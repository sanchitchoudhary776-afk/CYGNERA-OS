import { useState, useEffect, useRef, memo } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@context/AuthContext';
import { useApp, playAlarmSound, fireNativeNotification } from '@context/AppContext';
import { useTheme } from '@context/ThemeContext';
import { ThemeToggle } from '@components/ui';
import { LogoFull, LogoCompact } from '@components/ui/Logo';
import AuraDial from './AuraDial';
import { useAudio } from '@context/AudioContext';
import { PersonalizationEngine } from '@services/personalization';
import { moodCoaching, AI } from '@services/ai';
import toast from 'react-hot-toast';


export default function AppLayout({ children }) {
  const location = useLocation();
  const { theme } = useTheme();
  const progressRef = useRef(null);
  const headerRef = useRef(null);

  const { alarms = [], activeAlarm = null, A, todaySched = [] } = useApp();
  const [showAlarmsDrawer, setShowAlarmsDrawer] = useState(false);
  const [alarmForm, setAlarmForm] = useState({ time: '08:00', label: '', repeat: [] });

  const DAYS_CHIPS = [
    { name: 'M', value: 1 },
    { name: 'T', value: 2 },
    { name: 'W', value: 3 },
    { name: 'T', value: 4 },
    { name: 'F', value: 5 },
    { name: 'S', value: 6 },
    { name: 'S', value: 0 }
  ];

  const toggleDay = (dayVal) => {
    setAlarmForm(p => {
      const has = p.repeat.includes(dayVal);
      const next = has ? p.repeat.filter(d => d !== dayVal) : [...p.repeat, dayVal];
      return { ...p, repeat: next };
    });
  };

  const [notifPermission, setNotifPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );

  const requestNotifPermission = () => {
    if (typeof Notification === 'undefined') return;
    Notification.requestPermission().then(perm => {
      setNotifPermission(perm);
      if (perm === 'granted') {
        toast.success('System notifications enabled successfully! 🔔');
      } else if (perm === 'denied') {
        toast.error('Notification permission denied. Please enable them in browser settings.');
      }
    });
  };

  const handleCopySettingsLink = () => {
    const origin = encodeURIComponent(window.location.origin);
    let settingsUrl = `chrome://settings/content/siteDetails?site=${origin}`;
    if (navigator.userAgent.includes('Edg')) {
      settingsUrl = `edge://settings/content/siteDetails?site=${origin}`;
    }
    navigator.clipboard.writeText(settingsUrl).then(() => {
      toast.success('Direct Settings URL copied! Paste it in a new tab. 📋');
    }).catch(() => {
      toast.error('Failed to copy. Please open the lock icon.');
    });
  };

  useEffect(() => {
    const handleFocus = () => {
      if (typeof Notification !== 'undefined') {
        setNotifPermission(Notification.permission);
      }
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const getAlarmCountdown = (alarm) => {
    try {
      const now = new Date();
      const [ah, am] = alarm.time.split(':').map(Number);
      const alarmToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), ah, am, 0);
      
      let diffMs = alarmToday.getTime() - now.getTime();
      if (diffMs < 0) {
        diffMs += 24 * 60 * 60 * 1000;
      }
      
      const totalMins = Math.round(diffMs / 60000);
      const hrs = Math.floor(totalMins / 60);
      const mins = totalMins % 60;
      
      if (hrs === 0 && mins === 0) return 'Rings now!';
      if (hrs === 0) return `Rings in ${mins}m`;
      return `Rings in ${hrs}h ${mins > 0 ? `${mins}m` : ''}`;
    } catch (e) {
      return '';
    }
  };

  const handleAddAlarm = () => {
    A.alarm.add({
      time: alarmForm.time,
      label: alarmForm.label.trim() || 'Study Alarm',
      repeat: alarmForm.repeat
    });
    setAlarmForm({ time: '08:00', label: '', repeat: [] });
    toast.success('Alarm created! ⏰');
  };

  useEffect(() => {
    const el = document.getElementById('los-main');
    if (!el) return;
    
    const progressEl = progressRef.current;
    const headerEl = headerRef.current;

    const fn = () => {
      const st = el.scrollTop;
      const sh = el.scrollHeight - el.clientHeight;
      if (sh <= 0) return;
      
      const pct = (st / sh) * 100;

      if (progressEl) {
        progressEl.style.transform = `scaleX(${pct / 100})`;
      }

      if (headerEl) {
        const isScrolled = st > 20;
        if (headerEl.dataset.scrolled !== String(isScrolled)) {
          headerEl.dataset.scrolled = String(isScrolled);
          headerEl.style.background = isScrolled ? 'color-mix(in srgb, var(--bg) 92%, transparent)' : 'transparent';
          headerEl.style.borderBottom = isScrolled ? '1px solid var(--surface-b)' : '1px solid transparent';
          headerEl.style.boxShadow = isScrolled ? '0 4px 30px rgba(0,0,0,0.05)' : 'none';
        }
      }
    };

    el.addEventListener('scroll', fn, { passive: true });
    return () => el.removeEventListener('scroll', fn);
  }, []);

  const { active, spotifyUrl, isMinimized, setIsMinimized, BINAURAL_LINK, getSpotifyEmbed } = useAudio();
  const isFocusPage = location.pathname === '/focus';

  return (
    <div style={{ display: 'flex', height: '100dvh', overflow: 'hidden' }}>
      
      {/* PERSISTENT AUDIO ENGINE (Ghost Layer) */}
      <div style={{ 
        position: 'fixed', 
        zIndex: 10000, 
        pointerEvents: 'none', 
        opacity: (isFocusPage && !isMinimized) ? (active === 'spotify' || active === 'binaural' || active === 'lofi' ? 1 : 0) : 0,
        bottom: (isFocusPage && !isMinimized) ? 24 : -1000, 
        right: 24,
        width: (isFocusPage && !isMinimized) ? 'min(400px, 90vw)' : 0,
        height: (isFocusPage && !isMinimized) ? 'auto' : 0,
        transition: 'all 0.4s var(--bounce)'
      }}>
         {active === 'spotify' && spotifyUrl && (
           <iframe
             key={spotifyUrl}
             src={getSpotifyEmbed(spotifyUrl)}
             width="100%" height="80" frameBorder="0"
             allow="autoplay; encrypted-media; fullscreen"
             style={{ borderRadius:12, background:'black', boxShadow:'var(--sh-xl)', pointerEvents: 'auto' }}
           />
         )}
         {active === 'binaural' && (
           <iframe
             key="binaural-player"
             src={getSpotifyEmbed(BINAURAL_LINK)}
             width="100%" height="80" frameBorder="0"
             allow="autoplay; encrypted-media; fullscreen"
             style={{ borderRadius:12, background:'black', boxShadow:'var(--sh-xl)', pointerEvents: 'auto' }}
           />
         )}
         {active === 'lofi' && (
           <iframe 
             width="100%" height="180" 
             src="https://www.youtube-nocookie.com/embed/jfKfPfyJRdk?autoplay=1" 
             title="Lofi Girl" frameBorder="0" 
             allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
             allowFullScreen style={{ borderRadius:12, boxShadow:'var(--sh-xl)', pointerEvents: 'auto' }}
           />
         )}
      </div>

      {/* Main scroll area */}
      <main id="los-main" style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        height: '100dvh',
        position: 'relative',
        WebkitOverflowScrolling: 'touch',
        scrollBehavior: 'smooth',
        transform: 'translateZ(0)',
        contain: 'layout paint'
      }}>

        {/* Scroll Progress Indicator (Direct DOM update) */}
        <div ref={progressRef} style={{
          position: 'fixed', top: 0, left: 0, height: 3,
          width: '100%', background: 'linear-gradient(90deg, var(--p), var(--p-lt))',
          boxShadow: '0 0 10px var(--p-glow)', zIndex: 1001,
          transformOrigin: 'left',
          transform: 'scaleX(0)',
          transition: 'transform 40ms linear',
          willChange: 'transform'
        }} />

        {/* Persistent Aura Bar (Top) (Direct DOM update) */}
        <div ref={headerRef} style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          background: 'transparent',
          borderBottom: '1px solid transparent',
          transition: 'background 0.2s ease, border-color 0.2s ease'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <LogoFull size={40} className="hide-mobile" />
            <LogoCompact size={32} className="show-mobile" />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <SyncIndicator />
            {/* Elegant Alarms & Reminders Bell button */}
            <button 
              onClick={() => setShowAlarmsDrawer(true)} 
              className="icon-btn" 
              style={{ 
                position: 'relative', 
                background: 'var(--s1)', 
                border: '1px solid var(--surface-b)', 
                borderRadius: '50%', 
                width: 32, 
                height: 32, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                color: alarms?.some(a => a.enabled) ? 'var(--p)' : 'var(--t3)'
              }}
              title="Alarms & Reminders"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                {alarms?.some(a => a.enabled) ? 'notifications_active' : 'notifications'}
              </span>
              {alarms?.some(a => a.enabled) && (
                <span style={{ 
                  position: 'absolute', 
                  top: 2, 
                  right: 2, 
                  width: 8, 
                  height: 8, 
                  background: 'var(--p)', 
                  borderRadius: '50%',
                  boxShadow: '0 0 8px var(--p)' 
                }} />
              )}
            </button>
            <ThemeToggle size={32} />
          </div>
        </div>

        {/* Page Content */}
        <div key={`${location.pathname}-${theme}`} style={{
          animation: 'pageEnter 360ms cubic-bezier(0.4,0,0.2,1) both',
          minHeight: 'calc(100dvh - 64px)',
          paddingBottom: '120px'
        }}>
          {children}
        </div>

      </main>

      {/* The Aura Dial Navigation (Outside main to fix fixed-position context) */}
      <AuraDial />

      {/* Aura Ambient Check-In Popup */}
      <AuraAmbientCheckIn />

      {/* ── ALARMS & REMINDERS DRAWER UI ─────────────────────────────────── */}
      {showAlarmsDrawer && (
        <div onClick={() => setShowAlarmsDrawer(false)} style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          zIndex: 9990,
          background: 'rgba(0,0,0,0.4)',
          backdropFilter: 'blur(6px)',
          animation: 'fadeIn 0.2s ease'
        }} />
      )}

      <div style={{
        position: 'fixed',
        top: 0,
        right: showAlarmsDrawer ? 0 : -380,
        width: 'min(380px, 100vw)',
        height: '100dvh',
        zIndex: 9991,
        background: 'color-mix(in srgb, var(--bg) 85%, transparent)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderLeft: '1px solid var(--surface-b)',
        boxShadow: 'var(--sh-xl)',
        transition: 'right 300ms cubic-bezier(0.16, 1, 0.3, 1)',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 20px',
        color: 'var(--t1)',
        overflowY: 'auto'
      }}>
        {/* Drawer Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="material-symbols-outlined" style={{ color: 'var(--p)', fontSize: 22 }}>alarm</span>
            <span style={{ fontWeight: 800, fontSize: 16 }}>Alarms & Reminders</span>
          </div>
          <button onClick={() => setShowAlarmsDrawer(false)} className="icon-btn">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Notification Permission Prompt Banner (Default State) */}
        {notifPermission === 'default' && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(245, 158, 11, 0.1) 100%)',
            border: '1.5px solid color-mix(in srgb, var(--danger) 25%, transparent)',
            borderRadius: 16,
            padding: 16,
            marginBottom: 20,
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 10
          }}>
            <span className="material-symbols-outlined" style={{ color: 'var(--danger)', fontSize: 32, animation: 'alarmPulse 1.5s infinite alternate' }}>
              notifications_paused
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--t1)' }}>OS Notifications Disabled</span>
              <span style={{ fontSize: 11, color: 'var(--t3)', lineHeight: 1.4 }}>
                Alarms won't ring on other screens or when the app is closed unless system notifications are allowed.
              </span>
            </div>
            <button 
              onClick={requestNotifPermission}
              style={{
                width: '100%',
                padding: '8px 14px',
                fontSize: 12,
                fontWeight: 800,
                background: 'var(--p)',
                color: '#000',
                borderRadius: 10,
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>notifications_active</span>
              Enable OS Notifications
            </button>
          </div>
        )}

        {/* Notification Permission Denied Instruction Banner (Blocked State) */}
        {notifPermission === 'denied' && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(200, 30, 30, 0.12) 100%)',
            border: '1.5px solid var(--danger)',
            borderRadius: 16,
            padding: 18,
            marginBottom: 20,
            color: 'var(--t1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <span className="material-symbols-outlined" style={{ color: 'var(--danger)', fontSize: 24 }}>
                gpp_bad
              </span>
              <span style={{ fontSize: 13, fontWeight: 800 }}>Notification Permission Blocked</span>
            </div>
            
            <p style={{ fontSize: 11, color: 'var(--t3)', lineHeight: 1.4, marginBottom: 16 }}>
              Your browser has blocked notifications for this site.
            </p>

            {/* Direct Copy Shortcut Button */}
            <button 
              onClick={handleCopySettingsLink}
              style={{
                width: '100%',
                padding: '10px 14px',
                fontSize: 12,
                fontWeight: 800,
                background: 'var(--p)',
                color: '#000',
                borderRadius: 10,
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                boxShadow: '0 4px 15px rgba(9, 205, 131, 0.25)',
                marginBottom: 8,
                transition: 'all 0.2s ease'
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>content_copy</span>
              Copy Direct Settings URL
            </button>
            <p style={{ fontSize: 10, color: 'var(--t4)', lineHeight: 1.4, margin: '0 0 16px 0', textAlign: 'center' }}>
              Paste (Ctrl+V) this in a new browser tab to access the exact permission page directly!
            </p>

            {/* Manual Method Toggle Details */}
            <div style={{
              background: 'rgba(0, 0, 0, 0.2)',
              borderRadius: 10,
              padding: '10px 12px',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              fontSize: 10,
              lineHeight: 1.4,
              border: '1px solid var(--surface-b)',
              marginBottom: 14
            }}>
              <span style={{ fontWeight: 800, color: 'var(--t3)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Alternative Manual Steps:</span>
              <div style={{ display: 'flex', gap: 6 }}>
                <strong style={{ color: 'var(--p)' }}>1.</strong>
                <span>Click the <strong>Lock icon</strong> (🔒) at the far-left of your address bar.</span>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <strong style={{ color: 'var(--p)' }}>2.</strong>
                <span>Set <strong>Notifications</strong> toggle to <strong>Allow</strong>.</span>
              </div>
            </div>

            <button 
              onClick={() => window.location.reload()}
              style={{
                width: '100%',
                padding: '8px 14px',
                fontSize: 12,
                fontWeight: 800,
                background: 'var(--s3)',
                border: '1px solid var(--surface-b)',
                color: 'var(--t1)',
                borderRadius: 10,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                transition: 'all 0.2s ease'
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>refresh</span>
              Reload Tab
            </button>
          </div>
        )}

        {/* Section: Create Alarm */}
        <div style={{
          background: 'linear-gradient(145deg, var(--s1) 0%, rgba(20, 20, 20, 0.4) 100%)',
          borderRadius: 20,
          padding: 18,
          border: '1px solid var(--surface-b)',
          marginBottom: 20,
          boxShadow: 'var(--sh-sm)'
        }}>
          <h3 style={{ fontSize: 11, fontWeight: 800, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>New Custom Alarm</h3>
          
          <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
            <input 
              type="time" 
              className="input" 
              value={alarmForm.time} 
              onChange={e => setAlarmForm(p => ({ ...p, time: e.target.value }))} 
              style={{ flex: 1, minWidth: 0, padding: '10px 14px', borderRadius: 12, background: 'rgba(0,0,0,0.2)', border: '1px solid var(--surface-b)', color: '#fff', fontSize: 13, fontWeight: 700 }} 
            />
            <input 
              type="text" 
              className="input" 
              placeholder="Label (e.g. Wake up)" 
              value={alarmForm.label} 
              onChange={e => setAlarmForm(p => ({ ...p, label: e.target.value }))} 
              style={{ flex: 1.8, minWidth: 0, padding: '10px 14px', borderRadius: 12, background: 'rgba(0,0,0,0.2)', border: '1px solid var(--surface-b)', color: '#fff', fontSize: 12 }} 
            />
          </div>

          {/* Day Selection Chips */}
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 4, marginBottom: 14 }}>
            {DAYS_CHIPS.map(d => {
              const active = alarmForm.repeat.includes(d.value);
              return (
                <button
                  key={d.name + d.value}
                  onClick={() => toggleDay(d.value)}
                  style={{
                    width: 32, height: 32,
                    borderRadius: '50%',
                    border: `1.5px solid ${active ? 'var(--p)' : 'var(--surface-b)'}`,
                    background: active ? 'color-mix(in srgb, var(--p) 20%, transparent)' : 'rgba(0,0,0,0.15)',
                    color: active ? 'var(--p)' : 'var(--t4)',
                    fontSize: 11, fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {d.name}
                </button>
              );
            })}
          </div>

          <button 
            onClick={handleAddAlarm} 
            style={{
              width: '100%',
              padding: '11px',
              fontSize: 12,
              fontWeight: 800,
              background: 'var(--p)',
              color: '#000',
              borderRadius: 12,
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              transition: 'transform 0.1s ease'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add_alarm</span>
            Add Active Alarm
          </button>
        </div>

        {/* Section: Custom Alarms List */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 180, marginBottom: 20 }}>
          <h3 style={{ fontSize: 11, fontWeight: 800, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Active Alarms</h3>
          {alarms.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '1px dashed var(--surface-b)', borderRadius: 20, padding: 32, color: 'var(--t4)', textAlign: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 32, marginBottom: 10, opacity: 0.5, color: 'var(--t3)' }}>notifications_off</span>
              <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--t3)', margin: 0 }}>No active alarms. Set one above to notify you!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {alarms.map(alarm => (
                <div key={alarm.id} className="alarm-card-hover" style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 14,
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1.5px solid var(--surface-b)',
                  borderRadius: 16,
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                      <span style={{ fontSize: 20, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em' }}>{alarm.time}</span>
                      <span style={{ fontSize: 11, color: 'var(--t2)', fontWeight: 700 }}>{alarm.label}</span>
                    </div>
                    {/* Repeating Days or Live Countdown */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                      <div style={{ display: 'flex', gap: 3 }}>
                        {alarm.repeat.length === 0 ? (
                          <span style={{ fontSize: 9, color: 'var(--t4)', fontWeight: 800, textTransform: 'uppercase' }}>Once</span>
                        ) : (
                          DAYS_CHIPS.map(d => {
                            const isRepeat = alarm.repeat.includes(d.value);
                            return (
                              <span key={d.name + d.value} style={{ fontSize: 9, color: isRepeat ? 'var(--p)' : 'var(--t4)', fontWeight: 900 }}>
                                {d.name}
                              </span>
                            );
                          })
                        )}
                      </div>
                      {alarm.enabled && (
                        <>
                          <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--t4)' }} />
                          <span style={{ fontSize: 9, color: 'var(--p)', fontWeight: 800 }}>{getAlarmCountdown(alarm)}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {/* iOS style toggle */}
                    <div 
                      onClick={() => A.alarm.update({ ...alarm, enabled: !alarm.enabled })} 
                      style={{
                        width: 38, height: 22,
                        borderRadius: 99,
                        background: alarm.enabled ? 'var(--p)' : 'rgba(255, 255, 255, 0.08)',
                        border: '1.5px solid var(--surface-b)',
                        position: 'relative',
                        cursor: 'pointer',
                        transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
                      }}
                    >
                      <div style={{
                        width: 14, height: 14,
                        borderRadius: '50%',
                        background: alarm.enabled ? '#000' : '#fff',
                        position: 'absolute',
                        top: 2,
                        left: alarm.enabled ? 20 : 2,
                        transition: 'left 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                        boxShadow: 'var(--sh-sm)'
                      }} />
                    </div>

                    {/* Delete alarm button */}
                    <button onClick={() => A.alarm.remove(alarm.id)} className="icon-btn-danger" style={{
                      background: 'rgba(239, 68, 68, 0.08)',
                      border: 'none',
                      color: 'var(--danger)',
                      padding: 6,
                      borderRadius: 8,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section: Today's Tasks & Auto 5m Reminders */}
        <div style={{ borderTop: '1px solid var(--surface-b)', paddingTop: 20 }}>
          <h3 style={{ fontSize: 11, fontWeight: 800, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Schedule Pre-Reminders</h3>
          {todaySched.length === 0 ? (
            <div style={{ padding: '12px 16px', background: 'rgba(0,0,0,0.15)', borderRadius: 14, border: '1px solid var(--surface-b)', textAlign: 'center', color: 'var(--t4)', fontSize: 11, fontWeight: 600 }}>
              No study sessions scheduled today.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {todaySched.map(s => (
                <div key={s.id} style={{ padding: '12px 14px', background: 'rgba(255,255,255,0.01)', border: '1.5px solid var(--surface-b)', borderRadius: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--p)' }}>{s.subject}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)' }}>{s.startTime}</span>
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--t4)', marginTop: 2, fontWeight: 600 }}>{s.topic}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 8 }}>
                    <span className="pulsing-dot" style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
                    <span style={{ fontSize: 8, fontWeight: 900, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Auto 5m Reminder Active</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── TRIGGERED ACTIVE ALARM OVERLAY ───────────────────────────────── */}
      {activeAlarm && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          zIndex: 99999,
          background: 'rgba(5, 5, 5, 0.85)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
          animation: 'fadeIn 0.3s ease'
        }}>
          <div style={{
            width: '100%',
            maxWidth: 440,
            background: 'rgba(20, 20, 20, 0.7)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 24,
            padding: '36px 28px',
            textAlign: 'center',
            boxShadow: '0 20px 50px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Wave animation circles */}
            <div className="alarm-ring-pulse" style={{ animationDelay: '0s' }}></div>
            <div className="alarm-ring-pulse" style={{ animationDelay: '1s' }}></div>
            <div className="alarm-ring-pulse" style={{ animationDelay: '2s' }}></div>

            <div style={{
              width: 72, height: 72,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--p) 0%, var(--p-lt) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              boxShadow: '0 0 30px rgba(9, 205, 131, 0.4)',
              animation: 'alarmPulse 1.2s infinite alternate',
              position: 'relative',
              zIndex: 10
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 36, color: '#fff' }}>alarm</span>
            </div>

            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#fff', marginBottom: 10, position: 'relative', zIndex: 10 }}>{activeAlarm.title}</h2>
            <p style={{ fontSize: 13, color: '#aaa', lineHeight: 1.5, marginBottom: 28, position: 'relative', zIndex: 10 }}>{activeAlarm.desc}</p>

            <div style={{ display: 'flex', gap: 14, position: 'relative', zIndex: 10 }}>
              <button onClick={() => A.alarm.snooze()} style={{
                flex: 1,
                padding: '12px 20px',
                borderRadius: 12,
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#fff',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}>
                Snooze 5 Min
              </button>
              <button onClick={() => A.alarm.dismiss()} style={{
                flex: 1,
                padding: '12px 20px',
                borderRadius: 12,
                background: 'var(--p)',
                border: 'none',
                color: '#000',
                fontSize: 13,
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 4px 15px rgba(9, 205, 131, 0.3)',
                transition: 'all 0.2s ease'
              }}>
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pageEnter {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .show-mobile { display: none; }
        @media (max-width: 768px) {
          .show-mobile { display: block; }
          .hide-mobile { display: none; }
        }
        
        /* Alarms UI specific animations */
        @keyframes alarmPulse {
          0% { transform: scale(1); }
          100% { transform: scale(1.08); }
        }
        .alarm-ring-pulse {
          position: absolute;
          top: 35%;
          left: 50%;
          width: 80px;
          height: 80px;
          margin-top: -40px;
          margin-left: -40px;
          border: 1.5px solid var(--p);
          border-radius: 50%;
          opacity: 0;
          pointer-events: none;
          animation: alarmRing 3s infinite linear;
          z-index: 1;
        }
        @keyframes alarmRing {
          0% { transform: scale(0.8); opacity: 0.8; }
          100% { transform: scale(3.5); opacity: 0; }
        }
        
        /* Pulsing Dot animation */
        @keyframes pulseDot {
          0% { opacity: 0.4; }
          100% { opacity: 1; }
        }
        .pulsing-dot {
          animation: pulseDot 1s infinite alternate;
        }

        @keyframes timerPulse {
          0% { opacity: 0.85; }
          100% { opacity: 1; text-shadow: 0 0 8px var(--p); }
        }
        .alarm-card-hover:hover {
          background: rgba(255, 255, 255, 0.04) !important;
          border-color: rgba(9, 205, 131, 0.3) !important;
          transform: translateY(-2px);
        }
      `}
      </style>
    </div>
  );
}
const SyncIndicator = memo(function SyncIndicator() {
  const { syncStatus } = useApp();
  const { isAuth } = useAuth();
  if (!isAuth) return null;

  const CONFIG = {
    syncing: { icon: 'cloud_sync', color: 'var(--p)', label: 'Syncing...', spin: true },
    synced: { icon: 'cloud_done', color: '#10b981', label: 'Cloud Saved', spin: false },
    error: { icon: 'cloud_off', color: '#ef4444', label: 'Offline', spin: false },
  };

  const c = CONFIG[syncStatus] || CONFIG.synced;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 99, background: 'var(--s1)', border: '1px solid var(--surface-b)', cursor: 'default', transition: 'all 0.3s ease' }} title={c.label}>
      <span className={`material-symbols-outlined ${c.spin ? 'spinning' : ''}`} style={{ fontSize: 18, color: c.color, fontVariationSettings: "'FILL' 1" }}>
        {c.icon}
      </span>
      <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '0.05em' }} className="hide-mobile">
        {c.label}
      </span>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .spinning { animation: spin 2s linear infinite; }
      `}</style>
    </div>
  );
});

function AuraAmbientCheckIn() {
  const { checkIns, todayCI, tasks, A } = useApp();
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const [visible, setVisible] = useState(false);
  const [mood, setMood] = useState(3);
  const [energy, setEnergy] = useState(6);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Show only if not already checked in today and not skipped in this session
    const hasCalibrated = !!todayCI || checkIns?.some(c => c.date?.slice(0, 10) === new Date().toISOString().slice(0, 10));
    const hasSkipped = sessionStorage.getItem('aura_checkin_skipped') === 'true';

    if (!hasCalibrated && !hasSkipped) {
      const timer = setTimeout(() => {
        setVisible(true);
      }, 2500); // Premium delay after dashboard loads
      return () => clearTimeout(timer);
    }
  }, [todayCI, checkIns]);

  const handleSkip = () => {
    sessionStorage.setItem('aura_checkin_skipped', 'true');
    setVisible(false);
  };

  const handleSubmit = async () => {
    setLoading(true);
    const data = { mood, energy, sleepHours: 7, stressLevel: 4, focusMode: 'Deep Work', mainObjective: 'Uncalibrated intention' };
    
    // Set global mood parameter & invalidate briefing cache
    PersonalizationEngine.setMood(mood);
    const today = new Date().toDateString();
    for (let i = 1; i <= 5; i++) {
      localStorage.removeItem(`aura_briefing_${today}_m${i}`);
    }

    if (AI.enabled()) {
      try {
        const pendingTasks = tasks.filter(t => t.status === 'pending').map(t => t.title);
        const r = await moodCoaching({ ...data, tasks: pendingTasks });
        if (r) {
          data.aiCoaching = typeof r === 'string' ? r : [r.greeting, r.message].filter(Boolean).join(' ');
          data.aiStrategy = JSON.stringify(r);
        }
      } catch (err) {
        console.error('[Aura ambient checkin] AI coaching failed:', err);
      }
    }

    A.checkin.add(data);
    setLoading(false);
    setVisible(false);
    toast.success('Aura Calibrated! AI Briefing refreshed ✦', {
      style: { background: 'var(--s2)', color: 'var(--t1)', border: '1px solid var(--card-b)' }
    });
  };

  const MOODS = [
    { v: 1, e: '😔', l: 'Low', c: '#8A99AD' },
    { v: 2, e: '😐', l: 'Muted', c: '#E2B13C' },
    { v: 3, e: '🙂', l: 'Okay', c: '#06B6D4' },
    { v: 4, e: '😊', l: 'Good', c: '#10B981' },
    { v: 5, e: '🔥', l: 'Peak', c: '#F97316' }
  ];

  return (
    <>
      {visible && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            width: '330px',
            background: isLight 
              ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.72) 0%, rgba(255, 255, 255, 0.45) 100%)'
              : 'linear-gradient(135deg, rgba(13, 17, 28, 0.78) 0%, rgba(8, 10, 16, 0.55) 100%)',
            backdropFilter: 'blur(12px) saturate(210%)',
            WebkitBackdropFilter: 'blur(12px) saturate(210%)',
            border: isLight ? '1px solid rgba(16, 185, 129, 0.16)' : '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '24px',
            padding: '22px',
            boxShadow: isLight
              ? '0 20px 48px rgba(15, 23, 42, 0.06), inset 0 1px 0 rgba(255,255,255,0.7), 0 0 0 1px rgba(255, 255, 255, 0.2)'
              : '0 30px 60px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255,255,255,0.06), 0 0 0 1px rgba(255, 255, 255, 0.02)',
            zIndex: 1000,
            overflow: 'hidden',
            animation: 'modalCenterIn 380ms cubic-bezier(0.34,1.4,0.64,1) both'
          }}
        >
          {/* Subtle Ambient Mesh Radial Glow */}
          <div style={{
            position: 'absolute', top: '-30%', right: '-30%', width: '160px', height: '160px', borderRadius: '50%',
            background: `radial-gradient(circle at center, color-mix(in srgb, ${MOODS.find(m => m.v === mood)?.c || '#10b981'} 24%, transparent) 0%, transparent 70%)`,
            pointerEvents: 'none', zIndex: 0, transition: 'background 0.4s ease'
          }} />

          {/* Decorative aura border line */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, #10B981, #06B6D4, #8B5CF6)' }} />
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ 
                display: 'flex', alignItems: 'center', justifyContent: 'center', 
                width: 28, height: 28, borderRadius: '50%', 
                background: isLight ? 'rgba(16, 185, 129, 0.08)' : 'rgba(16, 185, 129, 0.12)',
                border: '1.5px solid rgba(16, 185, 129, 0.15)'
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--p)', fontVariationSettings: "'FILL' 1" }}>psychology</span>
              </div>
              <div>
                <span style={{ fontSize: 11, fontWeight: 900, color: 'var(--t1)', textTransform: 'uppercase', letterSpacing: '0.12em', display: 'block', lineHeight: 1 }}>Aura Calibration</span>
                <span style={{ fontSize: 8, fontWeight: 700, color: 'var(--p)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginTop: 2 }}>✦ AI Real-time Engine</span>
              </div>
            </div>
            <button 
              onClick={handleSkip}
              style={{ 
                background: isLight ? 'rgba(15, 23, 42, 0.03)' : 'rgba(255, 255, 255, 0.03)', 
                border: isLight ? '1px solid rgba(15,23,42,0.06)' : '1px solid rgba(255,255,255,0.05)', 
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                width: 24, height: 24, borderRadius: '50%', color: 'var(--t4)', transition: 'all 200ms ease' 
              }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--t1)'; e.currentTarget.style.background = isLight ? 'rgba(15,23,42,0.08)' : 'rgba(255,255,255,0.08)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--t4)'; e.currentTarget.style.background = isLight ? 'rgba(15,23,42,0.03)' : 'rgba(255,255,255,0.03)'; }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>close</span>
            </button>
          </div>

          <p style={{ fontSize: 12.5, color: 'var(--t3)', lineHeight: 1.5, margin: '0 0 18px', position: 'relative', zIndex: 1 }}>
            Quick check-in to align your daily dashboard recommendations.
          </p>

          {/* Mood Selector */}
          <div style={{ marginBottom: 18, position: 'relative', zIndex: 1 }}>
            <p style={{ fontSize: 9.5, fontWeight: 900, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Mood State</p>
            <div style={{ display: 'flex', gap: 8 }}>
              {MOODS.map(m => {
                const active = mood === m.v;
                return (
                  <button
                    key={m.v}
                    onClick={() => setMood(m.v)}
                    title={m.l}
                    style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: 46,
                      borderRadius: '16px',
                      border: active ? `1.5px solid ${m.c}` : isLight ? '1px solid rgba(15,23,42,0.06)' : '1px solid rgba(255,255,255,0.06)',
                      background: active 
                        ? `linear-gradient(145deg, color-mix(in srgb, ${m.c} 18%, transparent), color-mix(in srgb, ${m.c} 5%, transparent))`
                        : isLight ? 'rgba(15, 23, 42, 0.02)' : 'rgba(255, 255, 255, 0.02)',
                      cursor: 'pointer',
                      boxShadow: active ? `0 4px 14px color-mix(in srgb, ${m.c} 20%, transparent)` : 'none',
                      transform: active ? 'scale(1.08)' : 'scale(1)',
                      transition: 'all 280ms cubic-bezier(0.34, 1.56, 0.64, 1)'
                    }}
                    onMouseEnter={e => {
                      if (!active) {
                        e.currentTarget.style.transform = 'scale(1.04)';
                        e.currentTarget.style.borderColor = m.c;
                        e.currentTarget.style.background = isLight ? 'rgba(15, 23, 42, 0.04)' : 'rgba(255, 255, 255, 0.04)';
                      }
                    }}
                    onMouseLeave={e => {
                      if (!active) {
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.borderColor = isLight ? 'rgba(15,23,42,0.06)' : 'rgba(255,255,255,0.06)';
                        e.currentTarget.style.background = isLight ? 'rgba(15, 23, 42, 0.02)' : 'rgba(255, 255, 255, 0.02)';
                      }
                    }}
                  >
                    <span style={{ 
                      fontSize: 22, 
                      filter: active ? `drop-shadow(0 2px 8px color-mix(in srgb, ${m.c} 50%, transparent))` : 'grayscale(40%) opacity(75%)',
                      transition: 'all 200ms ease'
                    }}>{m.e}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Energy Slider */}
          <div style={{ marginBottom: 22, position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <p style={{ fontSize: 9.5, fontWeight: 900, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>Energy Level</p>
              <span style={{ fontSize: 12, fontWeight: 900, color: 'var(--p)', fontVariantNumeric: 'tabular-nums' }}>{energy}/10</span>
            </div>
            
            {/* Custom Slider Instrument Panel */}
            <div style={{ position: 'relative', height: 26, display: 'flex', alignItems: 'center' }}>
              {/* Back Track */}
              <div style={{ 
                width: '100%', height: 6, 
                background: isLight ? 'rgba(15, 23, 42, 0.06)' : 'rgba(255, 255, 255, 0.1)', 
                borderRadius: 99, position: 'relative'
              }}>
                {/* Active Colored Fill with Glow */}
                <div style={{ 
                  position: 'absolute', left: 0, height: '100%', 
                  width: `${((energy - 1) / 9) * 100}%`, 
                  background: 'linear-gradient(90deg, #10B981, #34D399)', 
                  borderRadius: 99,
                  boxShadow: '0 0 10px rgba(16, 185, 129, 0.3)'
                }} />
                
                {/* Custom Tactile Circular Bead (Slider Handle) */}
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: `${((energy - 1) / 9) * 100}%`,
                  transform: 'translate(-50%, -50%)',
                  width: 15,
                  height: 15,
                  borderRadius: '50%',
                  background: '#FFFFFF',
                  border: '3px solid var(--p)',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.15), 0 0 8px rgba(16, 185, 129, 0.4)',
                  pointerEvents: 'none',
                  transition: 'left 100ms cubic-bezier(0.1, 0.8, 0.2, 1)'
                }} />

                {/* Sub-Tick marks (1 to 10 scale dots) */}
                <div style={{ display: 'flex', justifyContent: 'space-between', position: 'absolute', width: '100%', top: 12 }}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(v => (
                    <div 
                      key={v} 
                      style={{ 
                        width: 3, 
                        height: 3, 
                        borderRadius: '50%', 
                        background: energy >= v ? 'var(--p)' : isLight ? 'rgba(15, 23, 42, 0.15)' : 'rgba(255, 255, 255, 0.2)',
                        opacity: energy === v ? 1 : 0.6,
                        transition: 'background 0.2s ease'
                      }} 
                    />
                  ))}
                </div>
              </div>

              {/* Invisible native input for interactive sliding */}
              <input 
                type="range" 
                min={1} 
                max={10} 
                value={energy} 
                onChange={e => setEnergy(Number(e.target.value))}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', zIndex: 2 }}
              />
            </div>
            
            {/* End Labels */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
              <span style={{ fontSize: 8, fontWeight: 700, color: 'var(--t4)', textTransform: 'uppercase' }}>Resting</span>
              <span style={{ fontSize: 8, fontWeight: 700, color: 'var(--t4)', textTransform: 'uppercase' }}>Hyper-Focus</span>
            </div>
          </div>

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #10B981, #059669)',
              border: 'none',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: 12.5,
              cursor: loading ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: '0 4px 20px rgba(16, 185, 129, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
              transition: 'all 280ms cubic-bezier(0.34, 1.56, 0.64, 1)',
              position: 'relative',
              zIndex: 1
            }}
            onMouseEnter={e => { 
              if(!loading) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 24px rgba(16, 185, 129, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.3)';
              }
            }}
            onMouseLeave={e => { 
              if(!loading) {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 20px rgba(16, 185, 129, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.2)';
              }
            }}
          >
            {loading ? (
              <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2, borderColor: '#ffffff', borderTopColor: 'transparent' }} />
            ) : (
              <>
                <span>Calibrate Aura</span>
                <span className="material-symbols-outlined" style={{ fontSize: 16, fontWeight: 'bold' }}>arrow_forward</span>
              </>
            )}
          </button>
        </div>
      )}
    </>
  );
}
