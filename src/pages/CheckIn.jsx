import { useState, useEffect, useMemo } from 'react';
import { useApp } from '@context/AppContext';
import { moodCoaching, AI } from '@services/ai';
import { fmt } from '@utils';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { Reveal } from '@components/ui/PremiumUI';

const MOODS = [
  { v:1, e:'😞', l:'Terrible', c:'#ff6b6b' },
  { v:2, e:'😟', l:'Low',      c:'#fb923c' },
  { v:3, e:'😐', l:'Okay',     c:'#e9cd6e' },
  { v:4, e:'😊', l:'Good',     c:'var(--p)' },
  { v:5, e:'🤩', l:'Amazing',  c:'var(--p-lt)' },
];

const FOCUS_MODES = [
  { id: 'Deep Work', icon: 'psychiatry', desc: 'Intense uninterrupted focus' },
  { id: 'Light Admin', icon: 'task_alt', desc: 'Clearing small tasks & emails' },
  { id: 'Learning', icon: 'menu_book', desc: 'Absorbing new information' },
  { id: 'Creative', icon: 'draw', desc: 'Brainstorming & designing' },
  { id: 'Recovery', icon: 'spa', desc: 'Low friction, easy wins today' },
];

const BURNOUT_CFG = {
  low:      { l:'Optimal',     icon:'check_circle', c:'var(--p)', bg:'rgba(9,205,131,0.07)', desc:'You are in a great state. Push forward!' },
  medium:   { l:'Watch Out',   icon:'warning',      c:'#e9cd6e', bg:'rgba(233,205,110,0.07)', desc:'Some fatigue detected. Consider a balanced workload.' },
  high:     { l:'High Risk',   icon:'error',        c:'#fb923c', bg:'rgba(251,146,60,0.07)',  desc:'Burnout approaching. Prioritize recovery and essential tasks only.' },
  critical: { l:'Rest Now',    icon:'dangerous',    c:'#ff6b6b', bg:'rgba(255,107,107,0.07)', desc:'Critical burnout levels. Take a full day off to recharge.' },
};

function Slider({ icon, label, val, onChange, min, max, step=1, color='var(--p)' }) {
  const pct = ((val-min)/(max-min))*100;
  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span className="material-symbols-outlined" style={{ fontSize:18, color, fontVariationSettings:"'FILL' 1" }}>{icon}</span>
          <span style={{ fontSize:14, fontWeight:700, color:'var(--t2)' }}>{label}</span>
        </div>
        <span style={{ fontSize:18, fontWeight:800, color, fontVariantNumeric:'tabular-nums' }}>{val}</span>
      </div>
      <div style={{ position:'relative', height:8, background:'var(--s5)', borderRadius:99, border:'1px solid var(--surface-b)' }}>
        <div style={{ position:'absolute', left:0, height:'100%', width:`${pct}%`, background:`linear-gradient(90deg, color-mix(in srgb, ${color} 25%, transparent), ${color})`, borderRadius:99, boxShadow:`0 0 12px color-mix(in srgb, ${color} 40%, transparent)`, transition:'width 0.15s cubic-bezier(0.4, 0, 0.2, 1)' }}/>
        <input type="range" min={min} max={max} step={step} value={val}
          onChange={e=>onChange(Number(e.target.value))}
          style={{ position:'absolute', inset:0, width:'100%', opacity:0, cursor:'pointer', zIndex:2 }}/>
        <div style={{ position:'absolute', top:'50%', left:`${pct}%`, transform:'translate(-50%,-50%)', width:22, height:22, borderRadius:'50%', background:color, border:'4px solid var(--s1)', boxShadow:`0 4px 12px color-mix(in srgb, ${color} 50%, transparent)`, pointerEvents:'none', transition:'left 0.15s cubic-bezier(0.4, 0, 0.2, 1)' }}/>
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', marginTop:6 }}>
        <span style={{ fontSize:11, fontWeight:600, color:'var(--t4)' }}>{min}</span>
        <span style={{ fontSize:11, fontWeight:600, color:'var(--t4)' }}>{max}</span>
      </div>
    </div>
  );
}

