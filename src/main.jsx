import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './styles/globals.css';
import './styles/mobile-fixes.css';

import { initGlobalHaptics } from './utils/haptics.js';

// ── Register Service Workers ─────────────────────────────────
// PWA SW: Handles offline caching and instant app-shell loading
// Alarm SW: Handles background alarm notifications
try {
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    // First unregister any STALE service workers (old ones that aren't ours)
    navigator.serviceWorker.getRegistrations().then(registrations => {
      registrations.forEach(reg => {
        const url = reg.active?.scriptURL || '';
        if (url && !url.includes('alarm-sw.js') && !url.includes('sw.js')) {
          reg.unregister().then(ok => {
            if (ok) console.log('[SW] Unregistered stale service worker');
          });
        }
      });
    });

    // Register the PWA service worker (offline caching + instant load)
    // Only in production — prevents stale caches from fighting Vite HMR in dev
    if (import.meta.env.PROD) {
      navigator.serviceWorker.register('/sw.js', { scope: '/' })
        .then(registration => {
          console.log('[PWA SW] Registered. Scope:', registration.scope);
        })
        .catch(err => {
          console.warn('[PWA SW] Registration failed (non-critical):', err.message);
        });
    }

    // Register the alarm service worker (background notifications)
    navigator.serviceWorker.register('/alarm-sw.js', { scope: '/alarm' })
      .then(registration => {
        console.log('[Alarm SW] Registered. Scope:', registration.scope);
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
  initGlobalHaptics();
} catch (e) {
  console.warn('Global touch haptics init failed (non-critical):', e);
}

// ── Global Crash-Proof Error Handlers ────────────────────────────
// These prevent unhandled errors from silently killing the app
try {
  // Catch unhandled promise rejections (e.g. failed API calls, Supabase timeouts)
  window.addEventListener('unhandledrejection', (event) => {
    event.preventDefault(); // Prevent default browser error logging
    const reason = event.reason;
    const msg = reason?.message || reason?.toString?.() || 'Unknown async error';
    console.error('[AXINITE OS] Unhandled Promise Rejection:', msg, reason);
    // Avoid spamming the user — only show critical non-network errors
    if (!msg.includes('fetch') && !msg.includes('network') && !msg.includes('Failed to fetch') && !msg.includes('AbortError')) {
      // Silently log — the ErrorBoundary or try/catch in services handle the real UI
    }
  });

  // Catch completely uncaught synchronous errors
  window.addEventListener('error', (event) => {
    // Suppress harmless ResizeObserver loop errors (browser quirk, not a real bug)
    if (event.message?.includes?.('ResizeObserver loop')) {
      event.stopImmediatePropagation();
      return;
    }
    console.error('[AXINITE OS] Uncaught Error:', event.message, event.filename, event.lineno);
  });
} catch (e) {
  // Even the error handlers themselves are wrapped — truly crash-proof
}

// ── Pause animations when tab is hidden (saves CPU/battery) ──────
try {
  document.addEventListener('visibilitychange', () => {
    document.body.classList.toggle('page-hidden', document.hidden);
  });
} catch (e) {}

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
