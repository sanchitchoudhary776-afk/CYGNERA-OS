import { createContext,useContext,useReducer,useEffect,useMemo,useCallback,useRef,useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { genId,calcBurnout,ALL_ACHIEVEMENTS,isToday } from '@utils';
import { db, supabase } from '@services/supabase';
import { notesCloud } from '@services/notesCloud';
import { useAuth } from './AuthContext';

const Ctx = createContext(null);
const TimerCtx = createContext(null);

// ── SoundScape Synthesizer Alarm Generator ────────────────────────────
// Creates a repeating, pleasant chime using Web Audio API
let currentAlarmSource = null;
let currentAlarmCtx = null;
let alarmLoopTimer = null;

function playChime(ctx, startTime) {
  // Create a pleasant two-tone chime
  const gain = ctx.createGain();
  gain.connect(ctx.destination);

  // Tone 1: C5 (pleasant bell)
  const osc1 = ctx.createOscillator();
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(523.25, startTime);
  osc1.connect(gain);

  // Tone 2: E5 (major third — warm, friendly)
  const osc2 = ctx.createOscillator();
  osc2.type = 'triangle';
  osc2.frequency.setValueAtTime(659.25, startTime);
  osc2.connect(gain);

  // Tone 3: G5 (completes the chord — bright, uplifting)
  const osc3 = ctx.createOscillator();
  osc3.type = 'sine';
  osc3.frequency.setValueAtTime(783.99, startTime);
  osc3.connect(gain);

  // Envelope: quick attack, gentle decay
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(0.4, startTime + 0.05);
  gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.6);

  osc1.start(startTime);
  osc2.start(startTime + 0.05);
  osc3.start(startTime + 0.1);
  osc1.stop(startTime + 0.7);
  osc2.stop(startTime + 0.7);
  osc3.stop(startTime + 0.7);
}

export function playAlarmSound() {
  stopAlarmSound();
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    currentAlarmCtx = ctx;

    // If AudioContext is suspended (autoplay policy), resume it
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    // Play initial burst: 3 chimes
    let t = ctx.currentTime;
    playChime(ctx, t);
    playChime(ctx, t + 0.8);
    playChime(ctx, t + 1.6);

    // Repeat every 3 seconds (persistent ringing until dismissed)
    alarmLoopTimer = setInterval(() => {
      if (!currentAlarmCtx || currentAlarmCtx.state === 'closed') {
        clearInterval(alarmLoopTimer);
        return;
      }
      const now = currentAlarmCtx.currentTime;
      playChime(currentAlarmCtx, now);
      playChime(currentAlarmCtx, now + 0.8);
      playChime(currentAlarmCtx, now + 1.6);
    }, 3000);

    currentAlarmSource = { stop: () => {} }; // Dummy — cleanup done in stopAlarmSound
  } catch (e) {
    console.error('[Alarm Sound] Failed to play:', e);
  }
}

export function stopAlarmSound() {
  if (alarmLoopTimer) {
    clearInterval(alarmLoopTimer);
    alarmLoopTimer = null;
  }
  if (currentAlarmSource) {
    try { currentAlarmSource.stop(); } catch (e) {}
    currentAlarmSource = null;
  }
  if (currentAlarmCtx) {
    try { currentAlarmCtx.close(); } catch (e) {}
    currentAlarmCtx = null;
  }
}

// ── Native OS Notification Helper ─────────────────────────────────
// Fires a real OS notification that appears even when the tab is in background
// or the user is in another application
export function fireNativeNotification(title, body) {
  try {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      const n = new Notification(`⏰ ${title}`, {
        body,
        icon: '/favicon.svg',
        badge: '/favicon.svg',
        requireInteraction: true, // Stays until user clicks it
        tag: `axinite-alarm-${Date.now()}`,
        silent: false // Allow OS notification sound
      });
      // When user clicks the notification, focus the app
      n.onclick = () => {
        window.focus();
        n.close();
      };
    } else if (Notification.permission === 'default') {
      // Try to request permission and show if granted
      Notification.requestPermission().then(perm => {
        if (perm === 'granted') {
          fireNativeNotification(title, body);
        }
      });
    }
  } catch (e) {
    console.warn('[Native Notification] Failed:', e);
  }
}

// ── Service Worker Sync Helper ────────────────────────────────────
// Sends alarm + schedule data to the background service worker so it can
// fire notifications even when the tab is not active
export function syncAlarmsToServiceWorker(alarms, schedule) {
  try {
    const data = { alarms: alarms || [], schedule: schedule || [] };
    
    // Store in CacheStorage (accessible to both window and SW, survives SW lifecycle kills)
    if ('caches' in window) {
      caches.open('axinite-alarm-store').then(store => {
        store.put('/alarm-data.json', new Response(JSON.stringify(data)));
      });
    }

    if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) return;
    navigator.serviceWorker.controller.postMessage({
      type: 'SYNC_ALARM_DATA',
      payload: data
    });
  } catch (e) {
    console.error('[Sync SW] Error:', e);
  }
}

