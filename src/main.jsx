import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './styles/globals.css';
import './styles/mobile-fixes.css';

// ── Register Alarm Service Worker ────────────────────────────────
// This SW runs in background and fires native OS notifications for alarms
// even when the tab is not focused or is minimized.
try {
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    // First unregister any STALE service workers (old PWA etc.)
    navigator.serviceWorker.getRegistrations().then(registrations => {
      registrations.forEach(reg => {
        // Only unregister non-alarm SWs
        if (reg.active && !reg.active.scriptURL.includes('alarm-sw.js')) {
          reg.unregister().then(ok => {
            if (ok) console.log('[SW] Unregistered stale service worker');
          });
        }
      });
    });

    // Register our alarm service worker
    navigator.serviceWorker.register('/alarm-sw.js', { scope: '/' })
      .then(registration => {
        console.log('[Alarm SW] Registered successfully. Scope:', registration.scope);
      })
      .catch(err => {
        console.warn('[Alarm SW] Registration failed (non-critical):', err.message);
      });
  }
} catch (e) {
  console.error('Service worker setup failed:', e);
}

// ── Request Notification Permission Early ────────────────────────
// This allows OS-level alarm notifications to fire
try {
  if ('Notification' in window && Notification.permission === 'default') {
    // We'll request on first user interaction to comply with browser policies
    const requestOnInteraction = () => {
      Notification.requestPermission().then(perm => {
        console.log('[Notifications] Permission:', perm);
      });
      document.removeEventListener('click', requestOnInteraction);
      document.removeEventListener('keydown', requestOnInteraction);
    };
    document.addEventListener('click', requestOnInteraction, { once: true });
    document.addEventListener('keydown', requestOnInteraction, { once: true });
  }
} catch (e) {}

// ── Global Premium Touch Screen Haptic Feedback ──────────────────
try {
  if (typeof window !== 'undefined') {
    const triggerGlobalTouchHaptic = (dur = 12) => {
      if (navigator.vibrate) {
        try {
          navigator.vibrate(dur);
        } catch (err) {}
      }
    };

    window.addEventListener('touchstart', (e) => {
      const target = e.target;
      if (!target) return;
      
      const isInteractive = target.closest(
        'button, a, input, select, textarea, [role="button"], [onClick], .clickable, .alarm-card-hover, .orbit-item, [onclick]'
      );
      
      if (isInteractive) {
        triggerGlobalTouchHaptic(12);
      }
    }, { passive: true });
  }
} catch (e) {
  console.warn('Global touch haptics init failed (non-critical):', e);
}

// Force clear all legacy/testing data to ensure a completely clean start
try {
  const legacyKeys = [
    'los_v3',
    'los_v3_meta',
    'los_v4',
    'los_v4_meta',
    'axos_network',
    'axos_network_v4',
    'axinite_student_profile',
    'axinite_student_profile_v4',
    'axinite_weekly_digests',
    'axinite_weekly_digests_v4',
    'axinite_current_mood',
    'axinite_current_mood_v4',
    'ax_last_drive_backup'
  ];
  legacyKeys.forEach(k => localStorage.removeItem(k));
  // Clear legacy AI cache and rate limiting keys
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const k = localStorage.key(i);
    if (k && (k.startsWith('ax_ai_cache_') || k.startsWith('ax_rl_') || k.startsWith('axinite_'))) {
      if (k !== 'ax_dev_groq_key') {
        localStorage.removeItem(k);
      }
    }
  }
} catch (e) {
  console.error('Failed to clean legacy cache:', e);
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode><App /></React.StrictMode>
);
