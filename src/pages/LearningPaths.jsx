import { useState, useEffect } from 'react';
import { useApp } from '@context/AppContext';
import { generatePath } from '@services/ai';
import { AI } from '@services/ai';
import { SUBJECTS, SUBJECT_COLORS } from '@utils';
import toast from 'react-hot-toast';
import { Portal } from '@components/ui';

const STYLES = [
  { id: 'visual', icon: 'visibility', label: 'Visual', desc: 'Charts & diagrams' },
  { id: 'auditory', icon: 'headphones', label: 'Auditory', desc: 'Talks & podcasts' },
  { id: 'reading', icon: 'menu_book', label: 'Reading', desc: 'Notes & books' },
  { id: 'kinesthetic', icon: 'sports_handball', label: 'Hands-on', desc: 'Build & practice' },
];
const LEVELS = ['Beginner', 'Intermediate', 'Advanced'];
const HOURS = [3, 5, 7, 10, 15, 20];

const STATUS = {
  completed: { icon: 'check_circle', c: 'var(--p)', bg: 'rgba(9,205,131,0.12)' },
  active: { icon: 'play_circle', c: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
  locked: { icon: 'lock', c: 'var(--t4)', bg: 'var(--s4)' },
};

function PhaseRow({ phase }) {
  const s = STATUS[phase.status] || STATUS.locked;
  const [open, setOpen] = useState(phase.status === 'active');
  return (
    <div style={{ borderRadius: 'var(--r-md)', overflow: 'hidden', border: `1px solid ${phase.status === 'active' ? 'rgba(96,165,250,0.22)' : 'rgba(255,255,255,0.05)'}`, borderLeft: `3px solid ${s.c}`, opacity: phase.status === 'locked' ? 0.5 : 1 }}>
      <button onClick={() => phase.status !== 'locked' && setOpen(o => !o)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', background: 'var(--s3)', border: 'none', cursor: phase.status === 'locked' ? 'default' : 'pointer', textAlign: 'left' }}>
        <div style={{ width: 32, height: 32, borderRadius: 10, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 17, color: s.c, fontVariationSettings: "'FILL' 1" }}>{s.icon}</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', marginBottom: 2 }}>
            <span style={{ fontSize: 10.5, fontWeight: 700, color: s.c, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Phase {phase.phase}</span>
            <span style={{ fontSize: 10.5, color: 'var(--t4)' }}>· Weeks {phase.weeks}</span>
            {phase.status === 'active' && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: 'rgba(96,165,250,0.12)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.25)' }}>In Progress</span>}
          </div>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)' }}>{phase.title}</p>
        </div>
        {phase.status !== 'locked' && <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--t4)', transition: 'transform 200ms', transform: open ? 'rotate(180deg)' : 'none' }}>expand_more</span>}
      </button>
      {open && phase.status !== 'locked' && (
        <div style={{ padding: '12px 16px 14px', borderTop: '1px solid rgba(255,255,255,0.04)', background: 'var(--s3)' }}>
          {phase.topics?.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
              {phase.topics.map(t => <span key={t} style={{ fontSize: 11.5, padding: '4px 10px', borderRadius: 99, background: 'var(--s4)', color: 'var(--t2)', fontWeight: 600 }}>{t}</span>)}
            </div>
          )}
          {phase.milestone && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 15, color: '#e9cd6e' }}>flag</span>
              <p style={{ fontSize: 12, color: 'var(--t3)' }}>Milestone: <em style={{ color: 'var(--t2)' }}>{phase.milestone}</em></p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PathCard({ path, onSelect, onDelete }) {
  const color = SUBJECT_COLORS[path.subject] || 'var(--p)';
  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden', cursor: 'pointer', position: 'relative' }}
      onClick={() => onSelect(path)}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 16px 48px rgba(0,0,0,0.35),0 0 28px ${color}18`; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = ''; }}>
      <div style={{ position: 'absolute', top: 0, right: 0, width: 90, height: 90, borderRadius: '50%', background: `radial-gradient(${color}14,transparent)`, pointerEvents: 'none' }} />
      <div style={{ padding: '18px 18px 14px', transition: 'transform 280ms var(--bounce)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 180px', minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 9px', borderRadius: 99, background: `${color}14`, color, border: `1px solid ${color}28`, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap', flexShrink: 0 }}>{path.status}</span>
              <span style={{ fontSize: 10.5, color: 'var(--t4)', whiteSpace: 'nowrap', flexShrink: 0 }}>{path.totalWeeks} weeks</span>
            </div>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--t1)', lineHeight: 1.4, wordBreak: 'break-word', marginBottom: 4 }}>{path.title}</h3>
            <p style={{ fontSize: 12, color: 'var(--t3)', lineHeight: 1.5, wordBreak: 'break-word' }}>{path.goal}</p>
          </div>
          <button onClick={e => { e.stopPropagation(); if (window.confirm('Delete path?')) onDelete(path.id); }}
            className="icon-btn" style={{ width: 28, height: 28, opacity: 0.4, flexShrink: 0 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 15 }}>delete</span>
          </button>
        </div>
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, flexWrap: 'wrap', gap: 4 }}>
            <span style={{ fontSize: 12, color: 'var(--t3)', whiteSpace: 'nowrap', flexShrink: 0 }}>Week {path.currentWeek}/{path.totalWeeks}</span>
            <span style={{ fontSize: 14, fontWeight: 800, color, whiteSpace: 'nowrap', flexShrink: 0 }}>{path.progress}%</span>
          </div>
          <div style={{ height: 6, background: 'var(--s5)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${path.progress}%`, background: `linear-gradient(90deg,${color}88,${color})`, borderRadius: 99, boxShadow: `0 0 8px ${color}50`, transition: 'width 0.9s var(--smooth)' }} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {(path.phases || []).map((ph, idx) => (
            <div key={idx} style={{ flex: 1, height: 3, borderRadius: 99, background: ph.status === 'completed' ? 'var(--p)' : ph.status === 'active' ? '#60a5fa' : 'var(--s5)', transition: 'all 0.3s' }} />
          ))}
          <span style={{ fontSize: 10.5, color: 'var(--t4)', flexShrink: 0, marginLeft: 6 }}>
            {path.phases?.filter(p => p.status === 'completed').length || 0}/{path.phases?.length || 0}
          </span>
        </div>
      </div>
    </div>
  );
}

