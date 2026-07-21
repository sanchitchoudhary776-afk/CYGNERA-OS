import { useState, useEffect } from 'react';
import { useAuth } from '@context/AuthContext';
import { useApp } from '@context/AppContext';
import { useTheme } from '@context/ThemeContext';
import { useFocusShield } from '@context/FocusShieldContext';
import { driveSync } from '@services/driveSync';
import { SUBJECTS, initials } from '@utils';
import { ThemeToggle } from '@components/ui';
import toast from 'react-hot-toast';
import { usePremium } from '@components/ui/PremiumUI';
import DesktopFocusShield from '@components/focus/DesktopFocusShield';
import MobileFocusShield from '@components/focus/MobileFocusShield';
import { triggerHaptic } from '../utils/haptics.js';

const STYLES = [
  { id: 'visual', icon: 'visibility', label: 'Visual', desc: 'Charts & diagrams' },
  { id: 'auditory', icon: 'headphones', label: 'Auditory', desc: 'Talks & podcasts' },
  { id: 'reading', icon: 'menu_book', label: 'Reading', desc: 'Notes & books' },
  { id: 'kinesthetic', icon: 'sports_handball', label: 'Hands-on', desc: 'Build & practice' },
];

function Toggle({ on, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      style={{
        position: 'relative',
        width: 56,
        height: 32,
        borderRadius: 999,
        border: 'none',
        cursor: 'pointer',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        padding: '3px',
        background: on ? 'linear-gradient(135deg, var(--p-lt), var(--p))' : 'var(--s3)',
        boxShadow: on
          ? 'inset 0 2px 4px rgba(0,0,0,0.1), 0 4px 16px rgba(9, 205, 131, 0.4)'
          : 'inset 0 2px 6px rgba(0,0,0,0.2), inset 0 0 0 1px rgba(255,255,255,0.03)',
        transition: 'all 400ms cubic-bezier(0.25, 1, 0.5, 1)',
        WebkitTapHighlightColor: 'transparent',
      }}>
      <div style={{
        width: 26,
        height: 26,
        borderRadius: '50%',
        background: 'linear-gradient(180deg, #ffffff 0%, #e2e8f0 100%)',
        transform: on ? 'translateX(24px)' : 'translateX(0)',
        boxShadow: '0 2px 6px rgba(0,0,0,0.2), 0 4px 12px rgba(0,0,0,0.1), inset 0 2px 2px rgba(255,255,255,1)',
        transition: 'transform 400ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {/* Micro-status glowing core */}
        <div style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: on ? 'var(--p)' : '#cbd5e1',
          boxShadow: on ? '0 0 8px var(--p), inset 0 1px 1px rgba(255,255,255,0.8)' : 'inset 0 1px 2px rgba(0,0,0,0.1)',
          transition: 'all 400ms ease'
        }} />
      </div>
    </button>
  );
}