export default function CheckIn() {
  const { checkIns, todayCI, burnout, tasks, A } = useApp();
  const [tab,       setTab]       = useState('checkin');
  
  const [mood,      setMood]      = useState(todayCI?.mood || 3);
  const [energy,    setEnergy]    = useState(todayCI?.energy || 6);
  const [sleep,     setSleep]     = useState(todayCI?.sleepHours || 7);
  const [stress,    setStress]    = useState(todayCI?.stressLevel || 4);
  const [focusMode, setFocusMode] = useState(todayCI?.focusMode || 'Deep Work');
  const [objective, setObjective] = useState(todayCI?.mainObjective || '');
  
  const [coaching,  setCoaching]  = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [done,      setDone]      = useState(!!todayCI);

  const bc = BURNOUT_CFG[burnout] || BURNOUT_CFG.low;

  const last7 = Array.from({ length:7 }, (_,i) => {
    const d = new Date(); d.setDate(d.getDate()-(6-i));
    return checkIns.find(c => c.date?.slice(0,10) === d.toISOString().slice(0,10)) || null;
  });

  const pendingTasksCount = useMemo(() => tasks.filter(t => t.status === 'pending').length, [tasks]);

  const submit = async () => {
    const data = { mood, energy, sleepHours:sleep, stressLevel:stress, focusMode, mainObjective:objective };
    
    if (AI.enabled()) {
      setAiLoading(true);
      try {
        const pendingTasks = tasks.filter(t=>t.status==='pending').map(t=>t.title);
        const r = await moodCoaching({ ...data, tasks: pendingTasks });
        if (r) {
          const msg = typeof r==='string' ? r : [r.greeting, r.message].filter(Boolean).join(' ');
          setCoaching({ ...r, message: msg });
          data.aiCoaching = msg;
          data.aiStrategy = JSON.stringify(r);
        }
      } finally { setAiLoading(false); }
    }
    
    A.checkin.add(data);
    setDone(true);
    toast.success('Calibration complete! Tactical strategy generated.');
    setTab('strategy');
  };

  const avg = key => checkIns.length
    ? (checkIns.slice(0,7).reduce((a,c)=>a+(c[key]||0),0)/Math.min(checkIns.length,7)).toFixed(1)
    : '—';

  return (
    <div className="page">
      {/* Header */}
      <Reveal delay={0}>
        <div style={{ marginBottom:32, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <h1 className="shimmer-text page-title">Daily Calibration</h1>
            <p style={{ fontSize:14, color:'var(--t3)', marginTop:6, maxWidth:500, lineHeight:1.6 }}>
              {done ? 'System calibrated for today. Review your tactical strategy.' : 'Log your biometrics and set your intentions for optimal AI task routing.'}
            </p>
          </div>
          {done && (
            <div style={{ display:'flex', alignItems:'center', gap:8, background:'rgba(9,205,131,0.1)', padding:'8px 16px', borderRadius:99, border:'1px solid rgba(9,205,131,0.2)' }}>
              <span className="material-symbols-outlined" style={{ fontSize:18, color:'var(--p)', fontVariationSettings:"'FILL' 1" }}>verified</span>
              <span style={{ fontSize:12, fontWeight:700, color:'var(--p)' }}>Calibrated</span>
            </div>
          )}
        </div>
      </Reveal>

      {/* Navigation */}
      <Reveal delay={100}>
        <div className="glass-sm" style={{ display:'flex', gap:4, padding:6, marginBottom:24, overflowX:'auto' }}>
          {[
            { id:'checkin',  icon:'tune',         label:'Calibration' },
            { id:'strategy', icon:'auto_awesome', label:'AI Strategy' },
            { id:'history',  icon:'analytics',    label:'Analytics'   },
          ].map(t => (
            <button key={t.id} onClick={()=>setTab(t.id)}
              style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'10px 16px', borderRadius:'var(--r-sm)', border:'none', cursor:'pointer', fontWeight:700, fontSize:13, whiteSpace:'nowrap', transition:'all 200ms ease', background:tab===t.id?'var(--p-sub)':'transparent', color:tab===t.id?'var(--p)':'var(--t3)', minWidth:120 }}>
              <span className="material-symbols-outlined" style={{ fontSize:18, fontVariationSettings:tab===t.id?"'FILL' 1":"'FILL' 0" }}>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      </Reveal>

      <div style={{ display:'grid', gridTemplateColumns:'1fr', gap:24 }}>
        <AnimatePresence mode="wait">
          {/* ─── CALIBRATION TAB ─── */}
          {tab==='checkin' && (
            <motion.div key="checkin" initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-10 }} style={{ display:'flex', flexDirection:'column', gap:24 }}>
              
              <div style={{ position:'relative', paddingTop:80 }}>
                {/* Shield-Arc Tactical Hub - Center-Locked */}
                <div style={{ 
                  position:'absolute', top:80, left:'50%', transform:'translateX(-50%)', 
                  zIndex:100, display:'flex', justifyContent:'center', width:180 
                }}>
                  <button 
                    onClick={submit} 
                    disabled={aiLoading}
                    className="card-hover"
                    style={{
                      width: 180,
                      height: 100,
                      borderRadius: '0 0 90px 90px',
                      background: done ? 'rgba(30, 41, 59, 0.95)' : 'radial-gradient(circle at top, var(--p), #0d9488)',
                      border: `1px solid ${done ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.2)'}`,
                      borderTop: 'none',
                      cursor: aiLoading ? 'wait' : 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4,
                      boxShadow: done ? '0 12px 32px rgba(0,0,0,0.4), inset 0 1px 1px rgba(255,255,255,0.1)' : '0 10px 40px var(--p-glow), inset 0 -4px 12px rgba(0,0,0,0.2)',
                      transition: 'all 0.4s var(--bounce)',
                      opacity: aiLoading ? 0.7 : 1,
                      overflow:'hidden',
                      position:'relative'
                    }}
                    onMouseEnter={e => {
                      if(!aiLoading) {
                        e.currentTarget.style.height = '110px';
                        e.currentTarget.style.width = '200px';
                        e.currentTarget.style.boxShadow = done ? '0 15px 40px rgba(0,0,0,0.5)' : '0 15px 50px var(--p-glow), inset 0 -4px 12px rgba(0,0,0,0.2)';
                      }
                    }}
                    onMouseLeave={e => {
                      if(!aiLoading) {
                        e.currentTarget.style.height = '100px';
                        e.currentTarget.style.width = '180px';
                      }
                    }}
                  >
                    {/* Subtle Internal Glow */}
                    <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:'rgba(255,255,255,0.1)' }} />
                    
                    {aiLoading ? (
                      <div className="spinner" style={{ width:24, height:24, borderWidth:3, borderColor:'white', borderTopColor:'transparent' }}/>
                    ) : (
                      <>
                        <span className="material-symbols-outlined" style={{ fontSize:28, color: '#ffffff', textShadow:'0 2px 4px rgba(0,0,0,0.3)' }}>
                          {done ? 'refresh' : 'auto_awesome'}
                        </span>
                        <p style={{ fontSize:11, fontWeight:900, color: '#ffffff', textTransform:'uppercase', letterSpacing:'0.2em', textShadow:'0 2px 4px rgba(0,0,0,0.3)' }}>
                          {done ? 'Recalibrate' : 'Initialize'}
                        </p>
                      </>
                    )}
                  </button>
                </div>

                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(360px, 1fr))', gap:24 }}>
                  {/* Left Col: Biometrics (Precision Shield Mask) */}
                  <div className="card" style={{ 
                    padding:32, 
                    position:'relative',
                    borderRadius: '24px',
                    WebkitMaskImage: 'radial-gradient(circle at calc(100% + 12px) 0px, transparent 90px, black 91px)',
                    maskImage: 'radial-gradient(circle at calc(100% + 12px) 0px, transparent 90px, black 91px)',
                    overflow:'hidden'
                  }}>
                    <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:28 }}>
                      <span className="material-symbols-outlined" style={{ fontSize:24, color:'var(--t2)' }}>monitor_heart</span>
                      <h3 style={{ fontSize:18, fontWeight:800, color:'var(--t1)' }}>Biometrics</h3>
                    </div>

                    {/* Mood pills */}
                    <div style={{ marginBottom:40 }}>
                      <p style={{ fontSize:13, fontWeight:700, color:'var(--t3)', marginBottom:16, textTransform:'uppercase', letterSpacing:'0.05em' }}>Current Mood</p>
                      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:8 }}>
                        {MOODS.map(m => (
                          <button key={m.v} onClick={()=>setMood(m.v)}
                            style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:10, padding:'16px 4px', borderRadius:'var(--r-md)', border:`2px solid ${mood===m.v?m.c:'var(--surface-b)'}`, background:mood===m.v?`${m.c}14`:'var(--s3)', cursor:'pointer', transition:'all 220ms var(--bounce)', transform:mood===m.v?'scale(1.05) translateY(-2px)':'scale(1)', boxShadow:mood===m.v?`0 8px 20px ${m.c}30`:'none' }}>
                            <span style={{ fontSize:28, lineHeight:1, filter:mood!==m.v?'grayscale(100%) opacity(50%)':'none' }}>{m.e}</span>
                            <span style={{ fontSize:11, fontWeight:800, color:mood===m.v?m.c:'var(--t4)' }}>{m.l}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div style={{ display:'flex', flexDirection:'column', gap:32 }}>
                      <Slider icon="bolt"    label="Energy Level"    val={energy} onChange={setEnergy} min={1} max={10} color={energy>=7?'var(--p)':energy>=4?'#e9cd6e':'#ff6b6b'}/>
                      <Slider icon="bedtime" label="Sleep Duration" val={sleep}  onChange={setSleep}  min={3} max={12} step={0.5} color={sleep>=7?'#60a5fa':sleep>=5?'#e9cd6e':'#ff6b6b'}/>
                      <Slider icon="vital_signs" label="Stress Level" val={stress} onChange={setStress} min={1} max={10} color={stress<=4?'var(--p)':stress<=7?'#e9cd6e':'#ff6b6b'}/>
                    </div>
                  </div>

                  {/* Right Col: Intentions (Precision Shield Mask) */}
                  <div className="card" style={{ 
                    padding:32, 
                    display:'flex', 
                    flexDirection:'column',
                    position:'relative',
                    borderRadius: '24px',
                    WebkitMaskImage: 'radial-gradient(circle at calc(0% - 12px) 0px, transparent 90px, black 91px)',
                    maskImage: 'radial-gradient(circle at calc(0% - 12px) 0px, transparent 90px, black 91px)',
                    overflow:'hidden'
                  }}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'flex-start', gap:12, marginBottom:28, paddingLeft: 64 }}>
                      <span className="material-symbols-outlined" style={{ fontSize:24, color:'var(--t2)' }}>flag</span>
                      <h3 style={{ fontSize:18, fontWeight:800, color:'var(--t1)' }}>Daily Intentions</h3>
                    </div>

                    {/* Objective */}
                    <div style={{ marginBottom:32, display:'flex', flexDirection:'column', alignItems:'flex-start', paddingLeft: 64 }}>
                      <p style={{ fontSize:14, fontWeight:700, color:'var(--t3)', marginBottom:16, textTransform:'uppercase', letterSpacing:'0.05em', textAlign:'left' }}>Main Objective</p>
                      <textarea 
                        className="input"
                        placeholder="What is the #1 thing you want to accomplish?"
                        value={objective}
                        onChange={e=>setObjective(e.target.value)}
                        style={{ width:'calc(100% + 20px)', marginLeft: -20, minHeight:120, padding:20, fontSize:16, lineHeight:1.6, resize:'vertical', background:'var(--s1)', transition:'all 0.2s ease', border:`1px solid ${objective?'var(--p-border)':'var(--surface-b)'}`, boxShadow:objective?'0 0 0 4px var(--p-sub)':'none', textAlign:'left' }}
                      />
                    </div>

                    {/* Focus Mode */}
                    <div>
                      <p style={{ fontSize:14, fontWeight:700, color:'var(--t3)', marginBottom:16, textTransform:'uppercase', letterSpacing:'0.05em' }}>Target Focus Mode</p>
                      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                        {FOCUS_MODES.map(fm => (
                          <button key={fm.id} onClick={()=>setFocusMode(fm.id)}
                            style={{ display:'flex', alignItems:'center', gap:16, padding:'16px 20px', borderRadius:'var(--r-lg)', border:`1px solid ${focusMode===fm.id?'var(--p)':'var(--surface-b)'}`, background:focusMode===fm.id?'var(--p-sub)':'var(--s3)', cursor:'pointer', transition:'all 0.2s ease', textAlign:'left' }}>
                            <span className="material-symbols-outlined" style={{ fontSize:22, color:focusMode===fm.id?'var(--p)':'var(--t4)' }}>{fm.icon}</span>
                            <div>
                              <p style={{ fontSize:15, fontWeight:800, color:focusMode===fm.id?'var(--p)':'var(--t1)' }}>{fm.id}</p>
                              <p style={{ fontSize:13, color:focusMode===fm.id?'var(--p)':'var(--t4)', opacity:0.8 }}>{fm.desc}</p>
                            </div>
                            {focusMode===fm.id && <span className="material-symbols-outlined" style={{ marginLeft:'auto', color:'var(--p)', fontSize:22, fontVariationSettings:"'FILL' 1" }}>check_circle</span>}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ─── STRATEGY TAB ─── */}
          {tab==='strategy' && (
            <motion.div key="strategy" initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-10 }}>
              {done ? (
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(340px, 1fr))', gap:24 }}>
                  {/* AI Strategy Card */}
                  <div className="card" style={{ padding:32, position:'relative', overflow:'hidden', border:'1px solid var(--p-border)', background:'linear-gradient(145deg, var(--s1), var(--s2))' }}>
                    <div style={{ position:'absolute', top:0, right:0, width:200, height:200, background:'radial-gradient(circle, rgba(9,205,131,0.08), transparent 70%)', borderRadius:'50%' }}/>
                    
                    <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24 }}>
                      <div style={{ width:40, height:40, borderRadius:'12px', background:'var(--p-sub)', display:'flex', alignItems:'center', justifyContent:'center', border:'1px solid var(--p-border)' }}>
                        <span className="material-symbols-outlined" style={{ fontSize:20, color:'var(--p)', fontVariationSettings:"'FILL' 1" }}>psychiatry</span>
                      </div>
                      <div>
                        <p style={{ fontSize:11, fontWeight:800, color:'var(--p)', textTransform:'uppercase', letterSpacing:'0.1em' }}>Aura Strategy Protocol</p>
                        <p style={{ fontSize:13, color:'var(--t3)' }}>Based on your calibration</p>
                      </div>
                    </div>

                    {(coaching || todayCI?.aiStrategy || todayCI?.aiCoaching) ? (
                      <div style={{ display:'flex', flexDirection:'column', gap:20, position:'relative', zIndex:2 }}>
                        {(() => {
                          const strategy = coaching || (todayCI?.aiStrategy ? JSON.parse(todayCI.aiStrategy) : null);
                          if (!strategy) return <p style={{ fontSize:15, fontStyle:'italic', color:'var(--t2)' }}>"{todayCI?.aiCoaching}"</p>;
                          return (
                            <>
                              <h2 style={{ fontSize:22, fontWeight:800, color:'var(--t1)', lineHeight:1.4 }}>{strategy.greeting}</h2>
                              
                              <div style={{ padding:'16px 20px', borderRadius:'var(--r-md)', background:'var(--s0)', border:'1px solid var(--surface-b)', borderLeft:'3px solid var(--p)' }}>
                                <p style={{ fontSize:12, fontWeight:800, color:'var(--t3)', marginBottom:8, textTransform:'uppercase', letterSpacing:'0.05em', display:'flex', alignItems:'center', gap:6 }}>
                                  <span className="material-symbols-outlined" style={{ fontSize:16, color:'var(--p)' }}>target</span>
                                  Tactical Recommendation
                                </p>
                                <p style={{ fontSize:15, color:'var(--t1)', lineHeight:1.6, fontWeight:500 }}>{strategy.recommendation}</p>
                              </div>

                              <div style={{ display:'flex', gap:12 }}>
                                <div style={{ flex:1, padding:16, borderRadius:'var(--r-md)', background:'var(--s0)', border:'1px solid var(--surface-b)' }}>
                                  <span className="material-symbols-outlined" style={{ fontSize:18, color:'#60a5fa', marginBottom:6 }}>timer</span>
                                  <p style={{ fontSize:11, color:'var(--t4)', fontWeight:700, textTransform:'uppercase' }}>Session Length</p>
                                  <p style={{ fontSize:16, fontWeight:800, color:'var(--t1)' }}>{strategy.durationMinutes} mins</p>
                                </div>
                                <div style={{ flex:1, padding:16, borderRadius:'var(--r-md)', background:'var(--s0)', border:'1px solid var(--surface-b)' }}>
                                  <span className="material-symbols-outlined" style={{ fontSize:18, color:'#a78bfa', marginBottom:6 }}>self_improvement</span>
                                  <p style={{ fontSize:11, color:'var(--t4)', fontWeight:700, textTransform:'uppercase' }}>Optimal Break</p>
                                  <p style={{ fontSize:14, fontWeight:600, color:'var(--t1)' }}>{strategy.breakActivity}</p>
                                </div>
                              </div>

                              {strategy.warningFlag && (
                                <div style={{ padding:'12px 16px', borderRadius:'var(--r-md)', background:'rgba(255,107,107,0.08)', border:'1px solid rgba(255,107,107,0.2)', display:'flex', gap:10 }}>
                                  <span className="material-symbols-outlined" style={{ fontSize:18, color:'#ff6b6b' }}>warning</span>
                                  <p style={{ fontSize:13, color:'#ff6b6b', fontWeight:600 }}>{strategy.warningFlag}</p>
                                </div>
                              )}

                              <p style={{ fontSize:15, fontStyle:'italic', color:'var(--t2)', textAlign:'center', marginTop:10, fontWeight:600 }}>
                                "{strategy.message}"
                              </p>
                            </>
                          );
                        })()}
                      </div>
                    ) : (
                      <p style={{ fontSize:15, fontStyle:'italic', color:'var(--t2)' }}>Calibration insight unavailable.</p>
                    )}
                  </div>

                  {/* Context Overview */}
                  <div style={{ display:'flex', flexDirection:'column', gap:24 }}>
                    <div className="card" style={{ padding:24 }}>
                      <p style={{ fontSize:12, fontWeight:800, color:'var(--t3)', marginBottom:16, textTransform:'uppercase', letterSpacing:'0.05em' }}>Today's Context</p>
                      
                      <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
                        <div style={{ display:'flex', gap:16 }}>
                          <div style={{ flex:1, background:'var(--s3)', padding:16, borderRadius:'var(--r-md)', textAlign:'center' }}>
                            <span style={{ fontSize:28, display:'block', marginBottom:4 }}>{MOODS.find(m=>m.v===(todayCI?.mood||mood))?.e||'😐'}</span>
                            <p style={{ fontSize:11, fontWeight:700, color:'var(--t4)', textTransform:'uppercase' }}>Mood</p>
                          </div>
                          <div style={{ flex:1, background:'var(--s3)', padding:16, borderRadius:'var(--r-md)', textAlign:'center' }}>
                            <span className="material-symbols-outlined" style={{ fontSize:28, color:'var(--p)', marginBottom:4 }}>bolt</span>
                            <p style={{ fontSize:11, fontWeight:700, color:'var(--t4)', textTransform:'uppercase' }}>Energy</p>
                            <p style={{ fontSize:14, fontWeight:800, color:'var(--t1)' }}>{todayCI?.energy||energy}/10</p>
                          </div>
                        </div>
                        
                        <div style={{ background:'var(--s3)', padding:16, borderRadius:'var(--r-md)' }}>
                          <p style={{ fontSize:11, fontWeight:700, color:'var(--t4)', textTransform:'uppercase', marginBottom:4 }}>Primary Objective</p>
                          <p style={{ fontSize:15, fontWeight:600, color:'var(--t1)' }}>{todayCI?.mainObjective || objective || 'None set'}</p>
                        </div>

                        <div style={{ background:'var(--s3)', padding:16, borderRadius:'var(--r-md)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                          <div>
                            <p style={{ fontSize:11, fontWeight:700, color:'var(--t4)', textTransform:'uppercase', marginBottom:2 }}>Pending Tasks</p>
                            <p style={{ fontSize:18, fontWeight:800, color:'var(--t1)' }}>{pendingTasksCount}</p>
                          </div>
                          <div style={{ width:40, height:40, borderRadius:'50%', background:'var(--s1)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                            <span className="material-symbols-outlined" style={{ fontSize:20, color:'var(--p)' }}>fact_check</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Burnout card */}
                    <div style={{ padding:20, borderRadius:'var(--r-lg)', background:bc.bg, border:`1px solid ${bc.c}25` }}>
                      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                        <span className="material-symbols-outlined" style={{ fontSize:24, color:bc.c, fontVariationSettings:"'FILL' 1" }}>{bc.icon}</span>
                        <div>
                          <p style={{ fontSize:10, fontWeight:800, color:bc.c, textTransform:'uppercase', letterSpacing:'0.08em' }}>Burnout Risk</p>
                          <p style={{ fontSize:16, fontWeight:800, color:bc.c }}>{bc.l}</p>
                        </div>
                      </div>
                      <p style={{ fontSize:13, color:'var(--t2)', marginTop:12, lineHeight:1.6, fontWeight:500 }}>{bc.desc}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="card empty-state" style={{ minHeight:400 }}>
                  <span className="material-symbols-outlined" style={{ fontSize:48, color:'var(--s6)' }}>auto_awesome</span>
                  <h3 style={{ fontWeight:800, color:'var(--t1)', margin:'16px 0 8px', fontSize:20 }}>System Uncalibrated</h3>
                  <p style={{ color:'var(--t3)', maxWidth:400, margin:'0 auto 24px', lineHeight:1.6 }}>Please complete your daily calibration to generate your personalized tactical strategy.</p>
                  <button onClick={()=>setTab('checkin')} className="btn btn-primary" style={{ padding:'12px 24px', fontSize:15, fontWeight:700 }}>Calibrate Now</button>
                </div>
              )}
            </motion.div>
          )}

          {/* ─── HISTORY TAB ─── */}
          {tab==='history' && (
            <motion.div key="history" initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-10 }}>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(300px, 1fr))', gap:24 }}>
                <div style={{ display:'flex', flexDirection:'column', gap:24 }}>
                  <div className="card" style={{ padding:24 }}>
                    <p style={{ fontSize:13, fontWeight:800, color:'var(--t3)', marginBottom:20, textTransform:'uppercase', letterSpacing:'0.05em' }}>7-Day Biometric Trend</p>
                    <div style={{ display:'flex', gap:8, alignItems:'flex-end', height:120, borderBottom:'1px solid var(--surface-b)', paddingBottom:12 }}>
                      {last7.map((ci, i) => {
                        const m = ci ? MOODS.find(x=>x.v===ci.mood) : null;
                        const day = ['M','T','W','T','F','S','S'][i];
                        const heightPct = ci ? (ci.energy / 10) * 100 : 0;
                        return (
                          <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:8, height:'100%', justifyContent:'flex-end' }}>
                            {ci && <div style={{ width:6, height:`${heightPct}%`, background:m.c, borderRadius:99, opacity:0.8 }}/>}
                            <span style={{ fontSize:ci?20:14, opacity:ci?1:0.3, lineHeight:1 }}>{ci ? m?.e : '○'}</span>
                            <span style={{ fontSize:10, color:i===6?'var(--p)':'var(--t4)', fontWeight:700 }}>{day}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="card" style={{ padding:24 }}>
                    <p style={{ fontSize:13, fontWeight:800, color:'var(--t3)', marginBottom:20, textTransform:'uppercase', letterSpacing:'0.05em' }}>7-Day Averages</p>
                    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
                      {[
                        { l:'Mood',   v:avg('mood'),       icon:'sentiment_satisfied', c:'var(--p)'   },
                        { l:'Energy', v:avg('energy'),     icon:'bolt',                c:'#e9cd6e'    },
                        { l:'Sleep',  v:`${avg('sleepHours')}h`, icon:'bedtime',      c:'#60a5fa'    },
                        { l:'Stress', v:avg('stressLevel'),icon:'vital_signs',         c:'#ff6b6b'    },
                      ].map(({ l, v, icon, c }) => (
                        <div key={l} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', background:'var(--s0)', borderRadius:'var(--r-md)', border:'1px solid var(--surface-b)' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                            <span className="material-symbols-outlined" style={{ fontSize:20, color:c, fontVariationSettings:"'FILL' 1" }}>{icon}</span>
                            <span style={{ fontSize:14, fontWeight:600, color:'var(--t2)' }}>{l}</span>
                          </div>
                          <span style={{ fontSize:18, fontWeight:800, color:c }}>{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="card" style={{ padding:24, flex:1 }}>
                  <p style={{ fontSize:13, fontWeight:800, color:'var(--t3)', marginBottom:20, textTransform:'uppercase', letterSpacing:'0.05em' }}>Log History</p>
                  {checkIns.length > 0 ? (
                    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                      {checkIns.slice(0,10).map((ci, i) => {
                        const m = MOODS.find(x=>x.v===ci.mood) || MOODS[2];
                        return (
                          <div key={ci.id} style={{ padding:'16px', borderRadius:'var(--r-md)', background:'var(--s0)', border:'1px solid var(--surface-b)', borderLeft:`4px solid ${m.c}` }}>
                            <div style={{ display:'flex', gap:14 }}>
                              <span style={{ fontSize:28, flexShrink:0, lineHeight:1 }}>{m.e}</span>
                              <div style={{ flex:1, minWidth:0 }}>
                                <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:8 }}>
                                  <span style={{ fontSize:14, fontWeight:800, color:m.c }}>{m.l}</span>
                                  <span style={{ fontSize:11, padding:'4px 10px', borderRadius:99, background:'rgba(9,205,131,0.08)', color:'var(--p)', fontWeight:700 }}>⚡ {ci.energy}</span>
                                  {ci.stressLevel && <span style={{ fontSize:11, padding:'4px 10px', borderRadius:99, background:'rgba(255,107,107,0.08)', color:'#ff6b6b', fontWeight:700 }}>Stress {ci.stressLevel}</span>}
                                  <span style={{ fontSize:11, color:'var(--t4)', marginLeft:'auto', fontWeight:600 }}>{fmt.ago(ci.date)}</span>
                                </div>
                                {ci.mainObjective && <p style={{ fontSize:13, fontWeight:600, color:'var(--t1)', marginBottom:4 }}>Target: {ci.mainObjective}</p>}
                                {ci.aiCoaching && <p style={{ fontSize:13, color:'var(--t3)', lineHeight:1.5 }}>"{ci.aiCoaching}"</p>}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="empty-state" style={{ minHeight:300 }}>
                      <span className="material-symbols-outlined" style={{ fontSize:40, color:'var(--s6)' }}>history</span>
                      <h3 style={{ fontWeight:700, color:'var(--t2)', margin:0 }}>No history yet</h3>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
