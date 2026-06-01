import { useState, useEffect } from 'react';
import { useApp }   from '@context/AppContext';
import { useNetwork } from '@context/NetworkContext';
import { breakTask } from '@services/ai';
import { AI }       from '@services/ai';
import { SUBJECT_COLORS, SUBJECTS, PRIORITY, daysUntil } from '@utils';
import toast from 'react-hot-toast';
import { usePremium } from '@components/ui/PremiumUI';
import { Portal } from '@components/ui';

const PC = {
  high:   { c:'#ff4e4e', bg:'rgba(255,78,78,0.06)', border:'rgba(255,78,78,0.2)', label:'Urgent' },
  medium: { c:'#fbbf24', bg:'rgba(251,191,36,0.06)', border:'rgba(251,191,36,0.2)', label:'Normal' },
  low:    { c:'#10b981', bg:'rgba(16,185,129,0.06)', border:'rgba(16,185,129,0.2)', label:'Backlog' },
};

function TaskCard({ task, onComplete, onRestore, onEdit, onDelete, index }) {
  const p    = PC[task.priority] || PC.medium;
  const sc   = SUBJECT_COLORS[task.subject] || 'var(--p)';
  const days = daysUntil(task.deadline);
  const ov   = days !== null && days < 0 && task.status === 'pending';
  const { triggerConfetti, askConfirm } = usePremium();
  const [going, setGoing] = useState(false);
  const done = task.status === 'completed';

  const handleDone = (e) => { 
    if (done) return;
    const rect = e.currentTarget.getBoundingClientRect();
    triggerConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
    setGoing(true); 
    setTimeout(() => onComplete(task.id), 500); 
  };

  return (
    <div className={`card fadeup d${(index%6)+1}`}
      style={{ 
        position: 'relative',
        padding: '20px', 
        background: done ? 'var(--s1)' : 'var(--s2)',
        border: `1px solid ${done ? 'transparent' : 'var(--surface-b)'}`,
        borderLeft: `4px solid ${p.c}`,
        opacity: going ? 0 : 1, 
        transform: going ? 'scale(0.95) translateX(10px)' : 'none', 
        transition: 'all 400ms cubic-bezier(0.4, 0, 0.2, 1)',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        overflow: 'hidden'
      }}>
      
      {/* Priority Glow Background */}
      {!done && <div style={{ position:'absolute', top:0, right:0, width:100, height:100, background:`radial-gradient(circle at top right, ${p.c}15, transparent 70%)`, pointerEvents:'none' }} />}

      <div style={{ display:'flex', alignItems:'flex-start', gap:14 }}>
        <button 
          onClick={handleDone} 
          disabled={done}
          style={{ 
            width:24, height:24, borderRadius:8, 
            border:`2px solid ${done ? 'var(--p)' : p.c+'44'}`, 
            background: done ? 'var(--p)' : 'transparent',
            cursor: done ? 'default' : 'pointer',
            flexShrink:0, marginTop:2, 
            display:'flex', alignItems:'center', justifyContent:'center',
            transition:'all 300ms var(--bounce)'
          }}>
          {done && <span className="material-symbols-outlined" style={{ fontSize:15, color:'#fff', fontVariationSettings:"'FILL' 1" }}>check</span>}
        </button>

        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', justifyContent:'space-between', gap:12, marginBottom:4 }}>
            <h3 style={{ 
              fontSize:15, fontWeight:800, color:done ? 'var(--t3)' : 'var(--t1)', 
              lineHeight:1.4, textDecoration:done?'line-through':'none',
              opacity: done ? 0.6 : 1,
              transition: 'all 300ms ease'
            }}>{task.title}</h3>
            
            <div style={{ display:'flex', gap:6, flexShrink:0 }}>
              {done ? (
                <button onClick={() => onRestore(task.id)} className="icon-btn" style={{ width:28, height:28, background:'rgba(9,205,131,0.1)' }} title="Restore to Active">
                  <span className="material-symbols-outlined" style={{ fontSize:15, color:'var(--p)' }}>settings_backup_restore</span>
                </button>
              ) : (
                <>
                  <button onClick={()=>onEdit(task)} className="icon-btn" style={{ width:28, height:28, background:'var(--s3)' }}>
                    <span className="material-symbols-outlined" style={{ fontSize:14 }}>edit</span>
                  </button>
                  <button onClick={() => askConfirm('Delete Task', 'Remove this task?').then(ok => ok && onDelete(task.id))} className="icon-btn" style={{ width:28, height:28, background:'var(--s3)' }}>
                    <span className="material-symbols-outlined" style={{ fontSize:14, color:'var(--danger)' }}>delete</span>
                  </button>
                </>
              )}
            </div>
          </div>

          <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
            <span style={{ fontSize:10, fontWeight:900, padding:'3px 10px', borderRadius:8, background:p.bg, color:p.c, border:`1px solid ${p.border}`, letterSpacing:'0.02em', textTransform:'uppercase' }}>{p.label}</span>
            <span style={{ fontSize:10, fontWeight:900, padding:'3px 10px', borderRadius:8, background:`${sc}12`, color:sc, border:`1px solid ${sc}20`, textTransform:'uppercase' }}>{task.subject}</span>
            {task.estimatedMinutes && <span style={{ fontSize:11, color:'var(--t4)', fontWeight:600, display:'flex', alignItems:'center', gap:4 }}><span className="material-symbols-outlined" style={{ fontSize:14 }}>schedule</span>{task.estimatedMinutes}m</span>}
          </div>

          {task.description && <p style={{ fontSize:13, color:done?'var(--t4)':'var(--t3)', marginTop:12, lineHeight:1.6 }}>{task.description}</p>}
        </div>
      </div>

      {/* Subtasks Footer */}
      {task.subtasks?.length > 0 && (
        <div style={{ padding:'12px', background:done?'var(--s1)':'var(--s3)', borderRadius:12, border:done?'1px dashed var(--surface-b)':'1px solid var(--surface-b)', opacity:done?0.7:1 }}>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {task.subtasks.slice(0, 2).map((st, i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:10, fontSize:12, color:'var(--t2)', fontWeight:500 }}>
                <span className="material-symbols-outlined" style={{ fontSize:14, color:'var(--t4)' }}>subdirectory_arrow_right</span>
                <span style={{ flex:1 }}>{st.title}</span>
                <span style={{ fontSize:10, color:'var(--t4)', fontWeight:800 }}>{st.estimatedMinutes}m</span>
              </div>
            ))}
            {task.subtasks.length > 2 && (
              <p style={{ fontSize:11, color:'var(--p)', fontWeight:800, paddingLeft:24, marginTop:2 }}>+ {task.subtasks.length - 2} more steps</p>
            )}
          </div>
        </div>
      )}

      {/* Deadline Badge */}
      {days !== null && !done && (
        <div style={{ 
          position:'absolute', bottom:0, right:0, 
          padding:'4px 12px', borderTopLeftRadius:12,
          background: ov ? 'var(--danger)' : days <= 1 ? 'var(--warn)' : 'var(--s4)',
          color: ov || days <= 1 ? '#fff' : 'var(--t3)',
          fontSize:10, fontWeight:900, textTransform:'uppercase', letterSpacing:'0.05em'
        }}>
          {ov ? 'Overdue' : days === 0 ? 'Due Today' : days === 1 ? 'Tomorrow' : `${days} Days Left`}
        </div>
      )}
    </div>
  );
}

