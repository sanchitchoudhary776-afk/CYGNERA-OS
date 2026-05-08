import { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useApp }        from '@context/AppContext';
import { progressInsights, generateDailyReport, achievementMsg, AI } from '@services/ai';
import { SUBJECT_COLORS, overallProgress, fmt } from '@utils';
import { usePremium, Counter } from '@components/ui/PremiumUI';

const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const CATS = ['All','Notes','Streak','Tasks','Focus','Hours','Paths'];

// ── Circular Ring ─────────────────────────────
function Ring({ pct=0, size=180, stroke=12, color='var(--p)', children }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(pct,100)/100)*c;
  return (
    <div style={{ position:'relative',width:size,height:size,flexShrink:0 }}>
      <svg width={size} height={size} style={{ transform:'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(9,205,131,0.07)" strokeWidth={stroke}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={offset}
          style={{ transition:'stroke-dashoffset 1.1s cubic-bezier(0.25,0.46,0.45,0.94)', willChange: 'stroke-dashoffset' }}/>
      </svg>
      <div style={{ position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',textAlign:'center' }}>
        {children}
      </div>
    </div>
  );
}

// ── Activity Bar (pill) ───────────────────────
function PillBars({ data }) {
  const max = Math.max(...data.map(d=>d.v), 0.5);
  return (
    <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
      <div style={{ display:'flex',alignItems:'flex-end',gap:5,height:90 }}>
        {data.map(({ d, v }, i) => {
          const pct = (v/max)*100;
          const today = i === (new Date().getDay()+6)%7;
          return (
            <div key={d} style={{ flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:3,height:'100%',justifyContent:'flex-end' }}>
              <div style={{ width:'100%',borderRadius:999,height:`${Math.max(pct,6)}%`,background:today?'linear-gradient(180deg,#3df5a0,#09cd83)':'rgba(9,205,131,0.15)',boxShadow:today?'0 0 14px rgba(9,205,131,0.45)':'none',transition:`height 900ms ${80+i*60}ms cubic-bezier(0.34,1.56,0.64,1)`,animation:`barPop 600ms ${i*55}ms ease both` }}/>
            </div>
          );
        })}
      </div>
      <div style={{ display:'flex',gap:5 }}>
        {data.map(({ d }, i) => (
          <div key={d} style={{ flex:1,textAlign:'center' }}>
            <span style={{ fontSize:9.5,fontWeight:700,color:i===(new Date().getDay()+6)%7?'var(--p)':'var(--t4)' }}>{d}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BadgeCard({ ach, onClick }) {
  const { earned, title, desc, icon, color, cat, earnedAt } = ach;
  return (
    <div onClick={()=>earned&&onClick(ach)}
      className="tilt-card"
      style={{
        padding:18, borderRadius:'var(--r-lg)', textAlign:'center',
        background: earned ? `${color}0c` : 'var(--s2)',
        border: `1px solid ${earned ? `${color}28` : 'rgba(255,255,255,0.04)'}`,
        cursor: earned ? 'pointer' : 'default',
        opacity: earned ? 1 : 0.4,
        filter: earned ? 'none' : 'grayscale(0.7)',
        transition:'all 280ms var(--bounce)',
        transform:'scale(1)',
        position:'relative', overflow:'hidden',
      }}>

      {earned && <div style={{ position:'absolute', inset:0, background:`radial-gradient(circle at 50% 20%, ${color}10, transparent 65%)`, pointerEvents:'none' }}/>}

      <div style={{ width:52, height:52, borderRadius:'var(--r-md)', margin:'0 auto 12px', background:earned?`${color}18`:'var(--s4)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:earned?`0 0 20px ${color}35`:'none', transition:'all 280ms ease' }}>
        <span className="material-symbols-outlined" style={{ fontSize:24, color:earned?color:'var(--s6)', fontVariationSettings:"'FILL' 1" }}>{icon}</span>
      </div>

      <p style={{ fontSize:13, fontWeight:700, color:earned?'var(--t1)':'var(--t4)', marginBottom:4, lineHeight:1.3 }}>{title}</p>
      <p style={{ fontSize:11, color:'var(--t4)', lineHeight:1.4 }}>{desc}</p>

      {earned && earnedAt ? (
        <div style={{ marginTop:10, display:'inline-block', padding:'3px 10px', borderRadius:99, background:`${color}14`, color, fontSize:10, fontWeight:700 }}>
          ✓ {fmt.shortDate(earnedAt)}
        </div>
      ) : !earned && (
        <div style={{ marginTop:10, display:'flex', alignItems:'center', justifyContent:'center', gap:4 }}>
          <span className="material-symbols-outlined" style={{ fontSize:12, color:'var(--s6)' }}>lock</span>
          <span style={{ fontSize:10, color:'var(--s6)', fontWeight:600 }}>Locked</span>
        </div>
      )}
    </div>
  );
}

function DetailModal({ ach, onClose }) {
  const [msg,     setMsg]     = useState('');
  const [loading, setLoading] = useState(false);
  const { color, icon, title, desc, earnedAt } = ach;

  const { triggerConfetti } = usePremium();

  useEffect(() => {
    if (ach.earned) {
      triggerConfetti(window.innerWidth / 2, window.innerHeight / 2);
    }
    if (!AI.enabled()) return;
    setLoading(true);
    achievementMsg(title, { earnedAt }).then(r=>{ if(r) setMsg(r); }).finally(()=>setLoading(false));
  }, [title]);

  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:1000, display:'flex', alignItems:'flex-end', justifyContent:'center', background:'var(--overlay)', animation:'modalFadeIn 220ms ease both' }}>
      <div onClick={e=>e.stopPropagation()}
        style={{ width:'100%', maxWidth:420, borderRadius:'var(--r-xl) var(--r-xl) 0 0', overflow:'hidden', background:'var(--s2)', border:`1px solid ${color}35`, boxShadow:`var(--modal-sh), 0 0 60px ${color}20`, animation:'modalSlideUp 340ms var(--bounce) both' }}>

        {/* Hero */}
        <div style={{ padding:'36px 24px 22px', textAlign:'center', background:`radial-gradient(circle at 50% 0%, ${color}14, transparent 65%)` }}>
          <div style={{ width:76, height:76, borderRadius:'var(--r-xl)', margin:'0 auto 16px', background:`${color}18`, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:`0 0 40px ${color}50` }}>
            <span className="material-symbols-outlined" style={{ fontSize:36, color, fontVariationSettings:"'FILL' 1" }}>{icon}</span>
          </div>
          <h2 style={{ fontSize:22, fontWeight:800, color:'var(--t1)', letterSpacing:'-0.025em', marginBottom:8 }}>{title}</h2>
          <p style={{ fontSize:13, color:'var(--t3)', lineHeight:1.6 }}>{desc}</p>
          <p style={{ fontSize:12, color, marginTop:12, fontWeight:700 }}>Earned {fmt.date(earnedAt)}</p>
        </div>

        {/* AI message */}
        <div style={{ padding:'0 22px 22px' }}>
          {loading ? (
            <div style={{ padding:14, borderRadius:'var(--r-md)', background:'var(--s3)', display:'flex', gap:10, alignItems:'center' }}>
              <div className="ai-dots"><span/><span/><span/></div>
              <span style={{ fontSize:12, color:'var(--t3)' }}>AI writing your message…</span>
            </div>
          ) : msg ? (
            <div style={{ padding:14, borderRadius:'var(--r-md)', background:`${color}09`, border:`1px solid ${color}20` }}>
              <p style={{ fontSize:13, color:'var(--t2)', lineHeight:1.7, fontStyle:'italic' }}>"{msg}"</p>
            </div>
          ) : (
            <div style={{ padding:14, borderRadius:'var(--r-md)', background:'var(--s3)', textAlign:'center' }}>
              <p style={{ fontSize:13, color:'var(--t3)' }}>🎊 Congratulations on this achievement!</p>
            </div>
          )}
          <button onClick={onClose} className="btn btn-surface" style={{ width:'100%', marginTop:14, padding:'12px', borderRadius:'var(--r-md)' }}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ── Streak Calendar ───────────────────────────
function StreakGrid({ streak }) {
  const days = Array.from({length:28},(_,i)=>{
    const d=new Date(); d.setDate(d.getDate()-(27-i));
    return { date:d, active:27-i<streak, today:i===27 };
  });
  return (
    <div style={{ display:'flex',flexWrap:'wrap',gap:4, maxWidth:180 }}>
      {days.map((d,i)=>(
        <div key={i} style={{ width:22,height:22,borderRadius:6,background:d.today?'var(--p)':d.active?'rgba(9,205,131,0.38)':'var(--s4)',boxShadow:d.today?'0 0 10px rgba(9,205,131,0.55)':'none',transition:'all 0.3s ease',border:`1px solid ${d.today?'var(--p)':d.active?'rgba(9,205,131,0.25)':'rgba(255,255,255,0.03)'}` }} title={d.date.toLocaleDateString('en-IN',{day:'numeric',month:'short'})}/>
      ))}
    </div>
  );
}

// ── Insight Panel ────────────────────────────
function InsightPanel({ data }) {
  const [ins, setIns] = useState(null);
  const [loading, setLoading] = useState(false);
  useEffect(()=>{
    if (!AI.enabled()) return;
    setLoading(true);
    progressInsights(data).then(r=>{ if(r) setIns(r); }).finally(()=>setLoading(false));
  },[]);

  if (!AI.enabled() && !ins) return (
    <div className="card" style={{ padding:20,textAlign:'center' }}>
      <span className="material-symbols-outlined" style={{ fontSize:36,color:'var(--s6)',display:'block',marginBottom:8 }}>insights</span>
      <p style={{ fontSize:13,color:'var(--t3)' }}>Connect your API key in Settings to unlock deep analytics</p>
    </div>
  );

  return (
    <div className="card" style={{ padding:22,background:'linear-gradient(135deg,rgba(9,205,131,0.07),rgba(9,205,131,0.02))' }}>
      <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:16 }}>
        <div style={{ width:32,height:32,borderRadius:10,background:'rgba(9,205,131,0.12)',display:'flex',alignItems:'center',justifyContent:'center' }}>
          <span className="material-symbols-outlined" style={{ fontSize:16,color:'var(--p)',fontVariationSettings:"'FILL' 1" }}>insights</span>
        </div>
        <div>
          <p style={{ fontSize:10,fontWeight:700,color:'var(--p)',textTransform:'uppercase',letterSpacing:'0.08em' }}>Smart Analysis</p>
          {ins && <p style={{ fontSize:13,fontWeight:700,color:'var(--t1)',marginTop:1 }}>{ins.headline}</p>}
        </div>
        {ins && (
          <div style={{ marginLeft:'auto',display:'flex',alignItems:'center',gap:6,padding:'5px 12px',borderRadius:999,background:`${ins.trend==='improving'?'rgba(9,205,131,0.12)':ins.trend==='declining'?'rgba(255,107,107,0.12)':'rgba(233,205,110,0.12)'}`,border:`1px solid ${ins.trend==='improving'?'rgba(9,205,131,0.25)':ins.trend==='declining'?'rgba(255,107,107,0.25)':'rgba(233,205,110,0.25)'}` }}>
            <span className="material-symbols-outlined" style={{ fontSize:14,color:ins.trend==='improving'?'var(--p)':ins.trend==='declining'?'var(--danger)':'var(--warn)' }}>{ins.trend==='improving'?'trending_up':ins.trend==='declining'?'trending_down':'trending_flat'}</span>
            <span style={{ fontSize:11,fontWeight:700,color:ins.trend==='improving'?'var(--p)':ins.trend==='declining'?'var(--danger)':'var(--warn)',textTransform:'capitalize' }}>{ins.trend}</span>
          </div>
        )}
      </div>

      {loading && <div style={{ display:'flex',alignItems:'center',gap:10 }}><div className="ai-dots"><span/><span/><span/></div><p style={{ fontSize:13,color:'var(--t3)' }}>Analyzing your progress…</p></div>}

      {ins && <>
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:14 }}>
          <div style={{ padding:'12px 14px',borderRadius:'var(--r-md)',background:'rgba(9,205,131,0.06)',border:'1px solid rgba(9,205,131,0.12)' }}>
            <p style={{ fontSize:10,fontWeight:700,color:'var(--p)',textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:6 }}>✦ Strengths</p>
            {(ins.strengths||[]).slice(0,2).map((s,i)=><p key={i} style={{ fontSize:12,color:'var(--t2)',lineHeight:1.5,marginBottom:3 }}>• {s}</p>)}
          </div>
          <div style={{ padding:'12px 14px',borderRadius:'var(--r-md)',background:'rgba(233,205,110,0.06)',border:'1px solid rgba(233,205,110,0.12)' }}>
            <p style={{ fontSize:10,fontWeight:700,color:'var(--warn)',textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:6 }}>↗ Focus On</p>
            {(ins.improvements||[]).slice(0,2).map((s,i)=><p key={i} style={{ fontSize:12,color:'var(--t2)',lineHeight:1.5,marginBottom:3 }}>• {s}</p>)}
          </div>
        </div>
        {ins.prediction && <div style={{ padding:'10px 14px',borderRadius:'var(--r-md)',background:'rgba(96,165,250,0.07)',border:'1px solid rgba(96,165,250,0.15)',marginBottom:12 }}><p style={{ fontSize:12,color:'var(--t2)' }}><span style={{ fontWeight:700,color:'#60a5fa' }}>📈 </span>{ins.prediction}</p></div>}
        {ins.encouragement && <p style={{ fontSize:13,fontStyle:'italic',color:'var(--t2)',borderLeft:'2px solid rgba(9,205,131,0.3)',paddingLeft:12,lineHeight:1.65 }}>"{ins.encouragement}"</p>}
        {ins.burnoutRisk && ins.burnoutRisk!=='low' && <div style={{ marginTop:12,padding:'10px 14px',borderRadius:'var(--r-md)',background:'rgba(255,107,107,0.06)',border:'1px solid rgba(255,107,107,0.2)',display:'flex',gap:8 }}><span className="material-symbols-outlined" style={{ fontSize:15,color:'var(--danger)',flexShrink:0 }}>warning</span><p style={{ fontSize:12,color:'var(--danger)' }}>Burnout risk: <strong>{ins.burnoutRisk}</strong>. Consider a lighter schedule or rest day.</p></div>}
      </>}
    </div>
  );
}

// ── Daily Report Modal ─────────────────────────
function ReportModal({ data, onClose }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!AI.enabled()) {
       setErr('Please add your API key in Settings to unlock the Report feature.');
       return;
    }
    setLoading(true);
    generateDailyReport(data)
      .then(r => { if(r) setReport(r); else setErr('Failed to generate report.'); })
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false));
  }, [data]);

  const gradeColor = (g) => {
    if(g.startsWith('A')) return '#10b981';
    if(g.startsWith('B')) return '#3b82f6';
    if(g.startsWith('C')) return '#e9cd6e';
    if(g.startsWith('D')) return '#f97316';
    return '#ff6b6b';
  };

  return (
    <div onClick={onClose} style={{ position:'fixed',inset:0,zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:'20px',background:'var(--overlay)',animation:'modalFadeIn 220ms ease both' }}>
      <div onClick={e=>e.stopPropagation()} style={{ width:'100%',maxWidth:600,maxHeight:'90vh',display:'flex',flexDirection:'column',background:'var(--s2)',border:'1px solid var(--card-b-h)',borderRadius:'var(--r-xl)',boxShadow:'var(--modal-sh)',animation:'scaleIn 340ms var(--bounce) both' }}>
        
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'18px 24px',borderBottom:'1px solid rgba(255,255,255,0.05)',flexShrink:0, background:'rgba(255,255,255,0.01)' }}>
          <div style={{ display:'flex',alignItems:'center',gap:10 }}>
            <span className="material-symbols-outlined" style={{ fontSize:20,color:'var(--p)',fontVariationSettings:"'FILL' 1" }}>history_edu</span>
            <span style={{ fontSize:16,fontWeight:800,color:'var(--t1)' }}>Daily Report Card</span>
          </div>
          <button onClick={onClose} className="icon-btn"><span className="material-symbols-outlined" style={{ fontSize:20 }}>close</span></button>
        </div>

        <div style={{ padding:'24px',display:'flex',flexDirection:'column',gap:20,overflowY:'auto' }}>
          {err ? (
             <div style={{ textAlign:'center', padding:'40px 20px' }}>
                <span className="material-symbols-outlined" style={{ fontSize:40, color:'var(--danger)', marginBottom:12 }}>error</span>
                <p style={{ color:'var(--t2)', fontSize:14 }}>{err}</p>
             </div>
          ) : loading || !report ? (
             <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'60px 20px', gap:16 }}>
               <div className="spinner" style={{ width:30, height:30, borderWidth:3, borderColor:'var(--p) transparent var(--p) transparent' }} />
               <p style={{ color:'var(--t3)', fontSize:13, fontWeight:700 }}>Evaluating your performance...</p>
             </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:24, animation:'fadeIn 400ms ease' }}>
               
               {/* Header / Grade */}
               <div style={{ display:'flex', alignItems:'center', gap:20, padding:'20px', background:'var(--s3)', borderRadius:'var(--r-lg)', border:'1px solid var(--surface-b)' }}>
                 <div style={{ width:80, height:80, borderRadius:20, background:gradeColor(report.grade)+'15', border:`2px solid ${gradeColor(report.grade)}40`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <span style={{ fontSize:36, fontWeight:900, color:gradeColor(report.grade), letterSpacing:'-0.05em' }}>{report.grade}</span>
                 </div>
                 <div>
                   <h3 style={{ fontSize:18, fontWeight:800, color:'var(--t1)', marginBottom:6 }}>{report.score}/100 Score</h3>
                   <p style={{ fontSize:13, color:'var(--t2)', lineHeight:1.5 }}>{report.summary}</p>
                 </div>
               </div>

               {/* Metrics */}
               <div>
                  <h4 style={{ fontSize:12, fontWeight:800, color:'var(--t4)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:12 }}>Core Metrics</h4>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(140px, 1fr))', gap:12 }}>
                    {Object.entries(report.metrics||{}).map(([k,v]) => (
                      <div key={k} style={{ padding:'12px', background:'var(--s1)', borderRadius:'var(--r-md)', border:'1px solid var(--surface-b)' }}>
                         <p style={{ fontSize:10, fontWeight:700, color:'var(--t4)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:4 }}>{k}</p>
                         <p style={{ fontSize:13, fontWeight:800, color:'var(--t2)' }}>{v}</p>
                      </div>
                    ))}
                  </div>
               </div>

               {/* Achievements & Missed */}
               <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:16 }}>
                 <div style={{ padding:'16px', background:'rgba(16,185,129,0.05)', borderRadius:'var(--r-md)', border:'1px solid rgba(16,185,129,0.15)' }}>
                    <h4 style={{ fontSize:12, fontWeight:800, color:'#10b981', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:10 }}>Achievements</h4>
                    <ul style={{ margin:0, paddingLeft:20, color:'var(--t2)', fontSize:13, lineHeight:1.6 }}>
                      {report.achievements?.map((a,i) => <li key={i}>{a}</li>)}
                    </ul>
                 </div>
                 <div style={{ padding:'16px', background:'rgba(255,107,107,0.05)', borderRadius:'var(--r-md)', border:'1px solid rgba(255,107,107,0.15)' }}>
                    <h4 style={{ fontSize:12, fontWeight:800, color:'#ff6b6b', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:10 }}>Needs Work</h4>
                    <ul style={{ margin:0, paddingLeft:20, color:'var(--t2)', fontSize:13, lineHeight:1.6 }}>
                      {report.missedOpportunities?.map((a,i) => <li key={i}>{a}</li>)}
                    </ul>
                 </div>
               </div>

               {/* Action Plan */}
               <div style={{ padding:'16px', background:'rgba(59,130,246,0.05)', borderRadius:'var(--r-md)', border:'1px solid rgba(59,130,246,0.15)' }}>
                  <h4 style={{ fontSize:12, fontWeight:800, color:'#3b82f6', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:10, display:'flex', alignItems:'center', gap:6 }}><span className="material-symbols-outlined" style={{ fontSize:16 }}>calendar_today</span> Tomorrow's Action Plan</h4>
                  <ul style={{ margin:0, paddingLeft:20, color:'var(--t2)', fontSize:13, lineHeight:1.6 }}>
                    {report.tomorrowActionPlan?.map((a,i) => <li key={i}>{a}</li>)}
                  </ul>
               </div>

            </div>
          )}
        </div>
        
        {report && !loading && (
          <div style={{ padding:'16px 24px', borderTop:'1px solid var(--surface-b)', background:'var(--s1)', textAlign:'center' }}>
             <button onClick={onClose} className="btn btn-surface" style={{ padding:'10px 30px', fontWeight:700 }}>Close Report</button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────
export default function Progress() {
  const { progress, tasks, notes, videos, allAchs } = useApp();
  const location = useLocation();
  const [tab, setTab] = useState(location.state?.tab || 'overview');

  // Sync tab if location state changes (e.g. clicking Badges while on Progress page)
  useEffect(() => {
    if (location.state?.tab) setTab(location.state.tab);
  }, [location.state]);
  const [showReport, setShowReport] = useState(false);
  const [cat, setCat] = useState('All');
  const [selectedAch, setSelectedAch] = useState(null);

  const weekData = DAYS.map((d,i) => ({ d, v: progress?.weeklyHours?.[i] ?? 0 }));
  const avg = useMemo(() => overallProgress(progress?.subjects), [progress?.subjects]);
  const subList = Object.entries(progress?.subjects||{});

  const reportData = {
     streak: progress?.streak || 0,
     focusHoursThisWeek: progress?.thisWeekHours || 0,
     pendingTasks: tasks.filter(t => t.status === 'pending').map(t => t.title),
     completedTasks: tasks.filter(t => t.status === 'completed').length,
     totalNotes: notes?.length || 0,
     watchedVideos: videos?.filter(v => v.watched).length || 0
  };

  return (
    <div className="page">
      <style>{`@keyframes barPop{ from{opacity:0;transform:scaleY(0.2)} to{opacity:1;transform:scaleY(1)} }`}</style>

      <div className="fadeup" style={{ marginBottom:24, display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:16 }}>
        <div>
          <h1 className="shimmer-text page-title">Progress</h1>
          <p style={{ fontSize:13,color:'var(--t3)',marginTop:4 }}>Your complete learning picture</p>
        </div>
        <button onClick={() => setShowReport(true)} className="btn" style={{ display:'flex', gap:8, alignItems:'center', background:'linear-gradient(135deg, rgba(167, 139, 250, 0.15), rgba(124, 58, 237, 0.05))', border:'1px solid rgba(167, 139, 250, 0.3)', color:'#a78bfa', padding:'10px 20px', borderRadius:'var(--r-md)', fontWeight:700, fontSize:13, boxShadow:'var(--sh)' }}>
          <span className="material-symbols-outlined" style={{ fontSize:18 }}>summarize</span> Generate Daily Report
        </button>
      </div>

      {/* Tab bar */}
      <div className="fadeup d1" style={{ display:'flex',gap:4,padding:'4px',background:'var(--s2)',border:'1px solid rgba(9,205,131,0.07)',borderRadius:'var(--r-lg)',marginBottom:22,width:'fit-content',maxWidth:'100%',overflowX:'auto',WebkitOverflowScrolling:'touch' }}>
        {['overview','subjects','insights','badges'].map(t=>(
          <button key={t} onClick={()=>setTab(t)} style={{ padding:'8px 18px',borderRadius:'var(--r-md)',border:'none',cursor:'pointer',fontWeight:700,fontSize:13,textTransform:'capitalize',background:tab===t?'var(--s4)':'transparent',color:tab===t?'var(--p)':'var(--t3)',transition:'all 200ms var(--bounce)',whiteSpace:'nowrap',flexShrink:0 }}>{t}</button>
        ))}
      </div>

      {/* OVERVIEW */}
      {tab==='overview' && <>
        {/* Mastery ring + stats */}
        <div className="card fadeup d2" style={{ padding:24,marginBottom:16,display:'flex',alignItems:'center',gap:24,flexWrap:'wrap' }}>
          <Ring pct={avg} size={170} stroke={11}>
            <p style={{ fontSize:36,fontWeight:800,color:'var(--t1)',letterSpacing:'-0.03em',lineHeight:1 }}><Counter value={avg} suffix="%"/></p>
            <p style={{ fontSize:10,fontWeight:700,color:'var(--p)',textTransform:'uppercase',letterSpacing:'0.08em',marginTop:5 }}>Overall Mastery</p>
            {progress?.streak>3 && <p style={{ fontSize:10,color:'var(--t4)',marginTop:3 }}>Flow state reached</p>}
          </Ring>
          <div style={{ flex:1,minWidth:180 }}>
            <div style={{ display:'flex',alignItems:'center',gap:7,marginBottom:8 }}>
              <div className="pulse-dot"/>
              <p style={{ fontSize:10,fontWeight:700,color:'var(--p)',textTransform:'uppercase',letterSpacing:'0.08em' }}>Daily Goal Reached</p>
            </div>
            <h3 style={{ fontSize:'clamp(1rem,2.5vw,1.35rem)',fontWeight:800,color:'var(--t1)',letterSpacing:'-0.025em',marginBottom:6 }}>Your Progress</h3>
            <p style={{ fontSize:13,color:'var(--t3)',marginBottom:16,lineHeight:1.6 }}>{progress?.streak>3?`You've reached flow state for ${progress.streak} consecutive days.`:'Build consistency to reach your flow state.'}</p>
            <div className="grid-4">
              {[
                { l:'Total Hours',  v:progress?.totalHours||0,   c:'var(--p)', s:'h'      },
                { l:'Streak',       v:progress?.streak||0,       c:'var(--warn)', s:'d'   },
                { l:'Tasks Done',   v:progress?.tasksCompleted||0,   c:'#60a5fa'   },
                { l:'Best Streak',  v:progress?.bestStreak||0,   c:'#a78bfa', s:'d' },
              ].map(({ l,v,c,s }) => (
                <div key={l} style={{ textAlign:'center',padding:'10px 6px',borderRadius:'var(--r-md)',background:'var(--s3)' }}>
                  <p style={{ fontSize:18,fontWeight:800,color:c,lineHeight:1 }}><Counter value={v} suffix={s}/></p>
                  <p style={{ fontSize:10.5,color:'var(--t4)',marginTop:3 }}>{l}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Activity bars */}
        <div className="card fadeup d3" style={{ padding:22,marginBottom:16 }}>
          <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16,flexWrap:'wrap',gap:12 }}>
            <div>
              <p className="section-label" style={{ marginBottom:3 }}>Activity Velocity</p>
              <p style={{ fontSize:14,fontWeight:700,color:'var(--t2)' }}>Weekly Focus Distribution</p>
            </div>
            <div style={{ textAlign:'right' }}>
              <p style={{ fontSize:22,fontWeight:800,color:'var(--p)',letterSpacing:'-0.02em' }}>{progress?.thisWeekHours||0}h</p>
              <p style={{ fontSize:10.5,color:'var(--t4)' }}>This week</p>
            </div>
          </div>
          <PillBars data={weekData}/>
        </div>

        {/* Streak grid */}
        <div className="card fadeup d4" style={{ padding:22 }}>
          <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14,flexWrap:'wrap',gap:12 }}>
            <div>
              <p className="section-label" style={{ marginBottom:3 }}>Consistency</p>
              <p style={{ fontSize:14,fontWeight:700,color:'var(--t2)' }}>Last 28 Days</p>
            </div>
            <div style={{ display:'flex',gap:16 }}>
              <div style={{ textAlign:'right' }}><p style={{ fontSize:22,fontWeight:800,color:'var(--warn)',letterSpacing:'-0.02em' }}>🔥 {progress?.streak||0}</p><p style={{ fontSize:10,color:'var(--t4)' }}>Current</p></div>
              <div style={{ textAlign:'right' }}><p style={{ fontSize:22,fontWeight:800,color:'var(--p)',letterSpacing:'-0.02em' }}>{progress?.bestStreak||0}</p><p style={{ fontSize:10,color:'var(--t4)' }}>Best</p></div>
            </div>
          </div>
          <StreakGrid streak={progress?.streak||0}/>
        </div>
      </>}

      {/* SUBJECTS */}
      {tab==='subjects' && (
        <div className="card fadeup tilt-container" style={{ padding:24 }}>
          <h3 style={{ fontSize:15,fontWeight:800,color:'var(--t1)',marginBottom:20 }}>Subject Breakdown</h3>
          <div style={{ display:'flex',flexDirection:'column',gap:18 }}>
            {subList.length > 0 ? subList.map(([sub, data]) => {
              const c = SUBJECT_COLORS[sub] || 'var(--p)';
              return (
                <div key={sub} className="tilt-card">
                  <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8,flexWrap:'wrap',gap:8 }}>
                    <div style={{ display:'flex',alignItems:'center',gap:8,flexShrink:0 }}>
                      <div style={{ width:8,height:8,borderRadius:'50%',background:c,boxShadow:`0 0 6px ${c}` }}/>
                      <p style={{ fontSize:14,fontWeight:700,color:'var(--t1)' }}>{sub}</p>
                    </div>
                    <div style={{ display:'flex',alignItems:'center',gap:12,flexWrap:'wrap' }}>
                      <span style={{ fontSize:11,color:'var(--t4)',whiteSpace:'nowrap' }}>{data.hoursStudied}h · {data.tasksCompleted} tasks</span>
                      <span style={{ fontSize:11,fontWeight:700,padding:'2px 9px',borderRadius:99,background:`${c}14`,color:c,border:`1px solid ${c}25`,whiteSpace:'nowrap',flexShrink:0 }}>{data.trend||'+0%'}</span>
                      <span style={{ fontSize:18,fontWeight:800,color:c,letterSpacing:'-0.02em',minWidth:44,textAlign:'right',flexShrink:0 }}><Counter value={data.progress} suffix="%" /></span>
                    </div>
                  </div>
                  <div className="progress-track"><div className="progress-fill" style={{ width:`${data.progress}%`,background:`linear-gradient(90deg, color-mix(in srgb, ${c} 40%, transparent), ${c})`,boxShadow:`0 0 8px color-mix(in srgb, ${c} 25%, transparent)` }}/></div>
                </div>
              );
            }) : (
              <div style={{ textAlign:'center',padding:'40px 20px' }}>
                <p style={{ fontSize:13,color:'var(--t4)' }}>No subject data yet. Start your first focus session!</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* INSIGHTS */}
      {tab==='insights' && <div className="fadeup"><InsightPanel data={{ subjects:progress?.subjects, weeklyHours:progress?.weeklyHours, streak:progress?.streak, totalHours:progress?.totalHours }}/></div>}

      {/* BADGES */}
      {tab==='badges' && (
        <div className="fadeup">
          <div style={{ display:'flex', gap:6, overflowX:'auto', marginBottom:20, paddingBottom:4 }}>
            {CATS.map(c => (
              <button key={c} onClick={()=>setCat(c)}
                style={{ padding:'7px 16px', borderRadius:99, border:`1px solid ${cat===c?'var(--p)':'rgba(255,255,255,0.07)'}`, background:cat===c?'rgba(9,205,131,0.10)':'transparent', color:cat===c?'var(--p)':'var(--t3)', fontWeight:700, fontSize:12, cursor:'pointer', whiteSpace:'nowrap', transition:'all 180ms ease', flexShrink:0 }}>
                {c}
                <span style={{ marginLeft:5, padding:'1px 6px', borderRadius:99, background:'rgba(255,255,255,0.06)', fontSize:10 }}>
                  {c==='All'?allAchs.length:allAchs.filter(a=>a.cat===c).length}
                </span>
              </button>
            ))}
          </div>

          <div className="tilt-container" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))', gap:12 }}>
            {(cat==='All' ? allAchs : allAchs.filter(a=>a.cat===cat)).map((ach, i) => (
              <div key={ach.id} className="fadeup tilt-card" style={{ animationDelay:`${i*0.035}s` }}>
                <BadgeCard ach={ach} onClick={setSelectedAch}/>
              </div>
            ))}
          </div>
        </div>
      )}

      {showReport && <ReportModal data={reportData} onClose={() => setShowReport(false)} />}
      {selectedAch && <DetailModal ach={selectedAch} onClose={()=>setSelectedAch(null)}/>}
    </div>
  );
}
