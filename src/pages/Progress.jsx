import { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useApp } from '@context/AppContext';
import { progressInsights, generateDailyReport, achievementMsg, moodCoaching, AI } from '@services/ai';
import { PersonalizationEngine } from '@services/personalization';
import { SUBJECT_COLORS, overallProgress, fmt } from '@utils';
import { usePremium, Counter, Reveal } from '@components/ui/PremiumUI';
import { useTheme } from '@context/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const CATS = ['All', 'Notes', 'Streak', 'Tasks', 'Focus', 'Hours', 'Paths'];

const MOODS = [
  { v:1, e:'😞', l:'Terrible', c:'#ff6b6b' },
  { v:2, e:'😟', l:'Low',      c:'#fb923c' },
  { v:3, e:'😐', l:'Okay',     c:'#e9cd6e' },
  { v:4, e:'😊', l:'Good',     c:'var(--p)' },
  { v:5, e:'🤩', l:'Amazing',  c:'var(--p-lt)' },
];

const FOCUS_MODES = [
  { id: 'Deep Work', icon: 'eco', desc: 'Intense uninterrupted focus' },
  { id: 'Light Admin', icon: 'task_alt', desc: 'Clearing small tasks & emails' },
  { id: 'Learning', icon: 'menu_book', desc: 'Absorbing new information' },
  { id: 'Creative', icon: 'palette', desc: 'Brainstorming & designing' },
  { id: 'Recovery', icon: 'spa', desc: 'Low friction, easy wins today' },
];

const BURNOUT_CFG = {
  low:      { l:'Optimal',     icon:'check_circle', c:'var(--p)', bg:'rgba(9,205,131,0.07)', desc:'You are in a great state. Push forward!' },
  medium:   { l:'Watch Out',   icon:'warning',      c:'#e9cd6e', bg:'rgba(233,205,110,0.07)', desc:'Some fatigue detected. Consider a balanced workload.' },
  high:     { l:'High Risk',   icon:'error',        c:'#fb923c', bg:'rgba(251,146,60,0.07)',  desc:'Burnout approaching. Prioritize recovery and essential tasks only.' },
  critical: { l:'Rest Now',    icon:'dangerous',    c:'#ff6b6b', bg:'rgba(255,107,107,0.07)', desc:'Critical burnout levels. Take a full day off to recharge.' },
};

function Slider({ icon, label, val, onChange, min, max, step=1, color='var(--p)' }) {
  const pct = ((val-min)/(max-min))*100;
  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span className="material-symbols-outlined" style={{ fontSize:20, color, fontVariationSettings:"'FILL' 1" }}>{icon}</span>
          <span style={{ fontSize:15.5, fontWeight:700, color:'var(--t2)' }}>{label}</span>
        </div>
        <span style={{ fontSize:20, fontWeight:800, color, fontVariantNumeric:'tabular-nums' }}>{val}</span>
      </div>
      <div style={{ position:'relative', height:8, background:'var(--s5)', borderRadius:99, border:'1px solid var(--surface-b)' }}>
        <div style={{ position:'absolute', left:0, height:'100%', width:`${pct}%`, background:`linear-gradient(90deg, color-mix(in srgb, ${color} 25%, transparent), ${color})`, borderRadius:99, boxShadow:`0 0 12px color-mix(in srgb, ${color} 40%, transparent)`, transition:'width 0.15s cubic-bezier(0.4, 0, 0.2, 1)' }}/>
        <input type="range" min={min} max={max} step={step} value={val}
          onChange={e=>onChange(Number(e.target.value))}
          style={{ position:'absolute', inset:0, width:'100%', opacity:0, cursor:'pointer', zIndex:2 }}/>
        <div style={{ position:'absolute', top:'50%', left:`${pct}%`, transform:'translate(-50%,-50%)', width:20, height:20, borderRadius:'50%', background:color, border:'3px solid var(--s1)', boxShadow:`0 4px 12px color-mix(in srgb, ${color} 50%, transparent)`, pointerEvents:'none', transition:'left 0.15s cubic-bezier(0.4, 0, 0.2, 1)' }}/>
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', marginTop:5 }}>
        <span style={{ fontSize:12, fontWeight:600, color:'var(--t4)' }}>{min}</span>
        <span style={{ fontSize:12, fontWeight:600, color:'var(--t4)' }}>{max}</span>
      </div>
    </div>
  );
}

// ── Circular Ring ─────────────────────────────
function Ring({ pct = 0, size = 180, stroke = 12, color = 'var(--p)', children }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(pct, 100) / 100) * c;
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(9,205,131,0.07)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1.1s cubic-bezier(0.25,0.46,0.45,0.94)', willChange: 'stroke-dashoffset' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        {children}
      </div>
    </div>
  );
}

