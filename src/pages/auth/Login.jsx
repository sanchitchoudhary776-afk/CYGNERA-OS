import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@context/AuthContext';
import { LogoFull } from '@components/ui/Logo';
import toast from 'react-hot-toast';

export default function Login() {
  const { login, loading } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const from      = location.state?.from?.pathname || '/dashboard';

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [focus,    setFocus]    = useState('');

  const submit = async e => {
    e.preventDefault();
    if (!email || !password) { toast.error('Fill in all fields'); return; }
    const r = await login(email, password);
    if (r.success) { toast.success('Welcome back! 👋'); navigate(from, { replace:true }); }
    else toast.error(r.error || 'Login failed');
  };

  return (
    <div style={{ minHeight:'100dvh', display:'flex', background:'var(--bg)', overflow:'hidden' }}>

      {/* Left panel — branding (desktop only) */}
      <div className="hide-mobile" style={{ width:420, flexShrink:0, background:'var(--s1)', borderRight:'1px solid rgba(9,205,131,0.07)', display:'flex', flexDirection:'column', justifyContent:'space-between', padding:'40px 36px', position:'relative', overflow:'hidden' }}>
        {/* Background glow */}
        <div style={{ position:'absolute', top:-100, left:-100, width:400, height:400, borderRadius:'50%', background:'radial-gradient(rgba(9,205,131,0.08),transparent)', pointerEvents:'none' }}/>
        <div style={{ position:'absolute', bottom:-80, right:-80, width:300, height:300, borderRadius:'50%', background:'radial-gradient(rgba(9,205,131,0.05),transparent)', pointerEvents:'none' }}/>

        {/* Logo */}
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <LogoFull size={48} />
        </div>

        {/* Hero content */}
        <div>
          <div style={{ width:56, height:56, borderRadius:'var(--r-lg)', background:'rgba(9,205,131,0.1)', border:'1px solid rgba(9,205,131,0.2)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:24, animation:'float 3s ease-in-out infinite' }}>
            <span className="material-symbols-outlined" style={{ fontSize:28, color:'var(--p)', fontVariationSettings:"'FILL' 1" }}>auto_awesome</span>
          </div>
          <h2 style={{ fontSize:'clamp(1.5rem,3vw,2rem)', fontWeight:800, color:'var(--t1)', letterSpacing:'-0.03em', lineHeight:1.3, marginBottom:16, padding:'0.1em 0' }}>
            Your AI-powered<br/>
            <span style={{ background:'linear-gradient(135deg,var(--p),var(--p-lt))', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text', paddingBottom:'0.15em' }}>learning sanctuary.</span>
          </h2>
          <p style={{ fontSize:14, color:'var(--t3)', lineHeight:1.7, marginBottom:32 }}>
            The platform that understands how you learn, predicts what you'll forget, and guides you intelligently — every session.
          </p>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            {[
              { icon:'psychology',  text:'AI that adapts to your learning style' },
              { icon:'trending_up', text:'Progress insights that actually matter' },
              { icon:'timer',       text:'Focus sessions optimized for your brain' },
            ].map(({ icon, text }) => (
              <div key={text} style={{ display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ width:32, height:32, borderRadius:10, background:'rgba(9,205,131,0.1)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <span className="material-symbols-outlined" style={{ fontSize:16, color:'var(--p)' }}>{icon}</span>
                </div>
                <span style={{ fontSize:13, color:'var(--t2)' }}>{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div style={{ display:'flex', gap:24 }}>
          {[{ v:'43+', l:'Features' }, { v:'AI', l:'Powered' }, { v:'Free', l:'Forever' }].map(({ v, l }) => (
            <div key={l}>
              <p style={{ fontSize:22, fontWeight:800, color:'var(--p)', letterSpacing:'-0.03em', lineHeight:1 }}>{v}</p>
              <p style={{ fontSize:11, color:'var(--t4)', marginTop:3 }}>{l}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — form */}
      <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:'32px 24px', overflowY:'auto' }}>
        <div style={{ width:'100%', maxWidth:400, animation:'scaleIn 350ms var(--bounce) both' }}>

          {/* Mobile logo */}
          <div className="show-mobile" style={{ display:'flex', alignItems:'center', gap:10, marginBottom:32 }}>
            <LogoFull size={36} />
          </div>

          <div style={{ marginBottom:28 }}>
            <h1 style={{ fontSize:'clamp(1.5rem,4vw,1.9rem)', fontWeight:800, color:'var(--t1)', letterSpacing:'-0.03em', marginBottom:6, lineHeight:1.35, padding:'0.12em 0' }}>Welcome back</h1>
            <p style={{ fontSize:13.5, color:'var(--t3)' }}>Sign in to continue your learning journey</p>
          </div>

          {/* Demo hint */}
          <div style={{ padding:'11px 16px', borderRadius:'var(--r-md)', background:'rgba(9,205,131,0.07)', border:'1px solid rgba(9,205,131,0.18)', marginBottom:22, display:'flex', alignItems:'flex-start', gap:10 }}>
            <span className="material-symbols-outlined" style={{ fontSize:16, color:'var(--p)', flexShrink:0, marginTop:1, fontVariationSettings:"'FILL' 1" }}>info</span>
            <p style={{ fontSize:12, color:'var(--t2)', lineHeight:1.5 }}><strong style={{ color:'var(--p)' }}>Demo:</strong> Any email + any password (6+ chars)</p>
          </div>

          <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
            {/* Email */}
            <div>
              <label className="label">Email Address</label>
              <div style={{ position:'relative' }}>
                <span className="material-symbols-outlined" style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', fontSize:18, color:focus==='email'?'var(--p)':'var(--t4)', pointerEvents:'none', transition:'color 200ms' }}>mail</span>
                <input className="input" type="email" value={email} onChange={e=>setEmail(e.target.value)}
                  onFocus={()=>setFocus('email')} onBlur={()=>setFocus('')}
                  placeholder="you@example.com" autoComplete="email" required
                  style={{ paddingLeft:42 }}/>
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="label">Password</label>
              <div style={{ position:'relative' }}>
                <span className="material-symbols-outlined" style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', fontSize:18, color:focus==='pass'?'var(--p)':'var(--t4)', pointerEvents:'none', transition:'color 200ms' }}>lock</span>
                <input className="input" type={showPass?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)}
                  onFocus={()=>setFocus('pass')} onBlur={()=>setFocus('')}
                  placeholder="••••••••" autoComplete="current-password" required
                  style={{ paddingLeft:42, paddingRight:42 }}/>
                <button type="button" onClick={()=>setShowPass(p=>!p)}
                  style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'transparent', border:'none', cursor:'pointer', color:'var(--t4)', display:'flex', alignItems:'center' }}>
                  <span className="material-symbols-outlined" style={{ fontSize:18 }}>{showPass?'visibility_off':'visibility'}</span>
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="btn btn-primary"
              style={{ width:'100%', padding:'13px 24px', fontSize:15, borderRadius:'var(--r-md)', marginTop:4, opacity:loading?0.7:1, cursor:loading?'not-allowed':'pointer' }}>
              {loading
                ? <><div className="spinner" style={{ width:16, height:16, borderWidth:2 }}/>Signing in…</>
                : <><span className="material-symbols-outlined" style={{ fontSize:18 }}>login</span>Sign In</>}
            </button>
          </form>

          <div style={{ display:'flex', alignItems:'center', gap:12, margin:'20px 0' }}>
            <div style={{ flex:1, height:1, background:'rgba(255,255,255,0.06)' }}/>
            <span style={{ fontSize:12, color:'var(--t4)' }}>or</span>
            <div style={{ flex:1, height:1, background:'rgba(255,255,255,0.06)' }}/>
          </div>

          <p style={{ textAlign:'center', fontSize:13.5, color:'var(--t3)' }}>
            New to CYGNERA OS?{' '}
            <Link to="/signup" style={{ color:'var(--p)', fontWeight:700, textDecoration:'none' }}>Create account →</Link>
          </p>
        </div>
      </div>

      <style>{`
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-7px)} }
        @keyframes scaleIn { from{opacity:0;transform:scale(0.95)} to{opacity:1;transform:scale(1)} }
      `}</style>
    </div>
  );
}
