// ═══════════════════════════════════════════
// AXINITE OS · UTILITIES
// ═══════════════════════════════════════════

// ── Date ────────────────────────────────────
export const fmt = {
  date: (d, opts={}) => d ? new Date(d).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric',...opts}) : '',
  time: (d) => d ? new Date(d).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}) : '',
  shortDate: (d) => d ? new Date(d).toLocaleDateString('en-IN',{day:'numeric',month:'short'}) : '',
  ago: (d) => {
    if (!d) return '';
    const diff = Date.now() - new Date(d).getTime();
    const m = Math.floor(diff/60000), h = Math.floor(diff/3600000), dy = Math.floor(diff/86400000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    if (h < 24) return `${h}h ago`;
    if (dy < 7) return `${dy}d ago`;
    return fmt.date(d);
  },
  mins: (m) => { if (!m) return '0m'; if (m < 60) return `${m}m`; return `${Math.floor(m/60)}h ${m%60?`${m%60}m`:''}`; },
  secs: (s) => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`,
};

export const daysUntil = (d) => d ? Math.ceil((new Date(d)-new Date())/86400000) : null;
export const isToday   = (d) => { const a=new Date(d),b=new Date(); return a.getDate()===b.getDate()&&a.getMonth()===b.getMonth()&&a.getFullYear()===b.getFullYear(); };
export const weekStart = () => { const d=new Date(); d.setDate(d.getDate()-d.getDay()+1); return d; };

export const getWeekDates = () => {
  const start = weekStart();
  return Array.from({length:7},(_,i) => { const d=new Date(start); d.setDate(start.getDate()+i); return d; });
};

// ── ID ──────────────────────────────────────
export const genId = (pfx='id') => `${pfx}_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;

// ── Array ───────────────────────────────────
export const groupBy = (arr, key) => arr.reduce((acc,item) => { const k=typeof key==='function'?key(item):item[key]; (acc[k]=acc[k]||[]).push(item); return acc; },{});
export const sortBy  = (arr, key, dir='asc') => [...arr].sort((a,b) => { const va=typeof key==='function'?key(a):a[key], vb=typeof key==='function'?key(b):b[key]; return dir==='asc'?(va>vb?1:-1):(va<vb?1:-1); });

// ── String ──────────────────────────────────
export const capitalize = (s) => s ? s.charAt(0).toUpperCase()+s.slice(1) : '';
export const truncate   = (s, n=50) => s?.length > n ? s.slice(0,n)+'…' : s;
export const wordCount  = (s) => s?.trim().split(/\s+/).filter(Boolean).length || 0;
export const initials   = (name) => name?.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase() || 'U';

// ── Math ────────────────────────────────────
export const clamp  = (v, min, max) => Math.min(Math.max(v, min), max);
export const pct    = (v, total) => total ? Math.round((v/total)*100) : 0;
export const avg    = (arr) => arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : 0;
export const round1 = (n) => Math.round(n*10)/10;

// ── Local Storage ───────────────────────────
export const ls = {
  get:    (k, fb=null) => { try { return JSON.parse(localStorage.getItem(k)) ?? fb; } catch { return fb; } },
  set:    (k, v)       => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } },
  remove: (k)          => { try { localStorage.removeItem(k); return true; } catch { return false; } },
};

// ── Colors ──────────────────────────────────
export const COLORS = {
  'Web Dev':     'var(--p)', // Emerald
  'Mathematics': '#7dd3fc', // Sky Blue
  'Biology':     '#c4b5fd', // Soft Purple
  'Physics':     '#fda4af', // Rose
  'Chemistry':   '#5eead4', // Teal
  'English':     '#f0abfc', // Lavender
  'History':     '#fde047', // Soft Yellow
  'Economics':   '#bef264', // Lime
  'Computer Sc.':'#67e8f9', // Cyan
  'Other':       'var(--t4)',
};
export const subjectColor    = (s) => COLORS[s] || 'var(--p)';
export const SUBJECT_COLORS  = COLORS; // alias

export const PRIORITY = {
  high:   { color:'#ff6b6b', bg:'rgba(255,107,107,0.12)', label:'HIGH',   icon:'keyboard_double_arrow_up'   },
  medium: { color:'#e9cd6e', bg:'rgba(233,205,110,0.12)', label:'MED',    icon:'drag_handle'                },
  low:    { color:'var(--p)', bg:'rgba(9,205,131,0.12)',   label:'LOW',    icon:'keyboard_double_arrow_down' },
};

export const MOODS = [
  { v:1, emoji:'😞', label:'Terrible', color:'#ff6b6b' },
  { v:2, emoji:'😟', label:'Bad',      color:'#fb923c' },
  { v:3, emoji:'😐', label:'Okay',     color:'#e9cd6e' },
  { v:4, emoji:'😊', label:'Good',     color:'var(--p)' },
  { v:5, emoji:'🤩', label:'Amazing',  color:'#44ea9d' },
];

