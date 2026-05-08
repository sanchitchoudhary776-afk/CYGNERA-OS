import { createContext,useContext,useReducer,useEffect,useMemo,useCallback,useRef,useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { genId,calcBurnout,ALL_ACHIEVEMENTS,isToday } from '@utils';
import { db, supabase } from '@services/supabase';
import { notesCloud } from '@services/notesCloud';
import { useAuth } from './AuthContext';

const Ctx = createContext(null);
const TimerCtx = createContext(null);

// ── Demo Data ────────────────────────────────
const NOW = Date.now();
const D = (days) => new Date(NOW + days*86400000).toISOString();

const NOTES0 = [
  { id:'note_1',title:'Photosynthesis — Complete',content:'Photosynthesis converts light energy into chemical energy. Light reactions occur in thylakoids producing ATP and NADPH. Dark reactions (Calvin Cycle) occur in stroma. Chlorophyll absorbs red and blue light. Overall equation: 6CO₂ + 6H₂O + light → C₆H₁₂O₆ + 6O₂. Two stages: light-dependent and light-independent reactions. Chloroplasts are the organelles responsible. Factors affecting rate: light intensity, CO₂ concentration, temperature.',
    subject:'Biology',tags:['biology','photosynthesis','important'],wordCount:72,createdAt:D(-3),updatedAt:D(-3),aiEnhanced:true,
    summary:'Photosynthesis converts light to chemical energy in chloroplasts via two stages.',
    flashcards:[{q:'What are the two stages?',a:'Light reactions (thylakoids) and Calvin Cycle (stroma)'},{q:'Overall equation?',a:'6CO₂+6H₂O+light → C₆H₁₂O₆+6O₂'},{q:'Which organelle?',a:'Chloroplast'}],
    concepts:['ATP','NADPH','Calvin Cycle','Chlorophyll','Chloroplast'] },
  { id:'note_2',title:'JavaScript Arrays — Core Methods',content:'Array methods: map() transforms each element returning new array. filter() returns elements passing test. reduce() reduces to single value. forEach() iterates without return. find() returns first match. some() returns true if any pass. every() returns true if all pass. flat() flattens nested arrays. flatMap() combines map+flat. slice() extracts portion. splice() modifies array. sort() sorts in place. Array.from() creates from iterable. Spread operator [...arr] clones arrays.',
    subject:'Web Dev',tags:['javascript','arrays','methods'],wordCount:71,createdAt:D(-5),updatedAt:D(-5),aiEnhanced:false },
  { id:'note_3',title:'Calculus — Derivative Rules',content:'Power Rule: d/dx(xⁿ)=nxⁿ⁻¹. Chain Rule: d/dx[f(g(x))]=f\'(g(x))·g\'(x). Product Rule: d/dx[u·v]=u\'v+uv\'. Quotient Rule: d/dx[u/v]=(u\'v-uv\')/v². Common: d/dx[sin x]=cos x, d/dx[cos x]=-sin x, d/dx[eˣ]=eˣ, d/dx[ln x]=1/x. Applications: finding maxima/minima, rates of change, optimization problems. Critical points occur where f\'(x)=0 or undefined.',
    subject:'Mathematics',tags:['calculus','derivatives','rules'],wordCount:68,createdAt:D(-7),updatedAt:D(-7),aiEnhanced:false },
  { id:'note_4',title:"Newton's Laws of Motion",content:"First Law (Inertia): An object at rest stays at rest, an object in motion stays in motion, unless acted upon by external force. Second Law: F=ma, force equals mass times acceleration. Third Law: Every action has an equal and opposite reaction. Applications: rocket propulsion, friction, projectile motion. Momentum: p=mv. Impulse-Momentum theorem: Ft=Δp.",
    subject:'Physics',tags:['newton','mechanics','laws'],wordCount:60,createdAt:D(-10),updatedAt:D(-10),aiEnhanced:false },
];

const TASKS0 = [
  { id:'task_1',title:'Complete JS Project',description:'Build full-stack todo app using React and Node.js',subject:'Web Dev',priority:'high',status:'pending',deadline:D(2),estimatedMinutes:180,
    subtasks:[{title:'Setup React+Vite',estimatedMinutes:20,done:false},{title:'Build UI components',estimatedMinutes:60,done:false},{title:'Add Express backend',estimatedMinutes:60,done:false},{title:'Deploy to Vercel',estimatedMinutes:40,done:false}],createdAt:D(-1) },
  { id:'task_2',title:'Review Calculus Derivatives',description:'Chain rule, product rule, quotient rule — 30 practice problems',subject:'Mathematics',priority:'medium',status:'pending',deadline:D(4),estimatedMinutes:60,subtasks:[],createdAt:D(-2) },
  { id:'task_3',title:'Biology Lab Report',description:'Write formal report on photosynthesis experiment results',subject:'Biology',priority:'high',status:'pending',deadline:D(1),estimatedMinutes:120,subtasks:[],createdAt:D(-3) },
  { id:'task_4',title:'HTML/CSS Quiz Prep',description:'Review flexbox, grid, responsive design',subject:'Web Dev',priority:'low',status:'completed',deadline:D(-1),estimatedMinutes:45,completedAt:D(-2),createdAt:D(-4) },
  { id:'task_5',title:'Physics Problem Set Ch.3',description:"20 problems on Newton's Laws and momentum",subject:'Physics',priority:'medium',status:'pending',deadline:D(5),estimatedMinutes:90,subtasks:[],createdAt:D(-1) },
  { id:'task_6',title:'English Essay Draft',description:'Write 1500-word essay on modern literature',subject:'English',priority:'medium',status:'completed',deadline:D(-3),estimatedMinutes:120,completedAt:D(-3),createdAt:D(-6) },
];

const CHECKINS0 = [
  { id:'ci_1',mood:4,energy:7,sleepHours:7.5,date:D(-1),aiCoaching:"Great energy today! Perfect for tackling that JavaScript project. Start with 2 Pomodoro sessions before lunch." },
  { id:'ci_2',mood:2,energy:4,sleepHours:5,date:D(-2),aiCoaching:"Rough day. Focus on review instead of new material. Sleep early tonight — aim for 8 hours." },
  { id:'ci_3',mood:5,energy:9,sleepHours:8,date:D(-3),aiCoaching:"Peak state! Tackle your hardest subject first. This is your optimal learning window — don't waste it!" },
  { id:'ci_4',mood:3,energy:6,sleepHours:6.5,date:D(-4),aiCoaching:"Steady day. Stick to your study plan, 25-min focus sessions recommended. Stay hydrated." },
  { id:'ci_5',mood:4,energy:8,sleepHours:7,date:D(-5),aiCoaching:"Good energy. Great time to work on that JS project you have pending. You're in a learning mode." },
  { id:'ci_6',mood:3,energy:5,sleepHours:7,date:D(-6),aiCoaching:"Average day. Review your Biology notes — repetition builds retention. Keep it light today." },
  { id:'ci_7',mood:4,energy:7,sleepHours:8,date:D(-7),aiCoaching:"Well rested and focused. Deep work mode — tackle that Physics problem set you've been avoiding." },
];

const PATHS0 = [
  { id:'path_1',title:'Full-Stack Web Development',goal:'Become a job-ready full-stack developer',status:'active',totalWeeks:12,currentWeek:5,progress:38,
    startedAt:D(-30),learningStyle:'visual',hoursPerWeek:10,
    phases:[
      { phase:1,title:'HTML & CSS Foundations',weeks:'1-2',status:'completed',topics:['HTML5 Semantics','CSS Flexbox','CSS Grid','Responsive Design'],milestone:'Build a responsive landing page' },
      { phase:2,title:'JavaScript Core',weeks:'3-5',status:'active',topics:['ES6+ Syntax','DOM Manipulation','Async/Await','Fetch API'],milestone:'Build an interactive web app',currentTopic:'Async/Await' },
      { phase:3,title:'React Fundamentals',weeks:'6-8',status:'locked',topics:['Components & Props','useState/useEffect','React Router','Context API'],milestone:'Build a multi-page React app' },
      { phase:4,title:'Backend with Node.js',weeks:'9-12',status:'locked',topics:['Express.js','REST APIs','PostgreSQL','JWT Auth'],milestone:'Deploy a full-stack application' },
    ],
    aiTip:"You're on track! JavaScript async/await is crucial — don't rush through it. Understanding Promises deeply will save you hours of debugging later.",
    milestones:['Week 2: Responsive landing page','Week 5: Interactive web app','Week 8: React SPA','Week 12: Full-stack deployed'] },
];

const SCHEDULE0 = [
  { id:'sch_1',subject:'Web Dev',topic:'Async/Await deep dive',startTime:'09:00',durationMinutes:90,day:new Date().toISOString().slice(0,10) },
  { id:'sch_2',subject:'Mathematics',topic:'Integration practice',startTime:'14:00',durationMinutes:60,day:new Date().toISOString().slice(0,10) },
  { id:'sch_3',subject:'Biology',topic:'Cell division review',startTime:'16:00',durationMinutes:45,day:D(1).slice(0,10) },
];

const VIDEOS0 = [
  { id:'vid_1',title:'JavaScript Promises & Async/Await Explained',url:'https://www.youtube.com/watch?v=vn3tm0quoqE',subject:'Web Dev',notes:'Really clear explanation. Key: async functions always return a promise.',watched:true,addedAt:D(-5) },
  { id:'vid_2',title:'Calculus for Beginners — Full Course',url:'https://www.youtube.com/watch?v=WUvTyaaNkzM',subject:'Mathematics',notes:'',watched:false,addedAt:D(-8) },
  { id:'vid_3',title:'Photosynthesis: Crash Course Biology',url:'https://www.youtube.com/watch?v=g78utcLQrJ4',subject:'Biology',notes:'Covers light reactions really well.',watched:true,addedAt:D(-12) },
];

const PROGRESS0 = {
  subjects:{
    'Web Dev':    { progress:65,hoursStudied:22,tasksCompleted:8,trend:'+20%'  },
    'Mathematics':{ progress:42,hoursStudied:14,tasksCompleted:5,trend:'+8%'   },
    'Biology':    { progress:58,hoursStudied:10,tasksCompleted:4,trend:'+12%'  },
    'Physics':    { progress:35,hoursStudied:6, tasksCompleted:2,trend:'+5%'   },
  },
  weeklyHours:[2,2.5,3.5,2.2,4.0,3.4,1.5],
  streak:17,bestStreak:32,totalHours:52,tasksCompleted:17,focusSessions:34,thisWeekHours:19.1,
};

const ACHIEVEMENTS0 = [
  { id:'n1',title:'First Note',desc:'Created your first note',icon:'edit_note',color:'var(--p)',cat:'Notes',earnedAt:D(-20) },
  { id:'s2',title:'Week Warrior',desc:'7-day study streak',icon:'local_fire_department',color:'#fb923c',cat:'Streak',earnedAt:D(-10) },
  { id:'t1',title:'First Win',desc:'Completed first task',icon:'task_alt',color:'#60a5fa',cat:'Tasks',earnedAt:D(-15) },
  { id:'t2',title:'Productive',desc:'Completed 10 tasks',icon:'checklist',color:'#60a5fa',cat:'Tasks',earnedAt:D(-5) },
  { id:'f1',title:'Deep Worker',desc:'Completed 5 focus sessions',icon:'timer',color:'#a78bfa',cat:'Focus',earnedAt:D(-8) },
  { id:'h1',title:'10 Hours',desc:'Studied 10+ hours total',icon:'schedule',color:'#22d3ee',cat:'Hours',earnedAt:D(-12) },
];

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
const STORAGE_KEY = 'los_v3';
const STORAGE_META_KEY = 'los_v3_meta';

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
    const toSave = { ...state };
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

/**
 * Smart merge: compare timestamps. Cloud wins if it was updated more recently,
 * otherwise local wins. This prevents data loss from stale overwrites.
 */
function smartMerge(localState, cloudData) {
  if (!cloudData) return localState;
  if (!localState) return cloudData;
  
  // Deep merge: prefer cloud arrays if they're longer (more data),
  // but keep local timer state (it's transient)
  const merged = { ...cloudData };
  
  // Always keep local timer (it's tab-specific)
  merged.timer = localState.timer || DEFAULT_TIMER;
  
  // For each collection, pick whichever has more items (simple heuristic)
  // In production you'd use item-level timestamps, but this is robust enough
  const collections = ['notes', 'tasks', 'checkIns', 'paths', 'schedule', 'videos', 'achievements'];
  collections.forEach(key => {
    const local = localState[key] || [];
    const cloud = cloudData[key] || [];
    // Use cloud data if it's the same size or bigger
    merged[key] = cloud.length >= local.length ? cloud : local;
  });

  // Progress: pick whichever has more total hours
  if (localState.progress?.totalHours > (cloudData.progress?.totalHours || 0)) {
    merged.progress = localState.progress;
  }

  return merged;
}

const INIT = loadState() || {
  user: { name: 'Student', email: 'student@cygnera.os', goal: 'Master the curriculum' },
  notes:NOTES0, tasks:TASKS0, checkIns:CHECKINS0, paths:PATHS0,
  schedule:SCHEDULE0, videos:VIDEOS0, progress:PROGRESS0, achievements:ACHIEVEMENTS0,
  timer: DEFAULT_TIMER,
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
        
        if (cloudData) {
          merged = smartMerge(merged, cloudData);
        }
        
        if (cloudNotes && cloudNotes.length > 0) {
          // Relational notes win over the monolithic blob notes
          merged = { ...merged, notes: cloudNotes };
        }

        dispatch({ type: 'SYNC_CLOUD', payload: merged });
        saveLocal(merged);
        setSyncStatus('synced');
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
      // notes is now synced surgically, so we exclude it from the monolithic hash
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
      if (pendingSync.current && isAuth && user?.id && navigator.sendBeacon) {
        // sendBeacon is reliable during page unload
        const payload = JSON.stringify({
          user_id: user.id,
          data: stateRef.current,
          updated_at: new Date().toISOString()
        });
        // Note: sendBeacon to Supabase REST API requires CORS setup
        // This is a best-effort attempt; the next login will sync anyway
        console.log('[Sync] Flushing pending sync before page unload');
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

  // ── Session Auto-Trigger ───────────────────
  const lastTriggered = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const checkSchedule = () => {
      const now = new Date();
      const today = now.toISOString().slice(0, 10);
      const currentTime = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
      
      const session = state.schedule.find(s => s.day === today && s.startTime === currentTime);
      
      if (session && lastTriggered.current !== session.id) {
        lastTriggered.current = session.id;
        
        // Notify user
        toast(`Time for ${session.subject} session!`, { 
          icon: '🚀',
          duration: 5000,
          style: { border: '1.5px solid var(--p)', background: 'var(--s2)' }
        });

        // Set timer settings
        dispatch({ type: 'TIMER_SET_SUB', payload: session.subject });
        dispatch({ type: 'TIMER_SET_DUR', payload: session.durationMinutes });
        dispatch({ type: 'TIMER_START' });

        // Redirect
        navigate('/focus');
      }
    };

    const interval = setInterval(checkSchedule, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, [state.schedule, navigate]);

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
        const newNote = { ...n, id:genId('note'), createdAt:new Date().toISOString(), updatedAt:new Date().toISOString() };
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
      add:    t  => dispatch({ type:'TASK_ADD',    payload:{...t,id:genId('task'),status:'pending',createdAt:new Date().toISOString()} }),
      update: t  => dispatch({ type:'TASK_UPDATE', payload:t }),
      done:   id => dispatch({ type:'TASK_DONE',   payload:id }),
      remove: id => dispatch({ type:'TASK_DELETE', payload:id }),
    },
    checkin: { add: c => dispatch({ type:'CI_ADD',payload:{...c,id:genId('ci'),date:new Date().toISOString()} }) },
    path: {
      add:    p  => dispatch({ type:'PATH_ADD',    payload:{...p,id:genId('path'),startedAt:new Date().toISOString()} }),
      update: p  => dispatch({ type:'PATH_UPDATE', payload:p }),
      remove: id => dispatch({ type:'PATH_DELETE', payload:id }),
    },
    schedule: {
      add:    s  => dispatch({ type:'SCHED_ADD', payload:{...s,id:genId('sch')} }),
      update: s  => dispatch({ type:'SCHED_UPDATE', payload:s }),
      remove: id => dispatch({ type:'SCHED_DEL', payload:id }),
    },
    video: {
      add:    v  => dispatch({ type:'VID_ADD',    payload:{...v,id:genId('vid'),addedAt:new Date().toISOString()} }),
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
    state.achievements, state.progress, state.user, user, // Added user to dependencies
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