function NewPathModal({ onClose, onSave }) {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [form, setForm] = useState({ goal: '', subject: 'Web Dev', style: 'visual', level: 'Beginner', hours: 10 });
  const [loading, setLoading] = useState(false);
  const set = k => e => setForm(p => ({ ...p, [k]: e.target?.value ?? e }));

  const create = async () => {
    if (!form.goal.trim()) { toast.error('Enter your learning goal'); return; }
    setLoading(true);
    let phases = [
      { phase: 1, title: 'Foundations', weeks: '1-2', status: 'active', topics: ['Core Concepts', 'Basics', 'Introduction'], milestone: 'Understand the fundamentals' },
      { phase: 2, title: 'Core Skills', weeks: '3-5', status: 'locked', topics: ['Key Skills', 'Practice', 'Application'], milestone: 'Build something simple' },
      { phase: 3, title: 'Advanced', weeks: '6-8', status: 'locked', topics: ['Advanced Topics', 'Real Projects', 'Portfolio'], milestone: 'Complete a real project' },
    ];
    let aiTip = 'Consistent daily practice beats occasional long sessions every time.';
    if (AI.enabled()) {
      try {
        const r = await generatePath({ goal: form.goal, style: form.style, level: form.level, hoursPerWeek: form.hours });
        if (r?.phases) phases = r.phases.map((p, i) => ({ ...p, status: i === 0 ? 'active' : 'locked' }));
        if (r?.tip) aiTip = r.tip;
      } catch (e) { console.error(e); }
    }
    setLoading(false);
    onSave({ title: `${form.subject} — ${form.level}`, goal: form.goal, subject: form.subject, status: 'active', totalWeeks: 8, currentWeek: 1, progress: 0, learningStyle: form.style, hoursPerWeek: form.hours, phases, aiTip, milestones: phases.map(p => p.milestone) });
    onClose();
    toast.success('Learning path created! 🚀');
  };

  return (
    <div onClick={onClose} className="modal-backdrop">
      <div onClick={e => e.stopPropagation()} className="modal" style={{ maxWidth: 500 }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--p)' }}>route</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--t1)' }}>New Learning Path</span>
          </div>
          <button onClick={onClose} className="icon-btn"><span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span></button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '12px 14px' : '18px 20px', display: 'flex', flexDirection: 'column', gap: isMobile ? 12 : 16 }}>
          <div>
            <label className="label">Your Goal</label>
            <input className="input" placeholder="e.g. Become a full-stack developer, Master calculus…" value={form.goal} onChange={set('goal')} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? 10 : 12 }}>
            <div><label className="label">Subject</label>
              <select className="input" value={form.subject} onChange={set('subject')}>{SUBJECTS.map(s => <option key={s}>{s}</option>)}</select></div>
            <div><label className="label">Level</label>
              <select className="input" value={form.level} onChange={set('level')}>{LEVELS.map(l => <option key={l}>{l}</option>)}</select></div>
          </div>
          <div>
            <label className="label">Learning Style</label>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2,1fr)', gap: 8 }}>
              {STYLES.map(st => (
                <button key={st.id} onClick={() => setForm(p => ({ ...p, style: st.id }))}
                  style={{ padding: isMobile ? '8px 10px' : '11px 8px', borderRadius: 'var(--r-md)', border: `2px solid ${form.style === st.id ? 'var(--p)' : 'rgba(255,255,255,0.06)'}`, background: form.style === st.id ? 'rgba(9,205,131,0.10)' : 'var(--s3)', cursor: 'pointer', transition: 'all 200ms var(--bounce)', transform: form.style === st.id ? 'scale(1.03)' : 'scale(1)', textAlign: 'left' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18, color: form.style === st.id ? 'var(--p)' : 'var(--t4)', display: 'block', marginBottom: 5 }}>{st.icon}</span>
                  <p style={{ fontSize: 12, fontWeight: 700, color: form.style === st.id ? 'var(--p)' : 'var(--t1)', marginBottom: 2 }}>{st.label}</p>
                  <p style={{ fontSize: 10.5, color: 'var(--t4)' }}>{st.desc}</p>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Hours/Week: <strong style={{ color: 'var(--p)' }}>{form.hours}h</strong></label>
            <div style={{ display: 'flex', gap: isMobile ? 5 : 7 }}>
              {HOURS.map(h => (
                <button key={h} onClick={() => setForm(p => ({ ...p, hours: h }))}
                  style={{ flex: 1, padding: isMobile ? '7px 4px' : '9px 4px', borderRadius: 'var(--r-md)', border: `1px solid ${form.hours === h ? 'var(--p)' : 'rgba(255,255,255,0.07)'}`, background: form.hours === h ? 'rgba(9,205,131,0.10)' : 'transparent', color: form.hours === h ? 'var(--p)' : 'var(--t4)', cursor: 'pointer', fontSize: isMobile ? 11 : 12, fontWeight: 700, transition: 'all 150ms ease' }}>
                  {h}h
                </button>
              ))}
            </div>
          </div>
          {AI.enabled() && (
            <div style={{ padding: '10px 14px', borderRadius: 'var(--r-md)', background: 'rgba(9,205,131,0.06)', border: '1px solid rgba(9,205,131,0.15)' }}>
              <p style={{ fontSize: 12, color: 'var(--p)' }}>✦ Personalized 8-week roadmap generation active</p>
            </div>
          )}
        </div>
        <div className="modal-footer" style={{ padding: isMobile ? '10px 14px' : '12px 20px' }}>
          <button onClick={onClose} className="btn btn-surface" style={{ padding: isMobile ? '8px 16px' : '11px 20px' }}>Cancel</button>
          <button onClick={create} disabled={loading} className="btn btn-primary"
            style={{ flex: 1, padding: isMobile ? '8px' : '11px', opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}>
            {loading ? <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />Generating…</> : <>Create Path →</>}
          </button>
        </div>
      </div>
    </div>
  );
}

function PathDetail({ path, onBack, onDelete }) {
  const color = SUBJECT_COLORS[path.subject] || 'var(--p)';
  return (
    <div className="page">
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 22, background: 'transparent', border: 'none', color: 'var(--p)', cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>
        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_back</span>All Paths
      </button>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="card fadeup" style={{ padding: 24, background: `linear-gradient(160deg,${color}0e,var(--s2))`, borderColor: `${color}20` }}>
          <h2 style={{ fontSize: 'clamp(1.075rem, 2.75vw, 1.475rem)', fontWeight: 800, color: 'var(--t1)', letterSpacing: '-0.025em', marginBottom: 6 }}>{path.title}</h2>
          <p style={{ fontSize: 13, color: 'var(--t3)', marginBottom: 18, lineHeight: 1.6 }}>{path.goal}</p>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 18 }}>
            {[{ icon: 'calendar_month', l: `Week ${path.currentWeek}/${path.totalWeeks}` }, { icon: 'schedule', l: `${path.hoursPerWeek}h/week` }, { icon: 'psychology', l: path.learningStyle }].map(({ icon, l }) => (
              <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 15, color: 'var(--t4)' }}>{icon}</span>
                <span style={{ fontSize: 12.5, color: 'var(--t2)', fontWeight: 600, textTransform: 'capitalize' }}>{l}</span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
            <span style={{ fontSize: 13, color: 'var(--t3)' }}>Overall Progress</span>
            <span style={{ fontSize: 18, fontWeight: 800, color }}>{path.progress}%</span>
          </div>
          <div style={{ height: 8, background: 'var(--s5)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${path.progress}%`, background: `linear-gradient(90deg,${color}88,${color})`, borderRadius: 99, boxShadow: `0 0 10px ${color}50`, transition: 'width 0.9s var(--smooth)' }} />
          </div>
        </div>

        <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--t1)' }}>Roadmap</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(path.phases || []).map(ph => <PhaseRow key={ph.phase} phase={ph} />)}
        </div>

        {path.aiTip && (
          <div style={{ padding: 16, borderRadius: 'var(--r-lg)', background: 'rgba(9,205,131,0.06)', border: '1px solid rgba(9,205,131,0.15)' }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--p)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 7 }}>✦ Mastery Tip</p>
            <p style={{ fontSize: 13, color: 'var(--t2)', lineHeight: 1.7 }}>{path.aiTip}</p>
          </div>
        )}

        {path.milestones?.length > 0 && (
          <div className="card" style={{ padding: 18 }}>
            <p className="section-label" style={{ marginBottom: 14 }}>Milestones</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {path.milestones.map((m, i) => {
                const done = i < (path.phases?.filter(p => p.status === 'completed').length || 0);
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: done ? 'var(--p)' : 'var(--s5)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1, boxShadow: done ? '0 0 8px rgba(9,205,131,0.4)' : 'none', transition: 'all 300ms' }}>
                      {done ? <span className="material-symbols-outlined" style={{ fontSize: 13, color: 'var(--bg-deep)', fontVariationSettings: "'FILL' 1" }}>check</span> : <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--t4)' }}>{i + 1}</span>}
                    </div>
                    <p style={{ fontSize: 12.5, color: done ? 'var(--t1)' : 'var(--t3)', lineHeight: 1.5 }}>{m}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <button onClick={() => { if (window.confirm('Delete this path?')) { onDelete(path.id); onBack(); } }}
          className="btn btn-danger" style={{ padding: '11px', width: '100%', borderRadius: 'var(--r-md)' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 17 }}>delete</span>Delete Path
        </button>
      </div>
    </div>
  );
}

export default function LearningPaths() {
  const { paths, A } = useApp();
  const [selected, setSelected] = useState(null);
  const [showNew, setShowNew] = useState(false);

  if (selected) return <PathDetail path={selected} onBack={() => setSelected(null)} onDelete={id => { A.path.remove(id); setSelected(null); }} />;

  const active = paths.filter(p => p.status === 'active');
  const completed = paths.filter(p => p.status === 'completed');
  const phaseDone = paths.reduce((a, p) => a + (p.phases?.filter(ph => ph.status === 'completed').length || 0), 0);

  return (
    <div className="page">
      <style>{`@keyframes slideUp{from{opacity:0;transform:translateY(40px)}to{opacity:1;transform:translateY(0)}}@keyframes fadeIn{from{opacity:0}to{opacity:1}}`}</style>
      <div className="fadeup" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 className="shimmer-text page-title">Learning Paths</h1>
          <p style={{ fontSize: 13, color: 'var(--t3)', marginTop: 4 }}>Surgical roadmaps to master any skill</p>
        </div>
        <button onClick={() => setShowNew(true)} className="btn btn-primary">
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>New Path
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))', gap: 'var(--gap-card)', marginBottom: 24 }}>
        {[{ l: 'Active', v: active.length, c: 'var(--p)', icon: 'route' }, { l: 'Phases Done', v: phaseDone, c: '#60a5fa', icon: 'check_circle' }, { l: 'Completed', v: completed.length, c: '#a78bfa', icon: 'flag' }].map(({ l, v, c, icon }, i) => (
          <div key={l} className={`card fadeup d${i + 1}`} style={{ padding: '16px 14px', textAlign: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20, color: c, display: 'block', marginBottom: 7 }}>{icon}</span>
            <p style={{ fontSize: 22, fontWeight: 800, color: c, letterSpacing: '-0.02em', lineHeight: 1 }}>{v}</p>
            <p style={{ fontSize: 11, color: 'var(--t4)', marginTop: 4 }}>{l}</p>
          </div>
        ))}
      </div>

      {active.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 15, fontWeight: 800, color: 'var(--t1)', marginBottom: 12 }}>Active</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 'var(--gap-card)' }}>
            {active.map((p, i) => <div key={p.id} className="fadeup" style={{ animationDelay: `${i * 0.06}s` }}><PathCard path={p} onSelect={setSelected} onDelete={A.path.remove} /></div>)}
          </div>
        </div>
      )}

      {completed.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 15, fontWeight: 800, color: 'var(--t1)', marginBottom: 12 }}>Completed</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 'var(--gap-card)', opacity: 0.7 }}>
            {completed.map(p => <PathCard key={p.id} path={p} onSelect={setSelected} onDelete={A.path.remove} />)}
          </div>
        </div>
      )}

      {paths.length === 0 && (
        <div className="card empty-state" style={{ marginTop: 20 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 52, color: 'var(--s6)' }}>route</span>
          <h3 style={{ fontWeight: 700, color: 'var(--t2)', margin: 0 }}>No learning paths yet</h3>
          <p style={{ fontSize: 13, color: 'var(--t3)', margin: 0 }}>Create your first personalized learning roadmap</p>
          <button onClick={() => setShowNew(true)} className="btn btn-primary" style={{ padding: '11px 28px' }}>Create First Path</button>
        </div>
      )}

      {showNew && <Portal><NewPathModal onClose={() => setShowNew(false)} onSave={p => { A.path.add(p); }} /></Portal>}
    </div>
  );
}