// ── Activity Bar (pill) ───────────────────────
function PillBars({ data, total }) {
  const [hoverIdx, setHoverIdx] = useState(null);
  const chartRef = useRef(null);
  const { theme } = useTheme();
  const isDark = theme !== 'light';
  const max = Math.max(...data.map(d => d.v), 8) * 1.4;
  const todayIdx = (new Date().getDay() + 6) % 7;

  const ghostData = useMemo(() => data.map(d => ({ ...d, v: Math.max(0, d.v * (0.7 + Math.random() * 0.6)) })), [data]);

  const getPoints = (points) => {
    const realPts = points.map((p, i) => ({
      x: 3 + (i / (points.length - 1)) * 94,
      y: 85 - (p.v / max) * 75
    }));
    const first = realPts[0];
    const last = realPts[realPts.length - 1];
    return [
      { x: 0, y: first.y },
      ...realPts,
      { x: 100, y: last.y }
    ];
  };

  const currPts = getPoints(data);
  const ghostPts = getPoints(ghostData);
  const interactionPts = currPts.slice(1, -1);

  const solvePath = (pts) => {
    if (pts.length < 2) return "";
    let d = `M ${pts[0].x},${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p1 = pts[i]; const p2 = pts[i + 1];
      const cp1x = p1.x + (p2.x - p1.x) / 2.5;
      const cp2x = p2.x - (p2.x - p1.x) / 2.5;
      d += ` C ${cp1x},${p1.y} ${cp2x},${p2.y} ${p2.x},${p2.y}`;
    }
    return d;
  };

  const currentPath = solvePath(currPts);
  const ghostPath = solvePath(ghostPts);

  const handleMouseMove = (e) => {
    if (!chartRef.current) return;
    const rect = chartRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const idx = Math.round((x / 100) * (data.length - 1));
    setHoverIdx(Math.max(0, Math.min(data.length - 1, idx)));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, position: 'relative' }}>
      <div
        ref={chartRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverIdx(null)}
        style={{ position: 'relative', height: 210, width: '100%', marginTop: 10, background: isDark ? '#0B0E14' : 'linear-gradient(180deg, #f8faf8 0%, #f0f4f0 100%)', borderRadius: 24, overflow: 'hidden', cursor: 'crosshair', border: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.08)'}`, boxShadow: isDark ? 'inset 0 0 80px rgba(0,0,0,0.9), 0 20px 50px rgba(0,0,0,0.5)' : 'inset 0 0 40px rgba(0,0,0,0.03), 0 4px 20px rgba(0,0,0,0.06)' }}
      >
        {/* Technical Dotted Grid */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: `radial-gradient(${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.12)'} 1px, transparent 1px)`, backgroundSize: '24px 24px' }} />

        {/* Atmospheric Cursor Glow */}
        <AnimatePresence>
          {hoverIdx !== null && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{
                position: 'absolute', width: 300, height: 300,
                background: 'radial-gradient(circle, rgba(167,139,250,0.05) 0%, transparent 70%)',
                left: `calc(${(hoverIdx / (data.length - 1)) * 100}% - 150px)`, top: `calc(${interactionPts[hoverIdx].y}% - 150px)`,
                pointerEvents: 'none', zIndex: 0
              }}
            />
          )}
        </AnimatePresence>

        <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at 50% 50%, ${isDark ? 'rgba(0,255,153,0.02)' : 'rgba(4,120,87,0.05)'} 0%, transparent 100%)`, zIndex: 0 }} />

        <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible', zIndex: 1 }}>
          <defs>
            <linearGradient id="cosmicGradientProg" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={isDark ? '#00FF99' : '#065F46'} />
              <stop offset="100%" stopColor={isDark ? '#A78BFA' : '#6D28D9'} />
            </linearGradient>
            <linearGradient id="cosmicAreaProg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={isDark ? '#00FF99' : '#065F46'} stopOpacity={isDark ? 0.12 : 0.1} />
              <stop offset="100%" stopColor={isDark ? '#A78BFA' : '#6D28D9'} stopOpacity="0" />
            </linearGradient>
            <filter id="prismaticGlowProg">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Micro-Dotted Ghost Performance Trace */}
          <path d={ghostPath} fill="none" stroke={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.12)'} strokeWidth="0.8" strokeDasharray="1,2" />

          {/* Area Fill - Full Panoramic */}
          <path d={`${currentPath} L 100,100 L 0,100 Z`} fill="url(#cosmicAreaProg)" />

          {/* Prismatic Spline System - Enhanced Curve */}
          <path d={currentPath} fill="none" stroke="url(#cosmicGradientProg)" strokeWidth="5" strokeOpacity={isDark ? '0.15' : '0.2'} filter="url(#prismaticGlowProg)" />
          <path d={currentPath} fill="none" stroke="url(#cosmicGradientProg)" strokeWidth="2.5" strokeLinecap="round" />
          <path d={currentPath} fill="none" stroke={isDark ? '#fff' : '#065F46'} strokeWidth="0.4" strokeOpacity={isDark ? '0.25' : '0.15'} />
        </svg>

        {/* Kinetic True-Sphere Glass Bead Slider */}
        {(() => {
          const activeIdx = hoverIdx !== null ? hoverIdx : todayIdx;
          const pt = interactionPts[activeIdx];
          const isSelection = hoverIdx !== null;
          const primaryColor = isSelection ? '#A78BFA' : '#00FF99';
          return (
            <motion.div
              animate={{ left: `${pt.x}%`, top: `${pt.y}%` }}
              transition={{ type: 'spring', stiffness: 180, damping: 24 }}
              style={{
                position: 'absolute', width: 16, height: 16,
                borderRadius: '50%', zIndex: 10, pointerEvents: 'none',
                transform: 'translate(-50%, -50%)',
                background: `radial-gradient(circle at 30% 30%, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.1) 40%, ${primaryColor}1a 100%)`,
                boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 15px ${primaryColor}33`,
                border: '1px solid rgba(255,255,255,0.4)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)'
              }}
            >
              {/* Spectral Core Shift */}
              <motion.div
                animate={{ background: `linear-gradient(135deg, ${primaryColor} 0%, #A78BFA 100%)` }}
                style={{ position: 'absolute', inset: 0, borderRadius: '50%', opacity: 0.3, zIndex: -1 }}
              />
              <div style={{ position: 'absolute', top: '20%', left: '20%', width: 3, height: 3, borderRadius: '50%', background: '#fff', opacity: 0.8, filter: 'blur(0.5px)' }} />
            </motion.div>
          );
        })()}

        <AnimatePresence>
          {hoverIdx !== null && (
            <motion.div
              initial={{ opacity: 0, y: 15, scale: 0.8 }}
              animate={{
                opacity: 1, y: 0, scale: 1,
                left: `${(hoverIdx / (data.length - 1)) * 94 + 3}%`,
                top: `${interactionPts[hoverIdx].y - 55}%`,
                translateX: hoverIdx < 2 ? '0%' : hoverIdx > 4 ? '-100%' : '-50%'
              }}
              exit={{ opacity: 0, y: 15, scale: 0.8 }}
              style={{
                position: 'absolute', width: 90, padding: '10px', borderRadius: 14,
                background: isDark ? 'rgba(11, 14, 20, 0.95)' : 'rgba(255,255,255,0.95)', backdropFilter: 'blur(24px)',
                border: isDark ? '1px solid rgba(0, 255, 153, 0.4)' : '1px solid rgba(4,120,87,0.2)', boxShadow: isDark ? '0 20px 40px rgba(0,0,0,0.8)' : '0 10px 30px rgba(0,0,0,0.1)',
                zIndex: 10, pointerEvents: 'none', textAlign: 'center'
              }}
            >
              <p style={{ fontSize: 10, fontWeight: 800, color: isDark ? '#00FF99' : '#047857', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 4 }}>{data[hoverIdx].d}</p>
              <p style={{ fontSize: 18, fontWeight: 900, color: 'var(--t1)' }}>{data[hoverIdx].v}<span style={{ fontSize: 11, opacity: 0.7, marginLeft: 2 }}>HRS</span></p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 3%', marginTop: 12 }}>
        {data.map(({ d }, i) => {
          const isToday = i === todayIdx;
          const isHovered = i === hoverIdx;
          return (
            <div key={d} style={{ textAlign: 'center' }}>
              <motion.span
                animate={{
                  opacity: isHovered || isToday ? 1 : 0.2,
                  color: isHovered ? (isDark ? '#A78BFA' : '#7C3AED') : isToday ? (isDark ? '#00FF99' : '#047857') : 'var(--t4)'
                }}
                style={{
                  fontSize: 11,
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 900,
                  display: 'inline-block'
                }}
              >
                {d.toUpperCase()}
              </motion.span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BadgeCard({ ach, onClick }) {
  const { earned, title, desc, icon, color, cat, earnedAt } = ach;
  return (
    <div onClick={() => earned && onClick(ach)}
      className="tilt-card"
      style={{
        padding: 18, borderRadius: 'var(--r-lg)', textAlign: 'center',
        background: earned ? `${color}0c` : 'var(--s2)',
        border: `1px solid ${earned ? `${color}28` : 'rgba(255,255,255,0.04)'}`,
        cursor: earned ? 'pointer' : 'default',
        opacity: earned ? 1 : 0.4,
        filter: earned ? 'none' : 'grayscale(0.7)',
        transition: 'all 280ms var(--bounce)',
        transform: 'scale(1)',
        position: 'relative', overflow: 'hidden',
      }}>

      {earned && <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at 50% 20%, ${color}10, transparent 65%)`, pointerEvents: 'none' }} />}

      <div style={{ width: 52, height: 52, borderRadius: 'var(--r-md)', margin: '0 auto 12px', background: earned ? `${color}18` : 'var(--s4)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: earned ? `0 0 20px ${color}35` : 'none', transition: 'all 280ms ease' }}>
        <span className="material-symbols-outlined" style={{ fontSize: 24, color: earned ? color : 'var(--s6)', fontVariationSettings: "'FILL' 1" }}>{icon}</span>
      </div>

      <p style={{ fontSize: 13, fontWeight: 700, color: earned ? 'var(--t1)' : 'var(--t4)', marginBottom: 4, lineHeight: 1.3 }}>{title}</p>
      <p style={{ fontSize: 11, color: 'var(--t4)', lineHeight: 1.4 }}>{desc}</p>

      {earned && earnedAt ? (
        <div style={{ marginTop: 10, display: 'inline-block', padding: '3px 10px', borderRadius: 99, background: `${color}14`, color, fontSize: 10, fontWeight: 700 }}>
          ✓ {fmt.shortDate(earnedAt)}
        </div>
      ) : !earned && (
        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 12, color: 'var(--s6)' }}>lock</span>
          <span style={{ fontSize: 10, color: 'var(--s6)', fontWeight: 600 }}>Locked</span>
        </div>
      )}
    </div>
  );
}

function DetailModal({ ach, onClose }) {
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const { color, icon, title, desc, earnedAt } = ach;

  const { triggerConfetti } = usePremium();

  useEffect(() => {
    if (ach.earned) {
      triggerConfetti(window.innerWidth / 2, window.innerHeight / 2);
    }
    if (!AI.enabled()) return;
    setLoading(true);
    achievementMsg(title, { earnedAt }).then(r => { if (r) setMsg(r); }).finally(() => setLoading(false));
  }, [title]);

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', background: 'var(--overlay)', animation: 'modalFadeIn 220ms ease both' }}>
      <div onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 420, borderRadius: 'var(--r-xl) var(--r-xl) 0 0', overflow: 'hidden', background: 'var(--s2)', border: `1px solid ${color}35`, boxShadow: `var(--modal-sh), 0 0 60px ${color}20`, animation: 'modalSlideUp 340ms var(--bounce) both' }}>

        {/* Hero */}
        <div style={{ padding: '36px 24px 22px', textAlign: 'center', background: `radial-gradient(circle at 50% 0%, ${color}14, transparent 65%)` }}>
          <div style={{ width: 76, height: 76, borderRadius: 'var(--r-xl)', margin: '0 auto 16px', background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 40px ${color}50` }}>
            <span className="material-symbols-outlined" style={{ fontSize: 36, color, fontVariationSettings: "'FILL' 1" }}>{icon}</span>
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--t1)', letterSpacing: '-0.025em', marginBottom: 8 }}>{title}</h2>
          <p style={{ fontSize: 13, color: 'var(--t3)', lineHeight: 1.6 }}>{desc}</p>
          <p style={{ fontSize: 12, color, marginTop: 12, fontWeight: 700 }}>Earned {fmt.date(earnedAt)}</p>
        </div>

        {/* AI message */}
        <div style={{ padding: '0 22px 22px' }}>
          {loading ? (
            <div style={{ padding: 14, borderRadius: 'var(--r-md)', background: 'var(--s3)', display: 'flex', gap: 10, alignItems: 'center' }}>
              <div className="ai-dots"><span /><span /><span /></div>
              <span style={{ fontSize: 12, color: 'var(--t3)' }}>AI writing your message…</span>
            </div>
          ) : msg ? (
            <div style={{ padding: 14, borderRadius: 'var(--r-md)', background: `${color}09`, border: `1px solid ${color}20` }}>
              <p style={{ fontSize: 13, color: 'var(--t2)', lineHeight: 1.7, fontStyle: 'italic' }}>"{msg}"</p>
            </div>
          ) : (
            <div style={{ padding: 14, borderRadius: 'var(--r-md)', background: 'var(--s3)', textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: 'var(--t3)' }}>🎊 Congratulations on this achievement!</p>
            </div>
          )}
          <button onClick={onClose} className="btn btn-surface" style={{ width: '100%', marginTop: 14, padding: '12px', borderRadius: 'var(--r-md)' }}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ── Streak Calendar ───────────────────────────
function StreakGrid({ streak }) {
  const days = Array.from({ length: 28 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (27 - i));
    return { date: d, active: 27 - i < streak, today: i === 27 };
  });
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, maxWidth: 180 }}>
      {days.map((d, i) => (
        <div key={i} style={{ width: 22, height: 22, borderRadius: 6, background: d.today ? 'var(--p)' : d.active ? 'rgba(9,205,131,0.38)' : 'var(--s4)', boxShadow: d.today ? '0 0 10px rgba(9,205,131,0.55)' : 'none', transition: 'all 0.3s ease', border: `1px solid ${d.today ? 'var(--p)' : d.active ? 'rgba(9,205,131,0.25)' : 'rgba(255,255,255,0.03)'}` }} title={d.date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} />
      ))}
    </div>
  );
}

// ── Unified AI Intelligence Panel ────────────────────────────
function AuraIntelligencePanel({ data }) {
  const { progress, tasks, notes, videos, checkIns, todayCI, burnout, user } = useApp();
  const [ins, setIns] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const bc = BURNOUT_CFG[burnout] || BURNOUT_CFG.low;

  // Parse strategy from today's check-in
  const strategy = useMemo(() => {
    if (todayCI?.aiStrategy) try { return JSON.parse(todayCI.aiStrategy); } catch { return null; }
    return null;
  }, [todayCI]);

  // Subject analysis
  const subEntries = Object.entries(progress?.subjects || {});
  const sortedSubs = [...subEntries].sort((a, b) => b[1].progress - a[1].progress);
  const strongSubs = sortedSubs.slice(0, 2);
  const weakSubs = sortedSubs.slice(-2).reverse();
  const pendingCount = tasks.filter(t => t.status === 'pending').length;
  const completedCount = tasks.filter(t => t.status === 'completed').length;
  const overdueCount = tasks.filter(t => t.status === 'pending' && t.deadline && new Date(t.deadline) < new Date()).length;

  useEffect(() => {
    if (!AI.enabled()) return;
    setLoading(true);
    setError(null);
    progressInsights(data, { progress, tasks, notes, videos, checkIns, todayCI, user })
      .then(r => {
        if (r) setIns(r);
        else setError('AI returned empty response. Your API key may be rate-limited — try again in a moment.');
      })
      .catch(err => {
        console.error('[AuraInsights] Failed:', err);
        setError(err.message || 'Failed to connect to AI service.');
      })
      .finally(() => setLoading(false));
  }, []);

  if (!AI.enabled()) return (
    <div className="card" style={{ padding: 32, textAlign: 'center' }}>
      <span className="material-symbols-outlined" style={{ fontSize: 40, color: 'var(--s6)', display: 'block', marginBottom: 10 }}>psychology</span>
      <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--t2)' }}>AI Intelligence Offline</p>
      <p style={{ fontSize: 12, color: 'var(--t4)', marginTop: 4 }}>Add your API key in Settings to unlock unified analytics</p>
    </div>
  );

  const moodEmoji = todayCI ? (MOODS.find(m => m.v === todayCI.mood)?.e || '😐') : '—';
  const moodLabel = todayCI ? (MOODS.find(m => m.v === todayCI.mood)?.l || 'Okay') : 'Uncalibrated';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* Header Briefing Banner */}
      <div className="card" style={{
        padding: '32px 28px',
        background: 'linear-gradient(135deg, rgba(9, 205, 131, 0.08) 0%, rgba(167, 139, 250, 0.03) 100%)',
        border: '1px solid rgba(9, 205, 131, 0.15)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
        backdropFilter: 'blur(12px)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 4 }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            background: 'rgba(9, 205, 131, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid rgba(9, 205, 131, 0.25)',
            boxShadow: '0 0 15px rgba(9, 205, 131, 0.2)'
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 26, color: 'var(--p)', fontVariationSettings: "'FILL' 1" }}>psychology</span>
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 11, fontWeight: 900, color: 'var(--p)', textTransform: 'uppercase', letterSpacing: '0.15em', margin: 0 }}>Aura Intelligence Briefing</p>
            <p style={{ fontSize: 22, fontWeight: 800, color: error ? '#ff6b6b' : 'var(--t1)', margin: '4px 0 0', letterSpacing: '-0.02em', lineHeight: 1.35 }}>{ins?.headline || (error ? 'Briefing Unavailable' : 'Analyzing your complete profile…')}</p>
            {error && !loading && <p style={{ fontSize: 13, color: '#ff6b6b', margin: '8px 0 0', lineHeight: 1.5, opacity: 0.85 }}>{error}</p>}
          </div>
          {ins && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 16px', borderRadius: 99, background: ins.trend === 'improving' ? 'rgba(9,205,131,0.12)' : ins.trend === 'declining' ? 'rgba(255,107,107,0.12)' : 'rgba(233,205,110,0.12)', border: `1px solid ${ins.trend === 'improving' ? 'rgba(9,205,131,0.25)' : ins.trend === 'declining' ? 'rgba(255,107,107,0.25)' : 'rgba(233,205,110,0.25)'}` }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18, color: ins.trend === 'improving' ? 'var(--p)' : ins.trend === 'declining' ? '#ff6b6b' : '#e9cd6e' }}>{ins.trend === 'improving' ? 'trending_up' : ins.trend === 'declining' ? 'trending_down' : 'trending_flat'}</span>
              <span style={{ fontSize: 12.5, fontWeight: 800, color: ins.trend === 'improving' ? 'var(--p)' : ins.trend === 'declining' ? '#ff6b6b' : '#e9cd6e', textTransform: 'capitalize', letterSpacing: '0.02em' }}>{ins.trend}</span>
            </div>
          )}
        </div>
        {loading && <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14 }}><div className="ai-dots"><span /><span /><span /></div><p style={{ fontSize: 14, color: 'var(--t3)', margin: 0 }}>Deep-analyzing mood, tasks & subjects…</p></div>}
      </div>

      {/* Biometric + Task Telemetry Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 16 }}>
        {[
          { icon: moodEmoji, label: 'Mood', value: moodLabel, isEmoji: true },
          { icon: 'bolt', label: 'Energy', value: todayCI ? `${todayCI.energy}/10` : '—', c: 'var(--p)' },
          { icon: 'bedtime', label: 'Sleep', value: todayCI ? `${todayCI.sleepHours}h` : '—', c: '#60a5fa' },
          { icon: 'vital_signs', label: 'Stress', value: todayCI ? `${todayCI.stressLevel}/10` : '—', c: '#ff6b6b' },
          { icon: 'task_alt', label: 'Pending', value: pendingCount, c: '#e9cd6e' },
          { icon: 'check_circle', label: 'Done', value: completedCount, c: 'var(--p)' },
        ].map(m => (
          <div key={m.label} className="card card-hover" style={{ padding: '20px 14px', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: 'linear-gradient(145deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))', border: '1px solid rgba(255,255,255,0.05)' }}>
            {m.isEmoji
              ? <span style={{ fontSize: 32, display: 'block', marginBottom: 8 }}>{m.icon}</span>
              : <span className="material-symbols-outlined" style={{ fontSize: 28, color: m.c, display: 'block', marginBottom: 8, fontVariationSettings: "'FILL' 1" }}>{m.icon}</span>
            }
            <p style={{ fontSize: 20, fontWeight: 800, color: 'var(--t1)', margin: 0, fontFamily: "'Inter', sans-serif", letterSpacing: '-0.02em', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{m.value}</p>
            <p style={{ fontSize: 10, fontWeight: 800, color: 'var(--t4)', textTransform: 'uppercase', margin: '8px 0 0', letterSpacing: '0.08em' }}>{m.label}</p>
          </div>
        ))}
      </div>

      {/* Strategy and Insights — Stacked */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

        {/* LEFT: Tactical Strategy */}
        <div className="card card-hover" style={{ padding: 28, border: strategy ? '1px solid var(--p-border)' : undefined, background: strategy ? 'linear-gradient(145deg, var(--s2), var(--s1))' : undefined, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(9, 205, 131, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(9, 205, 131, 0.15)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--p)', fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
            </div>
            <div>
              <p style={{ fontSize: 10.5, fontWeight: 900, color: 'var(--p)', textTransform: 'uppercase', letterSpacing: '0.12em', margin: 0 }}>Strategy Engine</p>
              <h4 style={{ fontSize: 18, fontWeight: 800, color: 'var(--t1)', margin: '2px 0 0', letterSpacing: '-0.01em' }}>Tactical Strategy</h4>
            </div>
          </div>

          {strategy ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <h4 style={{ fontSize: 16.5, fontWeight: 700, color: 'var(--t2)', margin: 0, lineHeight: 1.45 }}>{strategy.greeting}</h4>
              <div style={{ padding: '16px 20px', borderRadius: 'var(--r-md)', background: 'rgba(9, 205, 131, 0.02)', borderLeft: '4px solid var(--p)', border: '1px solid rgba(255, 255, 255, 0.03)', borderLeftColor: 'var(--p)' }}>
                <p style={{ fontSize: 11, fontWeight: 800, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 8px' }}>Recommendation</p>
                <p style={{ fontSize: 15.5, color: 'var(--t1)', margin: 0, lineHeight: 1.7 }}>{strategy.recommendation}</p>
              </div>
              <div style={{ display: 'flex', gap: 14 }}>
                <div style={{ flex: 1, padding: '14px 16px', borderRadius: 'var(--r-md)', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', textAlign: 'center' }}>
                  <p style={{ fontSize: 10, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 6px' }}>Session</p>
                  <p style={{ fontSize: 20, fontWeight: 800, color: 'var(--t1)', margin: 0, fontFamily: "'Inter', sans-serif", fontVariantNumeric: 'tabular-nums' }}>{strategy.durationMinutes}m</p>
                </div>
                <div style={{ flex: 1, padding: '14px 16px', borderRadius: 'var(--r-md)', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', textAlign: 'center' }}>
                  <p style={{ fontSize: 10, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 6px' }}>Break</p>
                  <p style={{ fontSize: 16, fontWeight: 800, color: 'var(--t1)', margin: 0 }}>{strategy.breakActivity}</p>
                </div>
              </div>
              {strategy.warningFlag && (
                <div style={{ padding: '12px 16px', borderRadius: 'var(--r-md)', background: 'rgba(255,107,107,0.05)', border: '1px solid rgba(255,107,107,0.2)', display: 'flex', gap: 10, alignItems: 'center' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#ff6b6b' }}>warning</span>
                  <p style={{ fontSize: 13.5, color: '#ff6b6b', margin: 0, fontWeight: 600 }}>{strategy.warningFlag}</p>
                </div>
              )}
              {strategy.message && (
                <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: 16 }}>
                  <p style={{ fontSize: 14.5, fontStyle: 'italic', color: 'var(--t3)', textAlign: 'center', margin: 0, lineHeight: 1.5 }}>"{strategy.message}"</p>
                </div>
              )}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '36px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 38, color: 'var(--s6)', display: 'block' }}>tune</span>
              <p style={{ fontSize: 14.5, color: 'var(--t3)', margin: 0, lineHeight: 1.6 }}>{todayCI ? 'No AI coaching generated yet.' : 'Complete your Daily Calibration to generate a tactical strategy.'}</p>
            </div>
          )}
        </div>

        {/* RIGHT: Performance Insights */}
        <div className="card card-hover" style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(167, 139, 250, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(167, 139, 250, 0.15)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#a78bfa', fontVariationSettings: "'FILL' 1" }}>insights</span>
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 10.5, fontWeight: 900, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.12em', margin: 0 }}>Telemetry Analysis</p>
              <h4 style={{ fontSize: 18, fontWeight: 800, color: 'var(--t1)', margin: '2px 0 0', letterSpacing: '-0.01em' }}>Performance Insights</h4>
            </div>
            {ins?.score != null && (
              <div style={{ textAlign: 'center', padding: '6px 14px', borderRadius: 'var(--r-md)', background: ins.score >= 70 ? 'rgba(9,205,131,0.08)' : ins.score >= 40 ? 'rgba(233,205,110,0.08)' : 'rgba(255,107,107,0.08)', border: `1px solid ${ins.score >= 70 ? 'rgba(9,205,131,0.2)' : ins.score >= 40 ? 'rgba(233,205,110,0.2)' : 'rgba(255,107,107,0.2)'}` }}>
                <p style={{ fontSize: 20, fontWeight: 800, color: ins.score >= 70 ? 'var(--p)' : ins.score >= 40 ? '#e9cd6e' : '#ff6b6b', margin: 0, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{ins.score}</p>
                <p style={{ fontSize: 9, fontWeight: 700, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '3px 0 0' }}>Score</p>
              </div>
            )}
          </div>

          {ins ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Strengths & Improvements Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ padding: '14px 16px', borderRadius: 'var(--r-md)', background: 'rgba(9,205,131,0.02)', borderLeft: '3px solid var(--p)', border: '1px solid rgba(9,205,131,0.08)', borderLeftColor: 'var(--p)' }}>
                  <p style={{ fontSize: 10.5, fontWeight: 900, color: 'var(--p)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 8px' }}>✦ Strengths</p>
                  {(ins.strengths || []).slice(0, 3).map((s, i) => <p key={i} style={{ fontSize: 13, color: 'var(--t2)', lineHeight: 1.55, margin: '0 0 5px' }}>• {s}</p>)}
                </div>
                <div style={{ padding: '14px 16px', borderRadius: 'var(--r-md)', background: 'rgba(233,205,110,0.02)', borderLeft: '3px solid #e9cd6e', border: '1px solid rgba(233,205,110,0.08)', borderLeftColor: '#e9cd6e' }}>
                  <p style={{ fontSize: 10.5, fontWeight: 900, color: '#e9cd6e', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 8px' }}>↗ Improve</p>
                  {(ins.improvements || []).slice(0, 3).map((s, i) => <p key={i} style={{ fontSize: 13, color: 'var(--t2)', lineHeight: 1.55, margin: '0 0 5px' }}>• {s}</p>)}
                </div>
              </div>

              {/* Prediction */}
              {ins.prediction && (
                <div style={{ padding: '12px 16px', borderRadius: 'var(--r-md)', background: 'rgba(96,165,250,0.05)', border: '1px solid rgba(96,165,250,0.12)' }}>
                  <p style={{ fontSize: 13.5, color: 'var(--t2)', margin: 0, lineHeight: 1.6 }}><span style={{ fontWeight: 800, color: '#60a5fa' }}>📈 </span>{ins.prediction}</p>
                </div>
              )}

              {/* Weekly Focus */}
              {ins.weeklyFocus && (
                <div style={{ padding: '12px 16px', borderRadius: 'var(--r-md)', background: 'rgba(167,139,250,0.04)', border: '1px solid rgba(167,139,250,0.12)' }}>
                  <p style={{ fontSize: 10, fontWeight: 800, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 6px' }}>🎯 Weekly Focus</p>
                  <p style={{ fontSize: 13.5, color: 'var(--t2)', margin: 0, lineHeight: 1.6 }}>{ins.weeklyFocus}</p>
                </div>
              )}

              {/* Next Steps */}
              {ins.nextSteps?.length > 0 && (
                <div style={{ padding: '12px 16px', borderRadius: 'var(--r-md)', background: 'rgba(9,205,131,0.03)', border: '1px solid rgba(9,205,131,0.1)' }}>
                  <p style={{ fontSize: 10, fontWeight: 800, color: 'var(--p)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 8px' }}>⚡ Action Items</p>
                  {ins.nextSteps.slice(0, 3).map((s, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 5 }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--p)', minWidth: 18, height: 18, borderRadius: 5, background: 'rgba(9,205,131,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>{i + 1}</span>
                      <p style={{ fontSize: 13, color: 'var(--t2)', margin: 0, lineHeight: 1.55 }}>{s}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Encouragement */}
              {ins.encouragement && (
                <div style={{ borderLeft: '3px solid rgba(9,205,131,0.25)', paddingLeft: 16, padding: '10px 16px' }}>
                  <p style={{ fontSize: 14, fontStyle: 'italic', color: 'var(--t2)', lineHeight: 1.65, margin: 0 }}>"{ins.encouragement}"</p>
                </div>
              )}

              {/* Burnout Risk */}
              {ins.burnoutRisk && ins.burnoutRisk !== 'low' && (
                <div style={{ padding: '12px 16px', borderRadius: 'var(--r-md)', background: ins.burnoutRisk === 'high' ? 'rgba(255,107,107,0.06)' : 'rgba(251,146,60,0.06)', border: `1px solid ${ins.burnoutRisk === 'high' ? 'rgba(255,107,107,0.2)' : 'rgba(251,146,60,0.2)'}`, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18, color: ins.burnoutRisk === 'high' ? '#ff6b6b' : '#fb923c', flexShrink: 0, marginTop: 1 }}>warning</span>
                  <div>
                    <p style={{ fontSize: 13.5, color: ins.burnoutRisk === 'high' ? '#ff6b6b' : '#fb923c', margin: 0, fontWeight: 700 }}>Burnout Status: <strong>{ins.burnoutRisk}</strong></p>
                    {ins.burnoutDetail && <p style={{ fontSize: 12.5, color: 'var(--t3)', margin: '4px 0 0', lineHeight: 1.5 }}>{ins.burnoutDetail}</p>}
                  </div>
                </div>
              )}
            </div>
          ) : loading ? null : (
            <p style={{ fontSize: 14, color: 'var(--t4)', textAlign: 'center', padding: 16 }}>No insights generated yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Daily Report Modal ─────────────────────────
function ReportModal({ data, onClose }) {
  const { progress, tasks, notes, videos } = useApp();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!AI.enabled()) {
      setErr('Please add your API key in Settings to unlock the Report feature.');
      return;
    }
    setLoading(true);
    generateDailyReport(data, { progress, tasks, notes, videos })
      .then(r => { if (r) setReport(r); else setErr('Failed to generate report.'); })
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false));
  }, [data]);

  const gradeColor = (g) => {
    if (g.startsWith('A')) return '#10b981';
    if (g.startsWith('B')) return '#3b82f6';
    if (g.startsWith('C')) return '#e9cd6e';
    if (g.startsWith('D')) return '#f97316';
    return '#ff6b6b';
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', background: 'var(--overlay)', animation: 'modalFadeIn 220ms ease both' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 600, maxHeight: '90vh', display: 'flex', flexDirection: 'column', background: 'var(--s2)', border: '1px solid var(--card-b-h)', borderRadius: 'var(--r-xl)', boxShadow: 'var(--modal-sh)', animation: 'scaleIn 340ms var(--bounce) both' }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0, background: 'rgba(255,255,255,0.01)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20, color: 'var(--p)', fontVariationSettings: "'FILL' 1" }}>history_edu</span>
            <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--t1)' }}>Daily Report Card</span>
          </div>
          <button onClick={onClose} className="icon-btn"><span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span></button>
        </div>

        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 20, overflowY: 'auto' }}>
          {err ? (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 40, color: 'var(--danger)', marginBottom: 12 }}>error</span>
              <p style={{ color: 'var(--t2)', fontSize: 14 }}>{err}</p>
            </div>
          ) : loading || !report ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', gap: 16 }}>
              <div className="spinner" style={{ width: 30, height: 30, borderWidth: 3, borderColor: 'var(--p) transparent var(--p) transparent' }} />
              <p style={{ color: 'var(--t3)', fontSize: 13, fontWeight: 700 }}>Evaluating your performance...</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24, animation: 'fadeIn 400ms ease' }}>

              {/* Header / Grade */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '20px', background: 'var(--s3)', borderRadius: 'var(--r-lg)', border: '1px solid var(--surface-b)' }}>
                <div style={{ width: 80, height: 80, borderRadius: 20, background: gradeColor(report.grade) + '15', border: `2px solid ${gradeColor(report.grade)}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 36, fontWeight: 900, color: gradeColor(report.grade), letterSpacing: '-0.05em' }}>{report.grade}</span>
                </div>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--t1)', marginBottom: 6 }}>{report.score}/100 Score</h3>
                  <p style={{ fontSize: 13, color: 'var(--t2)', lineHeight: 1.5 }}>{report.summary}</p>
                </div>
              </div>

              {/* Metrics */}
              <div>
                <h4 style={{ fontSize: 12, fontWeight: 800, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Core Metrics</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
                  {Object.entries(report.metrics || {}).map(([k, v]) => (
                    <div key={k} style={{ padding: '12px', background: 'var(--s1)', borderRadius: 'var(--r-md)', border: '1px solid var(--surface-b)' }}>
                      <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{k}</p>
                      <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--t2)' }}>{v}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Achievements & Missed */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                <div style={{ padding: '16px', background: 'rgba(16,185,129,0.05)', borderRadius: 'var(--r-md)', border: '1px solid rgba(16,185,129,0.15)' }}>
                  <h4 style={{ fontSize: 12, fontWeight: 800, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Achievements</h4>
                  <ul style={{ margin: 0, paddingLeft: 20, color: 'var(--t2)', fontSize: 13, lineHeight: 1.6 }}>
                    {report.achievements?.map((a, i) => <li key={i}>{a}</li>)}
                  </ul>
                </div>
                <div style={{ padding: '16px', background: 'rgba(255,107,107,0.05)', borderRadius: 'var(--r-md)', border: '1px solid rgba(255,107,107,0.15)' }}>
                  <h4 style={{ fontSize: 12, fontWeight: 800, color: '#ff6b6b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Needs Work</h4>
                  <ul style={{ margin: 0, paddingLeft: 20, color: 'var(--t2)', fontSize: 13, lineHeight: 1.6 }}>
                    {report.missedOpportunities?.map((a, i) => <li key={i}>{a}</li>)}
                  </ul>
                </div>
              </div>

              {/* Action Plan */}
              <div style={{ padding: '16px', background: 'rgba(59,130,246,0.05)', borderRadius: 'var(--r-md)', border: '1px solid rgba(59,130,246,0.15)' }}>
                <h4 style={{ fontSize: 12, fontWeight: 800, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}><span className="material-symbols-outlined" style={{ fontSize: 15 }}>calendar_today</span> Tomorrow's Action Plan</h4>
                <ul style={{ margin: 0, paddingLeft: 20, color: 'var(--t2)', fontSize: 13, lineHeight: 1.6 }}>
                  {report.tomorrowActionPlan?.map((a, i) => <li key={i}>{a}</li>)}
                </ul>
              </div>

            </div>
          )}
        </div>

        {report && !loading && (
          <div style={{ padding: '16px 24px', borderTop: '1px solid var(--surface-b)', background: 'var(--s1)', textAlign: 'center' }}>
            <button onClick={onClose} className="btn btn-surface" style={{ padding: '10px 30px', fontWeight: 700 }}>Close Report</button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────
// ── Main ──────────────────────────────────────
export default function Progress() {
  const { progress, tasks, notes, videos, allAchs, checkIns, todayCI, burnout, A } = useApp();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const location = useLocation();
  const [tab, setTab] = useState(() => {
    const saved = localStorage.getItem('los_progress_tab');
    if (saved) return saved;
    const initialTab = location.state?.tab || 'overview';
    return initialTab === 'subjects' ? 'insights' : initialTab;
  });

  useEffect(() => {
    localStorage.setItem('los_progress_tab', tab);
  }, [tab]);

  // Daily Calibration State Variables
  const [calTab, setCalTab]       = useState('checkin');
  const [mood, setMood]           = useState(todayCI?.mood || 3);
  const [energy, setEnergy]       = useState(todayCI?.energy || 6);
  const [sleep, setSleep]         = useState(todayCI?.sleepHours || 7);
  const [stress, setStress]       = useState(todayCI?.stressLevel || 4);
  const [focusMode, setFocusMode] = useState(todayCI?.focusMode || 'Deep Work');
  const [objective, setObjective] = useState(todayCI?.mainObjective || '');
  const [coaching, setCoaching]   = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [calDone, setCalDone]     = useState(!!todayCI);

  const bc = BURNOUT_CFG[burnout] || BURNOUT_CFG.low;

  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return checkIns?.find(c => c.date?.slice(0, 10) === d.toISOString().slice(0, 10)) || null;
  });

  const pendingTasksCount = useMemo(() => tasks.filter(t => t.status === 'pending').length, [tasks]);

  const calSubmit = async () => {
    const data = { mood, energy, sleepHours: sleep, stressLevel: stress, focusMode, mainObjective: objective };
    PersonalizationEngine.setMood(mood);
    const today = new Date().toDateString();
    for (let i = 1; i <= 5; i++) {
      localStorage.removeItem(`aura_briefing_${today}_m${i}`);
    }

    if (AI.enabled()) {
      setAiLoading(true);
      try {
        const pendingTasks = tasks.filter(t => t.status === 'pending').map(t => t.title);
        const r = await moodCoaching({ ...data, tasks: pendingTasks });
        if (r) {
          const msg = typeof r === 'string' ? r : [r.greeting, r.message].filter(Boolean).join(' ');
          setCoaching({ ...r, message: msg });
          data.aiCoaching = msg;
          data.aiStrategy = JSON.stringify(r);
        }
      } finally {
        setAiLoading(false);
      }
    }

    A.checkin.add(data);
    setCalDone(true);
    toast.success('Calibration complete!');
    setCalTab('history');
  };

  const calAvg = key => checkIns?.length
    ? (checkIns.slice(0, 7).reduce((a, c) => a + (c[key] || 0), 0) / Math.min(checkIns.length, 7)).toFixed(1)
    : '—';

  const renderSubmitButton = (fullWidth = false) => (
    <motion.button
      onClick={calSubmit}
      disabled={aiLoading}
      whileHover={{ scale: 1.02, boxShadow: calDone ? '0 12px 28px rgba(0,0,0,0.35)' : '0 12px 28px rgba(0,200,150,0.55)' }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 350, damping: 14 }}
      style={{
        width: fullWidth ? '100%' : 176,
        height: fullWidth ? 50 : 96,
        borderRadius: fullWidth ? '12px' : '0 0 88px 88px',
        background: aiLoading
          ? 'var(--s4)'
          : calDone
            ? 'rgba(255,255,255,0.12)'
            : 'linear-gradient(180deg, #1de9b6 0%, #00897b 100%)',
        border: calDone && !aiLoading
          ? '1px solid rgba(255,255,255,0.25)'
          : 'none',
        backdropFilter: calDone ? 'blur(12px)' : 'none',
        WebkitBackdropFilter: calDone ? 'blur(12px)' : 'none',
        boxShadow: aiLoading
          ? 'none'
          : calDone
            ? '0 8px 24px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.15)'
            : '0 8px 24px rgba(0,200,150,0.40), inset 0 1px 0 rgba(255,255,255,0.20)',
        cursor: aiLoading ? 'wait' : 'pointer',
        display: 'flex',
        flexDirection: fullWidth ? 'row' : 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: fullWidth ? 8 : 4,
        transformOrigin: 'top center',
      }}
    >
      {aiLoading ? (
        <div className="spinner" style={{ width: fullWidth ? 18 : 24, height: fullWidth ? 18 : 24, borderWidth: 2.5, borderColor: 'rgba(255,255,255,0.35)', borderTopColor: 'white' }} />
      ) : (
        <span className="material-symbols-outlined" style={{ fontSize: fullWidth ? 20 : 26, color: calDone ? 'rgba(255,255,255,0.85)' : 'white', fontVariationSettings: "'FILL' 1" }}>{calDone ? 'refresh' : 'auto_awesome'}</span>
      )}
      <span style={{
        fontSize: fullWidth ? 13 : 12.5,
        fontWeight: 900,
        color: calDone ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.95)',
        textTransform: 'uppercase',
        letterSpacing: '0.12em',
      }}>
        {aiLoading ? 'Loading…' : calDone ? 'Recalibrate' : 'Initialize'}
      </span>
    </motion.button>
  );

  // Sync tab if location state changes (e.g. clicking Badges while on Progress page)
  useEffect(() => {
    if (location.state?.tab) {
      setTab(location.state.tab === 'subjects' ? 'insights' : location.state.tab);
    }
  }, [location.state]);
  const [showReport, setShowReport] = useState(false);
  const [cat, setCat] = useState('All');
  const [selectedAch, setSelectedAch] = useState(null);

  const weekData = DAYS.map((d, i) => ({ d, v: progress?.weeklyHours?.[i] ?? 0 }));
  const avg = useMemo(() => overallProgress(progress?.subjects), [progress?.subjects]);
  const subList = Object.entries(progress?.subjects || {});

  const reportData = {
    streak: progress?.streak || 0,
    focusHoursThisWeek: progress?.thisWeekHours || 0,
    pendingTasks: tasks.filter(t => t.status === 'pending').map(t => t.title),
    completedTasks: tasks.filter(t => t.status === 'completed').length,
    totalNotes: notes?.length || 0,
    watchedVideos: videos?.filter(v => v.watched).length || 0
  };

  return (
    <div className="page">
      <style>{`@keyframes barPop{ from{opacity:0;transform:scaleY(0.2)} to{opacity:1;transform:scaleY(1)} }`}</style>

      <div className="fadeup" style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'flex-start', flexWrap: 'wrap', gap: 'var(--gap)', flexDirection: isMobile ? 'column' : 'row' }}>
        <div>
          <h1 className="shimmer-text page-title">Progress</h1>
          <p style={{ fontSize: 13, color: 'var(--t3)', marginTop: 4 }}>Your complete learning picture</p>
        </div>
        <button onClick={() => setShowReport(true)} className="btn" style={{ display: 'flex', gap: 'var(--gap-xs)', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, rgba(167, 139, 250, 0.15), rgba(124, 58, 237, 0.05))', border: '1px solid rgba(167, 139, 250, 0.3)', color: '#a78bfa', padding: isMobile ? '10px 16px' : '10px 20px', borderRadius: 'var(--r-md)', fontWeight: 700, fontSize: isMobile ? 12 : 13, boxShadow: 'var(--sh)', width: isMobile ? '100%' : 'auto' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>summarize</span> Generate Daily Report
        </button>
      </div>

      {/* Tab bar */}
      <div className="fadeup d1" style={{ display: 'flex', gap: 'var(--gap-xs)', padding: '4px', background: 'var(--s2)', border: '1px solid rgba(9,205,131,0.07)', borderRadius: 'var(--r-lg)', marginBottom: 0, width: isMobile ? '100%' : 'fit-content', maxWidth: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        {['overview', 'calibration', 'insights', 'badges'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: isMobile ? '8px 12px' : '8px 18px', borderRadius: 'var(--r-md)', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: isMobile ? 12.5 : 14, textTransform: 'capitalize', background: tab === t ? 'var(--s4)' : 'transparent', color: tab === t ? 'var(--p)' : 'var(--t3)', transition: 'all 200ms var(--bounce)', whiteSpace: 'nowrap', flexShrink: 0 }}>
            {t === 'calibration' ? (isMobile ? 'Calibration' : 'Daily Calibration') : t === 'insights' ? (isMobile ? 'AI Insights' : 'AI Insights & Strategy') : t}
          </button>
        ))}
      </div>

      {/* OVERVIEW */}
      {tab === 'overview' && <>
        {/* Mastery ring + stats */}
        <div className="card fadeup d2 mastery-overview-card" style={{ padding: 'var(--card-padding, 24px)', display: 'flex', alignItems: 'center', gap: 'var(--gap-page)', flexWrap: 'wrap' }}>
          <Ring pct={avg} size={isMobile ? 120 : 170} stroke={isMobile ? 8 : 11}>
            <p style={{ fontSize: isMobile ? 26 : 38, fontWeight: 800, color: 'var(--t1)', letterSpacing: '-0.03em', lineHeight: 1 }}><Counter value={avg} suffix="%" /></p>
            <p style={{ fontSize: isMobile ? 9 : 11, fontWeight: 700, color: 'var(--p)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: isMobile ? 3 : 5 }}>Overall Mastery</p>
            {progress?.streak > 3 && !isMobile && <p style={{ fontSize: 11, color: 'var(--t4)', marginTop: 3 }}>Flow state reached</p>}
          </Ring>
          <div style={{ flex: 1, minWidth: 180 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
              <div className="pulse-dot" />
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--p)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Daily Goal Reached</p>
            </div>
            <h3 style={{ fontSize: 'clamp(1.05rem, 2.5vw, 1.4rem)', fontWeight: 800, color: 'var(--t1)', letterSpacing: '-0.025em', marginBottom: 6 }}>Your Progress</h3>
            <p style={{ fontSize: 14.5, color: 'var(--t3)', marginBottom: 16, lineHeight: 1.6 }}>{progress?.streak > 3 ? `You've reached flow state for ${progress.streak} consecutive days.` : 'Build consistency to reach your flow state.'}</p>
            <div className="grid-4">
              {[
                { l: 'Total Hours', v: progress?.totalHours || 0, c: 'var(--p)', s: 'h' },
                { l: 'Streak', v: progress?.streak || 0, c: 'var(--warn)', s: 'd' },
                { l: 'Tasks Done', v: progress?.tasksCompleted || 0, c: '#60a5fa' },
                { l: 'Best Streak', v: progress?.bestStreak || 0, c: '#a78bfa', s: 'd' },
              ].map(({ l, v, c, s }) => (
                <div key={l} style={{ textAlign: 'center', padding: isMobile ? '8px 4px' : '10px 6px', borderRadius: 'var(--r-md)', background: 'var(--s3)' }}>
                  <p style={{ fontSize: isMobile ? 17 : 20, fontWeight: 800, color: c, lineHeight: 1 }}><Counter value={v} suffix={s} /></p>
                  <p style={{ fontSize: isMobile ? 10 : 11.5, color: 'var(--t4)', marginTop: 3 }}>{l}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Activity bars */}
        <div className="card fadeup d3" style={{ padding: isMobile ? 16 : 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <p className="section-label" style={{ marginBottom: 3 }}>Activity Velocity</p>
              <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--t2)' }}>Weekly Focus Distribution</p>
            </div>
          </div>
          <PillBars data={weekData} total={progress?.thisWeekHours || 0} />
        </div>

        {/* Streak grid */}
        <div className="card fadeup d4" style={{ padding: isMobile ? 16 : 22 }}>
          <div className="card-header-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <p className="section-label" style={{ marginBottom: 3 }}>Consistency</p>
              <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--t2)' }}>Last 28 Days</p>
            </div>
            <div style={{ display: 'flex', gap: 'var(--gap)' }}>
              <div style={{ textAlign: 'right' }}><p style={{ fontSize: 24, fontWeight: 800, color: 'var(--warn)', letterSpacing: '-0.02em' }}>🔥 {progress?.streak || 0}</p><p style={{ fontSize: 11, color: 'var(--t4)' }}>Current</p></div>
              <div style={{ textAlign: 'right' }}><p style={{ fontSize: 24, fontWeight: 800, color: 'var(--p)', letterSpacing: '-0.02em' }}>{progress?.bestStreak || 0}</p><p style={{ fontSize: 11, color: 'var(--t4)' }}>Best</p></div>
            </div>
          </div>
          <StreakGrid streak={progress?.streak || 0} />
        </div>

        {/* Subject Breakdown - Academic Mastery Section */}
        <div className="card card-hover fadeup d5" style={{ padding: isMobile ? '16px 16px' : '28px 32px', display: 'flex', flexDirection: 'column', gap: isMobile ? 14 : 20 }}>
          <div className="card-header-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(9, 205, 131, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(9, 205, 131, 0.15)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--p)', fontVariationSettings: "'FILL' 1" }}>school</span>
              </div>
              <div>
                <p style={{ fontSize: 10.5, fontWeight: 900, color: 'var(--p)', textTransform: 'uppercase', letterSpacing: '0.12em', margin: 0 }}>Subject Masteries</p>
                <h4 style={{ fontSize: isMobile ? 15 : 18, fontWeight: 800, color: 'var(--t1)', margin: '2px 0 0', letterSpacing: '-0.01em' }}>{isMobile ? 'Academic Velocity' : 'Academic Velocity & Course Breakdown'}</h4>
              </div>
            </div>
            <div style={{ display: 'flex', gap: isMobile ? 8 : 12, alignItems: 'center', fontSize: isMobile ? 11.5 : 13, color: 'var(--t3)', flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--t4)' }}>schedule</span>
                <strong>{subList.reduce((acc, [, d]) => acc + (d.hoursStudied || 0), 0)} hrs</strong> total
              </span>
              <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--t4)' }} />
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--t4)' }}>task_alt</span>
                <strong>{subList.reduce((acc, [, d]) => acc + (d.tasksCompleted || 0), 0)} tasks</strong> done
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {subList.length > 0 ? (
              subList.map(([sub, data]) => {
                const c = SUBJECT_COLORS[sub] || 'var(--p)';
                return (
                  <div key={sub} className="tilt-card" style={{ transition: 'transform 0.2s ease' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: c, boxShadow: `0 0 6px ${c}` }} />
                        <p style={{ fontSize: isMobile ? 13.5 : 15, fontWeight: 700, color: 'var(--t1)', margin: 0 }}>{sub}</p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 12.5, color: 'var(--t4)', whiteSpace: 'nowrap' }}>{data.hoursStudied}h · {data.tasksCompleted} tasks</span>
                        <span style={{ fontSize: 12, fontWeight: 700, padding: '2px 9px', borderRadius: 99, background: `${c}14`, color: c, border: `1px solid ${c}25`, whiteSpace: 'nowrap', flexShrink: 0 }}>{data.trend || '+0%'}</span>
                        <span style={{ fontSize: 19, fontWeight: 800, color: c, letterSpacing: '-0.02em', minWidth: 44, textAlign: 'right', flexShrink: 0 }}><Counter value={data.progress} suffix="%" /></span>
                      </div>
                    </div>
                    <div className="progress-track" style={{ height: 6, background: 'var(--s3)' }}>
                      <div className="progress-fill" style={{ width: `${data.progress}%`, background: `linear-gradient(90deg, color-mix(in srgb, ${c} 40%, transparent), ${c})`, boxShadow: `0 0 8px color-mix(in srgb, ${c} 25%, transparent)` }} />
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <p style={{ fontSize: 14, color: 'var(--t4)' }}>No subject data yet. Start your first focus session!</p>
              </div>
            )}
          </div>
        </div>
      </>}

      {/* DAILY CALIBRATION */}
      {tab === 'calibration' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: -6 }}>
          {/* Sub Navigation */}
          <div className="glass-sm animate-fade-in" style={{ display: 'flex', gap: 5, padding: 5, marginBottom: 0, overflowX: 'auto', position: 'relative', zIndex: 10, width: 'fit-content', borderRadius: 'var(--r-md)' }}>
            {[
              { id: 'checkin', icon: 'tune', label: 'Calibration Check-in' },
              { id: 'history', icon: 'analytics', label: 'Analytics' },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setCalTab(t.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 14px',
                  borderRadius: 'var(--r-sm)',
                  border: 'none',
                  background: calTab === t.id ? 'var(--s3)' : 'transparent',
                  color: calTab === t.id ? 'var(--p)' : 'var(--t3)',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: 13,
                  transition: 'all 200ms ease',
                  whiteSpace: 'nowrap'
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 17 }}>{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>

          {/* Sub Panels */}
          {calTab === 'checkin' && (
            <div className="fadeup" style={{ 
              position: 'relative', 
              display: 'flex', 
              flexDirection: isMobile ? 'column' : 'row',
              gap: 16, 
              alignItems: isMobile ? 'stretch' : 'stretch', 
              minHeight: isMobile ? 'auto' : 520 
            }}>

              {/* ── BOOKMARK BUTTON — absolutely centred at top seam (Desktop only) ── */}
              {!isMobile && (
                <div style={{
                  position: 'absolute',
                  top: -1,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  zIndex: 20,
                }}>
                  {renderSubmitButton(false)}
                </div>
              )}

              {/* ── LEFT CARD: Biometrics ── */}
              <div className="card" style={{
                flex: 1,
                padding: isMobile ? '18px 20px 22px 20px' : '24px 28px 28px 28px',
                display: 'flex',
                flexDirection: 'column',
                gap: isMobile ? 18 : 24,
                borderRadius: 'var(--r-lg)',
              }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: isMobile ? 22 : 26, color: 'var(--p)' }}>monitor_heart</span>
                  <span style={{ fontSize: isMobile ? 19 : 23, fontWeight: 900, color: 'var(--t1)', letterSpacing: '-0.01em' }}>Biometrics</span>
                </div>

                {/* Mood Grid */}
                <div>
                  <p style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Current Mood</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: isMobile ? 6 : 8 }}>
                    {MOODS.map(m => {
                      const isActive = mood === m.v;
                      return (
                        <button
                          key={m.v}
                          onClick={() => setMood(m.v)}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: isMobile ? 4 : 6,
                            padding: isMobile ? '10px 4px' : '12px 6px',
                            borderRadius: 12,
                            border: `1.5px solid ${mood === m.v ? m.c : 'rgba(255,255,255,0.06)'}`,
                            background: mood === m.v ? `${m.c}12` : 'var(--s2)',
                            boxShadow: mood === m.v ? `0 0 14px ${m.c}25` : 'none',
                            cursor: 'pointer',
                            transition: 'all 200ms ease',
                          }}
                        >
                          <span style={{ fontSize: isMobile ? 26 : 32, filter: mood !== m.v ? 'grayscale(100%) opacity(35%)' : 'none', transition: 'filter 200ms' }}>{m.e}</span>
                          <span style={{ 
                            fontSize: isMobile ? 9.5 : 12.5, 
                            fontWeight: 800, 
                            color: mood === m.v ? m.c : 'var(--t4)', 
                            textTransform: 'uppercase', 
                            letterSpacing: '0.04em',
                            display: isMobile && !isActive ? 'none' : 'block'
                          }}>{m.l}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Sliders */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 16 : 20 }}>
                  <Slider icon="bolt" label="Energy Level" val={energy} onChange={setEnergy} min={1} max={10} color={energy >= 7 ? 'var(--p)' : energy >= 4 ? '#e9cd6e' : '#ff6b6b'} />
                  <Slider icon="bedtime" label="Sleep Duration" val={sleep} onChange={setSleep} min={3} max={12} step={0.5} color={sleep >= 7 ? '#60a5fa' : sleep >= 5 ? '#e9cd6e' : '#ff6b6b'} />
                  <Slider icon="vital_signs" label="Stress Level" val={stress} onChange={setStress} min={1} max={10} color={stress <= 4 ? 'var(--p)' : stress <= 7 ? '#e9cd6e' : '#ff6b6b'} />
                </div>
              </div>

              {/* ── RIGHT CARD: Daily Intentions ── */}
              <div className="card" style={{
                flex: 1,
                padding: isMobile ? '18px 20px 22px 20px' : '24px 28px 28px 28px',
                display: 'flex',
                flexDirection: 'column',
                gap: isMobile ? 18 : 24,
                borderRadius: 'var(--r-lg)',
              }}>
                {/* Header — padded left to clear the centre button (button is 176px, so 88px each side) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingLeft: isMobile ? 0 : 96 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: isMobile ? 22 : 26, color: 'var(--p)' }}>flag</span>
                  <span style={{ fontSize: isMobile ? 19 : 23, fontWeight: 900, color: 'var(--t1)', letterSpacing: '-0.01em' }}>Daily Intentions</span>
                </div>

                {/* Main Objective */}
                <div>
                  <p style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12, paddingLeft: isMobile ? 0 : 24 }}>Main Objective</p>
                  <textarea
                    className="input"
                    placeholder="What is the #1 thing you want to accomplish?"
                    value={objective}
                    onChange={e => setObjective(e.target.value)}
                    rows={isMobile ? 3 : 4}
                    style={{
                      width: '100%',
                      padding: '14px 16px',
                      background: 'var(--s2)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      resize: 'none',
                      fontSize: 16,
                      lineHeight: 1.6,
                      color: 'var(--t1)',
                      borderRadius: 12,
                    }}
                  />
                </div>

                {/* Target Focus Mode */}
                <div>
                  <p style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Target Focus Mode</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {FOCUS_MODES.map(f => {
                      const isActive = focusMode === f.id;
                      return (
                        <div
                          key={f.id}
                          onClick={() => setFocusMode(f.id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: isMobile ? '10px 14px' : '12px 16px',
                            borderRadius: 12,
                            background: isActive ? 'rgba(9,205,131,0.04)' : 'var(--s2)',
                            border: `1.5px solid ${isActive ? 'var(--p)' : 'rgba(255,255,255,0.05)'}`,
                            cursor: 'pointer',
                            transition: 'all 200ms ease',
                            boxShadow: isActive ? '0 0 12px rgba(9,205,131,0.08)' : 'none'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <span className="material-symbols-outlined" style={{
                              fontSize: isMobile ? 22 : 24,
                              color: isActive ? 'var(--p)' : 'var(--t4)',
                              fontVariationSettings: "'FILL' 1"
                            }}>
                              {f.icon}
                            </span>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                              <p style={{
                                fontSize: isMobile ? 14.5 : 16,
                                fontWeight: 800,
                                color: isActive ? 'var(--p)' : 'var(--t2)',
                                margin: 0
                              }}>
                                {f.id}
                              </p>
                              <p style={{
                                fontSize: isMobile ? 12 : 13.5,
                                color: isActive ? 'rgba(9,205,131,0.7)' : 'var(--t4)',
                                margin: 0,
                                lineHeight: 1.45
                              }}>
                                {f.desc}
                              </p>
                            </div>
                          </div>
                          {isActive && (
                            <span className="material-symbols-outlined" style={{
                              fontSize: 20,
                              color: 'var(--p)',
                              fontVariationSettings: "'FILL' 1"
                            }}>
                              check_circle
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* ── BOOKMARK BUTTON — full width at the bottom (Mobile only) ── */}
              {isMobile && (
                <div style={{ width: '100%', marginTop: 8 }}>
                  {renderSubmitButton(true)}
                </div>
              )}

            </div>
          )}

          {calTab === 'history' && (
            <div className="fadeup" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {/* Average Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 16 }}>
                {[
                  { label: 'Avg Mood', v: MOODS.find(m => m.v === Math.round(Number(calAvg('mood'))))?.e || '😐', c: 'var(--t1)' },
                  { label: 'Avg Energy', v: `${calAvg('energy')}/10`, c: 'var(--p)' },
                  { label: 'Avg Sleep', v: `${calAvg('sleepHours')} hrs`, c: '#60a5fa' },
                  { label: 'Avg Stress', v: `${calAvg('stressLevel')}/10`, c: '#ff6b6b' }
                ].map(s => (
                  <div key={s.label} className="card" style={{ padding: '20px 16px', textAlign: 'center' }}>
                    <p style={{ fontSize: 26, fontWeight: 900, color: s.c, margin: 0 }}>{s.v}</p>
                    <p style={{ fontSize: 13, color: 'var(--t4)', marginTop: 6, textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.04em' }}>{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Burnout Risk */}
              <div className="card card-hover" style={{ padding: '20px 24px', background: bc.bg, border: `1px solid ${bc.c}20`, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: `${bc.c}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${bc.c}28`, flexShrink: 0 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 24, color: bc.c, fontVariationSettings: "'FILL' 1" }}>{bc.icon}</span>
                </div>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <p style={{ fontSize: 11, fontWeight: 900, color: bc.c, textTransform: 'uppercase', letterSpacing: '0.12em', margin: 0 }}>System Health & Burnout Risk</p>
                  <p style={{ fontSize: 14.5, color: 'var(--t2)', margin: '4px 0 0', lineHeight: 1.6 }}>{bc.desc}</p>
                </div>
                {tasks.filter(t => t.status === 'pending' && t.deadline && new Date(t.deadline) < new Date()).length > 0 && (
                  <div style={{ padding: '8px 14px', borderRadius: 10, background: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.15)', display: 'flex', alignItems: 'center', gap: 6, color: '#fb923c', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>warning</span>
                    <span>{tasks.filter(t => t.status === 'pending' && t.deadline && new Date(t.deadline) < new Date()).length} overdue tasks</span>
                  </div>
                )}
              </div>

              {/* Logs */}
              <div className="card" style={{ padding: 24 }}>
                <h4 style={{ fontSize: 18, fontWeight: 800, color: 'var(--t1)', marginBottom: 18, letterSpacing: '-0.01em' }}>Biometric History Log</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {checkIns?.length > 0 ? (
                    checkIns.map((c, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', background: 'var(--s2)', borderRadius: 'var(--r-md)', border: '1px solid var(--surface-b)', gap: 16, flexWrap: 'wrap' }}>
                        <div>
                          <p style={{ fontSize: 15.5, fontWeight: 700, color: 'var(--t2)', margin: 0 }}>{new Date(c.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                          {c.mainObjective && <p style={{ fontSize: 14, color: 'var(--t4)', margin: '4px 0 0', lineHeight: 1.5 }}>"{c.mainObjective}"</p>}
                        </div>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                          <span style={{ fontSize: 24 }}>{MOODS.find(m => m.v === c.mood)?.e || '😐'}</span>
                          <span style={{ fontSize: 13.5, padding: '4px 10px', borderRadius: 99, background: 'var(--s3)', color: 'var(--p)', fontWeight: 700 }}>⚡ {c.energy}</span>
                          <span style={{ fontSize: 13.5, padding: '4px 10px', borderRadius: 99, background: 'var(--s3)', color: '#60a5fa', fontWeight: 700 }}>😴 {c.sleepHours}h</span>
                          <span style={{ fontSize: 13.5, padding: '4px 10px', borderRadius: 99, background: 'var(--s3)', color: '#ff6b6b', fontWeight: 700 }}>🔥 {c.stressLevel}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p style={{ fontSize: 15, color: 'var(--t4)', textAlign: 'center', padding: '24px 0' }}>No check-in history yet.</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}


      {/* INSIGHTS */}
      {tab === 'insights' && <div className="fadeup"><AuraIntelligencePanel data={{ subjects: progress?.subjects, weeklyHours: progress?.weeklyHours, streak: progress?.streak, totalHours: progress?.totalHours }} /></div>}

      {/* BADGES */}
      {tab === 'badges' && (
        <div className="fadeup">
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 20, paddingBottom: 4 }}>
            {CATS.map(c => (
              <button key={c} onClick={() => setCat(c)}
                style={{ padding: '7px 16px', borderRadius: 99, border: `1px solid ${cat === c ? 'var(--p)' : 'rgba(255,255,255,0.07)'}`, background: cat === c ? 'rgba(9,205,131,0.10)' : 'transparent', color: cat === c ? 'var(--p)' : 'var(--t3)', fontWeight: 700, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 180ms ease', flexShrink: 0 }}>
                {c}
                <span style={{ marginLeft: 5, padding: '1px 6px', borderRadius: 99, background: 'rgba(255,255,255,0.06)', fontSize: 11 }}>
                  {c === 'All' ? allAchs.length : allAchs.filter(a => a.cat === c).length}
                </span>
              </button>
            ))}
          </div>

          <div className="tilt-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: 12 }}>
            {(cat === 'All' ? allAchs : allAchs.filter(a => a.cat === cat)).map((ach, i) => (
              <div key={ach.id} className="fadeup tilt-card" style={{ animationDelay: `${i * 0.035}s` }}>
                <BadgeCard ach={ach} onClick={setSelectedAch} />
              </div>
            ))}
          </div>
        </div>
      )}

      {showReport && <ReportModal data={reportData} onClose={() => setShowReport(false)} />}
      {selectedAch && <DetailModal ach={selectedAch} onClose={() => setSelectedAch(null)} />}
    </div>
  );
}
