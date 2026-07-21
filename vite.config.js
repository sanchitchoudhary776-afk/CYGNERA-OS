import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import fs from "fs";
import { exec, spawn } from "child_process";
import { promisify } from "util";

const execPromise = promisify(exec);
const DEV_KEY_HEALTH = {};

/* ────────────────────────────────────────────────
 *  Helper: write a temporary .ps1 script and run it
 *  This avoids all $_ / quoting issues with inline
 *  powershell -Command "..." from Node child_process.
 * ──────────────────────────────────────────────── */
function runPsScript(root, name, scriptBody, opts = {}) {
  const scriptPath = path.join(root, `.axinite-${name}.ps1`);
  fs.writeFileSync(scriptPath, scriptBody, 'utf8');
  const timeout = opts.timeout || 15000;
  return execPromise(
    `powershell -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File "${scriptPath}"`,
    { timeout, windowsHide: true }
  ).finally(() => {
    try { fs.unlinkSync(scriptPath); } catch {}
  });
}

export default defineConfig({
  base: '/',
  plugins: [
    react(),
    {
      name: 'dev-api-proxy',
      configureServer(server) {
        /* ═══════════════════════════════════════════
         *  FOCUS SHIELD – App & Website Blocker
         * ═══════════════════════════════════════════ */
        const ROOT = server.config.root;
        const env = loadEnv(server.config.mode, ROOT, '');
        const supabaseUrl = env.VITE_SUPABASE_URL;
        const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;
        let devSupabase = null;

        import('@supabase/supabase-js').then(({ createClient }) => {
          if (supabaseUrl && supabaseAnonKey && supabaseUrl !== 'your_supabase_url_here') {
            devSupabase = createClient(supabaseUrl, supabaseAnonKey);
          }
        }).catch(err => {
          console.error('[Dev API Proxy] Failed to load Supabase:', err);
        });

        const DEV_USER_RATE_BUCKETS = {};
        function checkDevRateLimit(userId) {
          const now = Date.now();
          const windowStart = now - (5 * 60 * 60 * 1000);
          if (!DEV_USER_RATE_BUCKETS[userId]) {
            DEV_USER_RATE_BUCKETS[userId] = [];
          }
          DEV_USER_RATE_BUCKETS[userId] = DEV_USER_RATE_BUCKETS[userId].filter(ts => ts > windowStart);
          if (DEV_USER_RATE_BUCKETS[userId].length >= 120) {
            return false;
          }
          DEV_USER_RATE_BUCKETS[userId].push(now);
          return true;
        }

        const CONFIG_PATH = path.join(ROOT, 'blocked_apps.json');
        const HOSTS_PATH = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'drivers', 'etc', 'hosts');
        const HOSTS_TAG_START = '# ===AXINITE-FOCUS-SHIELD-START===';
        const HOSTS_TAG_END   = '# ===AXINITE-FOCUS-SHIELD-END===';

        // Load persisted state
        let blockerState = { enabled: false, blockedApps: [], blockedSites: [] };
        try {
          if (fs.existsSync(CONFIG_PATH)) {
            blockerState = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
          }
        } catch (e) {
          console.error('[Focus Shield] Error loading config:', e.message);
        }

        function saveState() {
          try {
            fs.writeFileSync(CONFIG_PATH, JSON.stringify(blockerState, null, 2), 'utf8');
          } catch {}
        }

        /* ── Hosts-file website blocker (Node.js-first, no PowerShell) ── */
        const SCHTASK_NAME = 'AxiniteFocusShieldHostsSync';
        let hasHostsAdmin = false; // cached after first successful direct write
        let hasScheduledTask = false; // cached after task is confirmed/created

        function syncHostsFile(enable, sites) {
          const entries = (sites || []).map(s => {
            const clean = s.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '').toLowerCase().trim();
            return clean;
          }).filter(Boolean);

          // Build new hosts file content in pure Node.js
          let hostsContent = '';
          try { hostsContent = fs.readFileSync(HOSTS_PATH, 'utf8'); } catch {}

          // Strip old Axinite block
          const escapedStart = HOSTS_TAG_START.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const escapedEnd = HOSTS_TAG_END.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const blockRegex = new RegExp(`\\r?\\n?${escapedStart}[\\s\\S]*?${escapedEnd}\\r?\\n?`, 'g');
          hostsContent = hostsContent.replace(blockRegex, '').trimEnd();

          // Append new block
          if (enable && entries.length > 0) {
            hostsContent += '\n' + HOSTS_TAG_START + '\n';
            for (const domain of entries) {
              hostsContent += `127.0.0.1 ${domain}\n`;
              hostsContent += `127.0.0.1 www.${domain}\n`;
              hostsContent += `127.0.0.1 m.${domain}\n`;
            }
            hostsContent += HOSTS_TAG_END + '\n';
          }

          // Strategy 1: Direct Node.js file write (works if dev server is admin)
          if (hasHostsAdmin) {
            try {
              fs.writeFileSync(HOSTS_PATH, hostsContent, 'utf8');
              execPromise('ipconfig /flushdns', { windowsHide: true, timeout: 5000 }).catch(() => {});
              console.log(`[Website Blocker] ✓ Hosts updated. ${enable ? entries.length + ' sites blocked.' : 'Blocks cleared.'}`);
              return;
            } catch { hasHostsAdmin = false; }
          }

          // Try direct write first time
          try {
            fs.writeFileSync(HOSTS_PATH, hostsContent, 'utf8');
            hasHostsAdmin = true;
            execPromise('ipconfig /flushdns', { windowsHide: true, timeout: 5000 }).catch(() => {});
            console.log(`[Website Blocker] ✓ Hosts updated (direct). ${enable ? entries.length + ' sites blocked.' : 'Blocks cleared.'}`);
            return;
          } catch {}

          // Strategy 2: Use scheduled task (silent, no UAC after first setup)
          const helperScriptPath = path.join(ROOT, '.axinite-hosts-payload.ps1');
          const psPayload = `
$hostsPath = '${HOSTS_PATH.replace(/\\/g, '\\\\')}'
try {
    [System.IO.File]::WriteAllText($hostsPath, (Get-Content '${helperScriptPath.replace(/\\/g, '\\\\')}.txt' -Raw))
    & ipconfig /flushdns | Out-Null
} catch {}
`;
          // Write the desired hosts content to a .txt sidecar
          try { fs.writeFileSync(helperScriptPath + '.txt', hostsContent, 'utf8'); } catch {}
          try { fs.writeFileSync(helperScriptPath, psPayload, 'utf8'); } catch {}

          if (hasScheduledTask) {
            // Task already exists — just trigger it silently
            exec(`schtasks /Run /TN "${SCHTASK_NAME}"`, { windowsHide: true, timeout: 10000 }, (err) => {
              if (!err) console.log(`[Website Blocker] ✓ Hosts updated (task). ${enable ? entries.length + ' sites blocked.' : 'Blocks cleared.'}`);
            });
            return;
          }

          // Check if task exists, if not create it (one-time UAC prompt)
          exec(`schtasks /Query /TN "${SCHTASK_NAME}" 2>nul`, { windowsHide: true, timeout: 5000 }, (err, stdout) => {
            if (!err && stdout.includes(SCHTASK_NAME)) {
              hasScheduledTask = true;
              exec(`schtasks /Run /TN "${SCHTASK_NAME}"`, { windowsHide: true, timeout: 10000 });
              console.log(`[Website Blocker] ✓ Hosts updated (existing task).`);
            } else {
              // Create the scheduled task — ONE-TIME UAC prompt via elevation
              console.log('[Website Blocker] Creating one-time elevated task (you will see a single UAC prompt)...');
              const createTaskScript = `
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument '-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File "${helperScriptPath.replace(/\\/g, '\\\\')}"'
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -RunLevel Highest -LogonType S4U
Register-ScheduledTask -TaskName '${SCHTASK_NAME}' -Action $action -Principal $principal -Force | Out-Null
Start-ScheduledTask -TaskName '${SCHTASK_NAME}'
`;
              const createPath = path.join(ROOT, '.axinite-create-task.ps1');
              fs.writeFileSync(createPath, createTaskScript, 'utf8');
              exec(
                `powershell -NoProfile -WindowStyle Hidden -Command "Start-Process powershell -Verb RunAs -WindowStyle Hidden -ArgumentList '-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File \\\"${createPath}\\\"' -Wait"`,
                { timeout: 30000, windowsHide: true },
                (err2) => {
                  try { fs.unlinkSync(createPath); } catch {}
                  if (!err2) {
                    hasScheduledTask = true;
                    console.log(`[Website Blocker] ✓ Task created & hosts updated. Future changes will be silent.`);
                  } else {
                    console.error('[Website Blocker] Task creation failed. Run dev server as Admin for website blocking.');
                  }
                }
              );
            }
          });
        }

        // Sync hosts on startup if enabled
        if (blockerState.enabled && blockerState.blockedSites?.length > 0) {
          syncHostsFile(true, blockerState.blockedSites);
        }

        /* ── App process killer (runs every 2.5s) ── 
         *  Uses native verbose 'tasklist' with STATUS eq Running.
         *  Completely silent, no console windows, no permission prompts.
         * ──────────────────────────────────────────── */
        function parseVerboseTasklistCSV(stdout) {
          const procs = [];
          if (!stdout) return procs;
          for (const line of stdout.split('\n')) {
            const t = line.trim();
            if (!t) continue;
            // Robust CSV parsing that respects quotes
            const fields = [];
            let current = '';
            let inQuotes = false;
            for (let i = 0; i < t.length; i++) {
              const c = t[i];
              if (c === '"') {
                inQuotes = !inQuotes;
              } else if (c === ',' && !inQuotes) {
                fields.push(current.trim());
                current = '';
              } else {
                current += c;
              }
            }
            if (current) fields.push(current.trim());

            if (fields.length >= 9) {
              const name = fields[0].replace(/\.exe$/i, '');
              const pid = parseInt(fields[1], 10);
              const title = fields[8];
              procs.push({ ProcessName: name, Id: pid, MainWindowTitle: title });
            }
          }
          return procs;
        }

        // Valid single-word executable process names only (no spaces)
        const PROTECTED_PROCESSES = [
          'chrome', 'chromium',
          'msedge',
          'firefox',
          'opera', 'operagx',
          'brave',
          'vivaldi',
          'safari',
          'arc',
          'explorer', 'taskmgr', 'cmd', 'powershell', 'windowsterminal',
          'svchost', 'csrss', 'dwm', 'winlogon', 'lsass',
          'axinite', 'cygnera'
        ];

        // Browser process names — used to scope window-title site matching
        const BROWSER_PROCESSES = new Set([
          'chrome', 'chromium', 'msedge', 'firefox', 'opera', 'operagx',
          'brave', 'vivaldi', 'safari', 'arc', 'tor'
        ]);

        function isProtectedProcess(name) {
          const lower = (name || '').toLowerCase().replace(/\.exe$/i, '').trim();
          return PROTECTED_PROCESSES.some(p => lower === p || lower.includes(p));
        }

        function getSiteKeywords(site) {
          const clean = site.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '').toLowerCase().trim();
          const domainParts = clean.split('.');
          const keywords = [clean];
          if (domainParts.length >= 2) {
            const mainName = domainParts[domainParts.length - 2];
            if (mainName.length > 2) {
              keywords.push(mainName);
            }
          }
          return keywords;
        }

        if (!globalThis.__axiniteLastNotified) {
          globalThis.__axiniteLastNotified = {};
        }
        const lastNotifiedApps = globalThis.__axiniteLastNotified;
        let isRunningCheck = false;

        if (globalThis.__axiniteCheckInterval) {
          clearInterval(globalThis.__axiniteCheckInterval);
        }

        const checkInterval = setInterval(async () => {
          if (!blockerState.enabled) return;
          const hasApps = Array.isArray(blockerState.blockedApps) && blockerState.blockedApps.length > 0;
          const hasSites = Array.isArray(blockerState.blockedSites) && blockerState.blockedSites.length > 0;
          if (!hasApps && !hasSites) return;
          if (isRunningCheck) return;
          isRunningCheck = true;

          try {
            const blockedAppsSet = new Set(
              (blockerState.blockedApps || []).map(b => b.replace(/\.exe$/i, '').toLowerCase().trim())
            );

            // Build a clean, validated set of process names (no spaces, no empty strings)
            const targetNames = new Set([
              ...Array.from(blockedAppsSet).filter(n => n && !n.includes(' ')),
              ...PROTECTED_PROCESSES.filter(n => n && !n.includes(' '))
            ]);
            if (targetNames.size === 0) { isRunningCheck = false; return; }
            // Quote each name for safe PowerShell array syntax
            const nameFilter = Array.from(targetNames).map(n => `'${n.replace(/\.exe$/i, '')}'`).join(',');

            // Fast, non-blocking PowerShell query to fetch only targeted processes
            const { stdout } = await execPromise(
              `powershell -NoProfile -Command "Get-Process -Name ${nameFilter} -ErrorAction SilentlyContinue | Select-Object ProcessName, Id, MainWindowTitle | ConvertTo-Json -Compress; exit 0"`,
              { timeout: 8000, windowsHide: true }
            );
            if (!stdout || !stdout.trim()) return;

            const parsed = JSON.parse(stdout.trim());
            const processes = Array.isArray(parsed) ? parsed : [parsed];

            const blockedSites = blockerState.blockedSites || [];
            const terminatedAppsThisTick = new Set();

            for (const proc of processes) {
              if (!proc || !proc.ProcessName) continue;
              const procName = proc.ProcessName.toLowerCase();
              const title = (proc.MainWindowTitle || '').toLowerCase();
              const hasTitle = title && title.trim() !== '';

              // 1. App Blocking
              if (blockedAppsSet.has(procName)) {
                if (isProtectedProcess(procName)) {
                  if (hasTitle) {
                    const hasBannedSite = blockedSites.some(site => {
                      const keywords = getSiteKeywords(site);
                      return keywords.some(k => title.includes(k));
                    });
                    if (hasBannedSite) {
                      console.log(`[Focus Shield] Protected process ${proc.ProcessName} has blocked site window: "${proc.MainWindowTitle}". Closing window...`);
                      try {
                        await execPromise(`powershell -NoProfile -Command "(Get-Process -Id ${proc.Id}).CloseMainWindow()"`, { timeout: 3000, windowsHide: true });
                      } catch {}
                    }
                  }
                } else {
                  if (!terminatedAppsThisTick.has(procName)) {
                    terminatedAppsThisTick.add(procName);
                    console.log(`[Focus Shield] ✗ Blocked GUI app detected: ${proc.ProcessName}. Terminating all instances...`);
                    try {
                      await execPromise(`taskkill /F /IM ${procName}.exe`, { timeout: 5000, windowsHide: true });
                    } catch {}
                  }
                }
              }

              // 2. Website Blocking via Window Title Match — ONLY on browser processes
              //    This prevents false positives like closing "YouTube_Notes.docx" in Word
              if (hasTitle && BROWSER_PROCESSES.has(procName)) {
                const matchesBlockedSite = blockedSites.some(site => {
                  const keywords = getSiteKeywords(site);
                  return keywords.some(k => title.includes(k));
                });

                if (matchesBlockedSite) {
                  console.log(`[Focus Shield] Blocked website detected in browser window: "${proc.MainWindowTitle}" (Process: ${proc.ProcessName}, PID: ${proc.Id}). Closing tab...`);
                  try {
                    await execPromise(`powershell -NoProfile -Command "(Get-Process -Id ${proc.Id}).CloseMainWindow()"`, { timeout: 3000, windowsHide: true });
                  } catch {}
                }
              }
            }

            // Trigger premium decoupled HTA notification popups with 15-second cooldown
            const nowTime = Date.now();
            for (const appName of terminatedAppsThisTick) {
              const lowerName = appName.toLowerCase();
              const lastTime = lastNotifiedApps[lowerName] || 0;
              if (nowTime - lastTime > 15000) {
                // Set the cooldown timestamp IMMEDIATELY to prevent race conditions
                lastNotifiedApps[lowerName] = nowTime;

                // Format app name nicely
                const formattedName = appName.charAt(0).toUpperCase() + appName.slice(1);
                const safeAppName = formattedName.replace(/"/g, '\\"');
                const sanitizedFileName = lowerName.replace(/[^a-z0-9]/g, '');
                const htaPath = path.join(ROOT, `.axinite-popup-${sanitizedFileName}.hta`);
                const safeHtaPath = htaPath.replace(/\\/g, '\\\\');
                const htaContent = `
<!DOCTYPE html>
<html>
<head>
<title>Axinite OS - Focus Shield</title>
<hta:application 
  id="appBlockPopup"
  applicationname="Axinite Focus Shield"
  border="thin"
  borderstyle="normal"
  caption="yes"
  contextmenu="no"
  maximizebutton="no"
  minimizebutton="no"
  navigable="no"
  scroll="no"
  selection="no"
  showintaskbar="yes"
  singleinstance="no"
  sysmenu="yes"
  windowstate="normal"
/>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: #0c1120;
    color: #e2e8f0;
    font-family: "Segoe UI", sans-serif;
    margin: 0; padding: 0;
    overflow: hidden;
  }
  .container {
    width: 100%; height: 100%;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    background: linear-gradient(180deg, #161232 0%, #0c1120 60%);
    padding: 30px 36px 28px;
  }
  .badge {
    background: rgba(139, 92, 246, 0.12);
    border: 1px solid rgba(139, 92, 246, 0.25);
    color: #a78bfa;
    font-size: 10px; font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    padding: 5px 16px;
    border-radius: 20px;
    margin-bottom: 20px;
  }
  .shield-ring {
    width: 64px; height: 64px;
    border-radius: 50%;
    background: rgba(248, 113, 113, 0.06);
    border: 2px solid rgba(248, 113, 113, 0.3);
    box-shadow: 0 0 24px rgba(248, 113, 113, 0.12);
    display: flex; align-items: center; justify-content: center;
    margin-bottom: 20px;
  }
  .shield-ring span { font-size: 28px; }
  h2 {
    font-size: 20px; font-weight: 700;
    color: #fca5a5;
    margin-bottom: 14px;
  }
  .app-label {
    font-size: 14px; color: #f1f5f9;
    font-weight: 600;
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.08);
    padding: 7px 20px;
    border-radius: 6px;
    margin-bottom: 12px;
  }
  .msg {
    font-size: 12px; color: #64748b;
    line-height: 1.6;
    text-align: center;
    margin-bottom: 24px;
  }
  .btn {
    background: #ef4444;
    color: #fff;
    border: none;
    padding: 10px 34px;
    font-size: 13px; font-weight: 700;
    border-radius: 7px;
    cursor: pointer;
    letter-spacing: 0.03em;
    box-shadow: 0 2px 10px rgba(239, 68, 68, 0.35);
  }
</style>
<script language="JavaScript">
  window.resizeTo(460, 380);
  window.moveTo((screen.width - 460) / 2, (screen.height - 380) / 2);

  window.onbeforeunload = function() {
    try {
      var fso = new ActiveXObject("Scripting.FileSystemObject");
      fso.DeleteFile("${safeHtaPath}");
    } catch(e) {}
  };

  function dismissPopup() {
    try { window.close(); } catch(e) {}
    try { self.close(); } catch(e) {}
  }
</script>
</head>
<body>
<div class="container">
  <div class="badge">Focus Shield</div>
  <div class="shield-ring"><span>&#128737;</span></div>
  <h2>Access Denied</h2>
  <div class="app-label">${safeAppName}</div>
  <p class="msg">This app is blocked during your focus session.<br>Stay on track and keep learning!</p>
  <button class="btn" onclick="dismissPopup()">DISMISS</button>
</div>
</body>
</html>
                `.trim();

                try {
                  fs.writeFileSync(htaPath, htaContent, 'utf8');
                  console.log(`[Focus Shield] Spawning HTA popup: ${htaPath}`);
                  const child = spawn('mshta.exe', [htaPath], {
                    detached: true,
                    stdio: 'ignore',
                    windowsHide: false
                  });
                  child.unref();
                } catch (err) {
                  console.error('[Focus Shield] Failed to spawn HTA popup:', err);
                }
              }
            }
          } catch (e) {
            console.error('[Focus Shield] Error during process check:', e);
          } finally {
            isRunningCheck = false;
          }
        }, 2500);
        globalThis.__axiniteCheckInterval = checkInterval;

        // Clean up hosts file and interval when server shuts down
        server.httpServer?.on('close', () => {
          clearInterval(checkInterval);
          // Remove hosts entries when dev server stops
          syncHostsFile(false, []);
        });

        // Graceful hosts cleanup on abnormal exit (Ctrl+C, crashes, etc.)
        const cleanupHostsOnExit = () => {
          try {
            clearInterval(checkInterval);
            syncHostsFile(false, []);
          } catch {}
        };
        if (!globalThis.__axiniteExitHandlersRegistered) {
          globalThis.__axiniteExitHandlersRegistered = true;
          process.on('SIGINT', () => { cleanupHostsOnExit(); process.exit(0); });
          process.on('SIGTERM', () => { cleanupHostsOnExit(); process.exit(0); });
          process.on('exit', cleanupHostsOnExit);
          process.on('uncaughtException', (err) => {
            console.error('[Focus Shield] Uncaught exception, cleaning up hosts:', err.message);
            cleanupHostsOnExit();
          });
        }

        /* ═══════════════════════════════════════════
         *  MIDDLEWARE – API Routes
         * ═══════════════════════════════════════════ */
        server.middlewares.use(async (req, res, next) => {

          /* ── GET /api/blocker ── */
          if (req.url === '/api/blocker' && req.method === 'GET') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(blockerState));
            return;
          }

          /* ── POST /api/blocker ── */
          if (req.url === '/api/blocker' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', () => {
              try {
                const payload = JSON.parse(body);
                const wasEnabled = blockerState.enabled;
                const oldSites = [...(blockerState.blockedSites || [])];

                blockerState.enabled = !!payload.enabled;
                if (Array.isArray(payload.blockedApps)) {
                  blockerState.blockedApps = payload.blockedApps;
                }
                if (Array.isArray(payload.blockedSites)) {
                  blockerState.blockedSites = payload.blockedSites;
                }
                saveState();

                // Sync hosts file if sites or enabled state changed
                const sitesChanged = JSON.stringify(oldSites) !== JSON.stringify(blockerState.blockedSites);
                const enabledChanged = wasEnabled !== blockerState.enabled;
                if (sitesChanged || enabledChanged) {
                  syncHostsFile(blockerState.enabled, blockerState.blockedSites);
                }

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(blockerState));
              } catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: e.message }));
              }
            });
            return;
          }

          /* ── GET /api/processes (running GUI apps) ── */
          if (req.url === '/api/processes' && req.method === 'GET') {
            try {
              const { stdout } = await execPromise(
                'powershell -NoProfile -Command "Get-Process | Where-Object { $_.MainWindowTitle } | Select-Object ProcessName, Id, MainWindowTitle | ConvertTo-Json -Compress"',
                { timeout: 8000, windowsHide: true }
              );
              let results = [];
              if (stdout && stdout.trim()) {
                try {
                  const parsed = JSON.parse(stdout.trim());
                  const arr = Array.isArray(parsed) ? parsed : [parsed];
                  results = arr
                    .filter(p => p && p.ProcessName)
                    .map(p => ({
                      ProcessName: p.ProcessName || '',
                      Id: p.Id || 0,
                      MainWindowTitle: p.MainWindowTitle || ''
                    }));
                } catch (parseErr) {
                  console.warn('[Focus Shield] Failed to parse process list JSON:', parseErr.message);
                }
              }
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify(results));
            } catch (err) {
              // Return empty array instead of 500 when PowerShell fails
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end('[]');
            }
            return;
          }

          /* ── GET /api/installed-apps (ALL start-menu apps) ── */
          if (req.url === '/api/installed-apps' && req.method === 'GET') {
            try {
              const script = `Get-StartApps | Select-Object Name, AppID | ConvertTo-Json`;
              const { stdout } = await runPsScript(ROOT, 'installed-apps', script, { timeout: 12000 });
              let results = '[]';
              if (stdout && stdout.trim()) {
                try {
                  // Validate JSON before sending
                  JSON.parse(stdout.trim());
                  results = stdout.trim();
                } catch {
                  console.warn('[Focus Shield] Invalid JSON from Get-StartApps, returning empty.');
                }
              }
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(results);
            } catch (err) {
              // Return empty array instead of 500 when PowerShell fails
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end('[]');
            }
            return;
          }

          /* ── POST /api/ai ── */
          if (req.url === '/api/ai' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', async () => {
              try {
                let devUserId = 'anonymous_dev';
                if (devSupabase) {
                  const authHeader = req.headers.authorization || req.headers.Authorization || '';
                  const token = authHeader.replace(/^Bearer /i, '').trim();
                  if (!token) {
                    res.writeHead(401, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: { message: 'Authentication required. Token missing.' } }));
                    return;
                  }
                  try {
                    const { data: { user }, error } = await devSupabase.auth.getUser(token);
                    if (error || !user) {
                      res.writeHead(401, { 'Content-Type': 'application/json' });
                      res.end(JSON.stringify({ error: { message: 'Unauthorized. Invalid or expired token.' } }));
                      return;
                    }
                    devUserId = user.id;
                  } catch (err) {
                    res.writeHead(401, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: { message: 'Authentication check failed.' } }));
                    return;
                  }
                }

                if (!checkDevRateLimit(devUserId)) {
                  res.writeHead(429, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ error: { message: 'Too many requests. Local dev backend rate limit exceeded.' } }));
                  return;
                }

                const payload = JSON.parse(body);
                const env = loadEnv(server.config.mode, server.config.root, '');
                const envKey = env.GROQ_API_KEY || env.VITE_GROQ_API_KEY || '';
                if (!envKey || !envKey.trim()) {
                  res.writeHead(500, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ error: { message: 'GROQ_API_KEY is not set in your local .env file. Add it and restart the dev server.' } }));
                  return;
                }
                const cleanEnvKey = envKey.replace(/['"]/g, '').trim();
                const keys = cleanEnvKey.split(',').map(k => k.trim()).filter(Boolean);
                let lastError = null;
                const retries = Math.max(10, Math.min(keys.length, 30));

                for (let i = 0; i < retries; i++) {
                  const now = Date.now();
                  const healthyKeys = keys.filter(k => !DEV_KEY_HEALTH[k] || DEV_KEY_HEALTH[k] < now);
                  const candidateKeys = healthyKeys.length > 0 ? healthyKeys : keys;
                  const key = candidateKeys[Math.floor(Math.random() * candidateKeys.length)];

                  try {
                    const fetchController = new AbortController();
                    const fetchTimeout = setTimeout(() => fetchController.abort(), 50000);

                    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                      method: 'POST',
                      headers: {
                        'Authorization': `Bearer ${key}`,
                        'Content-Type': 'application/json'
                      },
                      body: JSON.stringify(payload),
                      signal: fetchController.signal,
                    });

                    clearTimeout(fetchTimeout);
                    const data = await groqRes.json();
                    
                    if (!groqRes.ok) {
                      throw new Error(data.error?.message || `HTTP ${groqRes.status}`);
                    }

                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(data));
                    return;
                  } catch (err) {
                    const errMsg = err.name === 'AbortError' ? 'Request timed out (50s)' : err.message;
                    console.error(`[AI Dev Rotator] Attempt ${i+1}/${retries} failed with key ...${key.slice(-6)}:`, errMsg);
                    lastError = err.name === 'AbortError' ? new Error(errMsg) : err;
                    
                    if (err.name === 'AbortError' || err.message.includes('429') || err.message.includes('401') || err.message.includes('403') || err.message.includes('Limit')) {
                      DEV_KEY_HEALTH[key] = Date.now() + 5 * 60 * 1000;
                    } else {
                      DEV_KEY_HEALTH[key] = Date.now() + 30 * 1000;
                    }
                    
                    if (i < retries - 1) {
                      await new Promise(r => setTimeout(r, 200));
                    }
                  }
                }
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: { message: `All local key rotation attempts failed. Last error: ${lastError?.message || 'Unknown'}` } }));
              } catch (e) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: { message: e.message } }));
              }
            });
            return;
          }
          next();
        });
      }
    }
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@components": path.resolve(__dirname, "./src/components"),
      "@pages": path.resolve(__dirname, "./src/pages"),
      "@services": path.resolve(__dirname, "./src/services"),
      "@context": path.resolve(__dirname, "./src/context"),
      "@hooks": path.resolve(__dirname, "./src/hooks"),
      "@styles": path.resolve(__dirname, "./src/styles"),
      "@utils": path.resolve(__dirname, "./src/utils"),
    },
  },
  server: {
    port: 5000,
    open: true,
  },
  build: {
    outDir: "dist",
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/') || id.includes('node_modules/react-router'))
            return 'vendor';
          if (id.includes('node_modules/recharts'))
            return 'charts';
          if (id.includes('node_modules/framer-motion'))
            return 'motion';
          if (id.includes('node_modules/react-quill') || id.includes('node_modules/quill'))
            return 'editor';
          if (id.includes('node_modules/react-markdown') || id.includes('node_modules/remark') || id.includes('node_modules/mdast') || id.includes('node_modules/micromark'))
            return 'markdown';
          if (id.includes('node_modules/@supabase'))
            return 'supabase';
        },
      },
    },
  },
});