function Row({ icon, label, desc, children, color = 'var(--p)' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '14px 0', borderBottom: '1px solid var(--card-b)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
        <div style={{ width: 34, height: 34, borderRadius: 'var(--r-md)', background: `${color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 17, color }}>{icon}</span>
        </div>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)' }}>{label}</p>
          {desc && <p style={{ fontSize: 11.5, color: 'var(--t3)', marginTop: 1, lineHeight: 1.4 }}>{desc}</p>}
        </div>
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  );
}

function Section({ title, children, delay = 0 }) {
  return (
    <div className={`card fadeup`} style={{ padding: '20px 22px', animationDelay: `${delay}s` }}>
      <p style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>{title}</p>
      {children}
    </div>
  );
}

export default function Settings() {
  const { user, update: updateUser, logout } = useAuth();
  const { notes, tasks, schedule, videos, paths, checkIns, A } = useApp();
  const { theme } = useTheme();
  const { askConfirm } = usePremium();
  const aiOn = true;
  const isDesktop = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);



  const [editName, setEditName] = useState(false);
  const [newName, setNewName] = useState(user?.name || '');

  const defaultNotifs = { deadline: true, study: true, streak: true, achievement: true, checkin: false };
  const [notifs, setNotifs] = useState(() => {
    try {
      const saved = localStorage.getItem('los_notif_prefs');
      return saved ? { ...defaultNotifs, ...JSON.parse(saved) } : defaultNotifs;
    } catch { return defaultNotifs; }
  });

  useEffect(() => {
    localStorage.setItem('los_notif_prefs', JSON.stringify(notifs));
  }, [notifs]);

  const [hapticPrefs, setHapticPrefs] = useState(() => {
    try {
      const saved = localStorage.getItem('los_haptics_prefs');
      return saved ? JSON.parse(saved) : { enabled: true, vibrate: true, sound: true };
    } catch {
      return { enabled: true, vibrate: true, sound: true };
    }
  });

  const handleHapticPrefChange = (key, val) => {
    const next = { ...hapticPrefs, [key]: val };
    next.enabled = next.vibrate || next.sound;
    setHapticPrefs(next);
    localStorage.setItem('los_haptics_prefs', JSON.stringify(next));
    
    triggerHaptic('medium');
  };

  const saveName = () => {
    if (!newName.trim()) { toast.error('Name cannot be empty'); return; }
    updateUser({ name: newName.trim() });
    setEditName(false);
    toast.success('Name updated ✨');
  };

  // Google Drive state
  const [driveLinked, setDriveLinked] = useState(() => driveSync.isLinked());
  const [driveLoading, setDriveLoading] = useState(false);

  const exportData = () => {
    // Full-fidelity local export — keeps EVERYTHING losslessly
    const data = {
      user: { name: user?.name, email: user?.email, learningStyle: user?.learningStyle },
      notes, tasks, schedule, videos, paths, checkIns,
      exportedAt: new Date().toISOString(),
    };
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })),
      download: `axinite-os-${Date.now()}.json`,
    });
    a.click();
    toast.success('Full workspace exported 📦');
  };

  const handleDriveLink = async () => {
    setDriveLoading(true);
    try {
      await driveSync.linkDrive();
      setDriveLinked(true);
    } catch (err) {
      toast.error('Failed to link Google Drive');
    } finally {
      setDriveLoading(false);
    }
  };

  const handleDriveUnlink = () => {
    driveSync.unlinkDrive();
    setDriveLinked(false);
  };

  const handleDriveBackup = async () => {
    setDriveLoading(true);
    try {
      const fullState = { notes, tasks, schedule, videos, paths, checkIns };
      const success = await driveSync.backup(fullState);
      if (success) {
        localStorage.setItem('ax_last_drive_backup', new Date().toISOString());
        toast.success('Full workspace backed up to Google Drive! ☁️');
      }
    } catch (err) {
      toast.error('Drive backup failed: ' + (err.message || 'Unknown'));
    } finally {
      setDriveLoading(false);
    }
  };

  const handleDriveRestore = async () => {
    setDriveLoading(true);
    try {
      const restoredData = await driveSync.restore();
      if (restoredData) {
        A({ type: 'SYNC_CLOUD', payload: restoredData });
        toast.success('Workspace fully restored from Drive! 🎯');
      }
    } catch (err) {
      toast.error('Drive restore failed: ' + (err.message || 'Unknown'));
    } finally {
      setDriveLoading(false);
    }
  };

  const clearData = async () => {
    if (await askConfirm('Reset Everything?', 'This will permanently erase all your notes, tasks, and progress. This action is irreversible.')) {
      const keysToRemove = [
        'los_v5',
        'los_v5_meta',
        'los_active_note_id',
        'los_show_note_editor',
        'los_note_draft',
        'los_progress_tab',
        'axos_network_v5',
        'drive_token',
        'axinite_student_profile_v5',
        'axinite_weekly_digests_v5',
        'axinite_current_mood_v5',
        'ax_last_drive_backup'
      ];
      keysToRemove.forEach(k => localStorage.removeItem(k));
      sessionStorage.clear();

      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.startsWith('aura_briefing_') || key.startsWith('ai_response_') || key.startsWith('ax_ai_cache_') || key.startsWith('ax_rl_') || key.startsWith('axinite_'))) {
            if (key !== 'ax_dev_groq_key') {
              localStorage.removeItem(key);
              i--;
            }
          }
        }
      } catch (e) { }

      toast.success('Data cleared. Reloading…');
      setTimeout(() => window.location.reload(), 700);
    }
  };

  const handleLogout = async () => {
    if (await askConfirm('Logout?', 'Ready to end your focus session?')) {
      logout();
    }
  };

  const completed = (tasks || []).filter(t => t.status === 'completed').length;
  const watched = (videos || []).filter(v => v.watched).length;

  return (
    <div className="page" style={{ maxWidth: 1120, width: '100%' }}>
      <style>{`
        .settings-grid {
          display: grid;
          grid-template-columns: repeat(12, 1fr);
          gap: 28px;
          align-items: start;
        }
        .settings-col-left {
          grid-column: span 7;
          display: flex;
          flex-direction: column;
          gap: 28px;
        }
        .settings-col-right {
          grid-column: span 5;
          display: flex;
          flex-direction: column;
          gap: 28px;
        }
        @media (max-width: 992px) {
          .settings-grid {
            grid-template-columns: 1fr;
            gap: 24px;
          }
          .settings-col-left, .settings-col-right {
            grid-column: span 12;
          }
        }
        @keyframes pulse {
          0% { transform: scale(0.95); opacity: 0.5; }
          50% { transform: scale(1.15); opacity: 1; }
          100% { transform: scale(0.95); opacity: 0.5; }
        }
      `}</style>

      <div className="fadeup" style={{ marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--card-b)', paddingBottom: 16 }}>
        <div>
          <h1 className="shimmer-text page-title">Settings</h1>
          <p style={{ fontSize: 13, color: 'var(--t3)', marginTop: 4 }}>Manage and fine-tune your AXINITE OS environment</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 999, background: 'rgba(9, 205, 131, 0.05)', border: '1px solid rgba(9, 205, 131, 0.15)' }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--p)', boxShadow: '0 0 8px var(--p)', animation: 'pulse 2s infinite' }} />
          <span style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--p)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>OS Operational</span>
        </div>
      </div>

      {/* Grid Container for Cards */}
      <div className="settings-grid">
        {/* Left Column: Identity & Progress */}
        <div className="settings-col-left">

          {/* Profile */}
          <Section title="Profile" delay={0.05}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 0 20px', borderBottom: '1px solid var(--card-b)', marginBottom: 4 }}>
              <div style={{
                padding: 3,
                borderRadius: 'var(--r-lg)',
                background: 'linear-gradient(135deg, var(--p) 0%, var(--p-lt) 50%, #60a5fa 100%)',
                boxShadow: '0 8px 24px rgba(9, 205, 131, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <div style={{
                  width: 54,
                  height: 54,
                  borderRadius: 'calc(var(--r-lg) - 2px)',
                  background: 'var(--bg-deep)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 20,
                  fontWeight: 800,
                  color: 'var(--p)'
                }}>
                  {initials(user?.name || 'U')}
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                {editName ? (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input className="input" value={newName} onChange={e => setNewName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && saveName()} autoFocus style={{ padding: '8px 12px', fontSize: 14 }} />
                    <button onClick={saveName} className="btn btn-primary" style={{ padding: '8px 14px', fontSize: 12, flexShrink: 0 }}>Save</button>
                    <button onClick={() => setEditName(false)} className="icon-btn"><span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span></button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <p style={{ fontSize: 16, fontWeight: 800, color: 'var(--t1)' }}>{user?.name}</p>
                    <button onClick={() => setEditName(true)} className="icon-btn" style={{ width: 28, height: 28, opacity: 0.6 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 15 }}>edit</span>
                    </button>
                  </div>
                )}
                <p style={{ fontSize: 12, color: 'var(--t3)', marginTop: 3 }}>{user?.email}</p>
                {user?.subjects?.length > 0 && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                    {user.subjects.slice(0, 4).map(s => <span key={s} style={{ fontSize: 10, padding: '3px 10px', borderRadius: 99, background: 'rgba(9,205,131,0.08)', color: 'var(--p)', border: '1px solid rgba(9,205,131,0.15)', fontWeight: 700 }}>{s}</span>)}
                  </div>
                )}
              </div>
            </div>
            <div style={{ paddingTop: 16 }}>
              <p style={{ fontSize: 10.5, fontWeight: 750, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>Learning Style Focus</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                {STYLES.map(({ id, icon, label, desc }) => {
                  const active = user?.learningStyle === id;
                  return (
                    <button key={id} onClick={() => { updateUser({ learningStyle: id }); toast.success(`Style: ${label}`); }}
                      style={{
                        padding: '14px 12px',
                        borderRadius: 'var(--r-md)',
                        border: `1px solid ${active ? 'var(--p)' : 'var(--card-b)'}`,
                        background: active ? 'rgba(9,205,131,0.06)' : 'var(--s3)',
                        boxShadow: active ? '0 8px 24px rgba(9, 205, 131, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.05)' : 'none',
                        cursor: 'pointer',
                        transition: 'all 250ms ease',
                        textAlign: 'left',
                        position: 'relative',
                        overflow: 'hidden'
                      }}
                      onMouseEnter={e => { if (!active) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; }}
                      onMouseLeave={e => { if (!active) e.currentTarget.style.borderColor = 'var(--card-b)'; }}>
                      {active && (
                        <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 3, background: 'var(--p)' }} />
                      )}
                      <span className="material-symbols-outlined" style={{ fontSize: 20, color: active ? 'var(--p)' : 'var(--t4)', display: 'block', marginBottom: 6 }}>{icon}</span>
                      <p style={{ fontSize: 13, fontWeight: 700, color: active ? 'var(--p)' : 'var(--t1)', marginBottom: 2 }}>{label}</p>
                      <p style={{ fontSize: 10.5, color: 'var(--t4)', lineHeight: 1.3 }}>{desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          </Section>

          {/* Stats */}
          <Section title="Your Progress" delay={0.15}>
            <div className="grid-3" style={{ gap: 12, padding: '12px 0' }}>
              {[
                { l: 'Notes', v: (notes || []).length, icon: 'edit_note', c: 'var(--p)' },
                { l: 'Tasks Done', v: completed, icon: 'task_alt', c: '#60a5fa' },
                { l: 'Watched', v: watched, icon: 'smart_display', c: '#ff6b6b' },
                { l: 'Schedules', v: (schedule || []).length, icon: 'calendar_month', c: '#e9cd6e' },
                { l: 'Paths', v: (paths || []).length, icon: 'route', c: '#34d399' },
                { l: 'Check-ins', v: (checkIns || []).length, icon: 'sentiment_satisfied', c: '#a78bfa' },
              ].map(({ l, v, icon, c }) => (
                <div key={l} style={{
                  textAlign: 'center',
                  padding: '16px 10px',
                  borderRadius: 'var(--r-lg)',
                  background: 'var(--s3)',
                  border: `1px solid var(--card-b)`,
                  boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.02)',
                  transition: 'all 300ms ease',
                  cursor: 'default'
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = c; e.currentTarget.style.boxShadow = `0 8px 24px ${c}15`; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--card-b)'; e.currentTarget.style.boxShadow = 'inset 0 1px 0 rgba(255, 255, 255, 0.02)'; }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: `${c}10`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 17, color: c }}>{icon}</span>
                  </div>
                  <p style={{ fontSize: 24, fontWeight: 800, color: c, letterSpacing: '-0.02em', lineHeight: 1 }}>{v}</p>
                  <p style={{ fontSize: 10.5, color: 'var(--t4)', marginTop: 5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>{l}</p>
                </div>
              ))}
            </div>
          </Section>

          {/* Minimized Smart Features Status */}
          <div className="card fadeup" style={{
            padding: '16px 20px',
            animationDelay: '0.18s',
            background: aiOn ? 'linear-gradient(165deg, rgba(9,205,131,0.06), rgba(0,0,0,0.4))' : 'var(--s2)',
            border: `1px solid ${aiOn ? 'rgba(9, 205, 131, 0.2)' : 'var(--card-b)'}`,
            boxShadow: aiOn ? '0 8px 32px rgba(9, 205, 131, 0.05), inset 0 1px 1px rgba(255, 255, 255, 0.04)' : 'none'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justify_content: 'space-between', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 38,
                  height: 38,
                  borderRadius: 'var(--r-md)',
                  background: aiOn ? 'rgba(9,205,131,0.12)' : 'rgba(233,205,110,0.12)',
                  border: `1px solid ${aiOn ? 'rgba(9,205,131,0.2)' : 'rgba(233,205,110,0.2)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18, color: aiOn ? 'var(--p)' : '#e9cd6e' }}>psychology</span>
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--t1)' }}>Smart Engine Status</p>
                    {aiOn && (
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--p)', boxShadow: '0 0 8px var(--p)', animation: 'pulse 2s infinite' }} />
                    )}
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2 }}>
                    {aiOn ? 'All 9 active AI modules are online and fully optimized' : 'Inactive. Add your Groq API key below to activate.'}
                  </p>
                </div>
              </div>
              <span style={{
                padding: '3px 10px',
                borderRadius: 999,
                fontWeight: 800,
                fontSize: 10,
                background: aiOn ? 'rgba(9,205,131,0.12)' : 'rgba(233,205,110,0.12)',
                color: aiOn ? 'var(--p)' : '#e9cd6e',
                border: `1px solid ${aiOn ? 'rgba(9,205,131,0.25)' : 'rgba(233,205,110,0.25)'}`,
                flexShrink: 0
              }}>
                {aiOn ? 'ACTIVE' : 'OFFLINE'}
              </span>
            </div>
            {aiOn && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                {['Note AI', 'Task Breakdown', 'Progress Insights', 'Mood Coach', 'Smart Timer', 'Path Gen', 'Daily Briefing', 'Smart Schedule', 'Badges'].map(f => (
                  <span key={f} style={{ fontSize: 9.5, fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: 'rgba(9,205,131,0.06)', color: 'var(--p)', border: '1px solid rgba(9,205,131,0.12)', transition: 'all 0.2s', cursor: 'default' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(9,205,131,0.12)'; e.currentTarget.style.borderColor = 'var(--p)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(9,205,131,0.06)'; e.currentTarget.style.borderColor = 'rgba(9,205,131,0.12)'; }}>
                    {f}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Data & Account */}
          <Section title="Data & Account" delay={0.2}>
            <Row icon="file_download" label="Export Data" desc="Download all your local data as a JSON package" color="#60a5fa">
              <button onClick={exportData} className="btn btn-surface" style={{ padding: '8px 18px', fontSize: 12 }}>Export</button>
            </Row>
            <Row icon="delete_sweep" label="Clear All Data" desc="Permanently erase all workspace settings and metrics" color="var(--danger)">
              <button onClick={clearData}
                style={{ padding: '8px 18px', borderRadius: 'var(--r-lg)', border: '1px solid rgba(255,107,107,0.28)', background: 'rgba(255,107,107,0.08)', color: 'var(--danger)', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
                Clear
              </button>
            </Row>
            <Row icon="logout" label="Sign Out" desc="Disconnect from this AXINITE OS terminal" color="var(--danger)">
              <button onClick={handleLogout}
                style={{ padding: '8px 18px', borderRadius: 'var(--r-lg)', border: '1px solid rgba(255,107,107,0.28)', background: 'rgba(255,107,107,0.08)', color: 'var(--danger)', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
                Sign Out
              </button>
            </Row>
          </Section>

        </div>

        {/* Right Column: Preferences & Focus */}
        <div className="settings-col-right">

          {/* Appearance / Theme */}
          <Section title="Appearance" delay={0.08}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 20px',
              background: 'var(--s3)',
              border: '1px solid var(--card-b-h)',
              borderRadius: 'var(--r-md)',
              boxShadow: 'var(--sh-md), inset 0 1px 0 rgba(255, 255, 255, 0.03)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 3, background: 'var(--p)' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 38, height: 38, borderRadius: 'var(--r-md)', background: 'rgba(9,205,131,0.06)', border: '1px solid rgba(9,205,131,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 20, color: 'var(--p)' }}>contrast</span>
                </div>
                <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--t1)' }}>Theme Mode</span>
              </div>
              <ThemeToggle size={42} />
            </div>
          </Section>

          {/* Tactile Feedback */}
          <Section title="Tactile Feedback" delay={0.1}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 16px',
                background: 'var(--s3)',
                borderRadius: 'var(--r-md)',
                border: '1px solid var(--card-b-h)',
                boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.02)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 'var(--r-md)', background: 'rgba(9,205,131,0.1)', border: '1px solid rgba(9,205,131,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--p)' }}>sensors_gesture</span>
                  </div>
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--t1)', display: 'block' }}>Haptic Vibration</span>
                    <span style={{ fontSize: 11, color: 'var(--t3)', lineHeight: 1.3, display: 'block', marginTop: 2 }}>Physical response when tapping buttons (Android/Chrome).</span>
                  </div>
                </div>
                <Toggle
                  on={hapticPrefs.vibrate}
                  onChange={v => handleHapticPrefChange('vibrate', v)}
                />
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 16px',
                background: 'var(--s3)',
                borderRadius: 'var(--r-md)',
                border: '1px solid var(--card-b-h)',
                boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.02)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 'var(--r-md)', background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#60a5fa' }}>volume_up</span>
                  </div>
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--t1)', display: 'block' }}>Audio Click Feedback</span>
                    <span style={{ fontSize: 11, color: 'var(--t3)', lineHeight: 1.3, display: 'block', marginTop: 2 }}>Synthesized mechanical click sound (supports iOS/Safari).</span>
                  </div>
                </div>
                <Toggle
                  on={hapticPrefs.sound}
                  onChange={v => handleHapticPrefChange('sound', v)}
                />
              </div>
            </div>
          </Section>

          {/* Focus Shield Settings — Desktop vs Mobile */}
          <Section title="Focus Shield" delay={0.12}>
            {isMobile ? <MobileFocusShield /> : <DesktopFocusShield />}
          </Section>






          {/* Notifications */}
          <Section title="Notifications" delay={0.1}>
            {[
              { k: 'deadline', icon: 'event_upcoming', label: 'Deadline Reminders', desc: 'Alerts 1 day, morning, and 1hr prior', c: '#ff6b6b' },
              { k: 'study', icon: 'schedule', label: 'Study Reminders', desc: 'Alerts 10 minutes prior to sessions', c: '#60a5fa' },
              { k: 'streak', icon: 'local_fire_department', label: 'Streak Nudges', desc: 'Daily notification to save streak', c: '#e9cd6e' },
              { k: 'achievement', icon: 'emoji_events', label: 'Achievement Alerts', desc: 'Real-time alerts when earning badges', c: '#a78bfa' },
              { k: 'checkin', icon: 'sentiment_satisfied', label: 'Daily Check-Ins', desc: '9:00 AM mental status check', c: 'var(--p)' },
            ].map(({ k, icon, label, desc, c }) => (
              <Row key={k} icon={icon} label={label} desc={desc} color={c}>
                <Toggle on={notifs[k]} onChange={v => { setNotifs(p => ({ ...p, [k]: v })); toast.success(`${label} ${v ? 'enabled' : 'disabled'}`); }} />
              </Row>
            ))}
          </Section>

          {/* Cloud Backup */}
          <Section title="Cloud Backup & Restore" delay={0.12}>
            <div style={{ padding: '8px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <div style={{ width: 40, height: 40, borderRadius: 'var(--r-md)', background: 'linear-gradient(135deg, #4285F4, #34A853)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#fff' }}>cloud_upload</span>
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)' }}>Google Drive Integration</p>
                  <p style={{ fontSize: 11.5, color: 'var(--t3)', lineHeight: 1.4 }}>
                    {driveLinked
                      ? 'Your Drive is linked. Back up your full workspace for safe keeping.'
                      : 'Link your Google Drive to save lossless backups (uses your free 15GB quota).'}
                  </p>
                </div>
              </div>

              {!driveLinked ? (
                <button
                  onClick={handleDriveLink}
                  disabled={driveLoading}
                  style={{
                    width: '100%',
                    padding: '12px 20px',
                    borderRadius: 'var(--r-lg)',
                    border: '1px solid rgba(66,133,244,0.3)',
                    background: 'linear-gradient(135deg, rgba(66,133,244,0.12), rgba(52,168,83,0.08))',
                    color: '#4285F4',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: driveLoading ? 'wait' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    transition: 'all 200ms ease',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>link</span>
                  {driveLoading ? 'Connecting…' : 'Link Google Drive'}
                </button>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={handleDriveBackup}
                      disabled={driveLoading}
                      style={{
                        flex: 1,
                        padding: '11px 16px',
                        borderRadius: 'var(--r-lg)',
                        border: '1px solid rgba(52,168,83,0.25)',
                        background: 'linear-gradient(135deg, rgba(52,168,83,0.12), rgba(52,168,83,0.04))',
                        color: '#34A853',
                        fontSize: 12.5,
                        fontWeight: 700,
                        cursor: driveLoading ? 'wait' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        transition: 'all 200ms ease',
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>cloud_upload</span>
                      {driveLoading ? 'Uploading…' : 'Backup Now'}
                    </button>
                    <button
                      onClick={handleDriveRestore}
                      disabled={driveLoading}
                      style={{
                        flex: 1,
                        padding: '11px 16px',
                        borderRadius: 'var(--r-lg)',
                        border: '1px solid rgba(66,133,244,0.25)',
                        background: 'linear-gradient(135deg, rgba(66,133,244,0.12), rgba(66,133,244,0.04))',
                        color: '#4285F4',
                        fontSize: 12.5,
                        fontWeight: 700,
                        cursor: driveLoading ? 'wait' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        transition: 'all 200ms ease',
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>cloud_download</span>
                      {driveLoading ? 'Restoring…' : 'Restore from Drive'}
                    </button>
                  </div>

                  {localStorage.getItem('ax_last_drive_backup') && (
                    <p style={{ fontSize: 11, color: 'var(--t4)', textAlign: 'center' }}>
                      Last backup: {new Date(localStorage.getItem('ax_last_drive_backup')).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}

                  <button
                    onClick={handleDriveUnlink}
                    style={{
                      padding: '8px 16px',
                      borderRadius: 'var(--r-lg)',
                      border: '1px solid rgba(255,107,107,0.15)',
                      background: 'rgba(255,107,107,0.06)',
                      color: '#ff6b6b',
                      fontSize: 11.5,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      transition: 'all 200ms ease',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>link_off</span>
                    Disconnect Google Drive
                  </button>
                </div>
              )}
            </div>

            {/* Local JSON Export */}
            <Row icon="download" label="Export Full Data (JSON)" desc="Download a complete local snapshot of your workspace" color="#60a5fa">
              <button
                onClick={exportData}
                style={{
                  padding: '7px 16px',
                  borderRadius: 99,
                  border: '1px solid rgba(96,165,250,0.25)',
                  background: 'rgba(96,165,250,0.08)',
                  color: '#60a5fa',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 200ms ease',
                }}
              >
                Export
              </button>
            </Row>
          </Section>

        </div>
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', padding: '24px 0 20px', marginTop: 16, borderTop: '1px solid var(--card-b)' }}>
        <p style={{ fontSize: 12, color: 'var(--t4)' }}>AXINITE OS v1.0</p>
        <p style={{ fontSize: 11, color: 'var(--s6)', marginTop: 4 }}>© 2026 · Built for ambitious learners</p>
      </div>


    </div>
  );
}
