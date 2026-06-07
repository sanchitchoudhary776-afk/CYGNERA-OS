import { useState } from 'react';
import toast from 'react-hot-toast';
import { useFocusShield } from '@context/FocusShieldContext';

function Toggle({ on, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      style={{
        position: 'relative',
        width: 52,
        height: 28,
        borderRadius: 999,
        border: 'none',
        cursor: 'pointer',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        padding: '2px',
        background: on ? 'linear-gradient(135deg, var(--p-lt), var(--p))' : 'var(--s4)',
        boxShadow: on
          ? 'inset 0 2px 4px rgba(0,0,0,0.1), 0 4px 12px rgba(9, 205, 131, 0.3)'
          : 'inset 0 2px 6px rgba(0,0,0,0.2)',
        transition: 'all 300ms cubic-bezier(0.25, 1, 0.5, 1)',
      }}>
      <div style={{
        width: 24,
        height: 24,
        borderRadius: '50%',
        background: '#ffffff',
        transform: on ? 'translateX(24px)' : 'translateX(0)',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        transition: 'transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1)',
      }} />
    </button>
  );
}

export default function DesktopFocusShield() {
  const {
    settings: shieldSettings,
    updateSettings,
    addBlockedSite,
    removeBlockedSite,
    addBlockedApp,
    removeBlockedApp
  } = useFocusShield();

  const [newSite, setNewSite] = useState('');
  const [newApp, setNewApp] = useState('');
  const [activeProcesses, setActiveProcesses] = useState([]);
  const [installedApps, setInstalledApps] = useState([]);
  const [loadingProcesses, setLoadingProcesses] = useState(false);
  const [loadingInstalled, setLoadingInstalled] = useState(false);
  const [showProcessPicker, setShowProcessPicker] = useState(false);
  const [pickerTab, setPickerTab] = useState('running'); // 'running' | 'installed'
  const [pickerSearch, setPickerSearch] = useState('');

  const fetchRunningProcesses = async () => {
    setLoadingProcesses(true);
    try {
      const res = await fetch('/api/processes');
      if (res.ok) {
        const data = await res.json();
        const unique = [];
        const seen = new Set();
        for (const item of (Array.isArray(data) ? data : [])) {
          if (!item || !item.ProcessName) continue;
          const cleanName = item.ProcessName.trim();
          if (!seen.has(cleanName.toLowerCase())) {
            seen.add(cleanName.toLowerCase());
            unique.push(item);
          }
        }
        setActiveProcesses(unique.sort((a, b) => a.ProcessName.localeCompare(b.ProcessName)));
      } else {
        toast.error('Failed to query system applications.');
      }
    } catch (e) {
      toast.error('Local background service is not running.');
    } finally {
      setLoadingProcesses(false);
    }
  };

  const fetchInstalledApps = async () => {
    setLoadingInstalled(true);
    try {
      const res = await fetch('/api/installed-apps');
      if (res.ok) {
        const data = await res.json();
        const apps = (Array.isArray(data) ? data : [])
          .filter(a => a && a.Name && !a.Name.startsWith('Uninstall'))
          .sort((a, b) => a.Name.localeCompare(b.Name));
        setInstalledApps(apps);
      }
    } catch {}
    finally { setLoadingInstalled(false); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* App Blocker Toggle */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 16px',
        background: 'var(--s3)',
        borderRadius: 'var(--r-md)',
        border: '1px solid var(--card-b-h)',
        marginBottom: shieldSettings.enabled ? 16 : 0,
        boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.02)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 34, height: 34, borderRadius: 'var(--r-md)', background: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#ff6b6b' }}>shield</span>
          </div>
          <div>
            <span style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--t1)', display: 'block' }}>Desktop Focus Shield Blocker</span>
            <span style={{ fontSize: 11, color: 'var(--t3)', display: 'block', marginTop: 2 }}>Deep App Blocking, Hosts Site Blocker & strict browser constraints.</span>
          </div>
        </div>
        <Toggle
          on={shieldSettings.enabled}
          onChange={v => {
            updateSettings({ enabled: v });
            toast.success(`Focus Shield ${v ? 'enabled' : 'disabled'} 🛡️`);
          }}
        />
      </div>

      {shieldSettings.enabled && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          padding: '16px',
          background: 'var(--s3)',
          borderRadius: 'var(--r-md)',
          border: '1px solid var(--card-b-h)',
          boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.02)'
        }}>
          {/* Fullscreen Lock */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingBottom: 12,
            borderBottom: '1px solid rgba(255,255,255,0.04)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 34, height: 34, borderRadius: 'var(--r-md)', background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#60a5fa' }}>fullscreen</span>
              </div>
              <div>
                <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--t1)', display: 'block' }}>Fullscreen Lock</span>
                <span style={{ fontSize: 11, color: 'var(--t3)', lineHeight: 1.3, display: 'block', marginTop: 2 }}>Forces browser fullscreen during focus. Re-locks if you press Esc.</span>
              </div>
            </div>
            <Toggle
              on={shieldSettings.fullscreenLock}
              onChange={v => {
                updateSettings({ fullscreenLock: v });
                toast.success(`Fullscreen Lock ${v ? 'enabled' : 'disabled'} 🖥️`);
              }}
            />
          </div>

          {/* Strictness Matrix */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingBottom: 12,
            borderBottom: '1px solid rgba(255,255,255,0.04)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 34, height: 34, borderRadius: 'var(--r-md)', background: 'rgba(251,146,60,0.1)', border: '1px solid rgba(251,146,60,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#fb923c' }}>tune</span>
              </div>
              <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--t1)' }}>Strictness Matrix</span>
            </div>

            <div style={{ display: 'flex', gap: 3, background: 'var(--bg-deep)', padding: 3, borderRadius: 10, border: '1px solid var(--card-b-h)' }}>
              {['gentle', 'strict', 'lockdown'].map(lvl => {
                const active = shieldSettings.strictness === lvl;
                return (
                  <button
                    key={lvl}
                    onClick={() => {
                      updateSettings({ strictness: lvl });
                      toast.success(`Strictness: ${lvl.toUpperCase()} 🚨`);
                    }}
                    style={{
                      fontSize: 9.5,
                      fontWeight: 850,
                      textTransform: 'uppercase',
                      padding: '6px 12px',
                      borderRadius: 7,
                      border: 'none',
                      cursor: 'pointer',
                      background: active ? 'linear-gradient(135deg, var(--p-lt), var(--p))' : 'transparent',
                      color: active ? 'var(--bg-deep)' : 'var(--t3)',
                      boxShadow: active ? '0 3px 8px rgba(9, 205, 131, 0.2)' : 'none',
                      transition: 'all 200ms ease',
                    }}
                  >
                    {lvl}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Blocked Sites */}
          <div style={{ paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div style={{ width: 34, height: 34, borderRadius: 'var(--r-md)', background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#a78bfa' }}>block</span>
              </div>
              <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--t1)' }}>Website Blocklist</span>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="input"
                placeholder="e.g. instagram.com, youtube.com"
                value={newSite}
                onChange={e => setNewSite(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    addBlockedSite(newSite);
                    setNewSite('');
                  }
                }}
                style={{ padding: '8px 12px', fontSize: 12.5, flex: 1 }}
              />
              <button
                onClick={() => {
                  addBlockedSite(newSite);
                  setNewSite('');
                }}
                className="btn btn-primary"
                style={{ padding: '8px 16px', fontSize: 12.5, flexShrink: 0 }}
              >
                Add
              </button>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
              {shieldSettings.blockedSites.map(site => (
                <span
                  key={site}
                  style={{
                    fontSize: 10.5,
                    fontWeight: 750,
                    padding: '4px 10px',
                    borderRadius: 99,
                    background: 'rgba(255,107,107,0.06)',
                    color: '#ff6b6b',
                    border: '1px solid rgba(255,107,107,0.15)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  {site}
                  <span
                    className="material-symbols-outlined"
                    onClick={() => removeBlockedSite(site)}
                    style={{ fontSize: 13, cursor: 'pointer', opacity: 0.7 }}
                  >
                    close
                  </span>
                </span>
              ))}
              {shieldSettings.blockedSites.length === 0 && (
                <p style={{ fontSize: 11.5, color: 'var(--t4)', fontStyle: 'italic', margin: '4px 0 0' }}>No sites blocked yet.</p>
              )}
            </div>
          </div>

          {/* Blocked Applications */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 34, height: 34, borderRadius: 'var(--r-md)', background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#f43f5e' }}>bolt</span>
                </div>
                <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--t1)' }}>Deep App Blocker (Windows)</span>
              </div>
              <button
                onClick={() => {
                  setShowProcessPicker(true);
                  setPickerTab('running');
                  setPickerSearch('');
                  fetchRunningProcesses();
                  fetchInstalledApps();
                }}
                className="btn btn-surface"
                style={{ padding: '6px 12px', fontSize: 11, borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>page_info</span>
                Scan System Apps
              </button>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="input"
                placeholder="e.g. spotify, discord, steam"
                value={newApp}
                onChange={e => setNewApp(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    addBlockedApp(newApp);
                    setNewApp('');
                  }
                }}
                style={{ padding: '8px 12px', fontSize: 12.5, flex: 1 }}
              />
              <button
                onClick={() => {
                  addBlockedApp(newApp);
                  setNewApp('');
                }}
                className="btn btn-primary"
                style={{ padding: '8px 16px', fontSize: 12.5, flexShrink: 0 }}
              >
                Block
              </button>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
              {(shieldSettings.blockedApps || []).map(app => (
                <span
                  key={app}
                  style={{
                    fontSize: 10.5,
                    fontWeight: 750,
                    padding: '4px 10px',
                    borderRadius: 99,
                    background: 'rgba(244,63,94,0.06)',
                    color: '#f43f5e',
                    border: '1px solid rgba(244,63,94,0.15)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  {app}
                  <span
                    className="material-symbols-outlined"
                    onClick={() => removeBlockedApp(app)}
                    style={{ fontSize: 13, cursor: 'pointer', opacity: 0.7 }}
                  >
                    close
                  </span>
                </span>
              ))}
              {(shieldSettings.blockedApps || []).length === 0 && (
                <p style={{ fontSize: 11.5, color: 'var(--t4)', fontStyle: 'italic', margin: '4px 0 0' }}>No applications blocked yet.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── System Application Scanner Modal ── */}
      {showProcessPicker && (() => {
        const isLoading = pickerTab === 'running' ? loadingProcesses : loadingInstalled;
        const searchLower = pickerSearch.toLowerCase();

        // Filter running processes
        const filteredProcesses = activeProcesses.filter(p =>
          !searchLower || p.ProcessName.toLowerCase().includes(searchLower) || (p.MainWindowTitle || '').toLowerCase().includes(searchLower)
        );

        // Filter installed apps and extract a usable block name from AppID
        const getBlockName = (app) => {
          const id = app.AppID || '';
          const exeMatch = id.match(/([^\\\/]+)\.exe/i);
          if (exeMatch) return exeMatch[1];
          return app.Name;
        };

        const filteredInstalled = installedApps.filter(a =>
          !searchLower || a.Name.toLowerCase().includes(searchLower)
        );

        return (
          <div style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(12px)', padding: 16 }}
            onClick={() => setShowProcessPicker(false)}>
            <div style={{ width: '100%', maxWidth: 520, background: 'var(--s1)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 'var(--r-lg)', padding: 24, boxShadow: '0 20px 50px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', maxHeight: '85dvh' }}
              onClick={e => e.stopPropagation()}>

              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 20, color: 'var(--p)' }}>monitor_heart</span>
                  <span style={{ fontSize: 14, fontWeight: 900, letterSpacing: '0.08em', color: 'var(--t1)', textTransform: 'uppercase' }}>Application Manager</span>
                </div>
                <button onClick={() => setShowProcessPicker(false)} style={{ background: 'transparent', border: 'none', color: 'var(--t4)', cursor: 'pointer', display: 'flex', padding: 4 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
                </button>
              </div>

              {/* Tabs */}
              <div style={{ display: 'flex', gap: 3, background: 'var(--bg-deep)', padding: 3, borderRadius: 10, border: '1px solid var(--card-b-h)', marginBottom: 14 }}>
                {[
                  { key: 'running', label: 'Running Apps', icon: 'play_circle' },
                  { key: 'installed', label: 'All Installed Apps', icon: 'apps' },
                ].map(t => {
                  const active = pickerTab === t.key;
                  return (
                    <button
                      key={t.key}
                      onClick={() => setPickerTab(t.key)}
                      style={{
                        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        fontSize: 11.5, fontWeight: 800, padding: '8px 12px', borderRadius: 7,
                        border: 'none', cursor: 'pointer',
                        background: active ? 'linear-gradient(135deg, var(--p-lt), var(--p))' : 'transparent',
                        color: active ? 'var(--bg-deep)' : 'var(--t3)',
                        boxShadow: active ? '0 3px 8px rgba(9,205,131,0.2)' : 'none',
                        transition: 'all 200ms ease',
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 15 }}>{t.icon}</span>
                      {t.label}
                    </button>
                  );
                })}
              </div>

              {/* Search */}
              <input
                className="input"
                placeholder={pickerTab === 'running' ? 'Search running apps...' : 'Search installed apps...'}
                value={pickerSearch}
                onChange={e => setPickerSearch(e.target.value)}
                style={{ padding: '9px 14px', fontSize: 12.5, marginBottom: 12, borderRadius: 10 }}
              />

              <p style={{ fontSize: 11, color: 'var(--t4)', marginBottom: 10 }}>
                {pickerTab === 'running'
                  ? `${filteredProcesses.length} running app${filteredProcesses.length !== 1 ? 's' : ''} found`
                  : `${filteredInstalled.length} installed app${filteredInstalled.length !== 1 ? 's' : ''} found`
                }
              </p>

              {/* App List */}
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, paddingRight: 4, scrollbarWidth: 'thin' }}>
                {isLoading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '40px 0' }}>
                    <div className="spinner" style={{ width: 28, height: 28, borderWidth: 3, borderColor: 'var(--p) transparent var(--p) transparent' }} />
                    <p style={{ fontSize: 12, color: 'var(--t3)' }}>Scanning system...</p>
                  </div>
                ) : pickerTab === 'running' ? (
                  filteredProcesses.length === 0 ? (
                    <p style={{ fontSize: 12, color: 'var(--t4)', textAlign: 'center', padding: '40px 0', fontStyle: 'italic' }}>
                      No user-facing applications detected.
                    </p>
                  ) : (
                    filteredProcesses.map(proc => {
                      const isBlocked = (shieldSettings.blockedApps || []).some(a => a.toLowerCase() === proc.ProcessName.toLowerCase());
                      return (
                        <div key={`${proc.ProcessName}-${proc.Id}`} style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '10px 14px', background: isBlocked ? 'rgba(244,63,94,0.04)' : 'rgba(255,255,255,0.02)',
                          border: `1px solid ${isBlocked ? 'rgba(244,63,94,0.15)' : 'rgba(255,255,255,0.05)'}`,
                          borderRadius: 12, transition: 'all 0.15s ease'
                        }}>
                          <div style={{ flex: 1, minWidth: 0, marginRight: 12 }}>
                            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)', margin: '0 0 2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {proc.ProcessName}
                            </p>
                            <p style={{ fontSize: 11, color: 'var(--t3)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {proc.MainWindowTitle || 'Active window'}
                            </p>
                          </div>
                          <button
                            onClick={() => isBlocked ? removeBlockedApp(proc.ProcessName) : addBlockedApp(proc.ProcessName)}
                            style={{
                              padding: '6px 14px', fontSize: 11, fontWeight: 700, borderRadius: 8, flexShrink: 0,
                              border: isBlocked ? '1px solid rgba(244,63,94,0.25)' : '1px solid rgba(9,205,131,0.25)',
                              background: isBlocked ? 'rgba(244,63,94,0.08)' : 'rgba(9,205,131,0.08)',
                              color: isBlocked ? '#f43f5e' : 'var(--p)', cursor: 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            {isBlocked ? '✗ Unblock' : '+ Block'}
                          </button>
                        </div>
                      );
                    })
                  )
                ) : (
                  filteredInstalled.length === 0 ? (
                    <p style={{ fontSize: 12, color: 'var(--t4)', textAlign: 'center', padding: '40px 0', fontStyle: 'italic' }}>
                      No installed applications detected.
                    </p>
                  ) : (
                    filteredInstalled.map((app, i) => {
                      const blockName = getBlockName(app);
                      const isBlocked = (shieldSettings.blockedApps || []).some(a => a.toLowerCase() === blockName.toLowerCase());
                      return (
                        <div key={`${app.Name}-${i}`} style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '10px 14px', background: isBlocked ? 'rgba(244,63,94,0.04)' : 'rgba(255,255,255,0.02)',
                          border: `1px solid ${isBlocked ? 'rgba(244,63,94,0.15)' : 'rgba(255,255,255,0.05)'}`,
                          borderRadius: 12, transition: 'all 0.15s ease'
                        }}>
                          <div style={{ flex: 1, minWidth: 0, marginRight: 12 }}>
                            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)', margin: '0 0 2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {app.Name}
                            </p>
                            <p style={{ fontSize: 10, color: 'var(--t4)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: 'monospace' }}>
                              blocks: {blockName}
                            </p>
                          </div>
                          <button
                            onClick={() => isBlocked ? removeBlockedApp(blockName) : addBlockedApp(blockName)}
                            style={{
                              padding: '6px 14px', fontSize: 11, fontWeight: 700, borderRadius: 8, flexShrink: 0,
                              border: isBlocked ? '1px solid rgba(244,63,94,0.25)' : '1px solid rgba(9,205,131,0.25)',
                              background: isBlocked ? 'rgba(244,63,94,0.08)' : 'rgba(9,205,131,0.08)',
                              color: isBlocked ? '#f43f5e' : 'var(--p)', cursor: 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            {isBlocked ? '✗ Unblock' : '+ Block'}
                          </button>
                        </div>
                      );
                    })
                  )
                )}
              </div>

              {/* Footer */}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: 16, paddingTop: 14, display: 'flex', gap: 10 }}>
                <button
                  onClick={() => { pickerTab === 'running' ? fetchRunningProcesses() : fetchInstalledApps(); }}
                  className="btn btn-surface"
                  style={{ flex: 1, padding: 10, fontSize: 12.5, borderRadius: 10 }}
                >
                  Refresh
                </button>
                <button onClick={() => setShowProcessPicker(false)} className="btn btn-primary" style={{ flex: 1, padding: 10, fontSize: 12.5, borderRadius: 10 }}>
                  Done
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