// Keep service worker alive with periodic pings
let swKeepaliveTimer = null;
export function startSWKeepalive() {
  if (swKeepaliveTimer) clearInterval(swKeepaliveTimer);
  swKeepaliveTimer = setInterval(() => {
    try {
      if (navigator.serviceWorker?.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'KEEPALIVE' });
      }
    } catch (e) {}
  }, 20000); // Ping every 20s
}

// ── Clean Slate Defaults (Production) ────────────────────────────────
const NOTES0 = [];
const TASKS0 = [];
const CHECKINS0 = [];
const PATHS0 = [];
const SCHEDULE0 = [];
const VIDEOS0 = [];
const ACHIEVEMENTS0 = [];

const PROGRESS0 = {
  subjects:{},
  weeklyHours:[0,0,0,0,0,0,0],
  streak:0,bestStreak:0,totalHours:0,tasksCompleted:0,focusSessions:0,thisWeekHours:0,
};

// ── Reducer ──────────────────────────────────
function reducer(state, { type, payload }) {
  switch (type) {
    case 'NOTE_ADD':    return { ...state, notes:    [payload, ...state.notes] };
    case 'NOTE_UPDATE': return { ...state, notes:    state.notes.map(n=>n.id===payload.id?{...n,...payload}:n) };
    case 'NOTE_DELETE': return { ...state, notes:    state.notes.filter(n=>n.id!==payload) };
    case 'TASK_ADD':    return { ...state, tasks:    [payload, ...state.tasks] };
    case 'TASK_UPDATE': return { ...state, tasks:    state.tasks.map(t=>t.id===payload.id?{...t,...payload}:t) };
    case 'TASK_DONE':   return { ...state, tasks:    state.tasks.map(t=>t.id===payload?{...t,status:'completed',completedAt:new Date().toISOString()}:t), progress:{...state.progress,tasksCompleted:state.progress.tasksCompleted+1} };
    case 'TASK_DELETE': return { ...state, tasks:    state.tasks.filter(t=>t.id!==payload) };
    case 'CI_ADD':      return { ...state, checkIns: [payload, ...state.checkIns] };
    case 'PATH_ADD':    return { ...state, paths:    [payload, ...state.paths] };
    case 'PATH_UPDATE': return { ...state, paths:    state.paths.map(p=>p.id===payload.id?{...p,...payload}:p) };
    case 'PATH_DELETE': return { ...state, paths:    state.paths.filter(p=>p.id!==payload) };
    case 'SCHED_ADD':   return { ...state, schedule: [payload, ...state.schedule] };
    case 'SCHED_UPDATE':return { ...state, schedule: state.schedule.map(s=>s.id===payload.id?{...s,...payload}:s) };
    case 'SCHED_DEL':   return { ...state, schedule: state.schedule.filter(s=>s.id!==payload) };
    case 'VID_ADD':     return { ...state, videos:   [payload, ...state.videos] };
    case 'VID_UPDATE':  return { ...state, videos:   state.videos.map(v=>v.id===payload.id?{...v,...payload}:v) };
    case 'VID_DELETE':  return { ...state, videos:   state.videos.filter(v=>v.id!==payload) };
    case 'ACH_UNLOCK':  return state.achievements.find(a=>a.id===payload.id)?state:{...state,achievements:[...state.achievements,payload]};
    case 'PROGRESS':    return { ...state, progress: { ...state.progress, ...payload } };
    
    // Alarms reducer cases
    case 'ALARM_ADD':    return { ...state, alarms: [payload, ...state.alarms] };
    case 'ALARM_UPDATE': return { ...state, alarms: state.alarms.map(a=>a.id===payload.id?{...a,...payload}:a) };
    case 'ALARM_DEL':    return { ...state, alarms: state.alarms.filter(a=>a.id!==payload) };
    case 'TRIGGER_ALARM':return { ...state, activeAlarm: payload };
    case 'DISMISS_ALARM':
      let updatedAlarms = state.alarms || [];
      if (state.activeAlarm?.alarmId && state.activeAlarm?.isOneOff) {
        updatedAlarms = (state.alarms || []).map(a => a.id === state.activeAlarm.alarmId ? { ...a, enabled: false } : a);
      }
      return { ...state, activeAlarm: null, alarms: updatedAlarms };
    case 'SNOOZE_ALARM':
      const snoozeTime = new Date(Date.now() + 5 * 60 * 1000);
      const snoozeTimeString = snoozeTime.getHours().toString().padStart(2, '0') + ':' + snoozeTime.getMinutes().toString().padStart(2, '0');
      const snoozedAlarm = {
        id: 'snooze_' + Date.now(),
        time: snoozeTimeString,
        label: `Snooze: ${state.activeAlarm?.title || 'Study Alarm'}`,
        enabled: true,
        repeat: [], // one-off
      };
      let snoozedAlarms = state.alarms || [];
      if (state.activeAlarm?.alarmId && state.activeAlarm?.isOneOff) {
        snoozedAlarms = (state.alarms || []).map(a => a.id === state.activeAlarm.alarmId ? { ...a, enabled: false } : a);
      }
      return { ...state, activeAlarm: null, alarms: [snoozedAlarm, ...snoozedAlarms] };

    case 'TIMER_TICK':
      const now = Date.now();
      const diff = Math.max(0, Math.round((state.timer.endTime - now) / 1000));
      if (diff <= 0) {
        return { ...state, timer: { ...state.timer, isRunning: false, remain: 0 } };
      }
      return { ...state, timer: { ...state.timer, remain: diff } };
    case 'TIMER_START':  
      const targetTime = Date.now() + (state.timer.remain * 1000);
      return { ...state, timer: { ...state.timer, isRunning: true, endTime: targetTime } };
    case 'TIMER_PAUSE':  return { ...state, timer: { ...state.timer, isRunning: false } };
    case 'TIMER_RESET':  
      const r = payload || (state.timer.duration * 60);
      return { ...state, timer: { ...state.timer, isRunning: false, remain: r, endTime: 0 } };
    case 'TIMER_SET_DUR':return { ...state, timer: { ...state.timer, duration: payload, remain: payload * 60, endTime: 0 } };
    case 'TIMER_SET_SUB':return { ...state, timer: { ...state.timer, subject: payload } };
    case 'TIMER_DONE':  return { ...state, timer: { ...state.timer, isRunning: false, remain: state.timer.duration * 60, endTime: 0 }, progress: { ...state.progress, focusSessions:state.progress.focusSessions+1, totalHours:round1(state.progress.totalHours+(payload/60)) } };
    case 'SYNC_CLOUD':  return { ...state, ...payload, timer: payload.timer || state.timer };
    default: return state;
  }
}
const round1 = n => Math.round(n*10)/10;

