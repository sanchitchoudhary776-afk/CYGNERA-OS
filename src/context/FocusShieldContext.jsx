import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';

const FocusShieldCtx = createContext(null);

const STORAGE_KEY = 'los_focus_shield';

const DEFAULT_SETTINGS = {
  enabled: true,
  fullscreenLock: false,
  blockedSites: ['instagram.com', 'youtube.com', 'twitter.com', 'tiktok.com', 'facebook.com', 'reddit.com', 'snapchat.com'],
  blockedApps: ['Discord', 'Spotify', 'Steam'], // Custom desktop apps to block on Windows
  strictness: 'strict', // 'gentle', 'strict', 'lockdown'
};

function loadSettings() {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (!s) return null;
    const parsed = JSON.parse(s);
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      blockedApps: parsed.blockedApps || DEFAULT_SETTINGS.blockedApps,
      blockedSites: parsed.blockedSites || DEFAULT_SETTINGS.blockedSites
    };
  } catch { return null; }
}

function saveSettings(settings) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); } catch {}
}

export function FocusShieldProvider({ children }) {
  const [settings, setSettings] = useState(() => loadSettings() || DEFAULT_SETTINGS);
  const [isActive, setIsActive] = useState(false);
  const [showShield, setShowShield] = useState(false);
  const [showFullscreenPrompt, setShowFullscreenPrompt] = useState(false);
  const [violations, setViolations] = useState(0);
  const [sessionViolations, setSessionViolations] = useState([]);
  const lastHiddenAt = useRef(null);

  const audioCtxRef = useRef(null);
  const alarmIntervalRef = useRef(null);
  const wakeLockRef = useRef(null);

  const initAudio = useCallback(() => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }
    } catch (e) {
      console.warn('[FocusShield] Web Audio API initialization failed:', e);
    }
  }, []);

  const acquireWakeLock = useCallback(async () => {
    try {
      if ('wakeLock' in navigator && !wakeLockRef.current) {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
      }
    } catch (err) {
      console.warn('[FocusShield] Screen Wake Lock request failed:', err);
    }
  }, []);

  const releaseWakeLock = useCallback(() => {
    if (wakeLockRef.current) {
      wakeLockRef.current.release().then(() => {
        wakeLockRef.current = null;
      }).catch(() => {
        wakeLockRef.current = null;
      });
    }
  }, []);

  const startAlarm = useCallback(() => {
    if (alarmIntervalRef.current) return;
    initAudio();
    
    alarmIntervalRef.current = setInterval(() => {
      try {
        const ctx = audioCtxRef.current;
        if (!ctx || ctx.state === 'suspended') return;
        
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(440, ctx.currentTime + 0.25);
        
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start();
        osc.stop(ctx.currentTime + 0.45);
      } catch (e) {
        console.warn('[FocusShield] Sound playback failed:', e);
      }
    }, 600);
  }, [initAudio]);

  const stopAlarm = useCallback(() => {
    if (alarmIntervalRef.current) {
      clearInterval(alarmIntervalRef.current);
      alarmIntervalRef.current = null;
    }
  }, []);

  // Persist settings
  useEffect(() => { saveSettings(settings); }, [settings]);

  // Page Visibility Detection
  useEffect(() => {
    if (!isActive || !settings.enabled) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // User left the app
        lastHiddenAt.current = Date.now();
      } else {
        // User returned
        if (lastHiddenAt.current) {
          const awayDuration = Date.now() - lastHiddenAt.current;
          // Only count if they were away for more than 2 seconds (not accidental)
          if (awayDuration > 2000) {
            const violation = {
              at: new Date().toISOString(),
              duration: Math.round(awayDuration / 1000),
            };
            setViolations(v => v + 1);
            setSessionViolations(prev => [...prev, violation]);
            setShowShield(true);

            // Attempt to regain fullscreen if fullscreen lock is on
            if (settings.fullscreenLock) {
              try { document.documentElement.requestFullscreen?.(); } catch {}
            }
          }
          lastHiddenAt.current = null;
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isActive, settings.enabled, settings.strictness, settings.fullscreenLock]);

  // Fullscreen lock on activation + show blocking prompt if user presses Esc
  useEffect(() => {
    if (!isActive || !settings.fullscreenLock || !settings.enabled) {
      setShowFullscreenPrompt(false);
      return;
    }

    // Enter fullscreen initially
    try { document.documentElement.requestFullscreen?.(); } catch {}

    const handleFullscreenChange = () => {
      // If we're supposed to be in fullscreen but user exited (e.g. pressed Esc)
      if (!document.fullscreenElement && isActive && settings.fullscreenLock && settings.enabled) {
        // Browser blocks requestFullscreen from non-user-gesture contexts,
        // so we show a blocking overlay with a button the user must click.
        setShowFullscreenPrompt(true);
      } else if (document.fullscreenElement) {
        setShowFullscreenPrompt(false);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [isActive, settings.fullscreenLock, settings.enabled]);

  // Callback for the user to click to re-enter fullscreen (valid user gesture)
  const reEnterFullscreen = useCallback(() => {
    try {
      document.documentElement.requestFullscreen?.();
    } catch {}
    setShowFullscreenPrompt(false);
  }, []);

  // Warn before leaving page during focus
  useEffect(() => {
    if (!isActive || !settings.enabled) return;

    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = 'You are in Focus Mode. Are you sure you want to leave?';
      return e.returnValue;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isActive, settings.enabled]);

  const activateShield = useCallback(() => {
    if (!settings.enabled) return;
    setIsActive(true);
    setViolations(0);
    setSessionViolations([]);
    setShowShield(false);
    lastHiddenAt.current = null;
    initAudio();
    acquireWakeLock();
  }, [settings.enabled, initAudio, acquireWakeLock]);

  const deactivateShield = useCallback(() => {
    setIsActive(false);
    setShowShield(false);
    lastHiddenAt.current = null;
    stopAlarm();
    releaseWakeLock();
    // Exit fullscreen if we entered it
    if (document.fullscreenElement) {
      try { document.exitFullscreen?.(); } catch {}
    }
  }, [stopAlarm, releaseWakeLock]);

  const syncWithBackend = useCallback(async (enabled, apps, sites) => {
    // Backend blocker API only exists on localhost dev server (Vite plugin).
    // Skip on deployed environments (Vercel, etc.) to avoid 404 noise.
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (!isLocal) return;
    try {
      await fetch('/api/blocker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled, blockedApps: apps, blockedSites: sites }),
      });
    } catch (e) {
      console.error('[FocusShield] Error syncing with backend:', e);
    }
  }, []);

  // Sync state to local dev server when focus shield is enabled/disabled or settings change
  useEffect(() => {
    syncWithBackend(settings.enabled, settings.blockedApps || [], settings.blockedSites || []);
  }, [settings.enabled, settings.blockedApps, settings.blockedSites, syncWithBackend]);

  const dismissShield = useCallback(() => {
    setShowShield(false);
    stopAlarm();
  }, [stopAlarm]);

  // Sync wake lock when tab returns to visibility
  useEffect(() => {
    const handleVisibilityCheck = () => {
      if (isActive && !document.hidden) {
        acquireWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityCheck);
    return () => document.removeEventListener('visibilitychange', handleVisibilityCheck);
  }, [isActive, acquireWakeLock]);

  // Handle playing and stopping alarm
  useEffect(() => {
    if (isActive && showShield) {
      startAlarm();
    } else {
      stopAlarm();
    }
  }, [isActive, showShield, startAlarm, stopAlarm]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAlarm();
      releaseWakeLock();
    };
  }, [stopAlarm, releaseWakeLock]);

  const updateSettings = useCallback((updates) => {
    setSettings(prev => ({ ...prev, ...updates }));
  }, []);

  const addBlockedSite = useCallback((site) => {
    const cleaned = site.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '').toLowerCase().trim();
    if (!cleaned) return;
    setSettings(prev => ({
      ...prev,
      blockedSites: prev.blockedSites.includes(cleaned) ? prev.blockedSites : [...prev.blockedSites, cleaned],
    }));
    toast.success(`Blocked: ${cleaned}`);
  }, []);

  const removeBlockedSite = useCallback((site) => {
    setSettings(prev => ({
      ...prev,
      blockedSites: prev.blockedSites.filter(s => s !== site),
    }));
  }, []);

  const addBlockedApp = useCallback((app) => {
    const cleaned = app.replace(/\.exe$/i, '').trim();
    if (!cleaned) return;
    setSettings(prev => ({
      ...prev,
      blockedApps: prev.blockedApps.some(a => a.toLowerCase() === cleaned.toLowerCase())
        ? prev.blockedApps
        : [...prev.blockedApps, cleaned],
    }));
    toast.success(`Blocked application: ${cleaned}`);
  }, []);

  const removeBlockedApp = useCallback((app) => {
    setSettings(prev => ({
      ...prev,
      blockedApps: prev.blockedApps.filter(a => a.toLowerCase() !== app.toLowerCase()),
    }));
    toast.success(`Unblocked application: ${app}`);
  }, []);

  const value = {
    settings,
    isActive,
    showShield,
    showFullscreenPrompt,
    reEnterFullscreen,
    violations,
    sessionViolations,
    activateShield,
    deactivateShield,
    dismissShield,
    updateSettings,
    addBlockedSite,
    removeBlockedSite,
    addBlockedApp,
    removeBlockedApp,
  };

  return <FocusShieldCtx.Provider value={value}>{children}</FocusShieldCtx.Provider>;
}

export const useFocusShield = () => {
  const ctx = useContext(FocusShieldCtx);
  if (!ctx) throw new Error('useFocusShield must be inside FocusShieldProvider');
  return ctx;
};
