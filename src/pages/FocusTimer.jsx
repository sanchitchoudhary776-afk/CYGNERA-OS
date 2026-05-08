import { useState, useEffect, useRef, useMemo, memo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAudio } from '@context/AudioContext';
import { useApp, useTimer }        from '@context/AppContext';
import { timerSettings, moodCoaching } from '@services/ai';
import { AI }            from '@services/ai';
import { SUBJECTS }      from '@utils';
import toast from 'react-hot-toast';
import { Counter } from '@components/ui/PremiumUI';

const MAX_MINS = 180;

function fmt(s) {
  return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
}

// ── Ultimate Hybrid 3D Aura Dial ──────────────
const CircularDialSlider = memo(function CircularDialSlider({ value, onChange, disabled, running, remain }) {
  const containerRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const handlePointerDown = (e) => {
    if (disabled) return;
    e.preventDefault();
    setIsDragging(true);
    updateValue(e);
  };

  useEffect(() => {
    const handlePointerMove = (e) => {
      if (!isDragging || disabled) return;
      updateValue(e);
    };
    const handlePointerUp = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener('pointermove', handlePointerMove, { passive: false });
      window.addEventListener('pointerup', handlePointerUp);
    }
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDragging, disabled]);

  const updateValue = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const clientX = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
    const clientY = e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : 0);

    const x = clientX - centerX;
    const y = clientY - centerY;
    
    let angle = Math.atan2(y, x) + Math.PI / 2;
    if (angle < 0) angle += 2 * Math.PI;

    let mins = Math.round((angle / (2 * Math.PI)) * MAX_MINS);
    
    if (isDragging) {
       const remainder = mins % 5;
       if (remainder < 2) mins -= remainder;
       else if (remainder > 3) mins += (5 - remainder);
    }

    if (mins === 0) mins = MAX_MINS;
    if (mins > MAX_MINS) mins = MAX_MINS;
    if (mins < 1) mins = 1;

    onChange(mins);
  };

  // Math for the Scale and Track
  const svgSize = 420;
  const center = svgSize / 2;
  const trackRadius = 135;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * trackRadius;
  
  const safeValue = value || 1;
  const currentMins = running ? (remain / 60) : safeValue;
  
  let pct = currentMins / MAX_MINS;
  if (isNaN(pct) || !isFinite(pct)) pct = 0;
  pct = Math.max(0, Math.min(1, pct));

  const dashoffset = circumference - pct * circumference;
  const rotationDeg = pct * 360;

  // 12 clock-style ticks (lightweight, no per-second re-render cost)
  const ticks = useMemo(() => Array.from({ length: 12 }).map((_, i) => {
    const angle = (i / 12) * 2 * Math.PI - Math.PI / 2;
    const inner = trackRadius + 14;
    const outer = trackRadius + 28;
    const textR = trackRadius + 44;
    const mins = i * 15;
    return {
      x1: center + inner * Math.cos(angle), y1: center + inner * Math.sin(angle),
      x2: center + outer * Math.cos(angle), y2: center + outer * Math.sin(angle),
      tx: center + textR * Math.cos(angle), ty: center + textR * Math.sin(angle) + 4,
      label: mins === 0 ? '180' : String(mins)
    };
  }), [center, trackRadius]);

  return (
    <div 
      ref={containerRef}
      style={{ 
        position: 'relative', width: svgSize, height: svgSize, margin: '10px auto 40px', 
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: disabled ? 'default' : (isDragging ? 'grabbing' : 'grab'),
        touchAction: 'none',
        contain: 'layout style',
        willChange: 'auto'
      }}
      onPointerDown={handlePointerDown}
      onTouchStart={handlePointerDown}
    >


      {/* Background ambient aura glow — pre-blurred radial gradient (no runtime filter) */}
      {running && (
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 350, height: 350, borderRadius: '50%', background: 'radial-gradient(circle, rgba(9,205,131,0.15) 0%, rgba(9,205,131,0.05) 40%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />
      )}

      {/* 1. Outer Scale & SVG Progress Track */}
      <svg 
        width="100%" height="100%" viewBox={`0 0 ${svgSize} ${svgSize}`} 
        style={{ position: 'absolute', inset: 0, overflow: 'visible', pointerEvents: 'none', zIndex: 1 }}
      >
        <defs>
          <linearGradient id="luxuryAura" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0f3443" />
            <stop offset="50%" stopColor="var(--p)" />
            <stop offset="100%" stopColor="#34e89e" />
          </linearGradient>
        </defs>

        {/* 12 clock-style tick marks */}
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke="var(--t3)" strokeWidth={2} strokeLinecap="round" />
            <text x={t.tx} y={t.ty} fill="var(--t3)" fontSize="11" fontWeight="700" fontFamily="'Plus Jakarta Sans', sans-serif" textAnchor="middle" letterSpacing="0.5px">
              {t.label}
            </text>
          </g>
        ))}

        <circle 
          cx={center} cy={center} r={trackRadius} 
          fill="none" stroke="var(--s3)" strokeWidth={strokeWidth} 
        />
        <circle 
          cx={center} cy={center} r={trackRadius} 
          fill="none" stroke="#000" strokeWidth={strokeWidth} strokeOpacity={0.5}
        />
        <circle 
          cx={center} cy={center} r={trackRadius} 
          fill="none" stroke="url(#luxuryAura)" strokeWidth={strokeWidth} 
          strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={dashoffset}
          style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%', transition: isDragging ? 'none' : 'stroke-dashoffset 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)' }}
        />
      </svg>

      {/* 2. Physical 3D Disc Assembly */}
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 250, height: 250, pointerEvents: 'none', zIndex: 2 }}>
        
        {/* The Recess Base */}
        <div className="dial-recess" style={{
          position: 'absolute', inset: 0, borderRadius: '50%', background: 'var(--s1)'
        }} />

        {/* The Rotating Tactile Disc */}
        <div className="dial-knob" style={{
          position: 'absolute', inset: 12, borderRadius: '50%',
          background: `
            radial-gradient(circle at 50% 0%, rgba(255,255,255,0.06) 0%, transparent 50%),
            conic-gradient(from 0deg, var(--s3), var(--s4), var(--s2), var(--s4), var(--s3))
          `,
          border: '1px solid var(--surface-b)',
          transform: `rotate(${rotationDeg}deg)`,
          transition: isDragging ? 'none' : 'transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)'
        }}>
          {/* Glowing Hardware Notch */}
          <div style={{
            position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
            width: 8, height: 20, borderRadius: 999,
            background: running ? 'var(--p)' : 'var(--t4)',
            boxShadow: running ? '0 0 16px var(--p), inset 0 2px 4px rgba(255,255,255,0.8)' : 'inset 0 2px 4px rgba(0,0,0,0.3)',
            transition: 'background 0.3s, box-shadow 0.3s'
          }} />
          
          {/* Inner Grip Ring */}
          <div className="dial-recess" style={{
            position: 'absolute', inset: 50, borderRadius: '50%', background: 'var(--s2)'
          }} />
        </div>
      </div>

      {/* 3. Center Digital Display (Fixed) */}
      <div className="dial-center" style={{
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 140, height: 140, 
        borderRadius: '50%', background: 'var(--s1)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        pointerEvents: 'none', zIndex: 10
      }}>
        <p style={{ 
          fontSize: remain >= 6000 ? '2.4rem' : 'clamp(2.5rem, 7vw, 3.2rem)', 
          fontWeight: 300, color: 'var(--t1)', 
          letterSpacing: '-0.02em', lineHeight: 1, fontVariantNumeric: 'tabular-nums', 
          fontFamily: "'Inter', sans-serif", textShadow: '0 4px 12px rgba(0,0,0,0.4)',
          whiteSpace: 'nowrap'
        }}>
          {fmt(remain)}
        </p>
        
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 8 }}>
          {running ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(9, 205, 131, 0.1)', padding: '4px 12px', borderRadius: 999, border: '1px solid rgba(9, 205, 131, 0.2)' }}>
               <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--p)', boxShadow: '0 0 8px var(--p)', animation: 'pulseDot 1.4s ease-in-out infinite' }} />
               <p style={{ fontSize: 10, color: 'var(--p)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', whiteSpace: 'nowrap' }}>
                 In Flow
               </p>
            </div>
          ) : (
            <p style={{ fontSize: 11, color: 'var(--t4)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.1em', whiteSpace: 'nowrap' }}>
              {value} Min Selected
            </p>
          )}
        </div>
      </div>
    </div>
  );
});

