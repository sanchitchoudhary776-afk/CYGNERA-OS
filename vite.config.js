import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import fs from "fs";
import { exec } from "child_process";
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

        const lastNotifiedApps = {};
        let isRunningCheck = false;

        const checkInterval = setInterval(async () => {
          if (!blockerState.enabled) return;
          if (!blockerState.blockedApps || blockerState.blockedApps.length === 0) return;
          if (isRunningCheck) return;
          isRunningCheck = true;

          try {
            // Native verbose tasklist for active processes only
            const { stdout } = await execPromise('tasklist /V /FO CSV /NH /FI "STATUS eq Running"', { timeout: 8000, windowsHide: true });
            if (!stdout || !stdout.trim()) return;

            const processes = parseVerboseTasklistCSV(stdout);
            const blockedSet = new Set(
              blockerState.blockedApps.map(b => b.replace(/\.exe$/i, '').toLowerCase().trim())
            );

            const terminatedAppsThisTick = new Set();

            for (const proc of processes) {
              if (!proc || !proc.ProcessName) continue;
              const name = proc.ProcessName.toLowerCase();

              if (blockedSet.has(name)) {
                // Only block/notify if it has a valid active window title (so tray/background helpers don't trigger alerts)
                const title = proc.MainWindowTitle || '';
                if (title && title !== 'N/A') {
                  console.log(`[App Blocker] ✗ Blocked GUI app detected: ${proc.ProcessName} ("${title}", PID ${proc.Id}). Terminating...`);
                  try {
                    await execPromise(`taskkill /F /PID ${proc.Id}`, { timeout: 5000, windowsHide: true });
                  } catch {}
                  terminatedAppsThisTick.add(proc.ProcessName);
                }
              }
            }

            // Trigger VBScript notifications with 15-second cooldown
            const nowTime = Date.now();
            for (const appName of terminatedAppsThisTick) {
              const lowerName = appName.toLowerCase();
              const lastTime = lastNotifiedApps[lowerName] || 0;
              if (nowTime - lastTime > 15000) {
                lastNotifiedApps[lowerName] = nowTime;

                // Show notification via VBScript — NO console window at all
                const safeAppName = appName.replace(/"/g, '""');
                const vbsContent = `MsgBox "ACCESS DENIED!" & vbCrLf & vbCrLf & "${safeAppName} is blocked by Axinite OS Focus Shield." & vbCrLf & "Close this dialog and get back to your learning goals!", vbExclamation, "Axinite OS - Focus Shield"`;
                const sanitizedFileName = lowerName.replace(/[^a-z0-9]/g, '');
                const vbsPath = path.join(ROOT, `.axinite-popup-${sanitizedFileName}.vbs`);

                try {
                  fs.writeFileSync(vbsPath, vbsContent, 'utf8');
                  exec(`wscript.exe "${vbsPath}"`, { windowsHide: true }, () => {
                    try { fs.unlinkSync(vbsPath); } catch {}
                  });
                } catch {}
              }
            }
          } catch {} finally {
            isRunningCheck = false;
          }
        }, 2500);

        // Clean up hosts file and interval when server shuts down
        server.httpServer?.on('close', () => {
          clearInterval(checkInterval);
          // Remove hosts entries when dev server stops
          syncHostsFile(false, []);
        });

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

          /* ── GET /api/processes (running GUI apps) — native tasklist, no PowerShell ── */
          if (req.url === '/api/processes' && req.method === 'GET') {
            try {
              const { stdout } = await execPromise('tasklist /V /FO CSV /NH /FI "STATUS eq Running"', { timeout: 10000, windowsHide: true });
              // Parse verbose tasklist CSV: "Name","PID","Session","#","Mem","Status","User","CPU","Window Title"
              const results = [];
              if (stdout) {
                for (const line of stdout.split('\n')) {
                  const t = line.trim();
                  if (!t) continue;
                  const parts = t.match(/"([^"]*)"/g);
                  if (parts && parts.length >= 9) {
                    const name = parts[0].replace(/"/g, '').replace(/\.exe$/i, '');
                    const pid = parseInt(parts[1].replace(/"/g, ''), 10);
                    const title = parts[8].replace(/"/g, '');
                    if (title && title !== 'N/A') {
                      results.push({ ProcessName: name, Id: pid, MainWindowTitle: title });
                    }
                  }
                }
              }
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify(results));
            } catch (err) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: err.message }));
            }
            return;
          }

          /* ── GET /api/installed-apps (ALL start-menu apps) ── */
          if (req.url === '/api/installed-apps' && req.method === 'GET') {
            try {
              const script = `Get-StartApps | Select-Object Name, AppID | ConvertTo-Json`;
              const { stdout } = await runPsScript(ROOT, 'installed-apps', script, { timeout: 12000 });
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(stdout || '[]');
            } catch (err) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: err.message }));
            }
            return;
          }

          /* ── POST /api/ai ── */
          if (req.url === '/api/ai' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', async () => {
              try {
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
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/') || id.includes('node_modules/react-router'))
            return 'vendor';
          if (id.includes('node_modules/recharts'))
            return 'charts';
          if (id.includes('node_modules/framer-motion'))
            return 'motion';
        },
      },
    },
  },
});