export const SUBJECTS = Object.keys(COLORS).filter(s=>s!=='Other');

// ── Progress Calc ───────────────────────────
export const calcBurnout = (checkIns=[]) => {
  if (!checkIns.length) return 'low';
  const r = checkIns.slice(0,7);
  const mood   = avg(r.map(c=>c.mood   || 3));
  const energy = avg(r.map(c=>c.energy || 5));
  const sleep  = avg(r.map(c=>c.sleepHours || 7));
  if (mood < 2.5 && energy < 4 && sleep < 6) return 'critical';
  if (mood < 3   && energy < 5)              return 'high';
  if (mood < 3.5 || energy < 6)             return 'medium';
  return 'low';
};

export const overallProgress = (subjects={}) => {
  const vals = Object.values(subjects).map(s=>s.progress||0);
  return vals.length ? Math.round(avg(vals)) : 0;
};

// ── Validator ───────────────────────────────
export const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

// ── Achievements Definition ─────────────────
export const ALL_ACHIEVEMENTS = [
  // Notes
  { id:'n1', title:'First Note',     desc:'Created your first note',  icon:'edit_note',      color:'var(--p)', cat:'Notes',   req:s=>s.notes>=1   },
  { id:'n2', title:'Note Taker',     desc:'Created 10 notes',         icon:'library_books',  color:'#44ea9d', cat:'Notes',   req:s=>s.notes>=10  },
  { id:'n3', title:'Note Wizard',    desc:'Created 25 notes',         icon:'auto_stories',   color:'var(--p)', cat:'Notes',   req:s=>s.notes>=25  },
  { id:'n4', title:'AI Explorer',    desc:'Used AI on a note',        icon:'auto_awesome',   color:'#60a5fa', cat:'Notes',   req:s=>s.aiNotes>=1 },
  // Streak
  { id:'s1', title:'Getting Started',desc:'3-day study streak',       icon:'trending_up',    color:'#e9cd6e', cat:'Streak',  req:s=>s.streak>=3  },
  { id:'s2', title:'Week Warrior',   desc:'7-day study streak',       icon:'local_fire_department',color:'#fb923c',cat:'Streak',req:s=>s.streak>=7 },
  { id:'s3', title:'Iron Mind',      desc:'30-day study streak',      icon:'whatshot',       color:'#ff6b6b', cat:'Streak',  req:s=>s.streak>=30 },
  { id:'s4', title:'Legend',         desc:'100-day study streak',     icon:'military_tech',  color:'#fbbf24', cat:'Streak',  req:s=>s.streak>=100},
  // Tasks
  { id:'t1', title:'First Win',      desc:'Completed first task',     icon:'task_alt',       color:'#60a5fa', cat:'Tasks',   req:s=>s.tasks>=1   },
  { id:'t2', title:'Productive',     desc:'Completed 10 tasks',       icon:'checklist',      color:'#60a5fa', cat:'Tasks',   req:s=>s.tasks>=10  },
  { id:'t3', title:'Task Master',    desc:'Completed 50 tasks',       icon:'done_all',       color:'#a78bfa', cat:'Tasks',   req:s=>s.tasks>=50  },
  // Focus
  { id:'f1', title:'Deep Worker',    desc:'Completed 5 focus sessions',icon:'timer',         color:'#a78bfa', cat:'Focus',   req:s=>s.sessions>=5  },
  { id:'f2', title:'Flow State',     desc:'10+ focus sessions',       icon:'bolt',           color:'#f472b6', cat:'Focus',   req:s=>s.sessions>=10 },
  { id:'f3', title:'Pomodoro Pro',   desc:'25+ focus sessions',       icon:'alarm_on',       color:'#a78bfa', cat:'Focus',   req:s=>s.sessions>=25 },
  // Paths
  { id:'p1', title:'Pathfinder',     desc:'Created a learning path',  icon:'route',          color:'#34d399', cat:'Paths',   req:s=>s.paths>=1   },
  { id:'p2', title:'Achiever',       desc:'Completed a learning path',icon:'flag',           color:'#fbbf24', cat:'Paths',   req:s=>s.done>=1    },
  // Hours
  { id:'h1', title:'10 Hours',       desc:'Studied 10+ hours total',  icon:'schedule',       color:'#22d3ee', cat:'Hours',   req:s=>s.hours>=10  },
  { id:'h2', title:'50 Hours',       desc:'Studied 50+ hours total',  icon:'hourglass_full', color:'#60a5fa', cat:'Hours',   req:s=>s.hours>=50  },
  { id:'h3', title:'100 Hours',      desc:'Studied 100+ hours total', icon:'stars',          color:'#fbbf24', cat:'Hours',   req:s=>s.hours>=100 },
];