function TaskForm({ task, onSave, onClose }) {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const { isOnline } = useNetwork();
  const [form, setForm] = useState({ title:task?.title||'', description:task?.description||'', subject:task?.subject||'Web Dev', priority:task?.priority||'medium', deadline:task?.deadline?task.deadline.slice(0,10):'', estimatedMinutes:task?.estimatedMinutes||60 });
  const [subtasks, setSubtasks] = useState(task?.subtasks||[]);
  const [aiLoad, setAiLoad] = useState(false);
  const set = k => e => setForm(p=>({...p,[k]:e.target?.value??e}));

  const runAI = async () => {
    if (!isOnline) {
      toast.error('Connect to the internet to run AI task breakdown 📡');
      return;
    }
    if (!form.title.trim()) { toast.error('Add a title first'); return; }
    if (!AI.enabled()) { toast('Add API key for AI ✦',{icon:'🔑'}); return; }
    setAiLoad(true);
    const r = await breakTask(form.title, form.subject);
    setAiLoad(false);
    if (r?.subtasks) { 
      setSubtasks(r.subtasks); 
      setForm(p=>({
        ...p,
        description: p.description || r.description || p.description,
        subject: r.subject && p.subject==='Web Dev' ? (SUBJECTS.includes(r.subject) ? r.subject : 'Computer Science') : p.subject,
        priority: r.priority || p.priority,
        estimatedMinutes: r.totalEstimatedMinutes || p.estimatedMinutes
      }));
      toast.success('Task auto-filled ✦'); 
    }
    else toast.error('Generation failed');
  };

  return (
    <div onClick={onClose} className="modal-backdrop">
      <div onClick={e=>e.stopPropagation()} className="modal">
        <div className="modal-header">
          <span style={{ fontSize:14,fontWeight:700,color:'var(--t1)' }}>{task?.id?'Edit Task':'New Task'}</span>
          <button onClick={onClose} className="icon-btn"><span className="material-symbols-outlined" style={{ fontSize:20 }}>close</span></button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '12px 14px' : '16px 20px', display: 'flex', flexDirection: 'column', gap: isMobile ? 10 : 13 }}>
          <div><label className="label">Title</label><input className="input" value={form.title} onChange={set('title')} placeholder="What needs to be done?" style={{ fontWeight: 700 }}/></div>
          <div><label className="label">Description</label><textarea className="input" rows={2} value={form.description} onChange={set('description')} placeholder="Details…" style={{ resize: 'none' }}/></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div><label className="label">Subject</label><select className="input" value={form.subject} onChange={set('subject')}>{SUBJECTS.map(s=><option key={s}>{s}</option>)}</select></div>
            <div>
              <label className="label">Priority</label>
              <div style={{ display: 'flex', gap: 5 }}>
                {['high','medium','low'].map(pr=>(
                  <button key={pr} onClick={()=>setForm(p=>({...p,priority:pr}))} style={{ flex: 1, padding: isMobile ? '8px 2px' : '10px 2px', borderRadius: 'var(--r-md)', border: `1px solid ${form.priority===pr?PC[pr].c+'55':'var(--surface-b)'}`, background: form.priority===pr?PC[pr].bg:'transparent', color: form.priority===pr?PC[pr].c:'var(--t4)', cursor: 'pointer', fontWeight: 700, fontSize: isMobile ? 9.5 : 10.5, transition: 'all 150ms ease' }}>{PC[pr].label}</button>
                ))}
              </div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? 10 : 10 }}>
            <div><label className="label">Deadline</label><input type="date" className="input" value={form.deadline} onChange={set('deadline')} /></div>
            <div><label className="label">Est. Minutes</label><input type="number" className="input" value={form.estimatedMinutes} onChange={set('estimatedMinutes')} min={5} max={480} step={5}/></div>
          </div>
          <div>
            <div className="fadeup" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <label className="label" style={{ margin: 0, flexShrink: 0 }}>Subtasks</label>
              <button onClick={runAI} disabled={aiLoad} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 11px', borderRadius: 999, border: '1px solid rgba(9,205,131,0.2)', background: 'rgba(9,205,131,0.07)', color: 'var(--p)', fontWeight: 700, fontSize: 11, cursor: 'pointer', opacity: aiLoad?0.6:1, flexShrink: 0, whiteSpace: 'nowrap' }}>
                {aiLoad?<div className="spinner" style={{ width: 11, height: 11, borderWidth: 2 }}/>:<span className="material-symbols-outlined" style={{ fontSize: 12, fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>}
                Construct Breakdown
              </button>
            </div>
            {subtasks.length>0 ? <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>{subtasks.map((st,i)=><div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 11px', borderRadius: 'var(--r-md)', background: 'var(--s3)', border: '1px solid rgba(9,205,131,0.07)' }}><span className="material-symbols-outlined" style={{ fontSize: 13, color: 'var(--p)' }}>radio_button_unchecked</span><span style={{ fontSize: 12, color: 'var(--t2)', flex: 1 }}>{st.title}</span><span style={{ fontSize: 11, color: 'var(--t4)' }}>{st.estimatedMinutes}m</span></div>)}</div>
            : <p style={{ fontSize: 12, color: 'var(--t4)', textAlign: 'center', padding: '10px' }}>Generate a tactical breakdown of this task</p>}
          </div>
        </div>
        <div className="modal-footer" style={{ padding: isMobile ? '10px 14px' : '12px 20px' }}>
          <button onClick={onClose} className="btn btn-surface" style={{ padding: isMobile ? '8px 16px' : '9px 18px' }}>Cancel</button>
          <button onClick={()=>{ if(!form.title.trim()){toast.error('Add a title');return;} onSave({...task,...form,subtasks,estimatedMinutes:Number(form.estimatedMinutes)}); }} className="btn btn-primary" style={{ padding: isMobile ? '8px 16px' : '9px 22px', flex: isMobile ? 1 : 'none' }}>Save Task</button>
        </div>
      </div>
    </div>
  );
}

export default function Tasks() {
  const { tasks, A } = useApp();
  const [filter, setFilter] = useState('pending');
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const pending   = tasks.filter(t=>t.status==='pending');
  const completed = tasks.filter(t=>t.status==='completed');
  const shown     = filter==='pending' ? pending : completed;
  const high      = pending.filter(t=>t.priority==='high').length;
  const due       = pending.filter(t=>{ const d=daysUntil(t.deadline); return d!==null&&d<=1; }).length;

  return (
    <div className="page">
      <div className="fadeup" style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:'var(--gap)' }}>
        <div>
          <h1 className="shimmer-text page-title">Pipeline</h1>
          <div style={{ display:'flex', alignItems:'center', gap:'var(--gap-sm)', marginTop:4 }}>
            <div style={{ display:'flex', alignItems:'center', gap:4, padding:'4px 10px', borderRadius:8, background:'var(--s3)', border:'1px solid var(--surface-b)' }}>
              <span className="material-symbols-outlined" style={{ fontSize:14, color:'var(--p)' }}>rocket_launch</span>
              <span style={{ fontSize:11, fontWeight:800, color:'var(--t2)' }}>{pending.length} Active</span>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:4, padding:'4px 10px', borderRadius:8, background:'var(--s3)', border:'1px solid var(--surface-b)' }}>
              <span className="material-symbols-outlined" style={{ fontSize:14, color:'#10b981' }}>check_circle</span>
              <span style={{ fontSize:11, fontWeight:800, color:'var(--t2)' }}>{completed.length} Mastered</span>
            </div>
          </div>
        </div>
        <button onClick={()=>{setEditing({});setShowForm(true);}} className="btn btn-primary" style={{ padding:'12px 24px', borderRadius:16, background:'linear-gradient(135deg, var(--p), #06b6d4)', border:'none', boxShadow:'0 8px 20px rgba(9,205,131,0.2)' }}>
          <span className="material-symbols-outlined" style={{ fontSize:20 }}>add_task</span>
          Construct Task
        </button>
      </div>

      {(high>0||due>0) && <div className="fadeup d1" style={{ display:'flex',gap:10,flexWrap:'wrap' }}>
        {high>0&&<div style={{ display:'flex',alignItems:'center',gap:8,padding:'10px 16px',borderRadius:12,background:'rgba(255,78,78,0.08)',border:'1px solid rgba(255,78,78,0.2)', boxShadow:'0 4px 12px rgba(255,78,78,0.1)' }}><span className="material-symbols-outlined" style={{ fontSize:18,color:'#ff4e4e' }}>priority_high</span><span style={{ fontSize:12,fontWeight:900,color:'#ff4e4e',textTransform:'uppercase',letterSpacing:'0.02em' }}>{high} Urgent Tasks</span></div>}
        {due>0&&<div style={{ display:'flex',alignItems:'center',gap:8,padding:'10px 16px',borderRadius:12,background:'rgba(251,191,36,0.08)',border:'1px solid rgba(251,191,36,0.2)', boxShadow:'0 4px 12px rgba(251,191,36,0.1)' }}><span className="material-symbols-outlined" style={{ fontSize:18,color:'#fbbf24' }}>alarm_on</span><span style={{ fontSize:12,fontWeight:900,color:'#fbbf24',textTransform:'uppercase',letterSpacing:'0.02em' }}>{due} Due Immediately</span></div>}
      </div>}

      <div className="card fadeup d3" style={{ display:'flex',gap:'var(--gap-xs)',padding:'6px',background:'var(--s2)',border:'1px solid var(--surface-b)',borderRadius:16,width:'fit-content',maxWidth:'100%',overflowX:'auto' }}>
        {[{id:'pending',label:`Active Pipeline`, icon:'rocket_launch'},{id:'completed',label:`History`, icon:'history'}].map(f=>(
          <button key={f.id} onClick={()=>setFilter(f.id)} 
            style={{ 
              display:'flex', alignItems:'center', gap:8,
              padding:'10px 20px',borderRadius:12,border:'none',cursor:'pointer',fontWeight:800,fontSize:13,
              background:filter===f.id?'var(--s4)':'transparent',
              color:filter===f.id?'var(--p)':'var(--t3)',
              transition:'all 300ms cubic-bezier(0.4, 0, 0.2, 1)',
              whiteSpace:'nowrap'
            }}>
            <span className="material-symbols-outlined" style={{ fontSize:18 }}>{f.icon}</span>
            {f.label}
          </button>
        ))}
      </div>

      {shown.length > 0 ? (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(min(100%, 360px), 1fr))', gap:'var(--gap-card)', paddingBottom:40 }}>
          {shown.map((t,i) => (
            <TaskCard key={t.id} index={i} task={t} 
              onComplete={id=>A.task.update({id,status:'completed'})} 
              onRestore={id=>A.task.update({id,status:'pending'})}
              onEdit={t=>{setEditing(t);setShowForm(true);}} 
              onDelete={id=>{A.task.remove(id);toast.success('System Purged');}}
            />
          ))}
        </div>
      ) : (
        <div className="fadeup" style={{ textAlign:'center',padding:'100px 20px', background:'var(--s1)', borderRadius:32, border:'2px dashed var(--surface-b)' }}>
          <div style={{ width:100, height:100, borderRadius:'50%', background:'var(--s2)', display:'flex', alignItems:'center', justifySelf:'center', margin:'0 auto 24px', boxShadow:'var(--modal-sh)' }}>
            <span className="material-symbols-outlined" style={{ fontSize:48, color:'var(--p)', opacity:0.5 }}>{filter==='pending'?'verified':'work_history'}</span>
          </div>
          <h2 style={{ fontSize:20,fontWeight:900,color:'var(--t1)',letterSpacing:'-0.02em' }}>{filter==='pending'?'Pipeline Fully Cleared':'No Historic Records'}</h2>
          <p style={{ fontSize:14,color:'var(--t4)',marginTop:8,maxWidth:280,marginInline:'auto',lineHeight:1.6 }}>{filter==='pending'?'Your academic engine is running at 100% efficiency. Time to refuel?':'Start completing tasks to build your historical study data.'}</p>
        </div>
      )}
      {showForm&&<Portal><TaskForm task={editing} onSave={task=>{if(task.id){A.task.update(task);toast.success('Task Modified');}else{A.task.add(task);toast.success('Logic Stream Injected ✦');}setShowForm(false);setEditing(null);}} onClose={()=>{setShowForm(false);setEditing(null);}}/></Portal>}
    </div>
  );
}
