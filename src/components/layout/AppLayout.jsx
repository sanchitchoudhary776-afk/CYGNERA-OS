import { useState, useEffect, useRef, memo } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@context/AuthContext';
import { useApp } from '@context/AppContext';
import { useTheme } from '@context/ThemeContext';
import { ThemeToggle } from '@components/ui';
import { LogoFull, LogoCompact } from '@components/ui/Logo';
import AuraDial from './AuraDial';
import { useAudio } from '@context/AudioContext';

export default function AppLayout({ children }) {
  const location = useLocation();
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const progressRef = useRef(null);
  const headerRef = useRef(null);

  useEffect(() => {
    const el = document.getElementById('los-main');
    if (!el) return;
    let ticking = false;

    const fn = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const st = el.scrollTop;
          const sh = el.scrollHeight - el.clientHeight;
          const pct = sh > 0 ? (st / sh) * 100 : 0;

          if (progressRef.current) {
            progressRef.current.style.transform = `scaleX(${pct / 100})`;
          }

          if (headerRef.current) {
            const isScrolled = st > 10;
            if (headerRef.current.dataset.scrolled !== String(isScrolled)) {
              headerRef.current.dataset.scrolled = String(isScrolled);
              headerRef.current.style.background = isScrolled ? 'var(--bg)' : 'transparent';
              headerRef.current.style.borderBottom = isScrolled ? '1px solid var(--surface-b)' : '1px solid transparent';
            }
          }

          ticking = false;
        });
        ticking = true;
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
          transition: 'background 0.2s ease, border-color 0.2s ease',
          backdropFilter: 'none',
          WebkitBackdropFilter: 'none',
          willChange: 'background, border-color'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <LogoFull size={40} className="hide-mobile" />
            <LogoCompact size={32} className="show-mobile" />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <SyncIndicator />
            <ThemeToggle size={32} />
          </div>
        </div>

        {/* Page Content */}
        <div key={location.pathname} style={{
          animation: 'pageEnter 360ms cubic-bezier(0.4,0,0.2,1) both',
          minHeight: 'calc(100dvh - 64px)',
          paddingBottom: '120px'
        }}>
          {children}
        </div>

      </main>

      {/* The Aura Dial Navigation (Outside main to fix fixed-position context) */}
      <AuraDial />

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
