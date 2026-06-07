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

export default function MobileFocusShield() {
  const {
    settings: shieldSettings,
    updateSettings,
    addBlockedSite,
    removeBlockedSite
  } = useFocusShield();

  const [newSite, setNewSite] = useState('');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Mobile Focus Shield Toggle */}
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
          <div style={{ width: 34, height: 34, borderRadius: 'var(--r-md)', background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#60a5fa' }}>smartphone</span>
          </div>
          <div>
            <span style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--t1)', display: 'block' }}>Mobile & Tablet Focus Shield</span>
            <span style={{ fontSize: 11, color: 'var(--t3)', display: 'block', marginTop: 2 }}>Keeps your device locked into study mode.</span>
          </div>
        </div>
        <Toggle
          on={shieldSettings.enabled}
          onChange={v => {
            updateSettings({ enabled: v });
            toast.success(`Mobile Focus Shield ${v ? 'enabled' : 'disabled'} 🛡️`);
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

          {/* Feature Badges list */}
          <div>
            <p style={{ fontSize: 11.5, fontWeight: 800, color: 'var(--t2)', marginBottom: 8 }}>Focus Enforcement Features</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {[
                { icon: 'visibility', label: 'Tab Switch Monitor' },
                { icon: 'volume_up', label: 'Anti-Distraction Alarm' },
                { icon: 'screen_lock_portrait', label: 'Keep Screen Awake' },
                { icon: 'block', label: 'Site Blocklist' }
              ].map(f => (
                <span key={f.label} style={{
                  fontSize: 10, fontWeight: 700, padding: '5px 10px', borderRadius: 99,
                  background: 'rgba(9,205,131,0.08)', color: 'var(--p)', border: '1px solid rgba(9,205,131,0.15)',
                  display: 'inline-flex', alignItems: 'center', gap: 4
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 12 }}>{f.icon}</span>
                  {f.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
