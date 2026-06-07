// ═══════════════════════════════════════════
// AXINITE OS · TOUCH HAPTICS & SOUND ENGINE
// ═══════════════════════════════════════════

let audioCtx = null;

// Lazy-initialization of AudioContext to satisfy browser autoplay policies
const getAudioContext = () => {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
};

// Retrieve user preferences from localStorage
export const getHapticSettings = () => {
  try {
    const saved = localStorage.getItem('los_haptics_prefs');
    return saved ? JSON.parse(saved) : { enabled: true, vibrate: true, sound: true };
  } catch (e) {
    return { enabled: true, vibrate: true, sound: true };
  }
};

// Save user preferences
export const saveHapticSettings = (settings) => {
  try {
    localStorage.setItem('los_haptics_prefs', JSON.stringify(settings));
    window.dispatchEvent(new Event('los_haptics_settings_changed'));
  } catch (e) {}
};

// Trigger Web Audio API-based sound tick
export const playAudioHaptic = (type = 'light') => {
  const prefs = getHapticSettings();
  if (!prefs.enabled || !prefs.sound) return;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    const now = ctx.currentTime;

    switch (type) {
      case 'light':
        // Crisp high-frequency tap (like native keyboard)
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1400, now);
        gainNode.gain.setValueAtTime(0.03, now); // Quiet, subtle
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.008);
        osc.start(now);
        osc.stop(now + 0.01);
        break;

      case 'medium':
        // Solid mechanical click
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1000, now);
        gainNode.gain.setValueAtTime(0.05, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.012);
        osc.start(now);
        osc.stop(now + 0.015);
        break;

      case 'heavy':
        // Thicker button press
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(700, now);
        osc.frequency.exponentialRampToValueAtTime(350, now + 0.018);
        gainNode.gain.setValueAtTime(0.07, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.018);
        osc.start(now);
        osc.stop(now + 0.02);
        break;

      case 'success':
        // Elegant ascending double chime
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now); // A5
        osc.frequency.setValueAtTime(1318.51, now + 0.065); // E6
        gainNode.gain.setValueAtTime(0.04, now);
        gainNode.gain.setValueAtTime(0.05, now + 0.065);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
        osc.start(now);
        osc.stop(now + 0.18);
        break;

      case 'warning':
        // Soft cautionary beep
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        gainNode.gain.setValueAtTime(0.06, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.14);
        break;

      case 'error':
        // Low cautionary double alarm
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(180, now);
        gainNode.gain.setValueAtTime(0.08, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.1);

        setTimeout(() => {
          try {
            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.connect(gain2);
            gain2.connect(ctx.destination);
            const now2 = ctx.currentTime;
            osc2.type = 'triangle';
            osc2.frequency.setValueAtTime(140, now2);
            gain2.gain.setValueAtTime(0.08, now2);
            gain2.gain.exponentialRampToValueAtTime(0.001, now2 + 0.1);
            osc2.start(now2);
            osc2.stop(now2 + 0.12);
          } catch (e) {}
        }, 110);
        break;

      default:
        break;
    }
  } catch (e) {
    console.warn('Audio haptic failure:', e);
  }
};

// Trigger Navigator Vibration API
export const vibrateHaptic = (type = 'light') => {
  const prefs = getHapticSettings();
  if (!prefs.enabled || !prefs.vibrate) return;

  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      switch (type) {
        case 'light':
          navigator.vibrate(10);
          break;
        case 'medium':
          navigator.vibrate(18);
          break;
        case 'heavy':
          navigator.vibrate(28);
          break;
        case 'success':
          navigator.vibrate([12, 40, 15]);
          break;
        case 'warning':
          navigator.vibrate([30, 40, 30]);
          break;
        case 'error':
          navigator.vibrate([40, 50, 40, 50, 60]);
          break;
        default:
          navigator.vibrate(type); // Allow raw millisecond input
          break;
      }
    } catch (e) {}
  }
};

// Main trigger function combining both physical and audio feedback
export const triggerHaptic = (type = 'light') => {
  vibrateHaptic(type);
  playAudioHaptic(type);
};

