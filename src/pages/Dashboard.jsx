import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@context/AuthContext';
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
          style={{ transition:'stroke-dashoffset 1.2s cubic-bezier(0.25,0.46,0.45,0.94)', willChange: 'stroke-dashoffset' }}/>
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
                transition:`height 900ms ${100+i*60}ms cubic-bezier(0.34,1.56,0.64,1)`,
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
    <div style={{ 
      padding:'16px 20px', 
      borderRadius:'var(--r-xl)', 
      background:'var(--s2)',
      border:'1px solid rgba(96, 165, 250, 0.15)',
      display:'flex', 
      alignItems:'flex-start', 
      gap:14,
      boxShadow: 'var(--sh)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div style={{ width:36,height:36,borderRadius:12,background:'rgba(96,165,250,0.12)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0, border:'1px solid rgba(96,165,250,0.2)' }}>
        <span className="material-symbols-outlined" style={{ fontSize:18,color:'#60a5fa',fontVariationSettings:"'FILL' 1" }}>psychology</span>
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <p style={{ fontSize:11,fontWeight:800,color:'#60a5fa',textTransform:'uppercase',letterSpacing:'0.12em',marginBottom:6 }}>Smart Insights</p>
        {loading ? <div className="ai-dots"><span/><span/><span/></div>
          : msg ? <p style={{ fontSize:14,color:'var(--t2)',lineHeight:1.6, letterSpacing:'0.01em' }}>{msg}</p>
          : <p style={{ fontSize:13,color:'var(--t4)' }}>Insights temporarily unavailable. Check your API key or connection in Settings.</p>}
      </div>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────