const DEFAULT_TIMER = { remain: 1500, isRunning: false, duration: 25, subject: 'Web Dev', endTime: 0 };

// ── Versioned Local Storage ─────────────────
const STORAGE_KEY = 'los_v5';
const STORAGE_META_KEY = 'los_v5_meta';
const DATA_VERSION = 5; // Bump this to invalidate all cached + cloud data

function loadState() {
  try { 
    const s = localStorage.getItem(STORAGE_KEY); 
    if (!s) return null;
    const data = JSON.parse(s);
    // Ensure new properties exist for backwards compatibility
    if (!data.timer) data.timer = DEFAULT_TIMER;
    if (!data.achievements) data.achievements = [];
    if (!data.videos) data.videos = [];
    if (!data.paths) data.paths = [];
    if (!data.checkIns) data.checkIns = [];
    if (!data.schedule) data.schedule = [];
    if (!data.alarms) data.alarms = [];
    if (!data.activeAlarm) data.activeAlarm = null;
    if (!data.progress) data.progress = PROGRESS0;
    return data;
  } catch(e) { 
    console.error('[Storage] Failed to load local state:', e);
    return null; 
  }
}

function saveLocal(state) {
  try {
    // Strip transient data to reduce storage size
    const toSave = { ...state, _dataVersion: DATA_VERSION };
    // Reset timer running state (not meaningful across sessions)
    if (toSave.timer?.isRunning) {
      toSave.timer = { ...toSave.timer, isRunning: false, endTime: 0, remain: (toSave.timer.duration || 25) * 60 };
    }
    const serialized = JSON.stringify(toSave);
    localStorage.setItem(STORAGE_KEY, serialized);
    localStorage.setItem(STORAGE_META_KEY, JSON.stringify({ 
      savedAt: Date.now(), 
      size: serialized.length 
    }));
  } catch(e) {
    console.error('[Storage] Failed to save local state:', e);
  }
}