// ── Check-In Modal ────────────────────────────
function CheckInModal({ onDone }) {
  const [mood,   setMood]   = useState(3);
  const [energy, setEnergy] = useState(7);
  const [sleep,  setSleep]  = useState(7);
  const [msg,    setMsg]    = useState('');
  const [loading, setLoading] = useState(false);
  const { A, tasks } = useApp();

  const MOODS = ['😞','😟','😐','😊','🤩'];

  const submit = async () => {
    const data = { mood, energy, sleepHours: sleep };
    A.checkin.add(data);
    if (AI.enabled()) {
      setLoading(true);
      const pendingTasks = tasks.filter(t=>t.status==='pending').map(t=>t.title);
      const r = await moodCoaching({ ...data, tasks: pendingTasks });
      setLoading(false);
      if (r) { setMsg(typeof r==='string'?r:(r.greeting||'')+(r.motivationalMessage?` ${r.motivationalMessage}`:'')); return; }
    }
    onDone();
  };

  if (msg) return (
    <div style={{ position:'fixed',inset:0,zIndex:100,display:'flex',alignItems:'center',justifyContent:'center',background:'var(--overlay)',animation:'modalFadeIn 220ms ease both',padding:'20px' }}>
      <div style={{ width:'100%',maxWidth:420,background:'var(--s2)',border:'1px solid var(--card-b-h)',borderRadius:'var(--r-xl)',padding:24,animation:'modalSlideUp 340ms var(--bounce) both',boxShadow:'var(--modal-sh)' }}>
        <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:16 }}>
          <div style={{ width:32,height:32,borderRadius:10,background:'rgba(9,205,131,0.12)',display:'flex',alignItems:'center',justifyContent:'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize:16,color:'var(--p)',fontVariationSettings:"'FILL' 1" }}>psychology</span>
          </div>
          <p style={{ fontSize:12,fontWeight:700,color:'var(--p)',textTransform:'uppercase',letterSpacing:'0.08em' }}>Session Coach</p>
        </div>
        <div style={{ padding:'14px 16px',borderRadius:'var(--r-md)',background:'rgba(9,205,131,0.07)',border:'1px solid rgba(9,205,131,0.18)',marginBottom:18 }}>
          <p style={{ fontSize:14,color:'var(--t2)',lineHeight:1.7 }}>{msg}</p>
        </div>
        <button onClick={onDone} className="btn btn-primary" style={{ width:'100%',padding:'13px' }}>
          <span className="material-symbols-outlined" style={{ fontSize:18,fontVariationSettings:"'FILL' 1" }}>play_arrow</span>
          Let's Focus!
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ position:'fixed',inset:0,zIndex:100,display:'flex',alignItems:'center',justifyContent:'center',background:'var(--overlay)',animation:'modalFadeIn 220ms ease both',padding:'20px' }}>
      <div style={{ width:'100%',maxWidth:420,background:'var(--s2)',border:'1px solid var(--card-b-h)',borderRadius:'var(--r-xl)',animation:'modalSlideUp 340ms var(--bounce) both',boxShadow:'var(--modal-sh)',overflow:'hidden' }}>
        <div style={{ padding:'18px 20px 0' }}>
          <h3 style={{ fontSize:16,fontWeight:800,color:'var(--t1)',marginBottom:4 }}>Pre-Session Check-In</h3>
          <p style={{ fontSize:12,color:'var(--t3)',marginBottom:20 }}>Quick check-in to optimize your session</p>

          {/* Mood */}
          <div style={{ marginBottom:20 }}>
            <p className="section-label" style={{ marginBottom:10 }}>Mood</p>
            <div style={{ display:'flex',gap:8 }}>
              {MOODS.map((em,i) => (
                <button key={i} onClick={()=>setMood(i+1)}
                  style={{ flex:1,minWidth:44,padding:'12px 4px',borderRadius:'var(--r-md)',border:`2px solid ${mood===i+1?'var(--p)':'transparent'}`,background:mood===i+1?'rgba(9,205,131,0.1)':'var(--s3)',cursor:'pointer',transition:'all 200ms var(--bounce)',transform:mood===i+1?'scale(1.08)':'scale(1)' }}>
                  <span style={{ fontSize:22 }}>{em}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Energy + Sleep */}
          {[
            { label:'Energy Level', val:energy, set:setEnergy, min:1, max:10, color:'var(--p)' },
            { label:'Sleep (hrs)',  val:sleep,  set:setSleep,  min:3, max:12, step:0.5, color:'#60a5fa' },
          ].map(({ label, val, set, min, max, step=1, color }) => (
            <div key={label} style={{ marginBottom:18 }}>
              <div style={{ display:'flex',justifyContent:'space-between',marginBottom:8 }}>
                <p className="section-label">{label}</p>
                <span style={{ fontSize:16,fontWeight:800,color }}>{val}</span>
              </div>
              <div style={{ position:'relative',height:6,background:'var(--s5)',borderRadius:999 }}>
                <div style={{ position:'absolute',left:0,height:'100%',width:`${((val-min)/(max-min))*100}%`,background:`linear-gradient(90deg, color-mix(in srgb, ${color} 40%, transparent), ${color})`,borderRadius:999,boxShadow:`0 0 8px color-mix(in srgb, ${color} 30%, transparent)`,transition:'width 0.1s ease' }}/>
                <input type="range" min={min} max={max} step={step} value={val} onChange={e=>set(Number(e.target.value))} style={{ position:'absolute',inset:0,width:'100%',opacity:0,cursor:'pointer',zIndex:2 }}/>
                <div style={{ position:'absolute',top:'50%',left:`${((val-min)/(max-min))*100}%`,transform:'translate(-50%,-50%)',width:18,height:18,borderRadius:'50%',background:color,border:'3px solid var(--s2)',boxShadow:`0 0 8px color-mix(in srgb, ${color} 50%, transparent)`,pointerEvents:'none',transition:'left 0.1s ease' }}/>
              </div>
            </div>
          ))}
        </div>
        <div style={{ display:'flex',gap:10,padding:'16px 20px 20px' }}>
          <button onClick={onDone} className="btn btn-surface" style={{ flex:1,padding:'12px' }}>Skip</button>
          <button onClick={submit} disabled={loading} className="btn btn-primary" style={{ flex:2,padding:'12px' }}>
            {loading ? <><div className="spinner" style={{ width:14,height:14,borderWidth:2 }}/>Getting advice…</> : 'Start Session →'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── SoundScape — UI Controller ───────────────────
const SoundScape = memo(function SoundScape() {
  const { 
    active, setActive, 
    vol, setVol, 
    spotifyUrl, setSpotifyUrl,
    tracks, loading,
    isMinimized, setIsMinimized,
    BINAURAL_LINK, getSpotifyEmbed
  } = useAudio();

  const SOUNDS = [
    { id: 'none',    label: 'Off',         icon: 'volume_off' },
    { id: 'rain',    label: 'Rain',        icon: 'water_drop' },
    { id: 'zen',     label: 'Zen',         icon: 'self_improvement' },
    { id: 'brown',   label: 'Deep Focus',  icon: 'self_improvement' },
    { id: 'white',   label: 'Soft Static', icon: 'waves' },
    { id: 'binaural', label: 'Binaural',   icon: 'psychology' },
    { id: 'spotify', label: 'Spotify',     icon: 'headphones' },
    { id: 'lofi',    label: 'Lofi',        icon: 'library_music' }
  ];

  const handleLaunchApp = () => {
    if (!spotifyUrl) return;
    const m = spotifyUrl.match(/open\.spotify\.com\/(track|playlist|album|episode)\/([a-zA-Z0-9]+)/);
    if (!m) { toast.error('Invalid Spotify URL'); return; }
    window.location.href = `spotify:${m[1]}:${m[2]}`;
    toast.success('Syncing with Spotify App... 🚀');
  };

  const handleDeepSync = () => {
    const syncUrl = spotifyUrl.includes('embed') ? spotifyUrl.replace('/embed', '') : spotifyUrl;
    window.open(syncUrl, 'CygneraSync', 'width=1000,height=700');
    toast.info('Log in to Spotify in the new window, then click Reload.');
  };

  const handleReload = () => {
    setActive('none');
    setTimeout(() => setActive('spotify'), 100);
    toast.success('Console Reloaded! 🔄');
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:10, marginTop:24, width:'100%', maxWidth:420 }}>
      <p style={{ fontSize:10, fontWeight:800, color:'var(--t4)', textTransform:'uppercase', letterSpacing:'0.1em' }}>
        <span className="material-symbols-outlined" style={{ fontSize:13, verticalAlign:'middle', marginRight:4 }}>music_note</span>
        Focus Sounds
      </p>
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', justifyContent:'center' }}>
        {SOUNDS.map(s => (
          <button
            key={s.id}
            onClick={() => setActive(s.id)}
            style={{
              display:'flex', alignItems:'center', gap:6,
              padding:'7px 14px', borderRadius:99,
              border: `1.5px solid ${active === s.id ? (s.id === 'none' ? 'var(--surface-b)' : s.id === 'spotify' ? '#1DB954' : s.id === 'lofi' ? '#FF5C00' : 'var(--p)') : 'var(--surface-b)'}`,
              background: active === s.id && s.id !== 'none' ? (s.id === 'spotify' ? 'rgba(29,185,84,0.1)' : s.id === 'lofi' ? 'rgba(255,92,0,0.1)' : 'rgba(9,205,131,0.1)') : 'var(--s3)',
              color: active === s.id && s.id !== 'none' ? (s.id === 'spotify' ? '#1DB954' : s.id === 'lofi' ? '#FF5C00' : 'var(--p)') : 'var(--t3)',
              fontSize:12, fontWeight:700, cursor:'pointer',
              transition:'all 0.2s var(--bounce)',
              transform: active === s.id ? 'scale(1.05)' : 'scale(1)'
            }}
          >
            <span className="material-symbols-outlined" style={{
              fontSize:15,
              fontVariationSettings: active === s.id ? "'FILL' 1" : "'FILL' 0"
            }}>{s.icon}</span>
            {s.label}
            {active === s.id && s.id !== 'none' && s.id !== 'lofi' && s.id !== 'spotify' && (
              <span style={{ width:6, height:6, borderRadius:'50%', background:'var(--p)', boxShadow:'0 0 6px var(--p-glow)', animation:'pulse 1.5s ease-in-out infinite' }} />
            )}
          </button>
        ))}
      </div>

      {active !== 'none' && active !== 'lofi' && active !== 'spotify' && active !== 'binaural' && (
        <div style={{ display:'flex', alignItems:'center', gap:10, marginTop:4, width:'100%', maxWidth:220 }}>
          <span className="material-symbols-outlined" style={{ fontSize:14, color:'var(--t4)' }}>volume_down</span>
          <input
            type="range" min={0} max={100} value={vol}
            onChange={e => setVol(Number(e.target.value))}
            style={{ flex:1, accentColor:'var(--p)', cursor:'pointer', height:4 }}
          />
          <span className="material-symbols-outlined" style={{ fontSize:14, color:'var(--t4)' }}>volume_up</span>
        </div>
      )}

      {active === 'spotify' && (
        <div className="glass-card" style={{ width:'100%', marginTop:12, padding:'16px', background:'rgba(29,185,84,0.03)', borderRadius:20, border:'1px solid rgba(29,185,84,0.15)', display:'flex', flexDirection:'column', gap:isMinimized ? 0 : 12 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ width:32, height:32, borderRadius:10, background:'#1DB954', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 12px rgba(29,185,84,0.3)' }}>
                <span className="material-symbols-outlined" style={{ color:'white', fontSize:20 }}>headphones</span>
              </div>
              <div>
                <p style={{ fontSize:12, fontWeight:800, color:'var(--t1)' }}>Spotify Console</p>
                {isMinimized && <p style={{ fontSize:10, color:'#1DB954', fontWeight:700 }}>SESSION ACTIVE</p>}
              </div>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              {spotifyUrl && (
                <button 
                  onClick={handleDeepSync}
                  style={{ background:'#1DB954', color:'white', border:'none', padding:'8px 16px', borderRadius:10, fontSize:10, fontWeight:900, cursor:'pointer', boxShadow:'0 4px 12px rgba(29,185,84,0.3)', transition:'all 0.2s' }}
                >
                  SYNC
                </button>
              )}
              <button 
                onClick={() => setIsMinimized(!isMinimized)}
                style={{ background:'none', border:'none', color:'var(--t4)', cursor:'pointer', display:'flex' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize:20 }}>{isMinimized ? 'expand_more' : 'expand_less'}</span>
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              <div style={{ position:'relative' }}>
                <span className="material-symbols-outlined" style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', fontSize:16, color:'rgba(29,185,84,0.5)' }}>link</span>
                <input
                  className="input"
                  placeholder="Paste Playlist / Album URL..."
                  value={spotifyUrl}
                  onChange={e => setSpotifyUrl(e.target.value)}
                  style={{ width:'100%', fontSize:11, padding:'10px 12px 10px 38px', background:'var(--s3)', border:'1px solid rgba(255,255,255,0.05)', borderRadius:12 }}
                />
              </div>

              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:4 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, padding:'4px 12px', borderRadius:8, background:'rgba(29,185,84,0.05)', width:'fit-content' }}>
                  <span style={{ width:6, height:6, borderRadius:'50%', background:'#1DB954', animation:'pulse 1.5s infinite' }} />
                  <p style={{ fontSize:10, color:'#1DB954', fontWeight:700, letterSpacing:'0.05em' }}>LIVE BACKGROUND HUB</p>
                </div>
                <button 
                  onClick={handleReload}
                  style={{ background:'none', border:'none', color:'var(--t4)', fontSize:10, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:4 }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize:14 }}>refresh</span>
                  RELOAD PLAYER
                </button>
              </div>
              
              <div style={{ display:'flex', alignItems:'center', gap:6, padding:'10px 14px', background:'rgba(255,255,255,0.03)', borderRadius:12, border:'1px solid rgba(255,255,255,0.05)' }}>
                <span className="material-symbols-outlined" style={{ fontSize:16, color:'#1DB954' }}>volume_up</span>
                <p style={{ fontSize:9.5, color:'var(--t3)', lineHeight:1.4 }}>
                  <b>Volume Sync:</b> Use player console controls.
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {active === 'binaural' && (
        <div className="glass-card" style={{ width:'100%', marginTop:12, padding:'16px', background:'rgba(9,205,131,0.03)', borderRadius:20, border:'1px solid rgba(9,205,131,0.15)', display:'flex', flexDirection:'column', gap:isMinimized ? 0 : 12 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ width:32, height:32, borderRadius:10, background:'var(--p)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 12px var(--p-glow)' }}>
                <span className="material-symbols-outlined" style={{ color:'white', fontSize:20 }}>psychology</span>
              </div>
              <div>
                <p style={{ fontSize:12, fontWeight:800, color:'var(--t1)' }}>Binaural Beats</p>
                {isMinimized && <p style={{ fontSize:10, color:'var(--p)', fontWeight:700 }}>COGNITIVE FLOW ACTIVE</p>}
              </div>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              {!isMinimized && (
                <button 
                  onClick={() => {
                    window.open(BINAURAL_LINK, 'CygneraBinaural', 'width=1000,height=700');
                    toast.success('Binaural Session Synced!');
                  }}
                  style={{ background:'var(--p)', color:'white', border:'none', padding:'8px 16px', borderRadius:10, fontSize:10, fontWeight:900, cursor:'pointer', boxShadow:'0 4px 12px var(--p-glow)', transition:'all 0.2s' }}
                >
                  SYNC
                </button>
              )}
              <button 
                onClick={() => setIsMinimized(!isMinimized)}
                style={{ background:'none', border:'none', color:'var(--t4)', cursor:'pointer', display:'flex' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize:20 }}>{isMinimized ? 'expand_more' : 'expand_less'}</span>
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              <div style={{ display:'flex', alignItems:'center', gap:8, padding:'4px 12px', borderRadius:8, background:'rgba(9,205,131,0.05)', width:'fit-content' }}>
                <span style={{ width:6, height:6, borderRadius:'50%', background:'var(--p)', animation:'pulse 1.5s infinite' }} />
                <p style={{ fontSize:10, color:'var(--p)', fontWeight:700, letterSpacing:'0.05em' }}>COGNITIVE STREAM ACTIVE</p>
              </div>
              
              <div style={{ display:'flex', alignItems:'center', gap:6, padding:'10px 14px', background:'rgba(255,255,255,0.03)', borderRadius:12, border:'1px solid rgba(255,255,255,0.05)' }}>
                <span className="material-symbols-outlined" style={{ fontSize:16, color:'var(--p)' }}>volume_up</span>
                <p style={{ fontSize:9.5, color:'var(--t3)', lineHeight:1.4 }}>
                  <b>Volume Sync:</b> Use the headphones icon <b>inside</b> the player to adjust binaural intensity.
                </p>
              </div>
            </>
          )}
        </div>
      )}


      {active === 'lofi' && (
        <div className="glass-card" style={{ width:'100%', marginTop:8, padding:'12px', display:'flex', alignItems:'center', justifyContent:'space-between', background:'rgba(255,92,0,0.03)', border:'1px solid rgba(255,92,0,0.15)', borderRadius:16 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ width:8, height:8, borderRadius:'50%', background:'#FF5C00', animation:'pulse 1.5s infinite' }} />
            <p style={{ fontSize:11, color:'#FF5C00', fontWeight:800 }}>LOFI GIRL {isMinimized ? 'ACTIVE' : 'STREAMING GLOBALLY'}</p>
          </div>
          <button 
            onClick={() => setIsMinimized(!isMinimized)}
            style={{ background:'none', border:'none', color:'var(--t4)', cursor:'pointer', display:'flex' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize:20 }}>{isMinimized ? 'expand_more' : 'expand_less'}</span>
          </button>
        </div>
      )}

      <style>{`@keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.3; } }`}</style>
    </div>
  );
});

