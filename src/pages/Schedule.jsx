import { useState, useMemo, useEffect } from 'react';
import { useApp }         from '@context/AppContext';
import { generateSchedule } from '@services/ai';
import { AI }             from '@services/ai';
import { SUBJECT_COLORS, SUBJECTS, fmt } from '@utils';
import toast from 'react-hot-toast';
import { usePremium, Counter } from '@components/ui/PremiumUI';
import { Portal } from '@components/ui';

const DAYS_SHORT = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const DAYS_FULL  = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const HOURS      = ['06','07','08','09','10','11','12','13','14','15','16','17','18','19','20','21','22'];
const DURATIONS  = [30,45,60,90,120];

function getWeekDates() {
  const today = new Date();
  const mon   = new Date(today);
  mon.setDate(today.getDate() - ((today.getDay()+6)%7));
  return Array.from({length:7}, (_,i) => {
    const d = new Date(mon); d.setDate(mon.getDate()+i); return d;
  });
}

// ── Add Session Modal ─────────────────────────
function AddModal({ onClose, onSave, defaultDay }) {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const today = new Date().toISOString().slice(0,10);
  const [form, setForm] = useState({
    subject:'Web Dev', topic:'', startTime:'09:00',
    durationMinutes:60, day: defaultDay || today,
  });
  const set = k => e => setForm(p=>({...p,[k]:e.target.value}));

  const submit = () => {
    if (!form.topic.trim()) { toast.error('Add a topic'); return; }
    onSave(form);
    onClose();
    toast.success('Session scheduled! 📅');
  };

  return (
    <div onClick={onClose} className="modal-backdrop">
      <div onClick={e=>e.stopPropagation()} className="modal" style={{ maxWidth:500 }}>
        <div className="modal-header">
          <div style={{ display:'flex',alignItems:'center',gap:10 }}>
            <span className="material-symbols-outlined" style={{ fontSize:18,color:'var(--p)' }}>calendar_add_on</span>
            <span style={{ fontSize:14,fontWeight:700,color:'var(--t1)' }}>Add Study Session</span>
          </div>
          <button onClick={onClose} className="icon-btn"><span className="material-symbols-outlined" style={{ fontSize:20 }}>close</span></button>
        </div>
        <div style={{ padding: isMobile ? '12px 14px' : '18px 20px', display: 'flex', flexDirection: 'column', gap: isMobile ? 10 : 14, overflowY: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? 10 : 12 }}>
            <div>
              <label className="label">Subject</label>
              <select className="input" value={form.subject} onChange={set('subject')}>
                {SUBJECTS.map(s=><option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Day</label>
              <input type="date" className="input" value={form.day} onChange={set('day')} />
            </div>
          </div>
          <div>
            <label className="label">Topic</label>
            <input className="input" placeholder="e.g. React Hooks, Calculus derivatives…" value={form.topic} onChange={set('topic')}/>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? 10 : 12 }}>
            <div>
              <label className="label">Start Time</label>
              <select className="input" value={form.startTime} onChange={set('startTime')}>
                {HOURS.flatMap(h=>[':00',':30'].map(m=><option key={h+m} value={`${h}${m}`}>{h}{m}</option>))}
              </select>
            </div>
            <div>
              <label className="label">Duration</label>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {DURATIONS.map(d=>(
                  <button key={d} onClick={()=>setForm(p=>({...p,durationMinutes:d}))}
                    style={{ flex: 1, padding: isMobile ? '7px 4px' : '10px 4px', borderRadius: 'var(--r-md)', border: `1px solid ${form.durationMinutes===d?'var(--p)':'var(--surface-b)'}`, background: form.durationMinutes===d?'rgba(9,205,131,0.10)':'transparent', color: form.durationMinutes===d?'var(--p)':'var(--t4)', cursor: 'pointer', fontSize: isMobile ? 10 : 11, fontWeight: 700, transition: 'all 150ms ease' }}>
                    {d<60?`${d}m`:`${d/60}h`}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="modal-footer" style={{ padding: isMobile ? '10px 14px' : '12px 20px' }}>
          <button onClick={onClose} className="btn btn-surface" style={{ padding: isMobile ? '8px 16px' : '11px 20px' }}>Cancel</button>
          <button onClick={submit} className="btn btn-primary" style={{ flex: 1, padding: isMobile ? '8px' : '11px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 17 }}>add</span>Add Session
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Session Pill (in calendar) ────────────────
function SessionPill({ session, onDelete }) {
  const color   = SUBJECT_COLORS[session.subject] || 'var(--p)';
  const [h,m]   = session.startTime.split(':').map(Number);
  const topPx   = (h - 6) * 64 + (m/60)*64;
  const heightPx= Math.max((session.durationMinutes / 60) * 64, 28);

  return (
    <div onClick={e=>{ e.stopPropagation(); if(window.confirm(`Delete "${session.topic}"?`)) onDelete(session.id); }}
      style={{ position:'absolute', left:2, right:2, top:`${topPx}px`, height:`${heightPx}px`, background:`${color}18`, border:`1px solid ${color}45`, borderLeft:`3px solid ${color}`, borderRadius:'var(--r-sm)', padding:'3px 7px', cursor:'pointer', overflow:'hidden', transition:'all 200ms ease', zIndex:2 }}
      onMouseEnter={e=>{ e.currentTarget.style.background=`${color}28`; e.currentTarget.style.boxShadow=`0 4px 12px ${color}30`; }}
      onMouseLeave={e=>{ e.currentTarget.style.background=`${color}18`; e.currentTarget.style.boxShadow='none'; }}>
      <p style={{ fontSize:11,fontWeight:700,color,lineHeight:1.2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{session.subject}</p>
      {heightPx>44 && <p style={{ fontSize:10,color:'var(--t3)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{session.topic}</p>}
      {heightPx>62 && <p style={{ fontSize:10,color:'var(--t4)' }}>{session.startTime} · {session.durationMinutes}m</p>}
    </div>
  );
}

export default function Schedule() {
  const { schedule, tasks, A } = useApp();
  const { askConfirm } = usePremium();
  const [showAdd,  setShowAdd]  = useState(false);
  const [selDay,   setSelDay]   = useState(null);
  const [aiLoad,   setAiLoad]   = useState(false);
  const weekDates = getWeekDates();
  const today     = new Date().toISOString().slice(0,10);
  const [activeMobileDay, setActiveMobileDay] = useState(today);

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const sessionsForDay = day => schedule.filter(s=>s.day===day).sort((a,b)=>a.startTime.localeCompare(b.startTime));

  const totalMins = useMemo(() => {
    const start = weekDates[0].toISOString().slice(0,10);
    const end   = weekDates[6].toISOString().slice(0,10);
    return schedule.filter(s=>s.day>=start&&s.day<=end).reduce((a,s)=>a+s.durationMinutes,0);
  }, [schedule, weekDates]);

  const todaySessions = sessionsForDay(today);
  const activeMobileSessions = sessionsForDay(activeMobileDay);

  const handleAI = async () => {
    if (!AI.enabled()) { toast('Add API key for AI ✦',{icon:'🔑'}); return; }
    if (!(await askConfirm('AI Schedule', 'Let AI analyze your tasks and goals to build an optimized study week?'))) return;
    setAiLoad(true);
    try {
      const subs = [...new Set(tasks.filter(t=>t.status==='pending').map(t=>t.subject))].slice(0,4);
      const res  = await generateSchedule({ subjects:subs.length?subs:SUBJECTS.slice(0,3), hours:15, priorities:subs.slice(0,2) });
      if (res?.schedule) {
        let added = 0;
        Object.entries(res.schedule).forEach(([dayName, sessions]) => {
          const idx  = DAYS_FULL.indexOf(dayName);
          const date = idx>=0 ? weekDates[idx]?.toISOString().slice(0,10) : null;
          if (!date) return;
          (sessions||[]).forEach(s => {
            if (s.subject && s.time) {
              A.schedule.add({ subject:s.subject, topic:s.topic||'Study session', startTime:s.time.slice(0,5), durationMinutes:s.duration||60, day:date });
              added++;
            }
          });
        });
        toast.success(`AI scheduled ${added} sessions! 🤖`);
      } else toast.error('AI scheduling failed');
    } catch { toast.error('AI scheduling failed'); }
    setAiLoad(false);
  };

  return (
    <div className="page">
      <style>{`
        @keyframes slideUp{from{opacity:0;transform:translateY(40px)}to{opacity:1;transform:translateY(0)}} 
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes modalCenterIn{from{opacity:0;transform:scale(0.9) translateY(20px)}to{opacity:1;transform:scale(1) translateY(0)}}
        
        .mobile-calendar-nav {
          display: none;
          gap: 8px;
          overflow-x: auto;
          padding: 4px 0 12px;
          margin-bottom: 16px;
          scrollbar-width: none;
          -webkit-overflow-scrolling: touch;
        }
        .mobile-calendar-nav::-webkit-scrollbar {
          display: none;
        }
        .mobile-calendar-nav-item {
          flex: 0 0 calc((100% - 48px) / 7);
          min-width: 44px;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 10px 4px;
          border-radius: 16px;
          background: var(--s2);
          border: 1px solid var(--surface-b);
          cursor: pointer;
          transition: all 0.2s var(--bounce);
        }
        .mobile-calendar-nav-item.active {
          background: var(--p-sub);
          border-color: var(--p);
          transform: scale(1.05);
          box-shadow: 0 4px 15px rgba(9, 205, 131, 0.15);
        }
        .mobile-timeline {
          display: none;
          flex-direction: column;
          gap: 12px;
        }
        
        @media (max-width: 768px) {
          .stats-grid-responsive {
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 6px !important;
          }
          .mobile-calendar-nav {
            display: flex;
          }
          .mobile-timeline {
            display: flex;
          }
          .desktop-only-calendar {
            display: none !important;
          }
        }
      `}</style>

      <div className="fadeup" style={{ display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:'var(--gap)',marginBottom:12,flexWrap:'wrap' }}>
        <div>
          <h1 className="shimmer-text page-title">Schedule</h1>
          <p style={{ fontSize:13,color:'var(--t3)',marginTop:4 }}>{totalMins > 0 ? `${fmt.mins(totalMins)} planned this week` : 'No sessions planned this week'}</p>
        </div>
        <div style={{ display:'flex',gap:16 }}>
          {AI.enabled() && (
            <button onClick={handleAI} disabled={aiLoad}
              style={{ display:'flex',alignItems:'center',gap:7,padding:'10px 16px',borderRadius:999,border:'1px solid rgba(9,205,131,0.25)',background:'rgba(9,205,131,0.08)',color:'var(--p)',fontWeight:700,fontSize:13,cursor:aiLoad?'not-allowed':'pointer',opacity:aiLoad?0.7:1 }}>
              {aiLoad?<div className="spinner" style={{ width:14,height:14,borderWidth:2 }}/>:<span className="material-symbols-outlined" style={{ fontSize:15,fontVariationSettings:"'FILL' 1" }}>auto_awesome</span>}
              AI Schedule
            </button>
          )}
          <button onClick={()=>{ setSelDay(activeMobileDay); setShowAdd(true); }} className="btn btn-primary">
            <span className="material-symbols-outlined" style={{ fontSize:18 }}>add</span>Add Session
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid-responsive" style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:isMobile ? 6 : 8,marginBottom:20 }}>
        {[
          { l:'Weekly (h)',   v:Math.round(totalMins/60), c:'var(--p)',   icon:'schedule'        },
          { l:'Sessions',    v:schedule.filter(s=>{ const w=weekDates[0].toISOString().slice(0,10); return s.day>=w; }).length, c:'#60a5fa', icon:'event' },
          { l:'Today',       v:todaySessions.length, c:'#e9cd6e',  icon:'today'           },
        ].map(({ l,v,c,icon },i) => (
          <div key={l} className={`card fadeup d${i+1}`} style={{ padding: isMobile ? '8px 4px 10px' : '16px 14px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: isMobile ? 18 : 20, color: c, display: 'block', marginBottom: isMobile ? 4 : 7 }}>{icon}</span>
            <p style={{ fontSize: isMobile ? 18 : 22, fontWeight: 800, color: c, letterSpacing: '-0.02em', lineHeight: 1 }}><Counter value={v}/></p>
            <p style={{ fontSize: isMobile ? 9.5 : 11, color: 'var(--t4)', marginTop: isMobile ? 3 : 4, fontWeight: 700, whiteSpace: 'nowrap' }}>{l}</p>
          </div>
        ))}
      </div>

      {/* Mobile-Native Day Picker Navigation */}
      <div className="mobile-calendar-nav fadeup d3">
        {weekDates.map((d, i) => {
          const dayKey = d.toISOString().slice(0, 10);
          const isActive = dayKey === activeMobileDay;
          const isT = dayKey === today;
          const count = sessionsForDay(dayKey).length;

          return (
            <div
              key={i}
              className={`mobile-calendar-nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setActiveMobileDay(dayKey)}
            >
              <span style={{ fontSize: 9, fontWeight: isActive ? 800 : 600, color: isActive ? 'var(--p)' : 'var(--t4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {DAYS_SHORT[i]}
              </span>
              <div style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: isT ? 'var(--p)' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '4px 0',
                boxShadow: isT ? '0 0 8px rgba(9,205,131,0.4)' : 'none'
              }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: isT ? 'var(--bg-deep)' : (isActive ? 'var(--p)' : 'var(--t2)') }}>
                  {d.getDate()}
                </span>
              </div>
              {count > 0 && (
                <div style={{ width: 4, height: 4, borderRadius: '50%', background: isActive ? 'var(--p)' : 'var(--t4)', marginTop: 2 }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile Timeline View */}
      <div className="mobile-timeline fadeup d4">
        <div className="card" style={{ padding: 18, background: 'var(--s2)', border: '1px solid var(--surface-b)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <p className="section-label" style={{ margin: 0 }}>
              {activeMobileDay === today ? "Today's Timeline" : `${DAYS_FULL[new Date(activeMobileDay).getDay() === 0 ? 6 : new Date(activeMobileDay).getDay() - 1]}'s Timeline`}
            </p>
            <span style={{ fontSize: 11, color: 'var(--t4)', fontWeight: 700 }}>{activeMobileSessions.length} sessions</span>
          </div>

          {activeMobileSessions.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {activeMobileSessions.map(s => {
                const c = SUBJECT_COLORS[s.subject] || 'var(--p)';
                return (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 'var(--r-md)', background: 'var(--s3)', borderLeft: `3px solid ${c}` }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--t1)', minWidth: 42, fontVariantNumeric: 'tabular-nums' }}>{s.startTime}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>{s.topic}</p>
                      <p style={{ fontSize: 11, color: c, margin: '2px 0 0' }}>{s.subject} · {s.durationMinutes}m</p>
                    </div>
                    <button onClick={async () => { if (await askConfirm('Remove session?', `Delete "${s.topic}"?`)) { A.schedule.remove(s.id); toast.success('Removed'); } }} className="icon-btn" style={{ width: 28, height: 28, opacity: 0.45 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 15 }}>delete</span>
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '24px 12px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 32, color: 'var(--t4)', opacity: 0.5, marginBottom: 8 }}>event_note</span>
              <p style={{ fontSize: 12, color: 'var(--t4)', margin: 0 }}>No sessions scheduled for this day</p>
              <button
                onClick={() => { setSelDay(activeMobileDay); setShowAdd(true); }}
                style={{ background: 'none', border: 'none', color: 'var(--p)', fontSize: 12, fontWeight: 800, marginTop: 8, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>add</span>
                Schedule one now
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Week Calendar - Desktop Only */}
      <div className="card fadeup d4 desktop-only-calendar" style={{ padding:0,overflow:'hidden' }}>
        {/* Day headers */}
        <div style={{ display:'grid',gridTemplateColumns:'48px repeat(7,1fr)',borderBottom:'1px solid var(--surface-b)' }}>
          <div style={{ padding:'12px 6px' }}/>
          {weekDates.map((d,i) => {
            const isT = d.toISOString().slice(0,10)===today;
            return (
              <div key={i} style={{ padding:'10px 4px',textAlign:'center',borderLeft:'1px solid var(--surface-b)' }}>
                <p style={{ fontSize:10,fontWeight:700,color:'var(--t4)',textTransform:'uppercase',letterSpacing:'0.05em' }}>{DAYS_SHORT[i]}</p>
                <div style={{ width:28,height:28,borderRadius:'50%',margin:'4px auto 0',background:isT?'var(--p)':'transparent',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:isT?'0 0 12px rgba(9,205,131,0.5)':'none' }}>
                  <p style={{ fontSize:13,fontWeight:800,color:isT?'var(--bg-deep)':'var(--t2)' }}>{d.getDate()}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Time grid */}
        <div style={{ overflowY:'auto',maxHeight:520,overflowX:'auto' }}>
          <div style={{ display:'grid',gridTemplateColumns:'48px repeat(7,minmax(80px,1fr))',minWidth:640 }}>
            {/* Hour labels */}
            <div>
              {HOURS.map(h => (
                <div key={h} style={{ height:64,display:'flex',alignItems:'flex-start',padding:'4px 8px 0',borderBottom:'1px solid var(--surface-b)' }}>
                  <span style={{ fontSize:9.5,color:'var(--t4)',fontWeight:600,fontVariantNumeric:'tabular-nums' }}>{h}:00</span>
                </div>
              ))}
            </div>
            {/* Day columns */}
            {weekDates.map((d,i) => {
              const dayKey  = d.toISOString().slice(0,10);
              const isToday = dayKey===today;
              const daySess = sessionsForDay(dayKey);
              return (
                <div key={i}
                  style={{ borderLeft:'1px solid var(--surface-b)',position:'relative',height:`${HOURS.length*64}px`,background:isToday?'rgba(9,205,131,0.018)':'transparent',cursor:'pointer' }}
                  onClick={()=>{ setSelDay(dayKey); setShowAdd(true); }}>
                  {/* Grid lines */}
                  {HOURS.map((_,ti) => <div key={ti} style={{ position:'absolute',top:`${ti*64}px`,left:0,right:0,height:64,borderBottom:'1px solid var(--surface-b)' }}/>)}
                  {/* Sessions */}
                  {daySess.map(s => <SessionPill key={s.id} session={s} onDelete={id=>{ A.schedule.remove(id); toast.success('Removed'); }}/>)}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {showAdd && <Portal><AddModal onClose={()=>{ setShowAdd(false); setSelDay(null); }} onSave={A.schedule.add} defaultDay={selDay}/></Portal>}
    </div>
  );
}
