import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@context/AuthContext';
import { useTheme } from '@context/ThemeContext';
import { useApp }  from '@context/AppContext';
import { dailyBriefing } from '@services/ai';
import { AI } from '@services/ai';
import { fmt, daysUntil, SUBJECT_COLORS } from '@utils';
import { usePremium, Counter, Reveal } from '@components/ui/PremiumUI';

const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

// ── Circular Progress Ring ────────────────────
function RingProgress({ pct=0, size=160, stroke=10, color='var(--p)', label='', sublabel='' }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(pct,100) / 100) * c;
  return (
    <div style={{ position:'relative', width:size, height:size, flexShrink:0 }}>
      <svg width={size} height={size} style={{ transform:'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--p-sub)" strokeWidth={stroke}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none"
          stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={offset}
          style={{ transition:'stroke-dashoffset 1.2s cubic-bezier(0.25,0.46,0.45,0.94)' }}/>
      </svg>
      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center' }}>
        <p style={{ fontSize: size > 130 ? 28 : 20, fontWeight:800, color:'var(--t1)', lineHeight:1, letterSpacing:'-0.03em', animation:'numberUp 600ms 400ms ease both' }}>{Math.round(pct)}%</p>
        {label    && <p style={{ fontSize:10.5, fontWeight:700, color, marginTop:4, textTransform:'uppercase', letterSpacing:'0.08em' }}>{label}</p>}
        {sublabel && <p style={{ fontSize:10, color:'var(--t4)', marginTop:2 }}>{sublabel}</p>}
      </div>
    </div>
  );
}

function ActivityBars({ data }) {
  const max = Math.max(...data.map(d=>d.v), 0.1);
  const colors = ['#60a5fa', '#a78bfa', '#f472b6', '#fbbf24', '#22d3ee', '#fb923c', '#ff6b6b'];
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
      <div style={{ display:'flex', alignItems:'flex-end', gap:6, height:80 }}>
        {data.map(({ d, v }, i) => {
          const hPct = (v / max) * 100;
          const isToday = i === new Date().getDay() - 1;
          const c = colors[i % colors.length];
          return (
            <div key={d} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4, height:'100%', justifyContent:'flex-end' }}>
              <div style={{ width:'100%', borderRadius:999, overflow:'hidden', height:`${Math.max(hPct,8)}%`,
                background: isToday ? `linear-gradient(180deg,${c},${c}dd)` : `${c}22`,
                animation:`barGrow 600ms ${i*60}ms ease both`,
              }}/>
            </div>
          );
        })}
      </div>
      <div style={{ display:'flex', gap:6 }}>
        {data.map(({ d }, i) => (
          <div key={d} style={{ flex:1, textAlign:'center' }}>
            <span style={{ fontSize:9.5, color: i === new Date().getDay()-1 ? colors[i % colors.length] : 'var(--t4)', fontWeight:700, letterSpacing:'0.05em' }}>{d}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Task Row ─────────────────────────────────
function TaskRow({ task, onComplete }) {
  const PCFG = { high:{ c:'#ff6b6b',bg:'rgba(255,107,107,0.08)' }, medium:{ c:'#e9cd6e',bg:'rgba(233,205,110,0.08)' }, low:{ c:'var(--p)',bg:'rgba(9,205,131,0.08)' } };
  const p = PCFG[task.priority] || PCFG.medium;
  const days = daysUntil(task.deadline);
  const [done, setDone] = useState(false);

  const { triggerConfetti } = usePremium();

  const handleDone = (e) => {
    const rect = e.target.getBoundingClientRect();
    triggerConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
    setDone(true);
    setTimeout(() => onComplete(task.id), 600);
  };

  return (
    <div style={{
      display:'flex', alignItems:'center', gap:12,
      padding:'11px 14px', borderRadius:'var(--r-md)',
      background:'var(--s3)', border:`1px solid var(--card-b)`,
      borderLeft:`3px solid ${p.c}`,
      opacity: done ? 0 : 1, transform: done ? 'translateX(24px)' : 'none',
      transition:'all 360ms ease',
    }}>
      <button onClick={handleDone}
        style={{ width:22,height:22,borderRadius:7,border:`2px solid ${p.c}50`,background:done?p.c:'transparent',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',flexShrink:0,transition:'all 200ms cubic-bezier(0.34,1.56,0.64,1)' }}>
        {done && <span className="material-symbols-outlined" style={{ fontSize:13,color:'#fff',fontVariationSettings:"'FILL' 1" }}>check</span>}
      </button>
      <div style={{ flex:1, minWidth:0 }}>
        <p style={{ fontSize:13,fontWeight:700,color:'var(--t2)',lineHeight:1.4 }}>{task.title}</p>
        <p style={{ fontSize:11,color:'var(--t4)',marginTop:2 }}>{task.subject}</p>
      </div>
      {days !== null && (
        <span style={{ fontSize:11,fontWeight:700,padding:'3px 9px',borderRadius:99,background:days<=0?'rgba(255,107,107,0.12)':days<=2?'rgba(233,205,110,0.12)':'rgba(255,255,255,0.05)',color:days<=0?'#ff6b6b':days<=2?'#e9cd6e':'var(--t3)',flexShrink:0 }}>
          {days<=0?'Due!':days===1?'Tomorrow':`${days}d`}
        </span>
      )}
    </div>
  );
}

// ── AI Briefing ──────────────────────────────
function AIBriefing({ user, progress, tasks }) {
  const [msg, setMsg]     = useState('');
  const [loading, setLoading] = useState(false);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (!AI.enabled() || fetchedRef.current) return;
    fetchedRef.current = true;
    
    const today = new Date().toDateString();
    const cachedDate = localStorage.getItem('aura_briefing_date');
    const cachedMsg = localStorage.getItem('aura_briefing_msg');

    if (cachedDate === today && cachedMsg) {
      setMsg(cachedMsg);
      return;
    }

    setLoading(true);
    
    // Calculate level progress safely
    const levelXP = progress?.xp ? progress.xp % 1000 : 0;
    const progressPercent = Math.floor((levelXP / 1000) * 100);

    dailyBriefing({ 
      name: user?.name?.split(' ')[0] || 'Student', 
      streak: progress?.streak || 0, 
      tasks: (tasks||[]).filter(t => t.status === 'pending').map(t => t.title), 
      progress: progressPercent 
    })
      .then(r => { 
        if(r) {
          setMsg(r);
          localStorage.setItem('aura_briefing_msg', r);
          localStorage.setItem('aura_briefing_date', today);
        }
      })
      .finally(() => setLoading(false));
  }, [user?.name, progress?.streak, progress?.xp, tasks]);

  if (!AI.enabled() && !msg) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="ai-card-premium"
      style={{ 
        position: 'relative',
        padding: '20px 24px', 
        borderRadius: 'var(--r-xl)', 
        background: 'var(--s2)', 
        backdropFilter: 'blur(20px) saturate(180%)',
        border: '1px solid color-mix(in srgb, var(--p-blue) 25%, transparent)',
        display:'flex', 
        alignItems:'flex-start', 
        gap:18,
        boxShadow: 'var(--sh-lg)',
        overflow: 'hidden'
      }}
    >
      {/* Subtle Mesh Background (Theme Aware) */}
      <div style={{ 
        position: 'absolute', inset: 0, 
        background: 'radial-gradient(circle at 0% 0%, color-mix(in srgb, var(--p-blue) 5%, transparent), transparent 40%), radial-gradient(circle at 100% 100%, color-mix(in srgb, var(--p-purple) 5%, transparent), transparent 40%)',
        pointerEvents: 'none' 
      }} />

      {/* AI Icon with Soft Pulse */}
      <div style={{ position: 'relative', flexShrink: 0, marginTop: 2 }}>
        <div style={{ 
          width:40, height:40, borderRadius:12, 
          background: 'color-mix(in srgb, var(--p-blue) 10%, transparent)',
          display:'flex', alignItems:'center', justifyContent:'center',
          border:'1px solid color-mix(in srgb, var(--p-blue) 20%, transparent)',
          zIndex: 1, position: 'relative'
        }}>
          <span className="material-symbols-outlined" style={{ fontSize:20, color:'var(--p-blue)', fontVariationSettings: "'FILL' 1" }}>psychology</span>
        </div>
        <div className="ai-pulse-ring" />
      </div>

      <div style={{ flex:1, minWidth:0, position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <p className="holographic-text" style={{ fontSize:10.5, fontWeight:900, textTransform:'uppercase', letterSpacing:'0.15em' }}>Smart Insights</p>
          <div style={{ width:4, height:4, borderRadius:'50%', background:'var(--p-blue)', opacity: 0.5 }} />
          <span style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--t4)', opacity: 0.5 }}>AURA ACTIVE</span>
        </div>

        {loading ? (
          <div style={{ display:'flex', alignItems:'center', gap:10, padding: '4px 0' }}>
            <div className="ai-dots"><span/><span/><span/></div>
            <span style={{ fontSize:13, color:'var(--t4)' }}>Processing insights...</span>
          </div>
        ) : msg ? (
          <p style={{ fontSize:14, color:'var(--t1)', lineHeight:1.7, fontWeight: 500 }}>
            {msg}
          </p>
        ) : (
          <p style={{ fontSize:13, color:'var(--t4)', fontStyle: 'italic' }}>Insights unavailable. Check connection.</p>
        )}
      </div>

      {/* Decorative subtle corner element */}
      <div style={{ position: 'absolute', bottom: -15, right: -15, opacity: 0.05, color: 'var(--t4)', pointerEvents: 'none' }}>
        <span className="material-symbols-outlined" style={{ fontSize: 100 }}>data_thresholding</span>
      </div>
    </motion.div>
  );
}

// ── Main Dashboard ────────────────────────────
export default function Dashboard() {
  const { user } = useAuth();
  const { progress, tasks, paths, allAchs, A } = useApp();
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const pending      = tasks.filter(t=>t.status==='pending');
  const focusTasks   = [...pending].sort((a,b)=>{ const o={high:0,medium:1,low:2}; return (o[a.priority]??1)-(o[b.priority]??1); }).slice(0,3);
  const upcoming     = pending.filter(t=>t.deadline).sort((a,b)=>new Date(a.deadline)-new Date(b.deadline)).slice(0,3);

  const avgPct = useMemo(() => {
    const vals = Object.values(progress?.subjects||{}).map(s=>s.progress);
    return vals.length ? Math.round(vals.reduce((a,v)=>a+v,0)/vals.length) : 0;
  }, [progress]);

  const activePath = paths.find(p=>p.status==='active');
  const earned     = allAchs?.filter(a=>a.earned).length || 0;
  const total      = allAchs?.length || 1;

  const weekHours = DAYS.map((d,i) => ({ d, v: progress?.weeklyHours?.[i] ?? 0 }));

  return (
    <div className="page">
      <style>{`
        @keyframes numberUp    { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes barGrow      { from{opacity:0;transform:scaleY(0.3)} to{opacity:1;transform:scaleY(1)} }
        @keyframes shimmer-wave { 0% { background-position: -100% 0; } 100% { background-position: 100% 0; } }
        
        @keyframes ai-breathe {
          0%, 100% { border-color: rgba(96, 165, 250, 0.2); box-shadow: 0 0 15px rgba(96, 165, 250, 0.05); }
          50% { border-color: rgba(167, 139, 250, 0.4); box-shadow: 0 0 25px rgba(167, 139, 250, 0.15); }
        }
        .ai-card-premium {
          animation: ai-breathe 4s ease-in-out infinite;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        @keyframes holographic {
          0%, 100% { color: #60a5fa; opacity: 0.8; }
          50% { color: #a78bfa; opacity: 1; }
        }
        .holographic-text {
          animation: holographic 6s ease-in-out infinite;
        }
        @keyframes ai-pulse-soft {
          0% { transform: scale(1); opacity: 0.3; }
          100% { transform: scale(1.4); opacity: 0; }
        }
        .ai-pulse-ring {
          position: absolute; inset: 0;
          border-radius: 14px;
          border: 1px solid rgba(96, 165, 250, 0.3);
          animation: ai-pulse-soft 3s ease-out infinite;
          pointer-events: none;
        }

        /* ── Light-mode sphere depth fix ── */
        [data-theme="light"] .glass-sphere {
          box-shadow:
            0 8px 24px rgba(0, 0, 0, 0.12),
            0 2px 6px rgba(0, 0, 0, 0.08),
            inset 0 -10px 20px rgba(0, 0, 0, 0.07),
            inset 0 8px 16px rgba(255, 255, 255, 0.9) !important;
          border-color: rgba(0, 0, 0, 0.1) !important;
          background:
            radial-gradient(circle at 30% 20%, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.3) 35%, transparent 55%),
            radial-gradient(circle at 50% 80%, rgba(0,0,0,0.04), transparent 60%),
            radial-gradient(circle at 50% 50%, var(--s2), var(--s3) 100%) !important;
        }
        [data-theme="light"] .glass-sphere .sphere-specular {
          background: linear-gradient(135deg, rgba(255,255,255,1) 0%, rgba(255,255,255,0.4) 50%, transparent 80%) !important;
          opacity: 0.7;
        }
        [data-theme="light"] .glass-sphere .sphere-refraction {
          opacity: 0.3 !important;
        }
        [data-theme="light"] .sphere-floor {
          background: radial-gradient(ellipse at center, rgba(0,0,0,0.12), transparent 80%) !important;
          opacity: 0.7 !important;
        }
      `}</style>

      {/* ─── HEADER ──────────────────────── */}
      <div className="fadeup" style={{ marginBottom:24, display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ fontSize:12,fontWeight:700,color:'var(--t4)',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:6 }}>
            {new Date().toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long'})}
          </p>
          <h1 className="shimmer-text page-title" style={{ fontSize:'clamp(1.6rem,4vw,2.4rem)' }}>
            {greeting()},<br/>
            {user?.name?.split(' ')[0] || 'Student'}.
          </h1>
          <p style={{ fontSize:14,color:'var(--t3)',marginTop:6 }}>
            {progress?.streak > 0 ? (
              <>
                <span className={progress.streak > 3 ? 'flame-active' : ''} style={{ display:'inline-block', marginRight:4 }}>🔥</span>
                <strong>{progress.streak}-day streak</strong> · Ready for today's flow state?
              </>
            ) : 'Start your learning journey today.'}
          </p>
        </div>

        {/* Network & XP Link + Focus Action */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <Link to="/network" style={{ textDecoration: 'none' }}>
            <div className="card card-hover shimmer-premium" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08), var(--s2))', border: '1px solid rgba(59, 130, 246, 0.2)', boxShadow: 'var(--sh)' }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(59, 130, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="material-symbols-outlined" style={{ color: '#3b82f6', fontSize: 20, fontVariationSettings: "'FILL' 1" }}>public</span>
              </div>
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2 }}>Global Rank</p>
                <p style={{ fontSize: 16, fontWeight: 800, color: 'var(--t1)', lineHeight: 1 }}><span style={{ color: '#3b82f6' }}>#5</span> <span style={{ fontSize: 12, color: 'var(--t3)' }}>(18.2k XP)</span></p>
              </div>
            </div>
          </Link>

          <Link to="/focus" style={{ textDecoration: 'none' }}>
            {isLight ? (
              <motion.button 
                whileHover={{ scale: 1.03, y: -3, boxShadow: '0 15px 35px -5px rgba(0,0,0,0.1), 0 4px 12px rgba(0,0,0,0.06), inset 0 2px 4px #fff' }}
                whileTap={{ scale: 0.96 }}
                transition={{ type: "spring", stiffness: 400, damping: 15, mass: 0.8 }}
                style={{ 
                  width: '100%', 
                  padding: '14px 20px', 
                  borderRadius: 16, 
                  background: 'linear-gradient(180deg, #ffffff 0%, #f9fafb 100%)',
                  border: '1px solid rgba(0, 0, 0, 0.05)', 
                  boxShadow: `
                    0 8px 20px -4px rgba(0, 0, 0, 0.08),
                    0 2px 8px -2px rgba(0, 0, 0, 0.04),
                    inset 0 2px 4px rgba(255, 255, 255, 1),
                    inset 0 -2px 4px rgba(0, 0, 0, 0.03)
                  `,
                  fontSize: 12.5, 
                  fontWeight: 900, 
                  color: '#0f172a',
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  gap: 12,
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden',
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em'
                }}
              >
                {/* Advanced Technique 1: Slow-moving subsurface emerald glow */}
                <motion.div 
                  animate={{ x: ['-50%', '150%'] }}
                  transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                  style={{
                    position: 'absolute', top: '-100%', left: 0, width: '150%', height: '300%',
                    background: 'radial-gradient(circle at center, rgba(16, 185, 129, 0.06) 0%, transparent 40%)',
                    zIndex: 0, pointerEvents: 'none'
                  }}
                />

                {/* Advanced Technique 2: Intense focused specular highlight (glass diagonal reflection) */}
                <div style={{ 
                  position: 'absolute', top: 0, left: '-50%', width: '200%', height: '100%', 
                  background: 'linear-gradient(115deg, transparent 35%, rgba(255,255,255,0.7) 45%, rgba(255,255,255,1) 50%, rgba(255,255,255,0.7) 55%, transparent 65%)',
                  transform: 'translateX(-100%)',
                  animation: 'shimmer-wave 5s infinite cubic-bezier(0.4, 0, 0.2, 1)',
                  zIndex: 0
                }} />

                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 10, zIndex: 1 }}>
                  {/* Advanced Technique 3: Drop-shadowed Icon for tactile depth */}
                  <span className="material-symbols-outlined" style={{ 
                    fontSize: 20, 
                    color: '#059669', 
                    fontVariationSettings: "'FILL' 1",
                    filter: 'drop-shadow(0 2px 3px rgba(5, 150, 105, 0.3))'
                  }}>center_focus_strong</span>
                  <span style={{ opacity: 0.9 }}>Enter Deep Focus</span>
                </div>
              </motion.button>
            ) : (
              <motion.button 
                className="focus-btn-glass"
                whileHover={{ scale: 1.03, y: -3 }}
                whileTap={{ scale: 0.96 }}
                transition={{ 
                  type: "spring", 
                  stiffness: 400, 
                  damping: 15, 
                  mass: 0.8,
                  layout: { type: "spring", stiffness: 300, damping: 30 }
                }}
                style={{ 
                  width: '100%', 
                  padding: '14px 20px', 
                  borderRadius: 16, 
                  background: 'rgba(167, 139, 250, 0.08)', // Semi-transparent base
                  backgroundColor: 'rgba(255, 255, 255, 0.01)',
                  backdropFilter: 'blur(16px) saturate(180%)',
                  border: '1px solid rgba(167, 139, 250, 0.3)', 
                  borderTopColor: 'rgba(255, 255, 255, 0.4)', // Top highlight
                  boxShadow: `
                    0 10px 25px -5px rgba(0, 0, 0, 0.3),
                    0 0 20px rgba(167, 139, 250, 0.1),
                    inset 0 1px 1px rgba(255, 255, 255, 0.1)
                  `,
                  fontSize: 12.5, 
                  fontWeight: 900, 
                  color: '#fff',
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  gap: 12,
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  textShadow: '0 0 10px rgba(167, 139, 250, 0.5)'
                }}
              >
                {/* Animated Liquid Light Background */}
                <div style={{ 
                  position: 'absolute', inset: 0, 
                  background: 'radial-gradient(circle at 50% 120%, rgba(167, 139, 250, 0.4), transparent 70%)',
                  opacity: 0.6,
                  zIndex: -1
                }} />

                {/* Shimmer Line */}
                <div style={{ 
                  position: 'absolute', inset: 0, 
                  background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.15), transparent)',
                  transform: 'translateX(-100%)',
                  animation: 'shimmer-wave 4s infinite ease-in-out',
                  zIndex: 0
                }} />

                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 10, zIndex: 1 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#a78bfa', fontVariationSettings: "'FILL' 1" }}>center_focus_strong</span>
                  <span>Enter Deep Focus</span>
                </div>
              </motion.button>
            )}
          </Link>
        </div>
      </div>

      {/* ─── AI BRIEFING ──────────────────── */}
      <div className="fadeup d1" style={{ marginBottom:20 }}>
        <AIBriefing user={user} progress={progress} tasks={focusTasks}/>
      </div>

      {/* ─── HERO ROW: Active Path + 3D Spheres ───────────── */}
      <div className="fadeup d2" style={{ display: 'flex', gap: 20, marginBottom: 24, alignItems: 'stretch', flexWrap: 'wrap' }}>

        {/* ── Left: Active Path Card (compressed horizontally, expanded vertically) ── */}
        <div className="card card-hover" style={{
          flex: '1 1 340px',
          borderRadius: 'var(--r-xl)', 
          padding: '24px 28px',
          position: 'relative',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 24,
          border: '1px solid var(--card-b)',
          background: 'var(--s2)',
          boxShadow: 'var(--sh-lg)'
        }} onClick={() => navigate('/paths')}>
          
          {/* Ambient Glows (kept subtle for hero feel) */}
          <div style={{ position:'absolute',top:'-20%',left:'-10%',width:'50%',height:'150%',background:'radial-gradient(ellipse at center, rgba(52,211,153,0.05), transparent 70%)',pointerEvents:'none' }}/>
          <div style={{ position:'absolute',bottom:'-50%',right:'-10%',width:'50%',height:'150%',background:'radial-gradient(ellipse at center, rgba(59,130,246,0.03), transparent 70%)',pointerEvents:'none' }}/>

          {/* ── Left: All text content ── */}
          <div style={{ flex: 1, position:'relative', zIndex:1, display:'flex', flexDirection:'column', gap: 14 }}>
            {/* Badge Row */}
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ display:'inline-flex',alignItems:'center',gap:6,padding:'4px 10px',borderRadius:6,background:'rgba(52,211,153,0.1)',border:'1px solid rgba(52,211,153,0.2)' }}>
                <div style={{ width:5,height:5,borderRadius:'50%',background:'#34d399',animation:'pulseDot 2s ease-in-out infinite' }}/>
                <span style={{ fontSize:9.5,fontWeight:800,color:'#34d399',textTransform:'uppercase',letterSpacing:'0.12em' }}>
                  {activePath ? 'Active Path' : 'No Path'}
                </span>
              </div>
              {activePath && (
                <span style={{ fontSize:11,fontWeight:700,color:'var(--t4)',textTransform:'uppercase',letterSpacing:'0.08em' }}>
                  Week {activePath.currentWeek} / {activePath.totalWeeks}
                </span>
              )}
            </div>
            
            {/* Title + Description */}
            <div>
              <h2 style={{ fontSize:'clamp(1.3rem,2.5vw,1.6rem)',fontWeight:900,color:'var(--t1)',letterSpacing:'-0.02em',lineHeight:1.3,marginBottom:6 }}>
                {activePath?.title || 'Start a Learning Path'}
              </h2>
              <p style={{ fontSize:13,color:'var(--t3)',lineHeight:1.6, fontWeight: 500 }}>
                {activePath?.goal || 'Create an AI-powered roadmap to master any skill'}
              </p>
            </div>

            {/* CTA Button + Progress Bar (same row) */}
            <div style={{ display:'flex', alignItems:'center', gap:32, flexWrap:'wrap', marginTop: 24 }}>
              <button className="btn btn-primary shimmer-premium" style={{ 
                padding:'12px 28px',fontSize:14, 
                background: 'linear-gradient(135deg, #10b981, #06b6d4)', 
                border: 'none', 
                boxShadow: '0 8px 20px rgba(16,185,129,0.25)', 
                borderRadius: 12, 
                flexShrink:0,
                fontWeight: 800,
                letterSpacing: '0.01em'
              }} onClick={e=>{e.stopPropagation();navigate(activePath?'/paths':'/paths');}}>
                <span className="material-symbols-outlined" style={{ fontSize:18,fontVariationSettings:"'FILL' 1" }}>{activePath?'play_arrow':'add'}</span>
                {activePath ? 'Resume Session' : 'Create Path'}
              </button>

              {activePath && (
                <div style={{ flex:1, minWidth:120, maxWidth: 220 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6, fontSize:10, fontWeight:800, color:'var(--t4)', textTransform:'uppercase', letterSpacing:'0.12em' }}>
                    <span>Daily Focus</span>
                    <span style={{ color:'#10b981' }}>{Math.min(100, Math.round((progress?.thisWeekHours||0)/14*100))}%</span>
                  </div>
                  <div className="progress-track" style={{ height:6, borderRadius:99, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                    <div className="progress-fill" style={{ 
                      width:`${Math.min(100, (progress?.thisWeekHours||0)/14*100)}%`, 
                      height:'100%', borderRadius:99, 
                      background: 'linear-gradient(90deg, #10b981, #34d399)',
                      boxShadow: '0 0 10px rgba(16,185,129,0.3)'
                    }}/>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Right: Ring Progress ── */}
          {activePath && (
            <div style={{ flexShrink:0, position:'relative', zIndex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:8, filter: 'drop-shadow(0 0 12px rgba(52,211,153,0.15))' }}>
              <RingProgress pct={activePath.progress || 0} size={120} stroke={10} label="Overall" color="#34d399"/>
            </div>
          )}
        </div>

        {/* ── Right: 2×2 Glass Sphere Grid ── */}
        <div style={{
          flex: '0 1 320px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 12,
          alignContent: 'center',
          justifyItems: 'center'
        }}>
          {[
            { icon:'local_fire_department', label:'Streak',      value:progress?.streak||0,   color:'#f0d890', colorMid:'rgba(240,216,144,0.08)', flame:(progress?.streak > 3), delay:0 },
            { icon:'schedule',             label:'This Week',    value:progress?.thisWeekHours||0, color:'#93dffd', colorMid:'rgba(147,223,253,0.08)', delay:0.06 },
            { icon:'task_alt',             label:'Completed',    value:tasks.filter(t=>t.status==='completed').length, color:'#6ee7b7', colorMid:'rgba(110,231,183,0.08)', delay:0.12 },
            { icon:'emoji_events',         label:'Achievements', value:earned, color:'#d4c5ff', colorMid:'rgba(212,197,255,0.08)', total:total, delay:0.18 },
          ].map(({ icon, label, value, color, colorMid, flame, total, delay }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 30, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 20, delay }}
              style={{ display:'flex', flexDirection:'column', alignItems:'center', cursor:'pointer' }}
            >
              {/* ── The Glassy 3D Sphere ── */}
              <motion.div
                className="glass-sphere"
                whileHover={{ y: -10, scale: 1.06 }}
                transition={{ type: 'spring', stiffness: 350, damping: 20 }}
                style={{
                  width: 120, height: 120,
                  borderRadius: '50%',
                  position: 'relative',
                  background: `
                    radial-gradient(circle at 35% 25%, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.05) 40%, transparent 60%),
                    radial-gradient(circle at 50% 50%, color-mix(in srgb, ${color} 10%, var(--s2)), var(--s2) 100%)
                  `,
                  boxShadow: `
                    0 15px 35px color-mix(in srgb, var(--t1) 12%, transparent),
                    inset 0 -12px 25px color-mix(in srgb, ${color} 15%, transparent),
                    inset 0 10px 20px rgba(255,255,255,0.15),
                    inset 0 0 2px rgba(255,255,255,0.4)
                  `,
                  border: '1px solid color-mix(in srgb, var(--t1) 8%, transparent)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 2,
                  overflow: 'hidden',
                  zIndex: 1
                }}
              >
                {/* Specular highlight */}
                <div className="sphere-specular" style={{
                  position: 'absolute',
                  top: '10%', left: '20%',
                  width: '50%', height: '30%',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.6) 0%, transparent 80%)',
                  filter: 'blur(5px)',
                  pointerEvents: 'none'
                }} />

                {/* Bottom edge glow */}
                <div className="sphere-refraction" style={{
                  position: 'absolute',
                  bottom: '5%', right: '5%',
                  width: '40%', height: '40%',
                  borderRadius: '50%',
                  background: `radial-gradient(circle at center, color-mix(in srgb, ${color} 20%, transparent), transparent 70%)`,
                  filter: 'blur(10px)',
                  opacity: 0.6,
                  pointerEvents: 'none'
                }} />

                {/* Icon */}
                <span
                  className={`material-symbols-outlined ${flame ? 'flame-active' : ''}`}
                  style={{
                    fontSize: 28,
                    color,
                    fontVariationSettings: "'FILL' 1",
                    position: 'relative', zIndex: 1,
                    filter: `drop-shadow(0 2px 8px color-mix(in srgb, ${color} 40%, transparent))`
                  }}
                >{icon}</span>

                {/* Value */}
                <p style={{
                  fontSize: 22, fontWeight: 900,
                  color: 'var(--t1)',
                  letterSpacing: '-0.03em',
                  lineHeight: 1,
                  position: 'relative', zIndex: 1
                }}>
                  <Counter value={value} />
                  {total !== undefined && <span style={{ fontSize: 10, opacity: 0.4, fontWeight: 700 }}>/{total}</span>}
                </p>

                {/* Label */}
                <p style={{
                  fontSize: 8.5, fontWeight: 800,
                  color: 'var(--t4)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                  lineHeight: 1,
                  position: 'relative', zIndex: 1,
                  marginTop: 1
                }}>{label}</p>
              </motion.div>

              {/* Floor Shadow / Grounding Reflection */}
              <div className="sphere-floor" style={{
                marginTop: 8,
                width: 40, height: 4,
                background: `radial-gradient(ellipse at center, color-mix(in srgb, var(--t1) 15%, transparent), transparent 80%)`,
                borderRadius: '50%',
                filter: 'blur(2px)',
                opacity: 0.5
              }} />

            </motion.div>
          ))}
        </div>
      </div>

      {/* ─── PROGRESS + ACTIVITY ──────────── */}
        <div className="reveal" style={{ display:'grid', gridTemplateColumns:'1fr', gap:16, marginBottom:20 }}>
          {/* ... existing mastery ring and activity bars ... */}
          <div className="card fadeup d4" style={{ padding:'26px 24px', display:'flex', alignItems:'center', gap:24, flexWrap:'wrap' }}>
            <RingProgress pct={avgPct} size={150} stroke={12} label="Overall Mastery" sublabel={`${progress?.totalHours||0}h total`} color="var(--p)"/>
            {/* ... rest of the content ... */}
            <div style={{ flex:1, minWidth:200 }}>
              <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:6 }}>
                <div style={{ width:6,height:6,borderRadius:'50%',background:'var(--p)',animation:'pulseDot 1.8s ease-in-out infinite' }}/>
                <p style={{ fontSize:10,fontWeight:700,color:'var(--p)',textTransform:'uppercase',letterSpacing:'0.09em' }}>Daily Goal Reached</p>
              </div>
              <h3 style={{ fontSize:'clamp(1.1rem,2.5vw,1.5rem)',fontWeight:800,color:'var(--t1)',letterSpacing:'-0.02em',marginBottom:6 }}>Mastery Progress</h3>
              <p style={{ fontSize:13,color:'var(--t3)',marginBottom:16,lineHeight:1.6 }}>
                {progress?.streak>3 ? `You've reached flow state for ${progress.streak} consecutive days.` : "Build consistency to reach your flow state."}
              </p>
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {Object.entries(progress?.subjects||{}).slice(0,3).map(([sub, data]) => {
                  const c = SUBJECT_COLORS[sub] || 'var(--p)';
                  return (
                    <div key={sub}>
                      <div style={{ display:'flex',justifyContent:'space-between',marginBottom:5 }}>
                        <span style={{ fontSize:12,fontWeight:700,color:'var(--t2)' }}>{sub}</span>
                        <span style={{ fontSize:12,fontWeight:800,color:c }}>{data.progress}%</span>
                      </div>
                      <div className="progress-track" style={{ height: 6, borderRadius: 99, background: 'var(--s3)' }}>
                        <div className="progress-fill" style={{ 
                          width:`${data.progress}%`, 
                          height: '100%',
                          borderRadius: 99,
                          background:`linear-gradient(90deg, color-mix(in srgb, ${c} 50%, transparent), ${c})`,
                          boxShadow: `0 0 10px color-mix(in srgb, ${c} 30%, transparent)` 
                        }}/>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="card fadeup d5" style={{ padding:'20px' }}>
            <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16 }}>
              <div>
                <p style={{ fontSize:11,fontWeight:700,color:'var(--t4)',textTransform:'uppercase',letterSpacing:'0.09em',marginBottom:3 }}>Activity Velocity</p>
                <p style={{ fontSize:14,fontWeight:700,color:'var(--t2)' }}>Weekly Focus Distribution</p>
              </div>
              <Link to="/progress" style={{ fontSize:12,fontWeight:700,color:'var(--p)',textDecoration:'none',display:'flex',alignItems:'center',gap:4 }}>
                View all <span className="material-symbols-outlined" style={{ fontSize:14 }}>arrow_forward</span>
              </Link>
            </div>
            <ActivityBars data={weekHours}/>
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.015, y: -2 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              style={{ 
                marginTop: 14,
                padding: '16px 20px',
                borderRadius: 'var(--r-lg)',
                background: 'var(--glass)',
                backdropFilter: 'blur(20px) saturate(160%)',
                border: '1px solid var(--card-b)',
                boxShadow: 'var(--sh), inset 0 1px 1px rgba(255,255,255,0.05)',
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                position: 'relative',
                overflow: 'hidden',
                cursor: 'pointer'
              }}
            >
              {/* Removed SVG noise overlay to prevent GPU rendering crashes */}

              <div style={{ 
                width: 42, height: 42, borderRadius: 12, 
                background: 'var(--p-sub)', 
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '1px solid var(--p-border)',
                flexShrink: 0,
                position: 'relative',
                zIndex: 1
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: 24, color: 'var(--p)', fontVariationSettings: "'FILL' 1" }}>bolt</span>
              </div>
              
              <div style={{ flex: 1, position: 'relative', zIndex: 1 }}>
                <p style={{ fontSize: 9.5, fontWeight: 800, color: 'var(--p)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 2 }}>Focus Pulse</p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <p style={{ fontSize: 24, fontWeight: 900, color: 'var(--t1)', letterSpacing: '-0.04em', lineHeight: 1 }}>{progress?.thisWeekHours || 0}</p>
                  <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--t3)', letterSpacing: '-0.02em' }}>hours focused</p>
                </div>
              </div>

              {/* Compact Functional Badge */}
              <div style={{ 
                display: 'flex', alignItems: 'center', gap: 6, 
                padding: '6px 12px', borderRadius: 99, 
                background: 'var(--s3)', border: '1px solid var(--card-b)',
                position: 'relative', zIndex: 1
              }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--p)', animation: 'pulseDot 2s infinite' }} />
                <span style={{ fontSize: 9, fontWeight: 800, color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Flow</span>
              </div>
            </motion.div>
          </div>
        </div>

      {/* ─── TODAY'S FOCUS ────────────────── */}
      <div className="card fadeup d6" style={{ padding:'20px', marginBottom:20 }}>
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16 }}>
          <div style={{ display:'flex',alignItems:'center',gap:10 }}>
            <span className="material-symbols-outlined" style={{ fontSize:18,color:'var(--p-purple)',fontVariationSettings:"'FILL' 1" }}>target</span>
            <h3 style={{ fontSize:15,fontWeight:800,color:'var(--t1)',letterSpacing:'-0.02em' }}>Today's Focus</h3>
            <span style={{ padding:'2px 10px',borderRadius:999,background:'var(--p-purple-sub)',color:'var(--p-purple)',fontSize:11,fontWeight:700 }}>{focusTasks.length}</span>
          </div>
          <Link to="/tasks" style={{ fontSize:12,fontWeight:700,color:'var(--p-purple)',textDecoration:'none',display:'flex',alignItems:'center',gap:3 }}>
            All tasks <span className="material-symbols-outlined" style={{ fontSize:14 }}>arrow_forward</span>
          </Link>
        </div>
        <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
          {focusTasks.length > 0 ? focusTasks.map(t => (
            <TaskRow key={t.id} task={t} onComplete={A.task.done}/>
          )) : (
            <div style={{ textAlign:'center',padding:'24px',color:'var(--t4)' }}>
              <span className="material-symbols-outlined" style={{ fontSize:40,display:'block',marginBottom:8,opacity:0.4 }}>check_circle</span>
              <p style={{ fontSize:13 }}>All caught up! <Link to="/tasks" style={{ color:'var(--p)',textDecoration:'none',fontWeight:700 }}>Add a task</Link></p>
            </div>
          )}
        </div>
      </div>

      {/* ─── QUICK ACTIONS ────────────────── */}
      <div className="grid-4 fadeup d7">
        {[
          { to:'/notes',    icon:'add_notes',    label:'New Note',    color:'var(--p)' },
          { to:'/tasks',    icon:'playlist_add', label:'Add Task',    color:'#60a5fa' },
          { to:'/focus',    icon:'timer',        label:'Start Focus', color:'#a78bfa' },
          { to:'/checkin',  icon:'sentiment_satisfied', label:'Check In', color:'#e9cd6e' },
        ].map(({ to, icon, label, color }, i) => (
          <Link key={to} to={to} style={{ textDecoration:'none' }}>
            <div className="card card-hover" style={{ padding:'16px 12px',textAlign:'center',cursor:'pointer',animationDelay:`${i*0.05}s`,border:`1px solid ${color}22` }}>
              <div style={{ width:40,height:40,borderRadius:'var(--r-md)',background:`${color}14`,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 10px' }}>
                <span className="material-symbols-outlined" style={{ fontSize:20,color,fontVariationSettings:"'FILL' 1" }}>{icon}</span>
              </div>
              <p style={{ fontSize:12,fontWeight:700,color:'var(--t2)' }}>{label}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
