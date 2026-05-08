import { useState, useEffect } from 'react';
import { useAuth }     from '@context/AuthContext';
import { useApp }      from '@context/AppContext';
import { useTheme }    from '@context/ThemeContext';
import { AI }          from '@services/ai';
import { SUBJECTS, initials } from '@utils';
import { ThemeToggle } from '@components/ui';
import toast from 'react-hot-toast';
import { usePremium } from '@components/ui/PremiumUI';

const STYLES = [
  { id:'visual',      icon:'visibility',     label:'Visual',   desc:'Charts & diagrams' },
  { id:'auditory',    icon:'headphones',     label:'Auditory', desc:'Talks & podcasts'  },
  { id:'reading',     icon:'menu_book',      label:'Reading',  desc:'Notes & books'     },
  { id:'kinesthetic', icon:'sports_handball',label:'Hands-on', desc:'Build & practice'  },
];

function Toggle({ on, onChange }) {
  return (
    <button 
      type="button"
      onClick={() => onChange(!on)}
      style={{ 
        position: 'relative',
        width: 56, 
        height: 32, 
        borderRadius: 999, 
        border: 'none', 
        cursor: 'pointer', 
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        padding: '3px',
        background: on ? 'linear-gradient(135deg, var(--p-lt), var(--p))' : 'var(--s3)',
        boxShadow: on 
          ? 'inset 0 2px 4px rgba(0,0,0,0.1), 0 4px 16px rgba(9, 205, 131, 0.4)' 
          : 'inset 0 2px 6px rgba(0,0,0,0.2), inset 0 0 0 1px rgba(255,255,255,0.03)',
        transition: 'all 400ms cubic-bezier(0.25, 1, 0.5, 1)',
        WebkitTapHighlightColor: 'transparent',
      }}>
      <div style={{ 
        width: 26, 
        height: 26, 
        borderRadius: '50%', 
        background: 'linear-gradient(180deg, #ffffff 0%, #e2e8f0 100%)',
        transform: on ? 'translateX(24px)' : 'translateX(0)',
        boxShadow: '0 2px 6px rgba(0,0,0,0.2), 0 4px 12px rgba(0,0,0,0.1), inset 0 2px 2px rgba(255,255,255,1)',
        transition: 'transform 400ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {/* Micro-status glowing core */}
        <div style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: on ? 'var(--p)' : '#cbd5e1',
          boxShadow: on ? '0 0 8px var(--p), inset 0 1px 1px rgba(255,255,255,0.8)' : 'inset 0 1px 2px rgba(0,0,0,0.1)',
          transition: 'all 400ms ease'
        }} />
      </div>
    </button>
  );
}