export default function Dashboard() {
  const { user } = useAuth();
  const { progress, tasks, paths, allAchs, A } = useApp();
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
        @keyframes numberUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes barGrow   { from{opacity:0;transform:scaleY(0.3)} to{opacity:1;transform:scaleY(1)} }
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

        {/* Network & XP Link */}
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
      </div>

      {/* ─── QUICK FOCUS ACTION (PREMIUM PROMINENT) ─── */}
      <div className="fadeup d1" style={{ marginBottom: 20 }}>
        <Link to="/focus" style={{ textDecoration: 'none', display: 'block' }}>
          <div className="card-hover" style={{ 
            position: 'relative',
            padding: '16px 24px', 
            borderRadius: 'var(--r-xl)', 
            background: 'linear-gradient(135deg, rgba(167, 139, 250, 0.08) 0%, rgba(124, 58, 237, 0.02) 100%)', 
            backgroundColor: 'var(--s2)',
            border: '1px solid rgba(167, 139, 250, 0.2)', 
            boxShadow: 'var(--sh), inset 0 1px 0 rgba(255,255,255,0.05)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 16,
            overflow: 'hidden'
          }}>
             {/* Animated Glow */}
             <div style={{ position:'absolute', top: '-50%', left: '-10%', width: '60%', height: '200%', background: 'radial-gradient(ellipse at center, rgba(167,139,250,0.1), transparent 60%)', pointerEvents:'none' }} />
             
             <div style={{ display: 'flex', alignItems: 'center', gap: 16, position: 'relative', zIndex: 1 }}>
               <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #a78bfa, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(124,58,237,0.4)' }}>
                 <span className="material-symbols-outlined" style={{ fontSize: 22, color: '#fff', fontVariationSettings: "'FILL' 1" }}>center_focus_strong</span>
               </div>
               <div>
                 <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--t1)', letterSpacing: '-0.01em', marginBottom: 2 }}>Enter Deep Focus</h3>
                 <p style={{ fontSize: 13, color: 'var(--t3)', fontWeight: 500 }}>Start a timed session to eliminate all distractions.</p>
               </div>
             </div>
             
             <div style={{ position: 'relative', zIndex: 1, marginLeft: 'auto' }}>
               <button className="btn" style={{ background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.4)', color: '#a78bfa', padding: '10px 24px', borderRadius: 99, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: 13 }}>
                 Start Now
               </button>
             </div>
          </div>
        </Link>
      </div>

      {/* ─── AI BRIEFING ──────────────────── */}
      <div className="fadeup d1" style={{ marginBottom:20 }}>
        <AIBriefing user={user} progress={progress} tasks={focusTasks}/>
      </div>

      {/* ─── TOP BENTO GRID ───────────────── */}
      <div className="reveal" style={{ display:'grid', gridTemplateColumns:'1fr', gap:16, marginBottom:20, borderRadius:'var(--r-xl)' }}>

        {/* Hero Card: Active path (Premium Compact Redesign) */}
        <div className="fadeup d2 card-hover" style={{
          borderRadius:'var(--r-xl)', overflow:'hidden',
          background:'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
          backgroundColor:'var(--s2)',
          border:'1px solid rgba(255,255,255,0.08)',
          padding:'20px 24px',
          position:'relative',
          cursor:'pointer',
          boxShadow: 'var(--sh-lg), inset 0 1px 0 rgba(255,255,255,0.05)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '24px'
        }} onClick={() => navigate('/paths')}>
          
          {/* Subtle Ambient Glows */}
          <div style={{ position:'absolute',top:'-20%',left:'-10%',width:'40%',height:'150%',background:'radial-gradient(ellipse at center, rgba(52,211,153,0.06), transparent 70%)',pointerEvents:'none' }}/>
          <div style={{ position:'absolute',bottom:'-50%',right:'-10%',width:'50%',height:'150%',background:'radial-gradient(ellipse at center, rgba(59,130,246,0.05), transparent 70%)',pointerEvents:'none' }}/>

          {/* Left Content */}
          <div style={{ flex:'1 1 300px', position:'relative', zIndex:1 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
              <div style={{ display:'inline-flex',alignItems:'center',gap:6,padding:'4px 10px',borderRadius:6,background:'rgba(52,211,153,0.1)',border:'1px solid rgba(52,211,153,0.2)' }}>
                <div style={{ width:5,height:5,borderRadius:'50%',background:'#34d399',animation:'pulseDot 2s ease-in-out infinite' }}/>
                <span style={{ fontSize:9.5,fontWeight:800,color:'#34d399',textTransform:'uppercase',letterSpacing:'0.1em' }}>
                  {activePath ? 'Active Path' : 'No Path'}
                </span>
              </div>
              {activePath && (
                <span style={{ fontSize:11,fontWeight:700,color:'var(--t4)',textTransform:'uppercase',letterSpacing:'0.08em' }}>
                  Week {activePath.currentWeek} / {activePath.totalWeeks}
                </span>
              )}
            </div>
            
            <h2 style={{ fontSize:'clamp(1.2rem,2.5vw,1.6rem)',fontWeight:800,color:'var(--t1)',letterSpacing:'-0.01em',lineHeight:1.3,marginBottom:4 }}>
              {activePath?.title || 'Start a Learning Path'}
            </h2>
            <p style={{ fontSize:13,color:'var(--t3)',lineHeight:1.5,marginBottom:16, maxWidth: '480px' }}>
              {activePath?.goal || 'Create an AI-powered roadmap to master any skill'}
            </p>

            <div style={{ display:'flex', alignItems:'center', gap:16 }}>
              <button className="btn btn-primary" style={{ padding:'10px 20px',fontSize:13, flexShrink:0, background: 'linear-gradient(135deg, var(--p), var(--p-cyan))', border: 'none', boxShadow: '0 4px 14px rgba(9,205,131,0.3)' }} onClick={e=>{e.stopPropagation();navigate(activePath?'/paths':'/paths');}}>
                <span className="material-symbols-outlined" style={{ fontSize:16,fontVariationSettings:"'FILL' 1" }}>{activePath?'play_arrow':'add'}</span>
                {activePath ? 'Resume Session' : 'Create Path'}
              </button>
              
              {activePath && (
                <div style={{ flex:1, maxWidth: 200 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4, fontSize:10, fontWeight:700, color:'var(--t4)', textTransform:'uppercase', letterSpacing:'0.1em' }}>
                    <span>Daily Focus</span>
                    <span style={{ color:'var(--p)' }}>{Math.min(100, Math.round((progress?.thisWeekHours||0)/14*100))}%</span>
                  </div>
                  <div className="progress-track" style={{ height:4, background: 'rgba(255,255,255,0.05)' }}>
                    <div className="progress-fill" style={{ width:`${Math.min(100, (progress?.thisWeekHours||0)/14*100)}%`, background: 'var(--p)' }}/>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Content - Compact Ring */}
          {activePath && (
            <div style={{ flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', padding: '0 10px', position:'relative', zIndex:1 }}>
              <RingProgress pct={activePath.progress || 0} size={100} stroke={8} label="Done" color="#34d399"/>
            </div>
          )}
        </div>
      </div>

      {/* ─── STATS ROW ────────────────────── */}
      <div className="grid-4 fadeup d3 tilt-container" style={{ marginBottom:20 }}>
        {[
          { icon:'local_fire_department', label:'Streak',        value:progress?.streak||0,   color:'#e9cd6e', sub:'days 🔥', glow:'rgba(233,205,110,0.2)', flame: (progress?.streak > 3) },
          { icon:'schedule',             label:'This Week',      value:progress?.thisWeekHours||0, color:'#60a5fa', sub:'studied',  glow:'rgba(96,165,250,0.2)'  },
          { icon:'task_alt',             label:'Completed',      value:tasks.filter(t=>t.status==='completed').length, color:'var(--p)', sub:'tasks', glow:'rgba(9,205,131,0.2)'   },
          { icon:'emoji_events',         label:'Achievements',   value:earned,         color:'#a78bfa', sub:'earned',   glow:'rgba(167,139,250,0.2)', total:total },
        ].map(({ icon, label, value, color, sub, glow, flame, total }, i) => (
          <div key={label} className="card card-hover fadeup tilt-card" style={{ padding:'18px 16px', animationDelay:`${i*0.06}s`, position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute',top:-16,right:-16,width:70,height:70,borderRadius:'50%',background:`radial-gradient(${glow},transparent)`,pointerEvents:'none' }}/>
            <div style={{ width:34,height:34,borderRadius:10,background:`${color}14`,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:12 }}>
              <span className={`material-symbols-outlined ${flame ? 'flame-active' : ''}`} style={{ fontSize:18,color,fontVariationSettings:"'FILL' 1" }}>{icon}</span>
            </div>
            <p style={{ fontSize:'clamp(1.3rem,3vw,1.8rem)',fontWeight:800,color,letterSpacing:'-0.02em',lineHeight:1 }}>
              <Counter value={value} />
              {total !== undefined && <span style={{ fontSize:14, opacity:0.5 }}>/{total}</span>}
            </p>
            <p style={{ fontSize:11,color:'var(--t4)',marginTop:4,fontWeight:600 }}>{label}</p>
          </div>
        ))}
      </div>

      {/* ─── PROGRESS + ACTIVITY ──────────── */}
      <Reveal>
        <div className="reveal" style={{ display:'grid', gridTemplateColumns:'1fr', gap:16, marginBottom:20 }}>
          {/* ... existing mastery ring and activity bars ... */}
          <div className="card fadeup d4" style={{ padding:'22px 20px', display:'flex', alignItems:'center', gap:20, flexWrap:'wrap' }}>
            <RingProgress pct={avgPct} size={140} stroke={10} label="Overall Mastery" sublabel={`${progress?.totalHours||0}h total`} color="var(--p-cyan)"/>
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
                      <div className="progress-track"><div className="progress-fill" style={{ width:`${data.progress}%`,background:`linear-gradient(90deg, color-mix(in srgb, ${c} 40%, transparent), ${c})` }}/></div>
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
            <div style={{ marginTop:16,padding:'14px 16px',borderRadius:'var(--r-md)',background:'linear-gradient(135deg,#a78bfa,#7c3aed)',display:'flex',alignItems:'center',gap:14 }}>
              <span className="material-symbols-outlined" style={{ fontSize:22,color:'#fff',fontVariationSettings:"'FILL' 1" }}>bolt</span>
              <div>
                <p style={{ fontSize:22,fontWeight:800,color:'#fff',letterSpacing:'-0.02em',lineHeight:1 }}>{progress?.thisWeekHours||0} hrs</p>
                <p style={{ fontSize:11,fontWeight:700,color:'rgba(255,255,255,0.7)' }}>Deep Focus This Week</p>
              </div>
            </div>
          </div>
        </div>
      </Reveal>

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