// ── Main Focus Timer ──────────────────────────
export default function FocusTimer() {
  const { A } = useApp();
  const timer = useTimer();
  const { remain, isRunning: running, duration: durationMins, subject } = timer;
  
  const [sessions,     setSessions]     = useState(0);
  const [history,      setHistory]      = useState([]);
  const [showCI,       setShowCI]       = useState(false);
  const [aiTip,        setAiTip]        = useState('');
  const [isDesktop,    setIsDesktop]    = useState(window.innerWidth > 1024);
  const prevRemain = useRef(remain);
  const color = 'var(--p)';

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth > 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch AI timer tip
  useEffect(() => {
    if (!AI.enabled()) return;
    timerSettings({ sessions }).then(r => { if (r?.preSessionTip) setAiTip(r.preSessionTip); });
  }, []);

  // Watch for session end (global state will set remain to 0 and isRunning to false)
  useEffect(() => {
    if (prevRemain.current > 0 && remain === 0 && !running) {
      onEnd();
    }
    prevRemain.current = remain;
  }, [remain, running]);

  const onEnd = () => {
    const mins = durationMins;
    setSessions(s => s+1);
    setHistory(h => [{ subject, minutes:mins, at:new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}) }, ...h].slice(0,8));
    toast.success(`+${mins}m session complete! 🎯`, { duration:4000 });
    A.progress.timerDone(mins);
  };

  const handleSliderChange = useCallback((m) => {
    A.timer.setDur(m);
  }, [A]);

  const handleStart = () => {
    if (!running && Math.round(remain) === (durationMins * 60) && sessions === 0) {
      setShowCI(true);
    } else {
      A.timer.start();
    }
  };

  const pct = (durationMins * 60) > 0 ? (((durationMins * 60) - remain) / (durationMins * 60)) * 100 : 0;
  const totalMins = history.reduce((a,s)=>a+s.minutes,0);

  return (
    <div className={`page ${running ? 'focus-active' : ''}`} style={{ position: 'relative', overflow: 'hidden' }}>

      <div className="fadeup" style={{ marginBottom:32, display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:16 }}>
        <div>
          <h1 className="shimmer-text page-title" style={{ fontSize: '2.5rem' }}>Focus</h1>
          <p style={{ fontSize:14,color:'var(--t3)',marginTop:6, fontWeight: 500 }}>
            {sessions > 0 
              ? `You've mastered ${sessions} deep sessions today` 
              : 'Precision timing for high-performance minds'}
          </p>
        </div>
        
        <div style={{ display:'flex', gap:16, alignItems:'center', background: 'var(--s2)', padding: '12px 20px', borderRadius: 'var(--r-lg)', border: '1px solid var(--surface-b)', boxShadow: 'var(--sh)' }}>
          <div style={{ textAlign:'center', minWidth: 60 }}>
            <p style={{ fontSize:20, fontWeight:800, color:'var(--p)', lineHeight: 1 }}><Counter value={sessions}/></p>
            <p style={{ fontSize:9, color:'var(--t4)', fontWeight:800, textTransform:'uppercase', marginTop:4, letterSpacing: '0.1em' }}>Sessions</p>
          </div>
          <div style={{ width: 1, height: 24, background: 'var(--surface-b)' }} />
          <div style={{ textAlign:'center', minWidth: 60 }}>
            <p style={{ fontSize:20, fontWeight:800, color:'#60a5fa', lineHeight: 1 }}><Counter value={totalMins} suffix="m"/></p>
            <p style={{ fontSize:9, color:'var(--t4)', fontWeight:800, textTransform:'uppercase', marginTop:4, letterSpacing: '0.1em' }}>Total</p>
          </div>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns: isDesktop ? '1.2fr 0.8fr' : '1fr', gap: 24, alignItems: 'start' }}>
        
        {/* Main Timer Section */}
        <div className="card fadeup d2" style={{ 
          padding:'48px 24px', 
          display:'flex', 
          flexDirection:'column', 
          alignItems:'center', 
          background:`radial-gradient(circle at top right, var(--p-sub), var(--s1))`,
          border: '1px solid var(--card-b-h)',
          position: 'relative'
        }}>
          
          <div style={{ marginBottom: 48, width: '100%', display: 'flex', justifyContent: 'center', transition: 'all 1s ease' }}>
            <CircularDialSlider 
              value={durationMins} 
              onChange={handleSliderChange} 
              disabled={running} 
              running={running}
              remain={remain}
            />
          </div>

          <div style={{ width: '100%', maxWidth: 440, display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Subject selector */}
            <div style={{ 
              display:'flex', alignItems:'center', gap:12, 
              padding:'14px 24px', borderRadius:'var(--r-xl)', 
              background:'var(--s2)', border:'1px solid var(--surface-b)',
              boxShadow: 'var(--sh)'
            }}>
              <span className="material-symbols-outlined" style={{ fontSize:20, color:'var(--t4)' }}>api</span>
              <select value={subject} onChange={e=>A.timer.setSub(e.target.value)} disabled={running}
                style={{ background:'transparent', border:'none', color:'var(--t1)', fontWeight:700, fontSize:16, outline:'none', cursor:running?'not-allowed':'pointer', flex: 1 }}>
                {SUBJECTS.map(s=><option key={s} style={{ background:'var(--s3)', color:'var(--t1)' }}>{s}</option>)}
              </select>
            </div>

            {/* Controls */}
            <div style={{ display:'flex', alignItems:'center', gap:20, justifyContent: 'center' }}>
              <button onClick={()=>A.timer.reset()}
                className="icon-btn" style={{ 
                  width:64, height:64, borderRadius:'50%', 
                  background:'var(--s3)', border:'1px solid var(--surface-b)',
                  color:'var(--t3)', transition: 'all 0.3s var(--bounce)',
                  opacity:remain===(durationMins*60)&&!running?0.3 : 1 
                }}>
                <span className="material-symbols-outlined" style={{ fontSize:28 }}>refresh</span>
              </button>
              
              <button onClick={running?()=>A.timer.pause():handleStart}
                style={{ 
                  display:'flex', alignItems:'center', gap:12, 
                  padding:'20px 56px', borderRadius:999, border:'none', 
                  cursor:'pointer', fontWeight:800, fontSize:18, 
                  background:running ? 'var(--s4)' : 'var(--p)', 
                  color:running ? 'var(--t1)' : `#002a18`,
                  boxShadow: running ? 'none' : `0 20px 40px var(--p-glow), inset 0 2px 4px rgba(255,255,255,0.3)`,
                  transition:'all 300ms var(--bounce)',
                  transform:'scale(1)' 
                }}
                onMouseEnter={e=>!running&&(e.currentTarget.style.transform='scale(1.05) translateY(-3px)')}
                onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}>
                <span className="material-symbols-outlined" style={{ fontSize:28, fontVariationSettings:"'FILL' 1" }}>
                  {running ? 'pause_circle' : 'play_circle'}
                </span>
                {running ? 'Pause' : remain < (durationMins*60) ? 'Resume' : 'Start Flow'}
              </button>
            </div>

            <SoundScape />
          </div>
        </div>

        {/* Sidebar Info Section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {/* Progress summary */}
          <div className="card fadeup d3" style={{ padding:24, background: 'var(--s2)', border: '1px solid var(--surface-b)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <p className="section-label" style={{ margin: 0 }}>Daily Mastery</p>
              <span style={{ fontSize: 11, color: 'var(--p)', fontWeight: 800, background: 'var(--p-sub)', padding: '4px 10px', borderRadius: 99 }}>{sessions}/4</span>
            </div>
            <div style={{ display:'flex', gap:12, flexWrap:'wrap', marginBottom:20 }}>
              {Array.from({length:Math.max(sessions, 4)},(_,i)=>(
                <div key={i} style={{ 
                  width:48, height:48, borderRadius:'16px', 
                  background:i<sessions ? 'linear-gradient(135deg, var(--p), var(--p-dk))' : 'var(--s3)',
                  border:`1px solid ${i<sessions ? 'var(--p-lt)' : 'var(--surface-b)'}`,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  transition:'all 500ms var(--bounce)', 
                  boxShadow: i<sessions ? '0 8px 20px var(--p-glow)' : 'none',
                  transform: i<sessions ? 'scale(1.1)' : 'scale(1)'
                }}>
                  {i<sessions 
                    ? <span className="material-symbols-outlined" style={{ fontSize:22, color:'#002a18', fontVariationSettings:"'FILL' 1" }}>verified</span> 
                    : <span style={{ fontSize:12, color:'var(--t4)', fontWeight:800 }}>0{i+1}</span>}
                </div>
              ))}
            </div>
            <p style={{ fontSize:13, color:'var(--t3)', lineHeight: 1.6 }}>
              {sessions > 0 
                ? `You're on a roll. Maintain this cadence to reach peak cognitive performance.` 
                : 'Your journey to mastery begins with a single focus block.'}
            </p>
          </div>

          {/* Focus Tip */}
          {aiTip && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="card" style={{ padding:'20px', background:'rgba(9,205,131,0.03)', border:'1px solid var(--p-border)', display:'flex', gap:16, alignItems: 'center' }}
            >
              <div style={{ width:40, height:40, borderRadius:12, background:'var(--p-sub)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <span className="material-symbols-outlined" style={{ fontSize:20, color:'var(--p)', fontVariationSettings:"'FILL' 1" }}>tips_and_updates</span>
              </div>
              <p style={{ fontSize:13.5, color:'var(--t2)', lineHeight:1.6, fontStyle: 'italic' }}>"{aiTip}"</p>
            </motion.div>
          )}

          {/* Session log */}
          <div className="fadeup d6 card" style={{ padding:20, maxHeight: isDesktop ? 300 : 'auto', overflowY: 'auto' }}>
            <p className="section-label" style={{ marginBottom:16 }}>Session History</p>
            {history.length > 0 ? (
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                {history.map((s,i) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', borderRadius:'var(--r-lg)', background:'var(--s3)', border:'1px solid var(--surface-b)' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--p)', boxShadow: '0 0 10px var(--p)' }} />
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ fontSize:14, fontWeight:700, color:'var(--t1)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.subject}</p>
                      <p style={{ fontSize:11, color:'var(--t4)', fontWeight: 600 }}>{s.at}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize:15, fontWeight:800, color:'var(--t1)' }}>{s.minutes}m</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign:'center', padding:'40px 20px' }}>
                <span className="material-symbols-outlined" style={{ fontSize:40, color: 'var(--s5)', marginBottom: 12 }}>history_toggle_off</span>
                <p style={{ fontSize:13, color:'var(--t4)', fontWeight: 500 }}>No sessions logged today.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {showCI && <CheckInModal onDone={()=>{ setShowCI(false); A.timer.start(); }}/>}
    </div>
  );
}