function smartMerge(localState, cloudData) {
  if (!cloudData) return localState;
  if (!localState) return cloudData;
  
  const merged = { ...cloudData };
  
  // Always keep local timer (it's tab-specific)
  merged.timer = localState.timer || DEFAULT_TIMER;
  
  // ── Local-First Smart Merge Strategy ──────────────────────────────
  // Local storage holds COMPLETE uncompressed history.
  // Cloud holds only the last 15 days of active items + archiveDigest.
  // We combine both sets and resolve duplicate IDs by choosing the one with the latest timestamp.
  const collections = ['notes', 'tasks', 'checkIns', 'paths', 'schedule', 'videos', 'achievements', 'alarms'];
  collections.forEach(key => {
    const local = localState[key] || [];
    const cloud = cloudData[key] || [];

    const mergedMap = new Map();
    
    // Add local items
    local.forEach(item => {
      if (item && item.id) {
        mergedMap.set(item.id, item);
      }
    });

    // Merge cloud items (latest timestamp wins for duplicates)
    cloud.forEach(item => {
      if (item && item.id) {
        const existing = mergedMap.get(item.id);
        if (!existing) {
          mergedMap.set(item.id, item);
        } else {
          const localTime = new Date(existing.updatedAt || existing.completedAt || existing.date || existing.earnedAt || 0).getTime();
          const cloudTime = new Date(item.updatedAt || item.completedAt || item.date || item.earnedAt || 0).getTime();
          if (cloudTime > localTime) {
            // Keep existing localized fields if present (e.g. offline edits)
            mergedMap.set(item.id, { ...existing, ...item });
          }
        }
      }
    });

    let chosen = Array.from(mergedMap.values());

    // Surgical achievements recovery on new device: rebuild rich metadata from local manifest
    if (key === 'achievements' && chosen.length > 0) {
      chosen = chosen.map(ca => {
        const la = local.find(x => x.id === ca.id);
        return la ? { ...la, ...ca } : ca;
      });
    }

    // Surgical check-ins on new device: ensure AI coaching text is present
    if (key === 'checkIns' && chosen.length > 0) {
      chosen = chosen.map(cc => {
        const lc = local.find(x => x.id === cc.id);
        return {
          ...cc,
          aiCoaching: cc.aiCoaching || lc?.aiCoaching || '',
          aiStrategy: cc.aiStrategy || lc?.aiStrategy || ''
        };
      });
    }

    merged[key] = chosen;
  });

  // Merge archiveDigest (monthly summaries of old data — cloud may have digests local doesn't)
  if (cloudData.archiveDigest) {
    merged.archiveDigest = {
      ...(localState.archiveDigest || {}),
      ...cloudData.archiveDigest
    };
  }

  // Progress: pick whichever has more total hours
  if (localState.progress?.totalHours > (cloudData.progress?.totalHours || 0)) {
    merged.progress = localState.progress;
  }

  return merged;
}

const INIT = loadState() || {
  _dataVersion: DATA_VERSION,
  user: { name: 'Student', email: 'student@axinite.os', goal: 'Master the curriculum' },
  notes:NOTES0, tasks:TASKS0, checkIns:CHECKINS0, paths:PATHS0,
  schedule:SCHEDULE0, videos:VIDEOS0, progress:PROGRESS0, achievements:ACHIEVEMENTS0,
  timer: DEFAULT_TIMER,
  alarms: [],
  activeAlarm: null,
};