// Global interceptor for standard touch screens
export const initGlobalHaptics = () => {
  if (typeof window === 'undefined') return;

  // Track active elements to avoid double triggering
  let activeTouchElement = null;
  let activeTouchTimeout = null;

  // Clean active state helper
  const clearActiveTouchState = () => {
    if (activeTouchElement) {
      activeTouchElement.classList.remove('touch-active');
      activeTouchElement = null;
    }
    if (activeTouchTimeout) {
      clearTimeout(activeTouchTimeout);
      activeTouchTimeout = null;
    }
  };

  // 1. Listen for touch start to capture intent instantly (zero delay)
  window.addEventListener('touchstart', (e) => {
    const prefs = getHapticSettings();
    if (!prefs.enabled) return;

    // Trigger AudioContext resume on user gesture
    getAudioContext();

    const target = e.target;
    if (!target) return;

    // Resolve closest interactive element up the DOM tree
    const interactiveEl = target.closest(
      'button, a, input, select, textarea, [role="button"], [onClick], .clickable, .alarm-card-hover, .orbit-item, .nav-item, [onclick]'
    );

    if (interactiveEl) {
      // Prevent double trigger on multi-touch or fast taps
      const now = Date.now();
      if (interactiveEl._lastHapticTime && now - interactiveEl._lastHapticTime < 150) {
        return;
      }
      interactiveEl._lastHapticTime = now;

      // Extract custom intensity from data attribute or determine by element type
      let intensity = interactiveEl.getAttribute('data-haptic') || 'light';
      
      // Auto-assign appropriate haptic intensity based on standard element semantics
      if (!interactiveEl.getAttribute('data-haptic')) {
        const textContent = interactiveEl.textContent?.toLowerCase() || '';
        const cl = interactiveEl.className?.toLowerCase() || '';
        
        if (
          cl.includes('danger') || 
          cl.includes('delete') || 
          textContent.includes('delete') || 
          textContent.includes('remove') || 
          textContent.includes('erase')
        ) {
          intensity = 'warning';
        } else if (
          cl.includes('primary') || 
          cl.includes('submit') || 
          cl.includes('save') || 
          textContent.includes('save') || 
          textContent.includes('construct') || 
          textContent.includes('confirm')
        ) {
          intensity = 'medium';
        }
      }

      // Trigger feedback
      triggerHaptic(intensity);

      // Apply tactile visual response class (touch-active)
      clearActiveTouchState();
      activeTouchElement = interactiveEl;
      interactiveEl.classList.add('touch-active');
      
      // Visual safety timeout
      activeTouchTimeout = setTimeout(clearActiveTouchState, 300);
    }
  }, { passive: true });

  // 2. Clear visual tap highlight immediately on scroll or touch release
  window.addEventListener('touchend', () => {
    // Delay slightly to allow the scale effect to feel tangible
    setTimeout(clearActiveTouchState, 80);
  }, { passive: true });

  window.addEventListener('touchmove', clearActiveTouchState, { passive: true });
  window.addEventListener('touchcancel', clearActiveTouchState, { passive: true });

  // 3. Fallback for non-touch (desktop mouse) click haptics (sound only)
  window.addEventListener('click', (e) => {
    const prefs = getHapticSettings();
    if (!prefs.enabled || !prefs.sound) return;

    // Skip if this event was initiated by a touch (already handled)
    const now = Date.now();
    const target = e.target;
    const interactiveEl = target?.closest(
      'button, a, input, select, textarea, [role="button"], [onClick], .clickable, .alarm-card-hover, .orbit-item, .nav-item, [onclick]'
    );
    
    if (interactiveEl && interactiveEl._lastHapticTime && now - interactiveEl._lastHapticTime < 250) {
      return;
    }

    if (interactiveEl) {
      // Play a very subtle audio-click for mouse users too
      const intensity = interactiveEl.getAttribute('data-haptic') || 'light';
      playAudioHaptic(intensity);
    }
  }, { passive: true });
};
