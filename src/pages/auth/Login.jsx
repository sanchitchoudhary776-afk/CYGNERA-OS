import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@context/AuthContext';
import { LogoFull } from '@components/ui/Logo';
import toast from 'react-hot-toast';

export default function Login() {
  const { login, loginWithGoogle, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/dashboard';
  const [googleLoading, setGoogleLoading] = useState(false);

  // Google Account Chooser state
  const [showGoogleChooser, setShowGoogleChooser] = useState(false);
  const [customGmail, setCustomGmail] = useState('');
  const [customName, setCustomName] = useState('');
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [googleHandshakeStep, setGoogleHandshakeStep] = useState('');

  const [googleAccounts, setGoogleAccounts] = useState(() => {
    try {
      const saved = localStorage.getItem('ax_google_accounts');
      if (saved) return JSON.parse(saved);
    } catch(e){}
    return [
      { name: 'Sanchit Choudhary', email: 'sanchitchoudhary776@gmail.com', avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Sanchit' }
    ];
  });

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [focus, setFocus] = useState('');

  const submit = async e => {
    e.preventDefault();
    if (!username.trim() || !password) { toast.error('Please enter your username and password'); return; }
    
    // Alphanumeric username validation
    const cleanUsername = username.trim().toLowerCase();
    if (cleanUsername.includes('@')) {
      toast.error('Please sign in using your username, not an email.');
      return;
    }
    if (cleanUsername.length < 3) {
      toast.error('Username must be at least 3 characters.');
      return;
    }

    const r = await login(cleanUsername, password);
    if (r.success) {
      toast.success('Welcome back! 👋');
      navigate(from, { replace: true });
    } else {
      toast.error(r.error || 'Login failed');
    }
  };

  const handleGoogleLogin = () => {
    setShowGoogleChooser(true);
    setIsCustomMode(false);
  };

  const handleAddCustomAccount = (emailInput) => {
    const email = emailInput.trim();
    if (!email || !email.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }
    
    const part = email.split('@')[0];
    const nameVal = part
      .split(/[\._-]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    const newAcc = {
      name: nameVal,
      email: email,
      avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${part}`
    };

    const updated = [newAcc, ...googleAccounts.filter(a => a.email !== email)];
    setGoogleAccounts(updated);
    try {
      localStorage.setItem('ax_google_accounts', JSON.stringify(updated));
    } catch (e) {}

    executeGoogleBridge(newAcc.email, newAcc.name, newAcc.avatar);
  };

  const executeGoogleBridge = async (email, nameVal, avatar) => {
    setShowGoogleChooser(true);
    setGoogleLoading(true);
    setGoogleHandshakeStep('handshake');
    
    await new Promise(r => setTimeout(r, 700));
    setGoogleHandshakeStep('securing');
    
    await new Promise(r => setTimeout(r, 600));
    setGoogleHandshakeStep('logging');
    
    const r = await loginWithGoogle(email, nameVal, avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${email}`);
    if (r.success) {
      toast.success('Welcome back! 👋');
      navigate(from, { replace: true });
    } else {
      toast.error(r.error || 'Google sign-in failed');
      setGoogleLoading(false);
      setGoogleHandshakeStep('');
      setShowGoogleChooser(false);
    }
  };

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', background: 'var(--bg)', overflow: 'hidden', position: 'relative' }}>
      {/* Animated background gradients */}
      <div style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 0
      }}>
        <div style={{
          position: 'absolute',
          width: 600,
          height: 600,
          background: 'radial-gradient(circle, rgba(9,205,131,0.08) 0%, transparent 70%)',
          borderRadius: '50%',
          top: '-200px',
          right: '-200px',
          animation: 'float 8s ease-in-out infinite',
          filter: 'blur(40px)'
        }} />
        <div style={{
          position: 'absolute',
          width: 400,
          height: 400,
          background: 'radial-gradient(circle, rgba(96,165,250,0.05) 0%, transparent 70%)',
          borderRadius: '50%',
          bottom: '100px',
          left: '-100px',
          animation: 'float 10s ease-in-out infinite 1s',
          filter: 'blur(40px)'
        }} />
      </div>

      {/* Left panel — branding (desktop only) */}
      <div className="hide-mobile" style={{ width: 420, flexShrink: 0, background: 'var(--s1)', borderRight: '1px solid rgba(9,205,131,0.12)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '40px 36px', position: 'relative', overflow: 'hidden', zIndex: 1 }}>
        <div style={{ position: 'absolute', top: -100, left: -100, width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(rgba(9,205,131,0.08),transparent)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -80, right: -80, width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(rgba(9,205,131,0.05),transparent)', pointerEvents: 'none' }} />

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, animation: 'slideIn 600ms ease-out' }}>
          <LogoFull size={48} />
          <span style={{ fontSize: 16, fontWeight: 800, background: 'linear-gradient(135deg, var(--p), var(--p-lt))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>AXINITE</span>
        </div>

        {/* Hero content */}
        <div>
          <div style={{ width: 56, height: 56, borderRadius: 'var(--r-lg)', background: 'linear-gradient(135deg, rgba(9,205,131,0.15), rgba(9,205,131,0.05))', border: '1px solid rgba(9,205,131,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24, animation: 'float 3s ease-in-out infinite', boxShadow: '0 0 20px rgba(9,205,131,0.1)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 28, color: 'var(--p)', fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
          </div>
          <h2 style={{ fontSize: 'clamp(1.4rem, 2.75vw, 1.9rem)', fontWeight: 800, color: 'var(--t1)', letterSpacing: '-0.03em', lineHeight: 1.3, marginBottom: 16 }}>
            Your AI-powered<br />
            <span style={{ background: 'linear-gradient(135deg,var(--p),var(--p-lt))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', paddingBottom: '0.15em' }}>learning sanctuary.</span>
          </h2>
          <p style={{ fontSize: 14, color: 'var(--t3)', lineHeight: 1.7, marginBottom: 32 }}>
            The platform that understands how you learn, predicts what you'll forget, and guides you intelligently — every session.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { icon: 'psychology', text: 'AI that adapts to your learning style' },
              { icon: 'trending_up', text: 'Progress insights that actually matter' },
              { icon: 'timer', text: 'Focus sessions optimized for your brain' },
            ].map(({ icon, text }) => (
              <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(9,205,131,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid rgba(9,205,131,0.2)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 15, color: 'var(--p)' }}>{icon}</span>
                </div>
                <span style={{ fontSize: 13, color: 'var(--t2)', fontWeight: 500 }}>{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 24 }}>
          {[{ v: '50k+', l: 'Users' }, { v: 'AI', l: 'Powered' }, { v: 'Free', l: 'Forever' }].map(({ v, l }) => (
            <div key={l}>
              <p style={{ fontSize: 22, fontWeight: 800, background: 'linear-gradient(135deg, var(--p), var(--p-lt))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', letterSpacing: '-0.03em', lineHeight: 1 }}>{v}</p>
              <p style={{ fontSize: 11, color: 'var(--t4)', marginTop: 3, fontWeight: 600 }}>{l}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — form */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 24px', overflowY: 'auto', position: 'relative', zIndex: 1 }}>
        <div style={{ width: '100%', maxWidth: 400, animation: 'scaleIn 500ms var(--bounce) both' }}>

          {/* Mobile logo */}
          <div className="show-mobile" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 }}>
            <LogoFull size={36} />
            <span style={{ fontSize: 14, fontWeight: 800, background: 'linear-gradient(135deg, var(--p), var(--p-lt))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>AXINITE</span>
          </div>

          <div style={{ marginBottom: 32 }}>
            <h1 style={{ fontSize: 'clamp(1.4rem, 3.75vw, 1.8rem)', fontWeight: 800, color: 'var(--t1)', letterSpacing: '-0.03em', marginBottom: 8 }}>Welcome back</h1>
            <p style={{ fontSize: 13.5, color: 'var(--t3)' }}>Sign in to your account and continue your learning journey</p>
          </div>

          {/* ── Google Sign-In Button ── */}
          <button
            onClick={handleGoogleLogin}
            disabled={googleLoading || loading}
            style={{
              width: '100%',
              padding: '13px 24px',
              borderRadius: 'var(--r-md)',
              border: '1px solid rgba(255,255,255,0.15)',
              background: 'rgba(255,255,255,0.06)',
              backdropFilter: 'blur(10px)',
              color: 'var(--t1)',
              fontSize: 15,
              fontWeight: 700,
              cursor: (googleLoading || loading) ? 'not-allowed' : 'pointer',
              opacity: (googleLoading || loading) ? 0.6 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              transition: 'all 200ms ease',
            }}
            onMouseEnter={e => { if (!googleLoading && !loading) { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            {googleLoading ? (
              <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />Redirecting…</>
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                </svg>
                Continue with Google
              </>
            )}
          </button>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '24px 0 24px' }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
            <span style={{ fontSize: 12, color: 'var(--t4)', fontWeight: 600 }}>OR</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
          </div>

          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Username */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--t2)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Username</label>
              <div style={{ position: 'relative' }}>
                <span className="material-symbols-outlined" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 18, color: focus === 'username' ? 'var(--p)' : 'var(--t4)', pointerEvents: 'none', transition: 'color 200ms' }}>person</span>
                <input className="input" type="text" value={username} onChange={e => setUsername(e.target.value)}
                  onFocus={() => setFocus('username')} onBlur={() => setFocus('')}
                  placeholder="e.g. aditya_kumar" required
                  style={{ paddingLeft: 44, padding: '12px 16px 12px 44', borderRadius: 'var(--r-md)', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(8px)', color: 'var(--t1)', fontSize: 14, fontWeight: 500, transition: 'all 200ms ease', width: '100%', boxSizing: 'border-box' }}
                  onMouseEnter={e => { if (focus !== 'username') { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; } }}
                  onMouseLeave={e => { if (focus !== 'username') { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; } }} />
              </div>
            </div>

            {/* Password */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--t2)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <span className="material-symbols-outlined" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 18, color: focus === 'pass' ? 'var(--p)' : 'var(--t4)', pointerEvents: 'none', transition: 'color 200ms' }}>lock</span>
                <input className="input" type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  onFocus={() => setFocus('pass')} onBlur={() => setFocus('')}
                  placeholder="••••••••" required
                  style={{ padding: '12px 44px 12px 44px', borderRadius: 'var(--r-md)', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(8px)', color: 'var(--t1)', fontSize: 14, fontWeight: 500, transition: 'all 200ms ease', width: '100%', boxSizing: 'border-box' }}
                  onMouseEnter={e => { if (focus !== 'pass') { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; } }}
                  onMouseLeave={e => { if (focus !== 'pass') { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; } }} />
                <button type="button" onClick={() => setShowPass(p => !p)}
                  style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--t4)', display: 'flex', alignItems: 'center', transition: 'color 200ms' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{showPass ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="btn btn-primary"
              style={{ width: '100%', padding: '13px 24px', fontSize: 15, borderRadius: 'var(--r-md)', marginTop: 8, opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer', background: 'linear-gradient(135deg, var(--p), var(--p-lt))', color: '#000', border: 'none', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 200ms ease', boxShadow: '0 8px 20px rgba(9,205,131,0.3)' }}
              onMouseEnter={e => { if (!loading) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 30px rgba(9,205,131,0.4)'; } }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(9,205,131,0.3)'; }}>
              {loading
                ? <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />Signing in…</>
                : <><span className="material-symbols-outlined" style={{ fontSize: 18 }}>login</span>Sign In</>}
            </button>
          </form>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '24px 0 24px' }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
            <span style={{ fontSize: 12, color: 'var(--t4)', fontWeight: 600 }}>NEW HERE?</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
          </div>

          <p style={{ textAlign: 'center', fontSize: 13.5, color: 'var(--t3)', margin: 0 }}>
            Don't have an account?{' '}
            <Link to="/signup" style={{ color: 'var(--p)', fontWeight: 700, textDecoration: 'none', transition: 'color 200ms' }} onMouseEnter={e => e.currentTarget.style.color = 'var(--p-lt)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--p)'}>Create one free →</Link>
          </p>

          {/* ── Visual Auth Diagnostics Console ── */}
          <AuthDiagnostics />
        </div>
      </div>

      <style>{`
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes scaleIn { from{opacity:0;transform:scale(0.95)} to{opacity:1;transform:scale(1)} }
        @keyframes slideIn { from{opacity:0;transform:translateX(-20px)} to{opacity:1;transform:translateX(0)} }
      `}</style>

      {/* ── Premium Google Account Chooser Modal ── */}
      {showGoogleChooser && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)', animation: 'scaleIn 200ms ease' }}
          onClick={e => { if (e.target === e.currentTarget && !googleHandshakeStep) { setShowGoogleChooser(false); setIsCustomMode(false); } }}>
          <div style={{ width: '100%', maxWidth: 400, background: 'rgba(5,7,10,0.95)', border: '1px solid rgba(9,205,131,0.2)', borderRadius: 'var(--r-lg)', padding: 32, boxShadow: '0 25px 50px rgba(0,0,0,0.6)', textAlign: 'center', animation: 'slideUp 300ms ease' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
              <svg width="40" height="40" viewBox="0 0 24 24" style={{ animation: 'float 3s ease-in-out infinite' }}>
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
            </div>

            {googleHandshakeStep ? (
              <div style={{ padding: '32px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                <div className="spinner" style={{ width: 48, height: 48, borderWidth: 3, borderColor: 'var(--p) transparent var(--p) transparent', animation: 'spin 1s linear infinite' }} />
                <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--t1)', margin: 0 }}>
                  {googleHandshakeStep === 'handshake' && 'Connecting to Google…'}
                  {googleHandshakeStep === 'securing' && 'Securing your session…'}
                  {googleHandshakeStep === 'logging' && 'Logging you in…'}
                </h3>
                <p style={{ fontSize: 13, color: 'var(--t3)', margin: 0 }}>Please wait, this won't take long</p>
              </div>
            ) : (
              <>
                <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--t1)', margin: '0 0 8px', letterSpacing: '-0.02em' }}>Choose an account</h2>
                <p style={{ fontSize: 13.5, color: 'var(--t3)', margin: '0 0 24px' }}>to sign in to <strong style={{ color: 'var(--p)' }}>AXINITE OS</strong></p>

                {!isCustomMode ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, textAlign: 'left' }}>
                    {googleAccounts.map((acc, idx) => (
                      <button key={idx} onClick={() => executeGoogleBridge(acc.email, acc.name, acc.avatar)}
                        style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '14px 16px', background: 'rgba(9,205,131,0.05)', border: '1px solid rgba(9,205,131,0.15)', borderRadius: 'var(--r-md)', cursor: 'pointer', transition: 'all 200ms', outline: 'none', color: 'inherit' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(9,205,131,0.1)'; e.currentTarget.style.borderColor = 'rgba(9,205,131,0.25)'; e.currentTarget.style.transform = 'translateX(4px)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(9,205,131,0.05)'; e.currentTarget.style.borderColor = 'rgba(9,205,131,0.15)'; e.currentTarget.style.transform = 'translateX(0)'; }}>
                        <img src={acc.avatar} alt={acc.name} style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--s2)' }} />
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--t1)', margin: '0 0 2px' }}>{acc.name}</p>
                          <p style={{ fontSize: 12, color: 'var(--t3)', margin: 0 }}>{acc.email}</p>
                        </div>
                        <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--t4)' }}>chevron_right</span>
                      </button>
                    ))}

                    <button onClick={() => setIsCustomMode(true)}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '14px 16px', background: 'transparent', border: '1px dashed rgba(9,205,131,0.2)', borderRadius: 'var(--r-md)', cursor: 'pointer', transition: 'all 200ms', outline: 'none', color: 'inherit', marginTop: 8 }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(9,205,131,0.05)'; e.currentTarget.style.borderColor = 'rgba(9,205,131,0.3)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(9,205,131,0.2)'; }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(9,205,131,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(9,205,131,0.2)' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 20, color: 'var(--p)' }}>person_add</span>
                      </div>
                      <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--t1)' }}>Use another account</span>
                    </button>
                    
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: 16, paddingTop: 16 }}>
                      <button onClick={() => { setShowGoogleChooser(false); }} style={{ width: '100%', padding: '12px 24px', borderRadius: 'var(--r-md)', fontSize: 14, fontWeight: 700, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: 'var(--t1)', cursor: 'pointer', transition: 'all 200ms' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ marginBottom: 18 }}>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--t2)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Google Email</label>
                      <input className="input" type="email" placeholder="name@gmail.com" value={customGmail} onChange={e => setCustomGmail(e.target.value)} style={{ padding: '12px 16px', borderRadius: 'var(--r-md)', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: 'var(--t1)', fontSize: 14, fontWeight: 500, width: '100%', boxSizing: 'border-box', transition: 'all 200ms ease' }} autoFocus />
                    </div>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <button onClick={() => setIsCustomMode(false)} style={{ flex: 1, padding: '12px 24px', borderRadius: 'var(--r-md)', fontSize: 14, fontWeight: 700, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: 'var(--t1)', cursor: 'pointer', transition: 'all 200ms' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}>Back</button>
                      <button onClick={() => { handleAddCustomAccount(customGmail); }} style={{ flex: 1, padding: '12px 24px', borderRadius: 'var(--r-md)', fontSize: 14, fontWeight: 700, background: 'linear-gradient(135deg, var(--p), var(--p-lt))', border: 'none', color: '#000', cursor: 'pointer', transition: 'all 200ms' }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}>Add & Continue</button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function AuthDiagnostics() {
  const [open, setOpen] = useState(true);
  const [logs, setLogs] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem('ax_auth_boot_logs') || '[]');
    } catch (e) { return []; }
  });
  
  const oauthType = sessionStorage.getItem('ax_oauth_error_type');
  const oauthDesc = sessionStorage.getItem('ax_oauth_error_desc');

  const refreshLogs = () => {
    try {
      setLogs(JSON.parse(sessionStorage.getItem('ax_auth_boot_logs') || '[]'));
    } catch (e) {}
  };

  const clearLogs = () => {
    sessionStorage.removeItem('ax_auth_boot_logs');
    sessionStorage.removeItem('ax_oauth_error_type');
    sessionStorage.removeItem('ax_oauth_error_desc');
    setLogs([]);
  };

  if (logs.length === 0 && !oauthType) return null;

  return (
    <div style={{ marginTop: 24, padding: 16, borderRadius: 'var(--r-md)', background: 'var(--s1)', border: '1px solid rgba(255,100,100,0.15)', boxShadow: '0 4px 20px rgba(0,0,0,0.3)', animation: 'scaleIn 300ms ease', textAlign: 'left' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#ef4444' }}>bug_report</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--t1)' }}>Auth Diagnostic Flight Recorder</span>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={refreshLogs} style={{ background: 'transparent', border: 'none', color: 'var(--t4)', cursor: 'pointer', display: 'flex', padding: 0 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>refresh</span>
          </button>
          <button onClick={clearLogs} style={{ background: 'transparent', border: 'none', color: 'var(--t4)', cursor: 'pointer', display: 'flex', padding: 0 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
          </button>
          <button onClick={() => setOpen(!open)} style={{ background: 'transparent', border: 'none', color: 'var(--t3)', cursor: 'pointer', display: 'flex', padding: 0 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{open ? 'expand_less' : 'expand_more'}</span>
          </button>
        </div>
      </div>

      {oauthType && (
        <div style={{ padding: '10px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', marginBottom: 10 }}>
          <p style={{ fontSize: 10.5, fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', marginBottom: 3, letterSpacing: '0.05em' }}>Backend Handshake Rejected</p>
          <p style={{ fontSize: 12, color: 'var(--t2)', lineHeight: 1.45, margin: 0 }}>
            <strong>{oauthType}:</strong> {oauthDesc || 'No error details returned.'}
          </p>
        </div>
      )}

      {open && (
        <div style={{ marginTop: 8, maxHeight: 150, overflowY: 'auto', background: 'rgba(0,0,0,0.5)', padding: 10, borderRadius: 6, border: '1px solid rgba(255,255,255,0.05)', scrollbarWidth: 'thin' }}>
          {logs.map((log, idx) => (
            <p key={idx} style={{ fontFamily: 'monospace', fontSize: 10, color: log.includes('State: SIGNED_IN') ? 'var(--p)' : log.includes('Failed') || log.includes('error') ? '#ef4444' : 'var(--t3)', margin: '0 0 5px', lineHeight: 1.4, wordBreak: 'break-all' }}>
              {log}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