// ── Provider ────────────────────────────────
export function AppProvider({ children }) {
  const { user, isAuth } = useAuth();
  const [state, dispatch] = useReducer(reducer, INIT);
  const [syncStatus, setSyncStatus] = useState('idle'); // 'idle', 'syncing', 'synced', 'error', 'offline'
  const isInitialMount = useRef(true);
  const syncTimeoutRef = useRef(null);
  const lastSyncedHash = useRef('');
  const pendingSync = useRef(false);

  // Background Timer Engine (Resilient to Browser Throttling)
  useEffect(() => {
    let timer;
    if (state.timer.isRunning && state.timer.remain > 0) {
      timer = setInterval(() => {
        dispatch({ type: 'TIMER_TICK' });
      }, 1000);
    }

    // Force recalculation when user returns to tab
    const handleFocus = () => {
      if (state.timer.isRunning) dispatch({ type: 'TIMER_TICK' });
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', handleFocus);
    };
  }, [state.timer.isRunning, state.timer.endTime]);

  // Multi-Tab Sync: Listen for storage changes
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);

  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const newData = JSON.parse(e.newValue);
          // Simple equality check to prevent infinite loops
          if (JSON.stringify(newData) === JSON.stringify(stateRef.current)) return;
          dispatch({ type: 'SYNC_CLOUD', payload: newData });
        } catch (err) {
          console.error('[Sync] Failed to parse storage update', err);
        }
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // ── Cloud Pull on Login ───────────────────
  useEffect(() => {
    if (isAuth && user?.id) {
      setSyncStatus('syncing');
      
      // 1. Fetch monolithic data (tasks, schedule, etc.)
      const p1 = db.getUserData(user.id);
      // 2. Fetch surgical notes data
      const p2 = notesCloud.fetchNotes(user.id);

      Promise.all([p1, p2]).then(([cloudData, cloudNotes]) => {
        let merged = stateRef.current;
        const cloudVersion = cloudData?._dataVersion || 0;
        
        if (cloudData && cloudVersion >= DATA_VERSION) {
          merged = smartMerge(merged, cloudData);
          
          if (cloudNotes) {
            // Merge local and cloud notes, preserving local edits if more recent
            const mergedNotesMap = new Map();
            const localNotes = stateRef.current.notes || [];
            const noteFlashcards = cloudData?.noteFlashcards || {};

            localNotes.forEach(ln => {
              if (ln && ln.id) mergedNotesMap.set(ln.id, ln);
            });

            cloudNotes.forEach(cn => {
              if (cn && cn.id) {
                const existing = mergedNotesMap.get(cn.id);
                const localTime = new Date(existing?.updatedAt || 0).getTime();
                const cloudTime = new Date(cn.updatedAt || 0).getTime();
                
                if (!existing || cloudTime > localTime) {
                  mergedNotesMap.set(cn.id, {
                    ...cn,
                    flashcards: existing?.flashcards?.length ? existing.flashcards : (noteFlashcards[cn.id] || cn.flashcards || [])
                  });
                }
              }
            });

            merged = { 
              ...merged, 
              notes: Array.from(mergedNotesMap.values())
            };
          }
          
          dispatch({ type: 'SYNC_CLOUD', payload: merged });
          saveLocal(merged);
          setSyncStatus('synced');
        } else if (cloudData || cloudNotes?.length > 0) {
          console.log('[Sync] Discarding stale cloud data (v' + cloudVersion + ' < v' + DATA_VERSION + ')');
          
          // Force save the clean empty state (v5) to the cloud to overwrite the stale record
          setSyncStatus('syncing');
          
          const clearPromises = [
            db.saveUserData(user.id, merged),
            supabase ? supabase.from('notes').delete().eq('user_id', user.id) : Promise.resolve()
          ];
          
          Promise.all(clearPromises).then(() => {
            dispatch({ type: 'SYNC_CLOUD', payload: merged });
            saveLocal(merged);
            setSyncStatus('synced');
            console.log('[Sync] ✓ Database wiped and initialized to v' + DATA_VERSION);
          }).catch(err => {
            console.error('[Sync] Clear failed:', err);
            setSyncStatus('error');
          });
        } else {
          // No cloud data at all (brand new user signup)
          dispatch({ type: 'SYNC_CLOUD', payload: merged });
          saveLocal(merged);
          setSyncStatus('synced');
        }
      }).catch(err => {
        console.error('[Sync] Pull failed:', err);
        setSyncStatus('error');
      });
    }
  }, [isAuth, user?.id]);

  // ── Smart Sync Engine ────────────────────
  // Generates a hash of meaningful data (excludes timer ticks)
  const getStateHash = useCallback((s) => {
    const meaningful = {
      // Include notes in the hash so local storage is updated upon note modifications
      notes: s.notes?.map(n => `${n.id}-${n.updatedAt}`).join(','),
      tasks: s.tasks?.map(t => t.id + t.status).join(','),
      checkIns: s.checkIns?.length,
      paths: s.paths?.length,
      schedule: s.schedule?.length,
      videos: s.videos?.map(v => `${v.id}-${v.playlist || ''}-${v.watched}-${v.notes?.length || 0}`).join(','),
      achievements: s.achievements?.length,
      progress: JSON.stringify(s.progress),
    };
    return JSON.stringify(meaningful);
  }, []);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      lastSyncedHash.current = getStateHash(state);
      return;
    }
    
    // 1. Only save/sync if meaningful data changed (NOT timer ticks)
    const currentHash = getStateHash(state);
    if (currentHash === lastSyncedHash.current) return;
    lastSyncedHash.current = currentHash;

    // 2. Save to localStorage only on meaningful changes
    saveLocal(state);

    // 3. Debounced cloud push (5s after last meaningful change)
    if (isAuth && user?.id) {
      pendingSync.current = true;
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);

      syncTimeoutRef.current = setTimeout(() => {
        setSyncStatus('syncing');
        db.saveUserData(user.id, stateRef.current).then(ok => {
          setSyncStatus(ok ? 'synced' : 'error');
          pendingSync.current = !ok;
        });
      }, 5000);

      return () => clearTimeout(syncTimeoutRef.current);
    }
  }, [state, isAuth, user?.id, getStateHash]);

  // ── Flush pending sync on page unload ────
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Save to localStorage one final time
      saveLocal(stateRef.current);
      
      // If there's a pending cloud sync, try to flush it
      if (pendingSync.current && isAuth && user?.id) {
        // Read auth token from localStorage (avoiding async await inside unload)
        const rawSession = localStorage.getItem('sb-cihpvkrvepsctepxwmox-auth-token');
        let token = import.meta.env.VITE_SUPABASE_ANON_KEY;
        if (rawSession) {
          try {
            const session = JSON.parse(rawSession);
            if (session?.access_token) {
              token = session.access_token;
            }
          } catch (e) {}
        }

        const cleanData = { ...stateRef.current };
        delete cleanData.notes; // Notes are saved surgically
        if (cleanData.timer) {
          cleanData.timer = { 
            ...cleanData.timer, 
            isRunning: false, 
            endTime: 0,
            remain: (cleanData.timer.duration || 25) * 60 
          };
        }

        const payload = JSON.stringify({
          user_id: user.id,
          data: cleanData,
          updated_at: new Date().toISOString()
        });

        // Use standard fetch with keepalive: true to securely sync even as the browser tab closes
        fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/user_data`, {
          method: 'POST',
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates'
          },
          body: payload,
          keepalive: true
        }).catch(err => {
          console.error('[Sync] Keepalive unload sync failed:', err);
        });
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isAuth, user?.id]);

  // ── Auto-retry on reconnect ──────────────
  useEffect(() => {
    const handleOnline = () => {
      console.log('[Sync] Back online — triggering cloud sync');
      setSyncStatus('syncing');
      if (isAuth && user?.id) {
        db.saveUserData(user.id, stateRef.current).then(ok => {
          setSyncStatus(ok ? 'synced' : 'error');
        });
      }
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [isAuth, user?.id]);

  // Auto-unlock achievements
  useEffect(() => {
    const s = {
      notes:   state.notes.length,
      aiNotes: state.notes.filter(n=>n.aiEnhanced).length,
      tasks:   state.tasks.filter(t=>t.status==='completed').length,
      streak:  state.progress.streak,
      sessions:state.progress.focusSessions,
      hours:   state.progress.totalHours,
      paths:   state.paths.length,
      done:    state.paths.filter(p=>p.status==='completed').length,
    };
    ALL_ACHIEVEMENTS.forEach(a => {
      if (!state.achievements.find(e=>e.id===a.id) && a.req(s)) {
        dispatch({ type:'ACH_UNLOCK', payload:{ id:a.id,title:a.title,desc:a.desc,icon:a.icon,color:a.color,cat:a.cat,earnedAt:new Date().toISOString() } });
      }
    });
  }, [state.notes.length, state.tasks.length, state.progress.streak, state.progress.focusSessions]);

  // ── Session Auto-Trigger & Alarms & Reminders Engine ───────────────────
  const lastTriggered = useRef(null);
  const triggeredSet = useRef(new Set()); // Track ALL triggered IDs per minute
  const navigate = useNavigate();

  // Listen for Service Worker messages (alarms triggered while tab was in background)
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const handleSWMessage = (event) => {
      const { type, payload } = event.data || {};
      if (type === 'ALARM_TRIGGERED') {
        // SW fired a notification while we were in background — also show in-app overlay
        playAlarmSound();
        dispatch({
          type: 'TRIGGER_ALARM',
          payload: {
            title: payload.title,
            desc: payload.desc,
            alarmId: payload.alarmId,
            isOneOff: payload.tag === 'reminder'
          }
        });
      }
      if (type === 'DISMISS_ALARM') {
        stopAlarmSound();
        dispatch({ type: 'DISMISS_ALARM' });
      }
      if (type === 'SNOOZE_ALARM') {
        stopAlarmSound();
        dispatch({ type: 'SNOOZE_ALARM' });
      }
    };

    navigator.serviceWorker.addEventListener('message', handleSWMessage);
    return () => navigator.serviceWorker.removeEventListener('message', handleSWMessage);
  }, []);

  // Start service worker keepalive
  useEffect(() => {
    startSWKeepalive();
    return () => {};
  }, []);

  // Sync alarm data to service worker whenever alarms or schedule change
  useEffect(() => {
    syncAlarmsToServiceWorker(state.alarms, state.schedule);
  }, [state.alarms, state.schedule]);

  useEffect(() => {
    const checkScheduleAndAlarms = () => {
      const now = new Date();
      const today = now.toISOString().slice(0, 10);
      const currentTime = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
      const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const minuteKey = `${today}_${currentTime}`;

      // Reset triggered set each new minute
      if (triggeredSet.current._minuteKey !== minuteKey) {
        triggeredSet.current = new Set();
        triggeredSet.current._minuteKey = minuteKey;
      }

      // 1. Session Exact Start Auto-Trigger (Focus redirection)
      const session = state.schedule.find(s => s.day === today && s.startTime === currentTime);
      if (session && !triggeredSet.current.has(session.id)) {
        triggeredSet.current.add(session.id);
        lastTriggered.current = session.id;
        
        fireNativeNotification(
          `Time for ${session.subject}!`,
          `Your ${session.subject} session is starting now. Let's go! 🚀`
        );
        toast(`Time for ${session.subject} session!`, { 
          icon: '🚀',
          duration: 5000,
          style: { border: '1.5px solid var(--p)', background: 'var(--s2)' }
        });

        dispatch({ type: 'TIMER_SET_SUB', payload: session.subject });
        dispatch({ type: 'TIMER_SET_DUR', payload: session.durationMinutes });
        dispatch({ type: 'TIMER_START' });
        navigate('/focus');
      }

      // 2. 5-Minute Pre-Task Reminder Notification
      state.schedule.forEach(s => {
        if (s.day === today) {
          const [sh, sm] = s.startTime.split(':').map(Number);
          const sTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), sh, sm, 0);
          const diffMs = sTime.getTime() - now.getTime();
          const diffMins = Math.round(diffMs / 60000);

          if (diffMins === 5) {
            const remId = `rem_5m_${s.id}_${today}_${s.startTime}`;
            if (!triggeredSet.current.has(remId)) {
              triggeredSet.current.add(remId);
              lastTriggered.current = remId;

              const title = 'Upcoming Study Session';
              const desc = `Your scheduled "${s.subject}" session (${s.topic || ''}) starts in 5 minutes!`;

              playAlarmSound();
              fireNativeNotification(title, desc);
              dispatch({
                type: 'TRIGGER_ALARM',
                payload: { title, desc, alarmId: remId, isOneOff: true }
              });
            }
          }
        }
      });

      // 3. Custom Alarms Triggering
      (state.alarms || []).forEach(alarm => {
        if (alarm.enabled && alarm.time === currentTime) {
          const alarmTriggerId = `alarm_${alarm.id}_${today}_${currentTime}`;
          if (!triggeredSet.current.has(alarmTriggerId)) {
            const isRepeatToday = alarm.repeat.length === 0 || alarm.repeat.includes(dayOfWeek);
            if (isRepeatToday) {
              triggeredSet.current.add(alarmTriggerId);
              lastTriggered.current = alarmTriggerId;

              const title = alarm.label || 'Study Alarm';
              const desc = `Scheduled alarm for ${alarm.time}`;

              playAlarmSound();
              fireNativeNotification(title, desc);
              dispatch({
                type: 'TRIGGER_ALARM',
                payload: { title, desc, alarmId: alarm.id, isOneOff: alarm.repeat.length === 0 }
              });
            }
          }
        }
      });
    };

    const interval = setInterval(checkScheduleAndAlarms, 15000); // Check every 15s
    checkScheduleAndAlarms(); // Run immediately on mount/update
    return () => clearInterval(interval);
  }, [state.schedule, state.alarms, navigate]);

  // Computed
  const pending   = useMemo(()=>state.tasks.filter(t=>t.status==='pending'),[state.tasks]);
  const completed = useMemo(()=>state.tasks.filter(t=>t.status==='completed'),[state.tasks]);
  const topTasks  = useMemo(()=>[...pending].sort((a,b)=>({high:0,medium:1,low:2}[a.priority]-{high:0,medium:1,low:2}[b.priority])).slice(0,3),[pending]);
  const deadlines = useMemo(()=>pending.filter(t=>t.deadline).sort((a,b)=>new Date(a.deadline)-new Date(b.deadline)).slice(0,5),[pending]);
  const todayCI   = useMemo(()=>state.checkIns.find(c=>isToday(c.date)),[state.checkIns]);
  const burnout   = useMemo(()=>calcBurnout(state.checkIns),[state.checkIns]);
  const activePath= useMemo(()=>state.paths.find(p=>p.status==='active'),[state.paths]);
  const todaySched= useMemo(()=>state.schedule.filter(s=>s.day===new Date().toISOString().slice(0,10)),[state.schedule]);
  const allAchs   = useMemo(()=>ALL_ACHIEVEMENTS.map(a=>({...a,earned:!!state.achievements.find(e=>e.id===a.id),earnedAt:state.achievements.find(e=>e.id===a.id)?.earnedAt})),[state.achievements]);

  // Actions — memoized to prevent child re-renders
  const A = useMemo(() => ({
    note: {
      add:    n  => {
        const newNote = { id: genId('note'), ...n, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
        dispatch({ type:'NOTE_ADD', payload: newNote });
        // Cloud sync handled async
        const uid = stateRef.current?.user?.id;
        if (uid) notesCloud.saveNote(newNote, uid).catch(() => {});
      },
      update: n  => {
        const updNote = { ...n, updatedAt:new Date().toISOString() };
        dispatch({ type:'NOTE_UPDATE', payload: updNote });
        const uid = stateRef.current?.user?.id;
        if (uid) notesCloud.saveNote(updNote, uid).catch(() => {});
      },
      remove: id => {
        dispatch({ type:'NOTE_DELETE', payload:id });
        const uid = stateRef.current?.user?.id;
        if (uid) notesCloud.deleteNote(id, uid).catch(() => {});
      },
    },
    task: {
      add:    t  => dispatch({ type:'TASK_ADD',    payload:{ id: genId('task'), status: 'pending', ...t, createdAt: new Date().toISOString() } }),
      update: t  => dispatch({ type:'TASK_UPDATE', payload:t }),
      done:   id => dispatch({ type:'TASK_DONE',   payload:id }),
      remove: id => dispatch({ type:'TASK_DELETE', payload:id }),
    },
    checkin: { add: c => dispatch({ type:'CI_ADD',payload:{ id: genId('ci'), ...c, date: new Date().toISOString() } }) },
    path: {
      add:    p  => dispatch({ type:'PATH_ADD',    payload:{ id: genId('path'), ...p, startedAt: new Date().toISOString() } }),
      update: p  => dispatch({ type:'PATH_UPDATE', payload:p }),
      remove: id => dispatch({ type:'PATH_DELETE', payload:id }),
    },
    schedule: {
      add:    s  => dispatch({ type:'SCHED_ADD', payload:{ id: genId('sch'), ...s } }),
      update: s  => dispatch({ type:'SCHED_UPDATE', payload:s }),
      remove: id => dispatch({ type:'SCHED_DEL', payload:id }),
    },
    alarm: {
      add:    s  => dispatch({ type:'ALARM_ADD', payload:{ id: genId('alm'), enabled: true, repeat: [], label: 'Study Alarm', ...s } }),
      update: s  => dispatch({ type:'ALARM_UPDATE', payload:s }),
      remove: id => dispatch({ type:'ALARM_DEL', payload:id }),
      trigger:payload => dispatch({ type:'TRIGGER_ALARM', payload }),
      dismiss:() => { stopAlarmSound(); dispatch({ type:'DISMISS_ALARM' }); },
      snooze: () => { stopAlarmSound(); dispatch({ type:'SNOOZE_ALARM' }); }
    },
    video: {
      add:    v  => dispatch({ type:'VID_ADD',    payload:{ id: genId('vid'), ...v, addedAt: new Date().toISOString() } }),
      update: v  => dispatch({ type:'VID_UPDATE', payload:v }),
      remove: id => dispatch({ type:'VID_DELETE', payload:id }),
    },
    progress: {
      update:    p  => dispatch({ type:'PROGRESS',   payload:p }),
      timerDone: m  => dispatch({ type:'TIMER_DONE', payload:m }),
    },
    timer: {
      start:    () => dispatch({ type:'TIMER_START' }),
      pause:    () => dispatch({ type:'TIMER_PAUSE' }),
      reset:    (m) => dispatch({ type:'TIMER_RESET', payload: m }),
      setDur:   (m) => dispatch({ type:'TIMER_SET_DUR', payload: m }),
      setSub:   (s) => dispatch({ type:'TIMER_SET_SUB', payload: s }),
    }
  }), [dispatch]);

  // ── SPLIT CONTEXTS: Timer vs Everything Else ──
  // Timer context — changes every second during focus sessions (ONLY FocusTimer subscribes)
  const timerValue = useMemo(() => state.timer, [state.timer]);

  // App context — changes only on meaningful data updates (all pages subscribe)
  // EXCLUDES state.timer so timer ticks don't cascade to Dashboard, Tasks, Notes, AuraDial, etc.
  const appValue = useMemo(() => {
    // Destructure timer out, keep everything else
    const { timer: _timer, ...rest } = state;
    return {
      ...rest, 
      user: user || state.user, // Prioritize AuthContext user
      pending, completed, topTasks, deadlines, todayCI, burnout, activePath, todaySched, allAchs, syncStatus, A
    };
  }, [
    state.notes, state.tasks, state.checkIns, state.paths, state.schedule, state.videos,
    state.achievements, state.progress, state.user, user, state.alarms, state.activeAlarm,
    pending, completed, topTasks, deadlines, todayCI, burnout, activePath, todaySched, allAchs, syncStatus, A
  ]);

  return (
    <Ctx.Provider value={appValue}>
      <TimerCtx.Provider value={timerValue}>
        {children}
      </TimerCtx.Provider>
    </Ctx.Provider>
  );
}

export const useApp = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useApp must be inside AppProvider');
  return ctx;
};

// Timer-specific hook — only FocusTimer should use this
export const useTimer = () => {
  const ctx = useContext(TimerCtx);
  if (!ctx) throw new Error('useTimer must be inside AppProvider');
  return ctx;
};
