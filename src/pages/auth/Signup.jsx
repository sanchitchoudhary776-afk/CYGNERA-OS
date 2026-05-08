import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth }   from '@context/AuthContext';
import { SUBJECTS }  from '@utils';
import { LogoFull }  from '@components/ui/Logo';
import toast from 'react-hot-toast';

const STYLES = [
  { id:'visual',      icon:'visibility',       label:'Visual',      desc:'Charts & diagrams' },
  { id:'auditory',    icon:'headphones',        label:'Auditory',    desc:'Talks & audio'     },
  { id:'reading',     icon:'menu_book',         label:'Reading',     desc:'Notes & books'     },
  { id:'kinesthetic', icon:'sports_handball',   label:'Hands-on',   desc:'Projects & build'  },
];

export default function Signup() {
  const { signup, loading } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1=account 2=profile

  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [subjects, setSubjects] = useState([]);
  const [style,    setStyle]    = useState('');
  const [focus,    setFocus]    = useState('');

  const toggleSub = s => setSubjects(p => p.includes(s) ? p.filter(x=>x!==s) : [...p,s]);

  const step1 = e => {
    e.preventDefault();
    if (!name.trim())      { toast.error('Add your name'); return; }
    if (!email.trim())     { toast.error('Add your email'); return; }
    if (password.length<6) { toast.error('Password needs 6+ chars'); return; }
    setStep(2);
  };

  const submit = async () => {
    if (!style) { toast.error('Pick your learning style'); return; }
    const r = await signup({ name:name.trim(), email:email.trim(), password, subjects, learningStyle:style });
    if (r.success) { toast.success('Welcome to CYGNERA OS! 🚀'); navigate('/dashboard', { replace:true }); }
    else toast.error(r.error || 'Signup failed');
  };

  const pct = step === 1 ? 50 : 100;

  return (
    <div style={{ minHeight:'100dvh', display:'flex', alignItems:'center', justifyContent:'center', padding:'24px 16px', background:'var(--bg)', overflowY:'auto' }}>
      {/* Background glow */}
      <div style={{ position:'fixed', top:'20%', right:'10%', width:400, height:400, borderRadius:'50%', background:'radial-gradient(rgba(9,205,131,0.06),transparent)', pointerEvents:'none', zIndex:0 }}/>

      <div style={{ width:'100%', maxWidth:460, position:'relative', zIndex:1 }}>
        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:28 }}>
          <LogoFull size={42} />
        </div>

        {/* Progress bar */}
        <div style={{ marginBottom:28 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
            {[1,2].map(n => (
              <div key={n} style={{ display:'flex', alignItems:'center', gap:8 }}>
                <div style={{ width:28, height:28, borderRadius:'50%', background:step>=n?'var(--p)':'var(--s4)', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 300ms var(--bounce)', boxShadow:step===n?'0 0 12px rgba(9,205,131,0.5)':'none' }}>
                  {step>n
                    ? <span className="material-symbols-outlined" style={{ fontSize:14, color:'var(--bg-deep)', fontVariationSettings:"'FILL' 1" }}>check</span>
                    : <span style={{ fontSize:12, fontWeight:700, color:step>=n?'var(--bg-deep)':'var(--t4)' }}>{n}</span>}
                </div>
                <span style={{ fontSize:12, fontWeight:600, color:step===n?'var(--p)':'var(--t4)' }}>
                  {n===1?'Account':'Profile'}
                </span>
              </div>
            ))}
          </div>
          <div style={{ height:3, background:'var(--s4)', borderRadius:99, overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${pct}%`, background:'linear-gradient(90deg,var(--p-dk),var(--p))', borderRadius:99, transition:'width 400ms var(--smooth)', boxShadow:'0 0 8px rgba(9,205,131,0.4)' }}/>
          </div>
        </div>

        {/* Card */}
        <div className="card" style={{ padding:'24px 24px 20px' }}>

          {/* STEP 1 */}
          {step===1 && (
            <form onSubmit={step1} style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div>
                <h2 style={{ fontSize:'clamp(1.25rem,3vw,1.55rem)', fontWeight:800, color:'var(--t1)', letterSpacing:'-0.03em', marginBottom:4, lineHeight:1.35, padding:'0.12em 0' }}>Create account</h2>
                <p style={{ fontSize:13, color:'var(--t3)' }}>Start your AI-powered learning journey</p>
              </div>

              {[
                { label:'Full Name',  val:name,     set:setName,     type:'text',     id:'name',  icon:'person',   ph:'Aditya Kumar',       auto:'name'             },
                { label:'Email',      val:email,    set:setEmail,    type:'email',    id:'email', icon:'mail',     ph:'you@example.com',    auto:'email'            },
                { label:'Password',   val:password, set:setPassword, type:showPass?'text':'password', id:'pass', icon:'lock', ph:'Min. 6 characters', auto:'new-password', showToggle:true },
              ].map(({ label, val, set, type, id, icon, ph, auto, showToggle }) => (
                <div key={id}>
                  <label className="label">{label}</label>
                  <div style={{ position:'relative' }}>
                    <span className="material-symbols-outlined" style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', fontSize:17, color:focus===id?'var(--p)':'var(--t4)', pointerEvents:'none', transition:'color 180ms' }}>{icon}</span>
                    <input className="input" type={type} value={val} onChange={e=>set(e.target.value)}
                      onFocus={()=>setFocus(id)} onBlur={()=>setFocus('')}
                      placeholder={ph} autoComplete={auto} required
                      style={{ paddingLeft:40, paddingRight:showToggle?40:14 }}/>
                    {showToggle && (
                      <button type="button" onClick={()=>setShowPass(p=>!p)}
                        style={{ position:'absolute', right:11, top:'50%', transform:'translateY(-50%)', background:'transparent', border:'none', cursor:'pointer', color:'var(--t4)', display:'flex' }}>
                        <span className="material-symbols-outlined" style={{ fontSize:17 }}>{showPass?'visibility_off':'visibility'}</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}

              <button type="submit" className="btn btn-primary" style={{ width:'100%', padding:'13px', fontSize:15, borderRadius:'var(--r-md)', marginTop:4 }}>
                Continue <span className="material-symbols-outlined" style={{ fontSize:18 }}>arrow_forward</span>
              </button>
            </form>
          )}

          {/* STEP 2 */}
          {step===2 && (
            <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
              <div>
                <h2 style={{ fontSize:'clamp(1.25rem,3vw,1.55rem)', fontWeight:800, color:'var(--t1)', letterSpacing:'-0.03em', marginBottom:4, lineHeight:1.35, padding:'0.12em 0' }}>Personalize your OS</h2>
                <p style={{ fontSize:13, color:'var(--t3)' }}>Helps your AI coach guide you better</p>
              </div>

              {/* Subjects */}
              <div>
                <label className="label" style={{ marginBottom:10 }}>Your Subjects (select all)</label>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(110px,1fr))', gap:7 }}>
                  {SUBJECTS.slice(0,8).map(s => (
                    <button key={s} type="button" onClick={()=>toggleSub(s)}
                      style={{ padding:'9px 8px', borderRadius:'var(--r-md)', border:`1.5px solid ${subjects.includes(s)?'var(--p)':'rgba(255,255,255,0.07)'}`, background:subjects.includes(s)?'rgba(9,205,131,0.1)':'var(--s3)', color:subjects.includes(s)?'var(--p)':'var(--t3)', cursor:'pointer', fontWeight:700, fontSize:12, transition:'all 180ms var(--bounce)', transform:subjects.includes(s)?'scale(1.03)':'scale(1)' }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Learning style */}
              <div>
                <label className="label" style={{ marginBottom:10 }}>How do you learn best?</label>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                  {STYLES.map(({ id, icon, label, desc }) => (
                    <button key={id} type="button" onClick={()=>setStyle(id)}
                      style={{ padding:'12px 10px', borderRadius:'var(--r-md)', border:`2px solid ${style===id?'var(--p)':'rgba(255,255,255,0.06)'}`, background:style===id?'rgba(9,205,131,0.1)':'var(--s3)', cursor:'pointer', transition:'all 200ms var(--bounce)', transform:style===id?'scale(1.03)':'scale(1)', textAlign:'left' }}>
                      <span className="material-symbols-outlined" style={{ fontSize:20, color:style===id?'var(--p)':'var(--t4)', display:'block', marginBottom:6 }}>{icon}</span>
                      <p style={{ fontSize:12.5, fontWeight:700, color:style===id?'var(--p)':'var(--t1)', marginBottom:2 }}>{label}</p>
                      <p style={{ fontSize:10.5, color:'var(--t4)' }}>{desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display:'flex', gap:10, marginTop:4 }}>
                <button onClick={()=>setStep(1)} className="btn btn-surface" style={{ padding:'11px 18px', flexShrink:0 }}>
                  <span className="material-symbols-outlined" style={{ fontSize:18 }}>arrow_back</span>
                </button>
                <button onClick={submit} disabled={loading} className="btn btn-primary"
                  style={{ flex:1, padding:'11px', fontSize:15, borderRadius:'var(--r-md)', opacity:loading?0.7:1, cursor:loading?'not-allowed':'pointer' }}>
                  {loading
                    ? <><div className="spinner" style={{ width:15,height:15,borderWidth:2 }}/>Creating…</>
                    : <>Start Learning 🚀</>}
                </button>
              </div>
            </div>
          )}
        </div>

        <p style={{ textAlign:'center', fontSize:13, color:'var(--t3)', marginTop:16 }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color:'var(--p)', fontWeight:700, textDecoration:'none' }}>Sign in →</Link>
        </p>
      </div>
    </div>
  );
}