function Row({ icon, label, desc, children, color='var(--p)' }) {
  return (
    <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',gap:16,padding:'14px 0',borderBottom:'1px solid var(--card-b)' }}>
      <div style={{ display:'flex',alignItems:'center',gap:12,flex:1,minWidth:0 }}>
        <div style={{ width:34,height:34,borderRadius:'var(--r-md)',background:`${color}12`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
          <span className="material-symbols-outlined" style={{ fontSize:17,color }}>{icon}</span>
        </div>
        <div style={{ minWidth:0 }}>
          <p style={{ fontSize:13,fontWeight:700,color:'var(--t1)' }}>{label}</p>
          {desc && <p style={{ fontSize:11.5,color:'var(--t3)',marginTop:1,lineHeight:1.4 }}>{desc}</p>}
        </div>
      </div>
      <div style={{ flexShrink:0 }}>{children}</div>
    </div>
  );
}

function Section({ title, children, delay=0 }) {
  return (
    <div className={`card fadeup`} style={{ padding:'20px 22px',animationDelay:`${delay}s` }}>
      <p style={{ fontSize:10.5,fontWeight:700,color:'var(--t4)',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:4 }}>{title}</p>
      {children}
    </div>
  );
}

export default function Settings() {
  const { user, update: updateUser, logout } = useAuth();
  const { notes, tasks, schedule, videos, paths, checkIns, A } = useApp();
  const { theme } = useTheme();
  const { askConfirm } = usePremium();
  const aiOn = AI.enabled();

  const [editName, setEditName] = useState(false);
  const [newName,  setNewName]  = useState(user?.name || '');

  const defaultNotifs = { deadline:true, study:true, streak:true, achievement:true, checkin:false };
  const [notifs, setNotifs] = useState(() => {
    try {
      const saved = localStorage.getItem('los_notif_prefs');
      return saved ? { ...defaultNotifs, ...JSON.parse(saved) } : defaultNotifs;
    } catch { return defaultNotifs; }
  });

  useEffect(() => {
    localStorage.setItem('los_notif_prefs', JSON.stringify(notifs));
  }, [notifs]);

  const saveName = () => {
    if (!newName.trim()) { toast.error('Name cannot be empty'); return; }
    updateUser({ name: newName.trim() });
    setEditName(false);
    toast.success('Name updated ✨');
  };

  const exportData = () => {
    const data = {
      user:  { name:user?.name, email:user?.email, learningStyle:user?.learningStyle },
      notes: notes.map(({ title, content, subject, tags })=>({ title, content, subject, tags })),
      tasks: tasks.map(({ title, subject, status, priority, deadline })=>({ title, subject, status, priority, deadline })),
      schedule: schedule.length, videos: videos.length, paths: paths.length,
      checkIns: checkIns.length, exportedAt: new Date().toISOString(),
    };
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type:'application/json' })),
      download: `cygnera-os-${Date.now()}.json`,
    });
    a.click();
    toast.success('Data exported 📦');
  };

  const clearData = async () => {
    if (await askConfirm('Reset Everything?', 'This will permanently erase all your notes, tasks, and progress. This action is irreversible.')) {
      localStorage.removeItem('los_v3');
      toast.success('Data cleared. Reloading…');
      setTimeout(()=>window.location.reload(), 700);
    }
  };

  const handleLogout = async () => {
    if (await askConfirm('Logout?', 'Ready to end your focus session?')) {
      logout();
    }
  };

  const completed = (tasks || []).filter(t=>t.status==='completed').length;
  const watched   = (videos || []).filter(v=>v.watched).length;

  return (
    <div className="page" style={{ maxWidth:680 }}>
      <div className="fadeup" style={{ marginBottom:24 }}>
        <h1 className="shimmer-text page-title">Settings</h1>
        <p style={{ fontSize:13,color:'var(--t3)',marginTop:4 }}>Manage your CYGNERA OS experience</p>
      </div>

      <div style={{ display:'flex',flexDirection:'column',gap:14 }}>

        {/* Profile */}
        <Section title="Profile" delay={0.05}>
          <div style={{ display:'flex',alignItems:'center',gap:16,padding:'16px 0 18px',borderBottom:'1px solid var(--card-b)',marginBottom:4 }}>
            <div style={{ width:58,height:58,borderRadius:'var(--r-lg)',background:'linear-gradient(135deg,var(--p),var(--p-lt))',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,fontWeight:800,color:'var(--bg-deep)',flexShrink:0,boxShadow:'0 6px 20px rgba(9,205,131,0.35)' }}>
              {initials(user?.name||'U')}
            </div>
            <div style={{ flex:1,minWidth:0 }}>
              {editName ? (
                <div style={{ display:'flex',gap:8,alignItems:'center' }}>
                  <input className="input" value={newName} onChange={e=>setNewName(e.target.value)}
                    onKeyDown={e=>e.key==='Enter'&&saveName()} autoFocus style={{ padding:'8px 12px',fontSize:14 }}/>
                  <button onClick={saveName} className="btn btn-primary" style={{ padding:'8px 14px',fontSize:12,flexShrink:0 }}>Save</button>
                  <button onClick={()=>setEditName(false)} className="icon-btn"><span className="material-symbols-outlined" style={{ fontSize:18 }}>close</span></button>
                </div>
              ) : (
                <div style={{ display:'flex',alignItems:'center',gap:8 }}>
                  <p style={{ fontSize:16,fontWeight:800,color:'var(--t1)' }}>{user?.name}</p>
                  <button onClick={()=>setEditName(true)} className="icon-btn" style={{ width:28,height:28,opacity:0.6 }}>
                    <span className="material-symbols-outlined" style={{ fontSize:15 }}>edit</span>
                  </button>
                </div>
              )}
              <p style={{ fontSize:12,color:'var(--t3)',marginTop:2 }}>{user?.email}</p>
              {user?.subjects?.length > 0 && (
                <div style={{ display:'flex',gap:5,flexWrap:'wrap',marginTop:8 }}>
                  {user.subjects.slice(0,4).map(s=><span key={s} style={{ fontSize:10,padding:'2px 8px',borderRadius:99,background:'rgba(9,205,131,0.10)',color:'var(--p)',fontWeight:700 }}>{s}</span>)}
                </div>
              )}
            </div>
          </div>
          <div style={{ paddingTop:12 }}>
            <p style={{ fontSize:10.5,fontWeight:700,color:'var(--t4)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:12 }}>Learning Style</p>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:8 }}>
              {STYLES.map(({ id, icon, label, desc })=>{
                const active = user?.learningStyle===id;
                return (
                  <button key={id} onClick={()=>{ updateUser({ learningStyle:id }); toast.success(`Style: ${label}`); }}
                    style={{ padding:'11px 10px',borderRadius:'var(--r-md)',border:`2px solid ${active?'var(--p)':'var(--card-b)'}`,background:active?'rgba(9,205,131,0.10)':'var(--s3)',cursor:'pointer',transition:'all 200ms var(--bounce)',transform:active?'scale(1.02)':'scale(1)',textAlign:'left' }}>
                    <span className="material-symbols-outlined" style={{ fontSize:18,color:active?'var(--p)':'var(--t4)',display:'block',marginBottom:5 }}>{icon}</span>
                    <p style={{ fontSize:12,fontWeight:700,color:active?'var(--p)':'var(--t1)',marginBottom:2 }}>{label}</p>
                    <p style={{ fontSize:10.5,color:'var(--t4)' }}>{desc}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </Section>

        {/* Appearance / Theme */}
        <Section title="Appearance" delay={0.08}>
          <Row icon="contrast" label="Theme Mode" desc={theme === 'light' ? 'Light mode active · Soft white interface' : 'Dark mode active · Deep emerald interface'} color="var(--p)">
            <ThemeToggle size={40} />
          </Row>
          <div style={{ padding:'12px 0 4px' }}>
            <p style={{ fontSize:11,color:'var(--t3)',lineHeight:1.5 }}>
              Your preference is saved automatically and applies across all sessions. 
              On your first visit, the app matches your system appearance.
            </p>
          </div>
        </Section>

        <Section title="Smart Features" delay={0.1}>

          <Row icon="psychology" label="Smart Engine"
            desc={aiOn ? 'Connected · Intelligent features are active' : 'Connect API key to unlock smart automation'}
            color={aiOn ? 'var(--p)' : '#e9cd6e'}>
            <span style={{ padding:'3px 12px',borderRadius:999,fontWeight:700,fontSize:11,
              background:aiOn ? 'rgba(9,205,131,0.12)' : 'rgba(233,205,110,0.12)',
              color:aiOn ? 'var(--p)' : '#e9cd6e',
              border:`1px solid ${aiOn ? 'rgba(9,205,131,0.28)' : 'rgba(233,205,110,0.28)'}` }}>
              {aiOn ? 'ACTIVE' : 'INACTIVE'}
            </span>
          </Row>
          {!aiOn && (
            <div style={{ padding:'12px 14px',borderRadius:'var(--r-md)',background:'rgba(233,205,110,0.06)',border:'1px solid rgba(233,205,110,0.18)',margin:'12px 0 4px' }}>
              <p style={{ fontSize:12,fontWeight:700,color:'#e9cd6e',marginBottom:8 }}>How to enable:</p>
              <p style={{ fontSize:11,color:'var(--t3)',lineHeight:1.6 }}>
                Get your free API key from{' '}
                <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer" style={{ color:'var(--p)',fontWeight:700 }}>
                  console.groq.com
                </a>
                {' '}to activate the full intelligence suite.
              </p>
            </div>
          )}
          {aiOn && ['Note Intelligence (Flashcards & Summaries)','Task Breakdown','Progress Insights','Mood Coaching','Timer Personalization','Learning Path Generation','Daily Briefing','Schedule Planning','Achievement Messages'].map(f=>(
            <Row key={f} icon="check_circle" label={f} desc="" color="var(--p)">
              <span style={{ fontSize:11,fontWeight:700,color:'var(--p)' }}>✓ ON</span>
            </Row>
          ))}
        </Section>

        {/* Notifications */}
        <Section title="Notifications" delay={0.15}>
          {[
            { k:'deadline',    icon:'event_upcoming',        label:'Deadline Reminders', desc:'1 day, morning, and 1hr before', c:'#ff6b6b' },
            { k:'study',       icon:'schedule',              label:'Study Reminders',    desc:'10 min before sessions',         c:'#60a5fa' },
            { k:'streak',      icon:'local_fire_department', label:'Streak Nudges',      desc:'Daily streak reminder',          c:'#e9cd6e' },
            { k:'achievement', icon:'emoji_events',          label:'Achievement Alerts', desc:'When you earn a badge',          c:'#a78bfa' },
            { k:'checkin',     icon:'sentiment_satisfied',   label:'Check-In Reminder',  desc:'Daily 9AM nudge',                c:'var(--p)' },
          ].map(({ k, icon, label, desc, c })=>(
            <Row key={k} icon={icon} label={label} desc={desc} color={c}>
              <Toggle on={notifs[k]} onChange={v=>{ setNotifs(p=>({...p,[k]:v})); toast.success(`${label} ${v?'enabled':'disabled'}`); }}/>
            </Row>
          ))}
        </Section>

        {/* Stats */}
        <Section title="Your Progress" delay={0.2}>
          <div className="grid-3" style={{ gap:10,padding:'12px 0' }}>
            {[
              { l:'Notes',     v:(notes||[]).length,    icon:'edit_note',          c:'var(--p)'   },
              { l:'Tasks Done',v:completed,             icon:'task_alt',           c:'#60a5fa'    },
              { l:'Watched',   v:watched,               icon:'smart_display',      c:'#ff6b6b'    },
              { l:'Schedules', v:(schedule||[]).length, icon:'calendar_month',     c:'#e9cd6e'    },
              { l:'Paths',     v:(paths||[]).length,    icon:'route',              c:'#34d399'    },
              { l:'Check-ins', v:(checkIns||[]).length, icon:'sentiment_satisfied',c:'#a78bfa'    },
            ].map(({ l,v,icon,c })=>(
              <div key={l} style={{ textAlign:'center',padding:'14px 8px',borderRadius:'var(--r-lg)',background:'var(--s3)',border:'1px solid var(--card-b)' }}>
                <span className="material-symbols-outlined" style={{ fontSize:18,color:c,display:'block',marginBottom:6 }}>{icon}</span>
                <p style={{ fontSize:22,fontWeight:800,color:c,letterSpacing:'-0.02em',lineHeight:1 }}>{v}</p>
                <p style={{ fontSize:10.5,color:'var(--t4)',marginTop:3 }}>{l}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* Data & Account */}
        <Section title="Data & Account" delay={0.25}>
          <Row icon="file_download" label="Export Data" desc="Download all your data as JSON" color="#60a5fa">
            <button onClick={exportData} className="btn btn-surface" style={{ padding:'7px 16px',fontSize:12 }}>Export</button>
          </Row>
          <Row icon="delete_sweep" label="Clear All Data" desc="Permanently delete everything" color="var(--danger)">
            <button onClick={clearData}
              style={{ padding:'7px 16px',borderRadius:'var(--r-lg)',border:'1px solid rgba(255,107,107,0.28)',background:'rgba(255,107,107,0.08)',color:'var(--danger)',cursor:'pointer',fontSize:12,fontWeight:700 }}>
              Clear
            </button>
          </Row>
          <Row icon="logout" label="Sign Out" desc="Log out of your account" color="var(--danger)">
            <button onClick={handleLogout}
              style={{ padding:'7px 16px',borderRadius:'var(--r-lg)',border:'1px solid rgba(255,107,107,0.28)',background:'rgba(255,107,107,0.08)',color:'var(--danger)',cursor:'pointer',fontSize:12,fontWeight:700 }}>
              Sign Out
            </button>
          </Row>
        </Section>

        {/* Footer */}
        <div style={{ textAlign:'center',padding:'8px 0 20px' }}>
          <p style={{ fontSize:12,color:'var(--t4)' }}>Learner OS v1.0</p>
          <p style={{ fontSize:11,color:'var(--s6)',marginTop:4 }}>© 2026 · Built for ambitious learners</p>
        </div>
      </div>
    </div>
  );
}
