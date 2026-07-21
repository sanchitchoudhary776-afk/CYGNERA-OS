import { useState, useMemo, useEffect } from 'react';
import { useApp }         from '@context/AppContext';
import { generateSchedule } from '@services/ai';
import { AI }             from '@services/ai';
import { SUBJECT_COLORS, SUBJECTS, fmt } from '@utils';
import toast from 'react-hot-toast';
import { usePremium, Counter } from '@components/ui/PremiumUI';
import { Portal } from '@components/ui';
import { useIsMobile } from '@utils/platform';

import DesktopSchedule from './Schedule/DesktopSchedule';
import MobileSchedule  from './Schedule/MobileSchedule';

const DAYS_SHORT = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const DAYS_FULL  = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const HOURS      = ['05','06','07','08','09','10','11','12','13','14','15','16','17','18','19','20','21','22','23','00','01','02','03','04'];
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
function AddModal({ onClose, onSave, defaultDay, defaultTime, isMobile }) {
  const today = new Date().toISOString().slice(0,10);
  const [form, setForm] = useState({
    subject:'Web Dev', topic:'', startTime: defaultTime || '09:00',
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
              <select className="input" value={form.startTime} onChange={set('startTime')} style={{ height: '40px' }}>
                {HOURS.flatMap(h=>[':00',':30'].map(m=><option key={h+m} value={`${h}${m}`}>{h}{m}</option>))}
              </select>
            </div>
            <div>
              <label className="label">Duration (minutes)</label>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input 
                  type="number" 
                  min="5" 
                  max="1440" 
                  className="input" 
                  placeholder="Minutes"
                  style={{ width: '90px', height: '40px', flexShrink: 0 }}
                  value={form.durationMinutes} 
                  onChange={e => {
                    const val = Math.max(1, parseInt(e.target.value) || 0);
                    setForm(p => ({ ...p, durationMinutes: val }));
                  }} 
                />
                <span style={{ fontSize: 12, color: 'var(--t3)', fontWeight: 600 }}>mins</span>
              </div>
            </div>
          </div>
          <div>
            <label className="label" style={{ marginBottom: 6 }}>Quick Durations</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {DURATIONS.map(d=>(
                <button key={d} type="button" onClick={()=>setForm(p=>({...p,durationMinutes:d}))}
                  style={{ flex: 1, padding: isMobile ? '7px 4px' : '10px 4px', borderRadius: 'var(--r-md)', border: `1px solid ${form.durationMinutes===d?'var(--p)':'var(--surface-b)'}`, background: form.durationMinutes===d?'rgba(9,205,131,0.10)':'transparent', color: form.durationMinutes===d?'var(--p)':'var(--t4)', cursor: 'pointer', fontSize: isMobile ? 10 : 11, fontWeight: 700, transition: 'all 150ms ease' }}>
                  {d<60?`${d}m`:`${d/60}h`}
                </button>
              ))}
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

export default function Schedule() {
  const { schedule, tasks, A } = useApp();
  const { askConfirm } = usePremium();
  const isMobile = useIsMobile();
  const [showAdd,  setShowAdd]  = useState(false);
  const [selDay,   setSelDay]   = useState(null);
  const [selTime,  setSelTime]  = useState(null);
  const [aiLoad,   setAiLoad]   = useState(false);
  const weekDates = getWeekDates();
  const today     = new Date().toISOString().slice(0,10);
  const [activeMobileDay, setActiveMobileDay] = useState(today);

  const sessionsForDay = day => schedule.filter(s=>s.day===day).sort((a,b)=>a.startTime.localeCompare(b.startTime));

  const totalMins = useMemo(() => {
    const start = weekDates[0].toISOString().slice(0,10);
    const end   = weekDates[6].toISOString().slice(0,10);
    return schedule.filter(s=>s.day>=start&&s.day<=end).reduce((a,s)=>a+s.durationMinutes,0);
  }, [schedule, weekDates]);

  const todaySessions = sessionsForDay(today);

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

  // Unified handler: opens the AddModal with a day/time prefilled
  const handleAddSession = (day, time) => {
    setSelDay(day);
    setSelTime(time);
    setShowAdd(true);
  };

  const handleDeleteSession = (id) => {
    A.schedule.remove(id);
    toast.success('Removed');
  };

  return (
    <div className="page">
      <style>{`
        @keyframes slideUp{from{opacity:0;transform:translateY(40px)}to{opacity:1;transform:translateY(0)}} 
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes modalCenterIn{from{opacity:0;transform:scale(0.9) translateY(20px)}to{opacity:1;transform:scale(1) translateY(0)}}
        
        .calendar-hour-cell {
          position: absolute;
          left: 0;
          right: 0;
          cursor: pointer;
          z-index: 1;
          transition: background 150ms ease;
        }
        .calendar-hour-cell:hover {
          background: rgba(9, 205, 131, 0.04);
        }
      `}</style>

      {/* Header: Title + AI + Add */}
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
          <button onClick={()=> handleAddSession(isMobile ? activeMobileDay : today, null)} className="btn btn-primary">
            <span className="material-symbols-outlined" style={{ fontSize:18 }}>add</span>Add Session
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap: isMobile ? 6 : 8,marginBottom:20 }}>
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

      {/* ── View Bifurcation ─────────────────────── */}
      {isMobile ? (
        <MobileSchedule
          weekDates={weekDates}
          sessionsForDay={sessionsForDay}
          today={today}
          HOURS={HOURS}
          DAYS_SHORT={DAYS_SHORT}
          DAYS_FULL={DAYS_FULL}
          onDeleteSession={handleDeleteSession}
          onAddSession={handleAddSession}
          activeMobileDay={activeMobileDay}
          setActiveMobileDay={setActiveMobileDay}
        />
      ) : (
        <DesktopSchedule
          weekDates={weekDates}
          sessionsForDay={sessionsForDay}
          today={today}
          HOURS={HOURS}
          DAYS_SHORT={DAYS_SHORT}
          onDeleteSession={handleDeleteSession}
          onAddSession={handleAddSession}
        />
      )}

      {showAdd && <Portal><AddModal onClose={()=>{ setShowAdd(false); setSelDay(null); setSelTime(null); }} onSave={A.schedule.add} defaultDay={selDay} defaultTime={selTime} isMobile={isMobile}/></Portal>}
    </div>
  );
}
