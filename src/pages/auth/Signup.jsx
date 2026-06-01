import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@context/AuthContext';
import { SUBJECTS } from '@utils';
import { LogoFull } from '@components/ui/Logo';
import toast from 'react-hot-toast';

const STYLES = [
  { id: 'visual', icon: 'visibility', label: 'Visual', desc: 'Charts & diagrams' },
  { id: 'auditory', icon: 'headphones', label: 'Auditory', desc: 'Talks & audio' },
  { id: 'reading', icon: 'menu_book', label: 'Reading', desc: 'Notes & books' },
  { id: 'kinesthetic', icon: 'sports_handball', label: 'Hands-on', desc: 'Projects & build' },
];

function getPasswordStrength(pw) {
  if (!pw) return { score: 0, label: '', color: '' };
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  if (score <= 1) return { score: 1, label: 'Weak', color: '#ef4444' };
  if (score === 2) return { score: 2, label: 'Fair', color: '#f59e0b' };
  if (score === 3) return { score: 3, label: 'Good', color: '#3b82f6' };
  if (score >= 4) return { score: Math.min(score, 5), label: 'Strong', color: '#10b981' };
  return { score: 0, label: '', color: '' };
}

export default function Signup() {
  const { signup, loginWithGoogle, loading } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1=account 2=profile
  const [googleLoading, setGoogleLoading] = useState(false);

  // Google Account Chooser state
  const [showGoogleChooser, setShowGoogleChooser] = useState(false);
  const [customGmail, setCustomGmail] = useState('');
  const [customName, setCustomName] = useState('');
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [googleHandshakeStep, setGoogleHandshakeStep] = useState(''); // '', 'handshake', 'securing', 'logging'

  const [googleAccounts, setGoogleAccounts] = useState(() => {
    try {
      const saved = localStorage.getItem('ax_google_accounts');
      if (saved) return JSON.parse(saved);
    } catch(e){}
    return [
      { name: 'Sanchit Choudhary', email: 'sanchitchoudhary776@gmail.com', avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Sanchit' }
    ];
  });

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [subjects, setSubjects] = useState([]);
  const [style, setStyle] = useState('');
  const [focus, setFocus] = useState('');

  const toggleSub = s => setSubjects(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s]);
  const pwStrength = useMemo(() => getPasswordStrength(password), [password]);

  const step1 = e => {
    e.preventDefault();
    if (!name.trim()) { toast.error('Please enter your name'); return; }
    
    // Alphanumeric + underscore validation for username
    const cleanUsername = username.trim().toLowerCase();
    if (cleanUsername.includes('@')) {
      toast.error('Do not enter an email address. Choose a secure username instead.');
      return;
    }
    if (cleanUsername.length < 3) {
      toast.error('Username must be at least 3 characters.');
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(cleanUsername)) {
      toast.error('Username can only contain letters, numbers, and underscores.');
      return;
    }

    if (password.length < 6) { toast.error('Password needs at least 6 characters'); return; }
    if (pwStrength.score < 2) { toast.error('Password is too weak. Add uppercase letters, numbers, or symbols.'); return; }
    setStep(2);
  };

  const submit = async () => {
    if (!style) { toast.error('Pick your learning style'); return; }
    const cleanUsername = username.trim().toLowerCase();
    const r = await signup({ name: name.trim(), usernameOrEmail: cleanUsername, password, subjects, learningStyle: style });
    if (r.success) {
      toast.success('Welcome to AXINITE OS! 🚀');
      navigate('/dashboard', { replace: true });
    } else {
      toast.error(r.error || 'Signup failed');
    }
  };

  const handleGoogleSignup = () => {
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
      toast.success('Welcome to AXINITE OS! 🚀');
      navigate('/dashboard', { replace: true });
    } else {
      toast.error(r.error || 'Google sign-up failed');
      setGoogleLoading(false);
      setGoogleHandshakeStep('');
      setShowGoogleChooser(false);
    }
  };

  const pct = step === 1 ? 50 : 100;

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', background: 'var(--bg)', overflowY: 'auto', position: 'relative' }}>
      <div style={{ position: 'fixed', top: '-50%', right: '-10%', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(rgba(9,205,131,0.08),transparent)', pointerEvents: 'none', zIndex: 0, animation: 'float 8s ease-in-out infinite', filter: 'blur(40px)' }} />
      <div style={{ position: 'fixed', bottom: '-30%', left: '-5%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(rgba(96,165,250,0.05),transparent)', pointerEvents: 'none', zIndex: 0, animation: 'float 10s ease-in-out infinite 1s', filter: 'blur(40px)' }} />

      <div style={{ width: '100%', maxWidth: 460, position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
          <LogoFull size={42} />
        </div>

        {/* Progress bar */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            {[1, 2].map(n => (
              <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: step >= n ? 'var(--p)' : 'var(--s4)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 300ms var(--bounce)', boxShadow: step === n ? '0 0 12px rgba(9,205,131,0.5)' : 'none' }}>
                  {step > n
                    ? <span className="material-symbols-outlined" style={{ fontSize: 14, color: 'var(--bg-deep)', fontVariationSettings: "'FILL' 1" }}>check</span>
                    : <span style={{ fontSize: 12, fontWeight: 700, color: step >= n ? 'var(--bg-deep)' : 'var(--t4)' }}>{n}</span>}
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: step === n ? 'var(--p)' : 'var(--t4)' }}>
                  {n === 1 ? 'Account' : 'Profile'}
                </span>
              </div>
            ))}
          </div>
          <div style={{ height: 3, background: 'var(--s4)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg,var(--p-dk),var(--p))', borderRadius: 99, transition: 'width 400ms var(--smooth)', boxShadow: '0 0 8px rgba(9,205,131,0.4)' }} />
          </div>
        </div>

        <div className="card" style={{ padding: '24px 24px 20px' }}>

          {/* ═══ STEP 1: Account ═══ */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <h2 style={{ fontSize: 'clamp(1.175rem, 2.75vw, 1.475rem)', fontWeight: 800, color: 'var(--t1)', letterSpacing: '-0.03em', marginBottom: 4, lineHeight: 1.35, padding: '0.12em 0' }}>Create account</h2>
                <p style={{ fontSize: 13, color: 'var(--t3)' }}>Start your AI-powered learning journey</p>
              </div>

              {/* Google button */}
              <button onClick={handleGoogleSignup} disabled={googleLoading || loading}
                style={{ width: '100%', padding: '13px 24px', borderRadius: 'var(--r-md)', border: '1px solid rgba(255,255,255,0.12)', background: 'var(--s2)', color: 'var(--t1)', fontSize: 15, fontWeight: 700, cursor: (googleLoading || loading) ? 'not-allowed' : 'pointer', opacity: (googleLoading || loading) ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, transition: 'all 200ms ease' }}
                onMouseEnter={e => { if (!googleLoading && !loading) { e.currentTarget.style.background = 'var(--s3)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--s2)'; e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                {googleLoading ? (
                  <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />Redirecting to Google…</>
                ) : (
                  <>
                    <svg width="20" height="20" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
                    Continue with Google
                  </>
                )}
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '2px 0' }}>
                <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
                <span style={{ fontSize: 12, color: 'var(--t4)' }}>or sign up with credentials</span>
                <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
              </div>

              <form onSubmit={step1} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Name */}
                <div>
                  <label className="label">Full Name</label>
                  <div style={{ position: 'relative' }}>
                    <span className="material-symbols-outlined" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 17, color: focus === 'name' ? 'var(--p)' : 'var(--t4)', pointerEvents: 'none', transition: 'color 180ms' }}>person</span>
                    <input className="input" type="text" value={name} onChange={e => setName(e.target.value)} onFocus={() => setFocus('name')} onBlur={() => setFocus('')} placeholder="Aditya Kumar" required style={{ paddingLeft: 40 }} />
                  </div>
                </div>

                {/* Username */}
                <div>
                  <label className="label">Choose Username</label>
                  <div style={{ position: 'relative' }}>
                    <span className="material-symbols-outlined" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 17, color: focus === 'username' ? 'var(--p)' : 'var(--t4)', pointerEvents: 'none', transition: 'color 180ms' }}>alternate_email</span>
                    <input className="input" type="text" value={username} onChange={e => setUsername(e.target.value)} onFocus={() => setFocus('username')} onBlur={() => setFocus('')} placeholder="e.g. aditya_kumar" required style={{ paddingLeft: 40 }} />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="label">Choose Password</label>
                  <div style={{ position: 'relative' }}>
                    <span className="material-symbols-outlined" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 17, color: focus === 'pass' ? 'var(--p)' : 'var(--t4)', pointerEvents: 'none', transition: 'color 180ms' }}>lock</span>
                    <input className="input" type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} onFocus={() => setFocus('pass')} onBlur={() => setFocus('')} placeholder="Min. 6 characters" required style={{ paddingLeft: 40, paddingRight: 40 }} />
                    <button type="button" onClick={() => setShowPass(p => !p)} style={{ position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--t4)', display: 'flex' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 17 }}>{showPass ? 'visibility_off' : 'visibility'}</span>
                    </button>
                  </div>
                  {/* Strength Bar */}
                  {password.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                        {[1, 2, 3, 4, 5].map(i => (
                          <div key={i} style={{ flex: 1, height: 3, borderRadius: 99, background: i <= pwStrength.score ? pwStrength.color : 'var(--s4)', transition: 'background 300ms ease' }} />
                        ))}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: pwStrength.color }}>{pwStrength.label}</span>
                        <span style={{ fontSize: 10, color: 'var(--t4)' }}>
                          {password.length < 6 ? 'Too short' : !(/[A-Z]/.test(password)) ? 'Add uppercase' : !(/[0-9]/.test(password)) ? 'Add a number' : !(/[^A-Za-z0-9]/.test(password)) ? 'Add a symbol' : 'Excellent!'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '13px', fontSize: 15, borderRadius: 'var(--r-md)', marginTop: 4 }}>
                  Continue <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_forward</span>
                </button>
              </form>
            </div>
          )}

          {/* ═══ STEP 2: Profile ═══ */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div>
                <h2 style={{ fontSize: 'clamp(1.175rem, 2.75vw, 1.475rem)', fontWeight: 800, color: 'var(--t1)', letterSpacing: '-0.03em', marginBottom: 4, lineHeight: 1.35, padding: '0.12em 0' }}>Personalize your OS</h2>
                <p style={{ fontSize: 13, color: 'var(--t3)' }}>Helps your AI coach guide you better</p>
              </div>

              <div>
                <label className="label" style={{ marginBottom: 10 }}>Your Subjects (select all)</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(110px,1fr))', gap: 7 }}>
                  {SUBJECTS.slice(0, 8).map(s => (
                    <button key={s} type="button" onClick={() => toggleSub(s)}
                      style={{ padding: '9px 8px', borderRadius: 'var(--r-md)', border: `1.5px solid ${subjects.includes(s) ? 'var(--p)' : 'rgba(255,255,255,0.07)'}`, background: subjects.includes(s) ? 'rgba(9,205,131,0.1)' : 'var(--s3)', color: subjects.includes(s) ? 'var(--p)' : 'var(--t3)', cursor: 'pointer', fontWeight: 700, fontSize: 12, transition: 'all 180ms var(--bounce)', transform: subjects.includes(s) ? 'scale(1.03)' : 'scale(1)' }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="label" style={{ marginBottom: 10 }}>How do you learn best?</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {STYLES.map(({ id, icon, label, desc }) => (
                    <button key={id} type="button" onClick={() => setStyle(id)}
                      style={{ padding: '12px 10px', borderRadius: 'var(--r-md)', border: `2px solid ${style === id ? 'var(--p)' : 'rgba(255,255,255,0.06)'}`, background: style === id ? 'rgba(9,205,131,0.1)' : 'var(--s3)', cursor: 'pointer', transition: 'all 200ms var(--bounce)', transform: style === id ? 'scale(1.03)' : 'scale(1)', textAlign: 'left' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 20, color: style === id ? 'var(--p)' : 'var(--t4)', display: 'block', marginBottom: 6 }}>{icon}</span>
                      <p style={{ fontSize: 12.5, fontWeight: 700, color: style === id ? 'var(--p)' : 'var(--t1)', marginBottom: 2 }}>{label}</p>
                      <p style={{ fontSize: 10.5, color: 'var(--t4)' }}>{desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button onClick={() => setStep(1)} className="btn btn-surface" style={{ padding: '11px 18px', flexShrink: 0 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_back</span>
                </button>
                <button onClick={submit} disabled={loading} className="btn btn-primary"
                  style={{ flex: 1, padding: '11px', fontSize: 15, borderRadius: 'var(--r-md)', opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}>
                  {loading
                    ? <><div className="spinner" style={{ width: 15, height: 15, borderWidth: 2 }} />Creating…</>
                    : <>Create Account 🚀</>}
                </button>
              </div>
            </div>
          )}
        </div>

        <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--t3)', marginTop: 16 }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--p)', fontWeight: 700, textDecoration: 'none' }}>Sign in →</Link>
        </p>

        {/* ── Visual Auth Diagnostics Console ── */}
        <AuthDiagnostics />
      </div>

      {/* ── Premium Google Account Chooser Modal ── */}
      {showGoogleChooser && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(12px)', animation: 'scaleIn 200ms ease' }}
          onClick={e => { if (e.target === e.currentTarget && !googleHandshakeStep) { setShowGoogleChooser(false); setIsCustomMode(false); } }}>
          <div style={{ width: '100%', maxWidth: 400, background: 'var(--s1)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 'var(--r-lg)', padding: 28, boxShadow: '0 20px 50px rgba(0,0,0,0.5)', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
              <svg width="36" height="36" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
            </div>

            {googleHandshakeStep ? (
              <div style={{ padding: '30px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                <div className="spinner" style={{ width: 40, height: 40, borderWidth: 3, borderColor: 'var(--p) transparent var(--p) transparent' }} />
                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--t1)', margin: 0 }}>
                  {googleHandshakeStep === 'handshake' && 'Contacting Google servers…'}
                  {googleHandshakeStep === 'securing' && 'Establishing secure handshake…'}
                  {googleHandshakeStep === 'logging' && 'Logging you in…'}
                </h3>
                <p style={{ fontSize: 12.5, color: 'var(--t3)', margin: 0 }}>Creating secure authenticated session</p>
              </div>
            ) : (
              <>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--t1)', margin: '0 0 6px' }}>Choose an account</h2>
                <p style={{ fontSize: 13, color: 'var(--t3)', margin: '0 0 20px' }}>to continue to <strong style={{ color: 'var(--p)' }}>AXINITE OS</strong></p>

                {!isCustomMode ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, textAlign: 'left' }}>
                    {googleAccounts.map((acc, idx) => (
                      <button key={idx} onClick={() => executeGoogleBridge(acc.email, acc.name, acc.avatar)}
                        style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '12px 14px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, cursor: 'pointer', transition: 'all 200ms', outline: 'none', color: 'inherit' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}>
                        <img src={acc.avatar} alt={acc.name} style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--s2)' }} />
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)', margin: '0 0 2px' }}>{acc.name}</p>
                          <p style={{ fontSize: 11, color: 'var(--t3)', margin: 0 }}>{acc.email}</p>
                        </div>
                        <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--t4)' }}>chevron_right</span>
                      </button>
                    ))}

                    <button onClick={() => setIsCustomMode(true)}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '12px 14px', background: 'transparent', border: '1px solid transparent', borderRadius: 10, cursor: 'pointer', transition: 'all 200ms', outline: 'none', color: 'inherit' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                      <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--t3)' }}>person_add</span>
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--t2)' }}>Use another account</span>
                    </button>
                    
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: 12, paddingTop: 14 }}>
                      <button onClick={() => { setShowGoogleChooser(false); }} className="btn btn-surface" style={{ width: '100%', padding: 10, borderRadius: 8, fontSize: 13 }}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ marginBottom: 16 }}>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--t3)', marginBottom: 6 }}>Google Email</label>
                      <input className="input" type="email" placeholder="name@gmail.com" value={customGmail} onChange={e => setCustomGmail(e.target.value)} style={{ padding: '10px 14px' }} autoFocus />
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button onClick={() => setIsCustomMode(false)} className="btn btn-surface" style={{ flex: 1, padding: 10, borderRadius: 8, fontSize: 13 }}>Back</button>
                      <button onClick={() => {
                        handleAddCustomAccount(customGmail);
                      }} className="btn btn-primary" style={{ flex: 1, padding: 10, borderRadius: 8, fontSize: 13 }}>Add & Continue</button>
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
