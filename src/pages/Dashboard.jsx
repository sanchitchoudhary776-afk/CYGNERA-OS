import { useState, useEffect, useMemo, useCallback, useRef, memo } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '@context/AuthContext';
import { useTheme } from '@context/ThemeContext';
import { useApp } from '@context/AppContext';
import { dailyBriefing, generateWeeklyDigest } from '@services/ai';
import { AI } from '@services/ai';
import { PersonalizationEngine } from '@services/personalization';
import { fmt, daysUntil, SUBJECT_COLORS } from '@utils';
import { usePremium, Counter, Reveal } from '@components/ui/PremiumUI';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function greeting(userName) {
  return PersonalizationEngine.getGreeting(userName);
}

// ── Circular Progress Ring ────────────────────
function RingProgress({ pct = 0, size = 160, stroke = 10, color = 'var(--p)', label = '', sublabel = '' }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(pct, 100) / 100) * c;
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--p-sub)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.25,0.46,0.45,0.94)' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        <p style={{ fontSize: size > 130 ? 28 : 20, fontWeight: 800, color: 'var(--t1)', lineHeight: 1, letterSpacing: '-0.03em', animation: 'numberUp 600ms 400ms ease both' }}>{Math.round(pct)}%</p>
        {label && <p style={{ fontSize: 10.5, fontWeight: 700, color, marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</p>}
        {sublabel && <p style={{ fontSize: 10, color: 'var(--t4)', marginTop: 2 }}>{sublabel}</p>}
      </div>
    </div>
  );
}

function ActivityBars({ data, total, compact = false }) {
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
    // Panoramic Dummy Extensions (0% and 100%)
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

  const chartRectRef = useRef(null);

  const handleMouseEnter = () => {
    if (chartRef.current) {
      chartRectRef.current = chartRef.current.getBoundingClientRect();
    }
  };

  const handleMouseMove = (e) => {
    let rect = chartRectRef.current;
    if (!rect && chartRef.current) {
      rect = chartRef.current.getBoundingClientRect();
      chartRectRef.current = rect;
    }
    if (!rect) return;
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const idx = Math.round(((x - 3) / 94) * (data.length - 1));
    setHoverIdx(Math.max(0, Math.min(data.length - 1, idx)));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, position: 'relative' }}>
      <div
        ref={chartRef}
        onMouseEnter={handleMouseEnter}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => { setHoverIdx(null); chartRectRef.current = null; }}
        style={{ position: 'relative', height: compact ? 150 : 210, width: '100%', marginTop: 10, background: isDark ? 'linear-gradient(180deg, #0B0E14 0%, #0D1117 100%)' : 'linear-gradient(180deg, #f8faf8 0%, #f0f4f0 100%)', borderRadius: compact ? 14 : 18, overflow: 'hidden', cursor: 'crosshair', border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'}`, boxShadow: isDark ? 'inset 0 0 60px rgba(0,0,0,0.8), 0 8px 32px rgba(0,0,0,0.4)' : 'inset 0 0 40px rgba(0,0,0,0.03), 0 4px 20px rgba(0,0,0,0.06)' }}
      >
        {/* Minimalist Technical Grid */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: `radial-gradient(${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.12)'} 1px, transparent 1px)`, backgroundSize: '24px 24px', zIndex: 0 }} />
        <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 50% 40%, ${isDark ? 'rgba(0,255,153,0.03)' : 'rgba(4,120,87,0.05)'} 0%, transparent 70%)`, zIndex: 0 }} />

        <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible', zIndex: 1 }}>
          <defs>
            <linearGradient id="cosmicGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={isDark ? '#00FF99' : '#065F46'} />
              <stop offset="100%" stopColor={isDark ? '#A78BFA' : '#6D28D9'} />
            </linearGradient>
            <linearGradient id="cosmicArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={isDark ? '#00FF99' : '#065F46'} stopOpacity={isDark ? 0.12 : 0.1} />
              <stop offset="100%" stopColor={isDark ? '#A78BFA' : '#6D28D9'} stopOpacity="0" />
            </linearGradient>
            <filter id="prismaticGlow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Micro-Dotted Ghost Performance Trace */}
          <path d={ghostPath} fill="none" stroke={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.12)'} strokeWidth="0.8" strokeDasharray="1,2" />

          {/* Area Fill - Full Panoramic */}
          <path d={`${currentPath} L 100,100 L 0,100 Z`} fill="url(#cosmicArea)" />

          {/* Prismatic Spline System - Enhanced Curve */}
          <path d={currentPath} fill="none" stroke="url(#cosmicGradient)" strokeWidth="5" strokeOpacity={isDark ? '0.15' : '0.2'} filter="url(#prismaticGlow)" />
          <path d={currentPath} fill="none" stroke="url(#cosmicGradient)" strokeWidth="2.5" strokeLinecap="round" />
          <path d={currentPath} fill="none" stroke={isDark ? '#fff' : '#065F46'} strokeWidth="0.4" strokeOpacity={isDark ? '0.25' : '0.15'} />

          {/* Base Floor Line */}
          <line x1="0" y1="99" x2="100" y2="99" stroke={isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.04)'} strokeWidth="0.5" />
        </svg>

        {/* Kinetic Glass Bead Slider — CSS transition (GPU-accelerated) */}
        {(() => {
          const activeIdx = hoverIdx !== null ? hoverIdx : todayIdx;
          const pt = interactionPts[activeIdx];
          const isSelection = hoverIdx !== null;
          const primaryColor = isSelection ? '#A78BFA' : '#00FF99';
          return (
            <div
              style={{
                position: 'absolute', width: 16, height: 16,
                borderRadius: '50%', zIndex: 10, pointerEvents: 'none',
                left: `${pt.x}%`,
                top: `${pt.y}%`,
                transform: 'translate(-50%, -50%)',
                transition: 'left 180ms ease-out, top 180ms ease-out',
                background: `radial-gradient(circle at 30% 30%, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.1) 40%, ${primaryColor}1a 100%)`,
                boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 15px ${primaryColor}33`,
                border: '1px solid rgba(255,255,255,0.4)',
              }}
            >
              {/* Spectral Core */}
              <div
                style={{
                  position: 'absolute', inset: 0, borderRadius: '50%', opacity: 0.3, zIndex: -1,
                  background: `linear-gradient(135deg, ${primaryColor} 0%, #A78BFA 100%)`,
                  transition: 'background 200ms ease'
                }}
              />
              {/* Specular Highlight Point */}
              <div style={{ position: 'absolute', top: '20%', left: '20%', width: 3, height: 3, borderRadius: '50%', background: '#fff', opacity: 0.8 }} />
            </div>
          );
        })()}

        {/* Snapping Tooltip — CSS transition (no AnimatePresence overhead) */}
        {hoverIdx !== null && (
          <div
            style={{
              position: 'absolute', width: 80, padding: '6px', borderRadius: 10,
              left: `${(hoverIdx / (data.length - 1)) * 94 + 3}%`,
              top: `${interactionPts[hoverIdx].y - 45}%`,
              transform: `translateX(${hoverIdx < 2 ? '0%' : hoverIdx > 4 ? '-100%' : '-50%'})`,
              transition: 'left 150ms ease-out, top 150ms ease-out',
              background: isDark ? 'rgba(11, 14, 20, 0.95)' : 'rgba(255,255,255,0.95)',
              border: isDark ? '1px solid rgba(0, 255, 153, 0.3)' : '1px solid rgba(4,120,87,0.2)', boxShadow: isDark ? '0 10px 30px rgba(0,0,0,0.8)' : '0 10px 30px rgba(0,0,0,0.1)',
              zIndex: 10, pointerEvents: 'none', textAlign: 'center',
              animation: 'fadeIn 120ms ease both'
            }}
          >
            <p style={{ fontSize: 9, fontWeight: 800, color: isDark ? '#00FF99' : '#047857', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 2 }}>{data[hoverIdx].d}</p>
            <p style={{ fontSize: 15, fontWeight: 900, color: 'var(--t1)' }}>{data[hoverIdx].v}<span style={{ fontSize: 10, opacity: 0.5, marginLeft: 2 }}>H</span></p>
          </div>
        )}
      </div>

      {/* Clean Typography */}
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 3%', marginTop: 12 }}>
        {data.map(({ d }, i) => {
          const isToday = i === todayIdx;
          const isHovered = i === hoverIdx;
          return (
            <div key={d} style={{ textAlign: 'center' }}>
              <span
                style={{
                  fontSize: 10,
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 900,
                  display: 'inline-block',
                  opacity: isHovered || isToday ? 1 : 0.2,
                  color: isHovered ? (isDark ? '#A78BFA' : '#7C3AED') : isToday ? (isDark ? '#00FF99' : '#047857') : 'var(--t4)',
                  transition: 'opacity 120ms ease, color 120ms ease'
                }}
              >
                {d.toUpperCase()}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Task Row ─────────────────────────────────
function TaskRow({ task, onComplete }) {
  const PCFG = { high: { c: '#ff6b6b', bg: 'rgba(255,107,107,0.08)' }, medium: { c: '#e9cd6e', bg: 'rgba(233,205,110,0.08)' }, low: { c: 'var(--p)', bg: 'rgba(9,205,131,0.08)' } };
  const p = PCFG[task.priority] || PCFG.medium;
  const days = daysUntil(task.deadline);
  const [done, setDone] = useState(false);

  const { triggerConfetti } = usePremium();

  const handleDone = (e) => {
    const rect = e.target.getBoundingClientRect();
    triggerConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
    setDone(true);
    setTimeout(() => onComplete(task.id), 600);
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '11px 14px', borderRadius: 'var(--r-md)',
      background: 'var(--s3)', border: `1px solid var(--card-b)`,
      borderLeft: `3px solid ${p.c}`,
      opacity: done ? 0 : 1, transform: done ? 'translateX(24px)' : 'none',
      transition: 'all 360ms ease',
    }}>
      <button onClick={handleDone}
        style={{ width: 22, height: 22, borderRadius: 7, border: `2px solid ${p.c}50`, background: done ? p.c : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, transition: 'all 200ms cubic-bezier(0.34,1.56,0.64,1)' }}>
        {done && <span className="material-symbols-outlined" style={{ fontSize: 13, color: '#fff', fontVariationSettings: "'FILL' 1" }}>check</span>}
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--t2)', lineHeight: 1.4 }}>{task.title}</p>
        <p style={{ fontSize: 11, color: 'var(--t4)', marginTop: 2 }}>{task.subject}</p>
      </div>
      {days !== null && (
        <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 99, background: days <= 0 ? 'rgba(255,107,107,0.12)' : days <= 2 ? 'rgba(233,205,110,0.12)' : 'rgba(255,255,255,0.05)', color: days <= 0 ? '#ff6b6b' : days <= 2 ? '#e9cd6e' : 'var(--t3)', flexShrink: 0 }}>
          {days <= 0 ? 'Due!' : days === 1 ? 'Tomorrow' : `${days}d`}
        </span>
      )}
    </div>
  );
}

// ── AI Briefing (Personalized) ───────────────
function AIBriefing({ user, progress, tasks, appState }) {
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const fetchedRef = useRef(false);
  const [isMinimized, setIsMinimized] = useState(() => window.innerWidth < 768);

  // Get current mood to use as cache-buster (new mood = new briefing)
  const currentMood = PersonalizationEngine.getMood();

  useEffect(() => {
    if (!AI.enabled() || fetchedRef.current) return;
    fetchedRef.current = true;

    // Trigger background student analysis on every dashboard load
    if (appState) PersonalizationEngine.analyzeStudent(appState);

    const today = new Date().toDateString();
    const moodKey = currentMood.level;
    const cacheKey = `aura_briefing_${today}_m${moodKey}`;
    const cachedMsg = localStorage.getItem(cacheKey);

    if (cachedMsg) {
      setMsg(cachedMsg);
      return;
    }

    setLoading(true);

    dailyBriefing({
      name: user?.name?.split(' ')[0] || 'Student',
      streak: progress?.streak || 0,
      tasks: (tasks || []).filter(t => t.status === 'pending').map(t => t.title),
      progress: 0 // Real scores are computed inside dailyBriefing now
    }, appState)
      .then(r => {
        if (r) {
          setMsg(r);
          localStorage.setItem(cacheKey, r);
        }
      })
      .catch(err => {
        console.error('[Aura] Briefing failed:', err);
        setMsg(`Aura is facing an issue: ${err.message || 'Unknown Connection Error'}. Please check the backend environment variables or console logs.`);
      })
      .finally(() => setLoading(false));
  }, [user?.name, progress?.streak, progress?.xp, tasks, currentMood.level]);

  if (!AI.enabled() && !msg) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{ padding: '12px', fontSize: '11px', color: 'var(--t4)', textAlign: 'center', background: 'var(--s1)', borderRadius: '12px', border: '1px dashed var(--card-b)' }}
      >
        AI Briefing unavailable. Please ensure GROQ_API_KEY is configured on the backend.
      </motion.div>
    );
  }

  return (
    <div
      className="fadeup"
      onClick={() => window.innerWidth < 768 && setIsMinimized(!isMinimized)}
      style={{
        position: 'relative',
        padding: window.innerWidth < 768 ? '12px 16px' : '20px 24px',
        borderRadius: 'var(--r-xl)',
        background: 'var(--s2)',
        border: '1px solid color-mix(in srgb, var(--p-blue) 25%, transparent)',
        display: 'flex',
        alignItems: 'center',
        gap: window.innerWidth < 768 ? 12 : 18,
        boxShadow: 'var(--sh-lg)',
        overflow: 'hidden',
        cursor: window.innerWidth < 768 ? 'pointer' : 'default',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
      }}
    >
      {/* Subtle Mesh Background (Theme Aware) */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(circle at 0% 0%, color-mix(in srgb, var(--p-blue) 5%, transparent), transparent 40%), radial-gradient(circle at 100% 100%, color-mix(in srgb, var(--p-purple) 5%, transparent), transparent 40%)',
        pointerEvents: 'none'
      }} />

      {/* AI Icon with Soft Pulse */}
      <div style={{ position: 'relative', flexShrink: 0, display: window.innerWidth < 768 && isMinimized ? 'none' : 'block' }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12,
          background: 'color-mix(in srgb, var(--p-blue) 10%, transparent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '1px solid color-mix(in srgb, var(--p-blue) 20%, transparent)',
          zIndex: 1, position: 'relative'
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 20, color: 'var(--p-blue)', fontVariationSettings: "'FILL' 1" }}>psychology</span>
        </div>
        <div className="ai-pulse-ring" />
      </div>
      <div style={{ flex: 1, minWidth: 0, position: 'relative', zIndex: 1, paddingRight: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: window.innerWidth < 768 && isMinimized ? 0 : 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <p className="holographic-text" style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Smart Insights</p>
            <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--p-blue)', opacity: 0.5 }} />
            <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--t4)', opacity: 0.5 }}>AURA</span>
          </div>

          <button
            onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }}
            style={{
              position: 'absolute',
              top: '-10px', // Shift minimizing button further upward
              right: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(96, 165, 250, 0.08)',
              border: '1px solid rgba(96, 165, 250, 0.2)',
              borderRadius: '50%',
              width: '24px',
              height: '24px',
              color: 'var(--p-blue)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              padding: 0,
              zIndex: 2
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16, fontWeight: 'bold' }}>
              {isMinimized ? 'expand_more' : 'expand_less'}
            </span>
          </button>
        </div>

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0' }}>
            <div className="ai-dots"><span /><span /><span /></div>
            <span style={{ fontSize: 13, color: 'var(--t4)' }}>Processing insights...</span>
          </div>
        ) : msg ? (
          <p style={{
            fontSize: window.innerWidth < 768 ? 12.5 : 14,
            color: 'var(--t1)',
            lineHeight: 1.6,
            fontWeight: 500,
            marginTop: window.innerWidth < 768 && isMinimized ? 4 : 0,
            display: isMinimized ? '-webkit-box' : 'block',
            WebkitLineClamp: isMinimized ? 1 : 'unset',
            WebkitBoxOrient: isMinimized ? 'vertical' : 'unset',
            overflow: isMinimized ? 'hidden' : 'visible',
            textOverflow: isMinimized ? 'ellipsis' : 'clip'
          }}>
            {msg}
          </p>
        ) : (
          <p style={{ fontSize: 13, color: 'var(--t4)', fontStyle: 'italic' }}>Insights unavailable. Check connection.</p>
        )}
      </div>

      {/* Decorative subtle corner element */}
      <div style={{ position: 'absolute', bottom: -15, right: -15, opacity: 0.03, color: 'var(--t4)', pointerEvents: 'none', display: window.innerWidth < 768 && isMinimized ? 'none' : 'block' }}>
        <span className="material-symbols-outlined" style={{ fontSize: 100 }}>data_thresholding</span>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { progress, tasks, paths, allAchs, A } = useApp();
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [currentMood, setCurrentMood] = useState(PersonalizationEngine.getMood());

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (!AI.enabled()) return;
    const profile = PersonalizationEngine.getProfile(user?.name);
    const lastDigest = profile.weeklyDigests?.[0];
    const daysSince = lastDigest ? (Date.now() - new Date(lastDigest.generatedAt).getTime()) / 86400000 : 999;

    if (daysSince >= 7 && (progress?.totalHours > 0 || tasks?.length > 0)) {
      generateWeeklyDigest({ user, progress, tasks })
        .catch(err => console.error('[Personalization] Weekly digest failed:', err));
    }
  }, [user?.name, progress, tasks]);

  const pending = tasks.filter(t => t.status === 'pending');
  const focusTasks = [...pending].sort((a, b) => { const o = { high: 0, medium: 1, low: 2 }; return (o[a.priority] ?? 1) - (o[b.priority] ?? 1); }).slice(0, 3);
  const upcoming = pending.filter(t => t.deadline).sort((a, b) => new Date(a.deadline) - new Date(b.deadline)).slice(0, 3);

  const avgPct = useMemo(() => {
    const vals = Object.values(progress?.subjects || {}).map(s => s.progress);
    return vals.length ? Math.round(vals.reduce((a, v) => a + v, 0) / vals.length) : 0;
  }, [progress]);

  const activePath = paths.find(p => p.status === 'active');
  const earned = allAchs?.filter(a => a.earned).length || 0;
  const total = allAchs?.length || 1;

  const weekHours = DAYS.map((d, i) => ({ d, v: progress?.weeklyHours?.[i] ?? 0 }));

  return (
    <div className="page dashboard-main-container">
      <style>{`
        @keyframes numberUp    { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes barGrow      { from{opacity:0;transform:scaleY(0.3)} to{opacity:1;transform:scaleY(1)} }
        @keyframes shimmer-wave { 0% { background-position: -100% 0; } 100% { background-position: 100% 0; } }
        
        @keyframes ai-breathe {
          0%, 100% { border-color: rgba(96, 165, 250, 0.2); box-shadow: 0 0 15px rgba(96, 165, 250, 0.05); }
          50% { border-color: rgba(167, 139, 250, 0.4); box-shadow: 0 0 25px rgba(167, 139, 250, 0.15); }
        }
        .ai-card-premium {
          animation: ai-breathe 4s ease-in-out infinite;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        @keyframes holographic {
          0%, 100% { color: #60a5fa; opacity: 0.8; }
          50% { color: #a78bfa; opacity: 1; }
        }
        .holographic-text {
          animation: holographic 6s ease-in-out infinite;
        }
        @keyframes ai-pulse-soft {
          0% { transform: scale(1); opacity: 0.3; }
          100% { transform: scale(1.4); opacity: 0; }
        }
        .ai-pulse-ring {
          position: absolute; inset: 0;
          border-radius: 14px;
          border: 1px solid rgba(96, 165, 250, 0.3);
          animation: ai-pulse-soft 3s ease-out infinite;
          pointer-events: none;
        }

        /* ── Light-mode sphere depth fix ── */
        [data-theme="light"] .glass-sphere {
          box-shadow:
            0 8px 24px rgba(0, 0, 0, 0.12),
            0 2px 6px rgba(0, 0, 0, 0.08),
            inset 0 -10px 20px rgba(0, 0, 0, 0.07),
            inset 0 8px 16px rgba(255, 255, 255, 0.9) !important;
          border-color: rgba(0, 0, 0, 0.1) !important;
          background:
            radial-gradient(circle at 30% 20%, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.3) 35%, transparent 55%),
            radial-gradient(circle at 50% 80%, rgba(0,0,0,0.04), transparent 60%),
            radial-gradient(circle at 50% 50%, var(--s2), var(--s3) 100%) !important;
        }
        [data-theme="light"] .glass-sphere .sphere-specular {
          background: linear-gradient(135deg, rgba(255,255,255,1) 0%, rgba(255,255,255,0.4) 50%, transparent 80%) !important;
          opacity: 0.7;
        }
        [data-theme="light"] .glass-sphere .sphere-refraction {
          opacity: 0.3 !important;
        }
        [data-theme="light"] .sphere-floor {
          background: radial-gradient(ellipse at center, rgba(0,0,0,0.12), transparent 80%) !important;
          opacity: 0.7 !important;
        }
      `}</style>

      {/* ─── HEADER ──────────────────────── */}
      <div className="fadeup dashboard-header-container" style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--gap)', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative' }}>
        <div>
          <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          <h1 className="shimmer-text page-title">
            {greeting(user?.name)}
          </h1>
          <p style={{ fontSize: 14, color: 'var(--t3)', marginTop: 6 }}>
            {progress?.streak > 0 ? (
              <>
                <span className={progress.streak > 3 ? 'flame-active' : ''} style={{ display: 'inline-block', marginRight: 4 }}>🔥</span>
                <strong>{progress.streak}-day streak</strong> · {PersonalizationEngine.getQuickRecommendation({ tasks, progress, checkIns: [] }).message.slice(0, 60)}...
              </>
            ) : `Welcome back, ${user?.name?.split(' ')[0] || 'Student'}! Let's build your streak.`}
          </p>
        </div>

        {/* Focus & Rank Actions Column */}
        <div className="dashboard-header-actions" style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
          width: isMobile ? '100%' : '215px',
          alignItems: isMobile ? 'stretch' : 'flex-end',
          justifyContent: 'center',
          marginTop: isMobile ? 12 : 14
        }}>
          {/* Global Rank Card */}
          <motion.div
            whileHover={{ scale: 1.015, y: -1.5 }}
            whileTap={{ scale: 0.985 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            style={{ width: '100%' }}
          >
            <Link to="/network" style={{
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '10px 16px',
              borderRadius: 20, // Perfectly rounded corners
              background: isLight
                ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.06), rgba(59, 130, 246, 0.02))'
                : 'rgba(10, 15, 27, 0.8)', // Translucent deep navy/slate container background
              border: '1px solid rgba(59, 130, 246, 0.18)',
              boxShadow: isLight
                ? '0 4px 12px rgba(59, 130, 246, 0.04)'
                : '0 4px 15px rgba(0, 0, 0, 0.3)',
              transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
              width: '100%',
              boxSizing: 'border-box'
            }}>
              {/* Left Globe Icon Container */}
              <div style={{
                width: 36,
                height: 36,
                borderRadius: 10, // Rounded-corner square icon frame
                background: isLight ? 'rgba(59, 130, 246, 0.12)' : 'rgba(19, 30, 51, 0.7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <span className="material-symbols-outlined" style={{
                  fontSize: 20,
                  color: isLight ? '#2563eb' : '#3b82f6',
                  fontVariationSettings: "'FILL' 1"
                }}>
                  public
                </span>
              </div>

              {/* Right Text Column */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, textAlign: 'left' }}>
                <span style={{
                  fontSize: 9.5,
                  fontWeight: 700,
                  color: isLight ? '#5a6f5a' : '#6b7b72',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  lineHeight: 1
                }}>
                  GLOBAL RANK
                </span>
                <span style={{
                  fontSize: 14,
                  fontWeight: 800,
                  color: 'var(--t1)',
                  lineHeight: 1.2
                }}>
                  <span style={{ color: '#3b82f6' }}>#5</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--t3)', marginLeft: 5 }}>(18.2k XP)</span>
                </span>
              </div>
            </Link>
          </motion.div>

          {/* Glowing Neon Focus Button */}
          <Link to="/focus" style={{ textDecoration: 'none', width: '100%' }}>
            {isLight ? (
              <motion.button
                whileHover={{ scale: 1.015, y: -1.5, boxShadow: '0 8px 24px rgba(16, 185, 129, 0.15), inset 0 2px 4px #fff' }}
                whileTap={{ scale: 0.985 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: 14, // Slightly boxier than rank card
                  background: 'linear-gradient(180deg, #ffffff 0%, #f9fafb 100%)',
                  border: '1.5px solid rgba(16, 185, 129, 0.35)',
                  boxShadow: `
                    0 4px 12px rgba(0, 0, 0, 0.05),
                    inset 0 2px 4px rgba(255, 255, 255, 1)
                  `,
                  fontSize: 12.5,
                  fontWeight: 900,
                  color: '#0f172a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em'
                }}
              >
                <span className="material-symbols-outlined" style={{
                  fontSize: 20,
                  color: '#059669',
                  fontVariationSettings: "'FILL' 1"
                }}>center_focus_strong</span>
                <span>Enter Deep Focus</span>
              </motion.button>
            ) : (
              <motion.button
                whileHover={{ scale: 1.015, y: -1.5, boxShadow: '0 8px 24px rgba(167, 139, 250, 0.2), inset 0 1px 1px rgba(255, 255, 255, 0.1)' }}
                whileTap={{ scale: 0.985 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: 14, // Slightly boxier than rank card
                  background: 'rgba(10, 15, 27, 0.8)',
                  backdropFilter: 'blur(12px) saturate(140%)',
                  border: '1px solid rgba(167, 139, 250, 0.2)',
                  boxShadow: `
                    0 4px 12px rgba(0, 0, 0, 0.3),
                    inset 0 1px 1px rgba(255, 255, 255, 0.05)
                  `,
                  fontSize: 12.5,
                  fontWeight: 900,
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em'
                }}
              >
                <span className="material-symbols-outlined" style={{
                  fontSize: 20,
                  color: '#a78bfa',
                  fontVariationSettings: "'FILL' 1"
                }}>center_focus_strong</span>
                <span>Enter Deep Focus</span>
              </motion.button>
            )}
          </Link>
        </div>
      </div>

      {/* ─── AI BRIEFING ──────────────────── */}
      <div className="fadeup d1">
        <AIBriefing key={currentMood.level} user={user} progress={progress} tasks={focusTasks} appState={{ user, tasks, progress }} />
      </div>

      {/* ─── HERO ROW: Active Path + 3D Spheres ───────────── */}
      <div className="fadeup d2" style={{ display: 'flex', gap: 'var(--gap-card)', alignItems: 'stretch', flexWrap: 'wrap' }}>

        {/* ── Left: Active Path Card (compressed horizontally, expanded vertically) ── */}
        <div className="card card-hover active-path-card" style={{
          flex: '1 1 340px',
          padding: 'var(--card-padding)',
          position: 'relative',
          cursor: 'pointer',
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'stretch' : 'center',
          gap: isMobile ? 12 : 'var(--gap-page)'
        }} onClick={() => navigate('/paths')}>

          {isMobile ? (
            /* MOBILE LAYOUT: Sleek, compact, no overlaps */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>
              {/* Row 1: Badge + RingProgress side-by-side */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 8px', borderRadius: 6, background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)' }}>
                      <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#34d399', animation: 'pulseDot 2s ease-in-out infinite' }} />
                      <span style={{ fontSize: 9, fontWeight: 800, color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                        {activePath ? 'Active Path' : 'No Path'}
                      </span>
                    </div>
                    {activePath && (
                      <span style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        Wk {activePath.currentWeek}/{activePath.totalWeeks}
                      </span>
                    )}
                  </div>
                  <h2 style={{ fontSize: 17, fontWeight: 900, color: 'var(--t1)', letterSpacing: '-0.02em', lineHeight: 1.25, marginTop: 4 }}>
                    {activePath?.title || 'Start a Learning Path'}
                  </h2>
                  <p style={{ fontSize: 12, color: 'var(--t3)', lineHeight: 1.4, fontWeight: 500, marginTop: 2 }}>
                    {activePath?.goal || 'Create an AI-powered roadmap to master any skill'}
                  </p>
                </div>

                {activePath && (
                  <div style={{ flexShrink: 0, marginLeft: 8, filter: 'drop-shadow(0 0 10px rgba(52,211,153,0.1))' }}>
                    <RingProgress pct={activePath.progress || 0} size={70} stroke={7} label="" color="#34d399" />
                  </div>
                )}
              </div>

              {/* Row 2: Daily Focus Progress Bar */}
              {activePath && (
                <div style={{ width: '100%', marginTop: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 9.5, fontWeight: 800, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                    <span>Daily Focus</span>
                    <span style={{ color: '#10b981' }}>{Math.min(100, Math.round((progress?.thisWeekHours || 0) / 14 * 100))}%</span>
                  </div>
                  <div className="progress-track" style={{ height: 6, borderRadius: 99, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                    <div className="progress-fill" style={{
                      width: `${Math.min(100, (progress?.thisWeekHours || 0) / 14 * 100)}%`,
                      height: '100%', borderRadius: 99,
                      background: 'linear-gradient(90deg, #10b981, #34d399)',
                      boxShadow: '0 0 10px rgba(16,185,129,0.3)'
                    }} />
                  </div>
                </div>
              )}

              {/* Row 3: Resume Button (Full Width) */}
              <button className="btn btn-primary shimmer-premium" style={{
                width: '100%',
                padding: '10px 20px', fontSize: 13,
                background: 'linear-gradient(135deg, #10b981, #06b6d4)',
                border: 'none',
                boxShadow: '0 4px 12px rgba(16,185,129,0.2)',
                borderRadius: 10,
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                marginTop: 4
              }} onClick={e => { e.stopPropagation(); navigate('/paths'); }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16, fontVariationSettings: "'FILL' 1" }}>{activePath ? 'play_arrow' : 'add'}</span>
                {activePath ? 'Resume Session' : 'Create Path'}
              </button>
            </div>
          ) : (
            /* DESKTOP LAYOUT */
            <>
              {/* Left: All text content */}
              <div style={{ flex: 1, position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Badge Row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 6, background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)' }}>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#34d399', animation: 'pulseDot 2s ease-in-out infinite' }} />
                    <span style={{ fontSize: 9.5, fontWeight: 800, color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                      {activePath ? 'Active Path' : 'No Path'}
                    </span>
                  </div>
                  {activePath && (
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      Week {activePath.currentWeek} / {activePath.totalWeeks}
                    </span>
                  )}
                </div>

                {/* Title + Description */}
                <div>
                  <h2 style={{ fontSize: 'clamp(1.225rem,2.35vw,1.525rem)', fontWeight: 900, color: 'var(--t1)', letterSpacing: '-0.02em', lineHeight: 1.3, marginBottom: 6 }}>
                    {activePath?.title || 'Start a Learning Path'}
                  </h2>
                  <p style={{ fontSize: 13, color: 'var(--t3)', lineHeight: 1.6, fontWeight: 500 }}>
                    {activePath?.goal || 'Create an AI-powered roadmap to master any skill'}
                  </p>
                </div>

                {/* CTA Button + Progress Bar (same row) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 32, flexWrap: 'wrap', marginTop: 24 }}>
                  <button className="btn btn-primary shimmer-premium" style={{
                    padding: '12px 28px', fontSize: 14,
                    background: 'linear-gradient(135deg, #10b981, #06b6d4)',
                    border: 'none',
                    boxShadow: '0 8px 20px rgba(16,185,129,0.25)',
                    borderRadius: 12,
                    flexShrink: 0,
                    fontWeight: 800,
                    letterSpacing: '0.01em'
                  }} onClick={e => { e.stopPropagation(); navigate(activePath ? '/paths' : '/paths'); }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}>{activePath ? 'play_arrow' : 'add'}</span>
                    {activePath ? 'Resume Session' : 'Create Path'}
                  </button>

                  {activePath && (
                    <div style={{ flex: 1, minWidth: 120, maxWidth: 220 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 10, fontWeight: 800, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                        <span>Daily Focus</span>
                        <span style={{ color: '#10b981' }}>{Math.min(100, Math.round((progress?.thisWeekHours || 0) / 14 * 100))}%</span>
                      </div>
                      <div className="progress-track" style={{ height: 6, borderRadius: 99, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                        <div className="progress-fill" style={{
                          width: `${Math.min(100, (progress?.thisWeekHours || 0) / 14 * 100)}%`,
                          height: '100%', borderRadius: 99,
                          background: 'linear-gradient(90deg, #10b981, #34d399)',
                          boxShadow: '0 0 10px rgba(16,185,129,0.3)'
                        }} />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Ring Progress */}
              {activePath && (
                <div style={{ flexShrink: 0, position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, filter: 'drop-shadow(0 0 12px rgba(52,211,153,0.15))' }}>
                  <RingProgress pct={activePath.progress || 0} size={120} stroke={10} label="Overall" color="#34d399" />
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Right: 2×2 Glass Sphere Grid ── */}
        <div className="spheres-grid-container" style={{
          flex: '0 1 320px',
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 'var(--gap-card)',
          alignContent: 'center',
          justifyItems: 'center'
        }}>
          {[
            { icon: 'local_fire_department', label: 'Streak', value: progress?.streak || 0, color: '#f0d890', colorMid: 'rgba(240,216,144,0.08)', flame: (progress?.streak > 3), delay: 0, route: '/progress' },
            { icon: 'schedule', label: 'This Week', value: progress?.thisWeekHours || 0, color: '#93dffd', colorMid: 'rgba(147,223,253,0.08)', delay: 0.06, route: '/schedule' },
            { icon: 'task_alt', label: 'Completed', value: tasks.filter(t => t.status === 'completed').length, color: '#6ee7b7', colorMid: 'rgba(110,231,183,0.08)', delay: 0.12, route: '/tasks' },
            { icon: 'emoji_events', label: 'Achievements', value: earned, color: '#d4c5ff', colorMid: 'rgba(212,197,255,0.08)', total: total, delay: 0.18, route: '/progress', routeState: { tab: 'badges' } },
          ].map(({ icon, label, value, color, colorMid, flame, total, delay, route, routeState }, i) => (
            <div
              key={label}
              onClick={() => navigate(route, routeState ? { state: routeState } : undefined)}
              title={`Go to ${label}`}
              className="fadeup sphere-wrapper"
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', animationDelay: `${delay}s` }}
            >
              {/* ── The Glassy 3D Sphere ── */}
              <div
                className="glass-sphere sphere-hover"
                style={{
                  width: 'var(--sphere-size)', height: 'var(--sphere-size)',
                  borderRadius: '50%',
                  position: 'relative',
                  background: `
                    radial-gradient(circle at 30% 22%, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.03) 35%, transparent 55%),
                    radial-gradient(circle at 50% 50%, color-mix(in srgb, ${color} 12%, var(--s2)), var(--s2) 100%)
                  `,
                  boxShadow: `
                    0 20px 40px color-mix(in srgb, var(--t1) 15%, transparent),
                    inset 0 -15px 30px color-mix(in srgb, ${color} 20%, transparent),
                    inset 0 12px 25px rgba(255,255,255,0.10),
                    inset 0 0 3px rgba(255,255,255,0.25),
                    0 0 0 0.5px rgba(255,255,255,0.04)
                  `,
                  border: '1px solid color-mix(in srgb, var(--t1) 10%, transparent)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 2,
                  overflow: 'hidden',
                  zIndex: 1
                }}
              >
                {/* Primary Specular Highlight — no blur filter for performance */}
                <div className="sphere-specular" style={{
                  position: 'absolute',
                  top: '8%', left: '18%',
                  width: '45%', height: '28%',
                  borderRadius: '50%',
                  background: 'linear-gradient(145deg, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.04) 60%, transparent 90%)',
                  opacity: 0.9,
                  pointerEvents: 'none'
                }} />

                {/* Secondary Micro-Specular */}
                <div style={{
                  position: 'absolute',
                  top: '12%', left: '28%',
                  width: 8, height: 4,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.50)',
                  opacity: 0.8,
                  pointerEvents: 'none'
                }} />

                {/* Bottom Caustic Refraction */}
                <div className="sphere-refraction" style={{
                  position: 'absolute',
                  bottom: '3%', right: '8%',
                  width: '35%', height: '35%',
                  borderRadius: '50%',
                  background: `radial-gradient(circle at center, color-mix(in srgb, ${color} 18%, transparent), transparent 65%)`,
                  opacity: 0.5,
                  pointerEvents: 'none'
                }} />

                {/* Rim Light */}
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '50%',
                  border: '1px solid rgba(255,255,255,0.08)',
                  background: 'linear-gradient(180deg, transparent 40%, rgba(255,255,255,0.04) 100%)',
                  pointerEvents: 'none'
                }} />

                {/* Icon */}
                <span
                  className={`material-symbols-outlined ${flame ? 'flame-active' : ''}`}
                  style={{
                    fontSize: 'var(--sphere-icon)',
                    color,
                    fontVariationSettings: "'FILL' 1",
                    position: 'relative', zIndex: 1,
                    filter: `drop-shadow(0 2px 10px color-mix(in srgb, ${color} 50%, transparent))`
                  }}
                >{icon}</span>

                {/* Value */}
                <p style={{
                  fontSize: 'var(--sphere-val)', fontWeight: 900,
                  color: 'var(--t1)',
                  letterSpacing: '-0.03em',
                  lineHeight: 1,
                  position: 'relative', zIndex: 1
                }}>
                  <Counter value={value} />
                  {total !== undefined && <span style={{ fontSize: 10, opacity: 0.4, fontWeight: 700 }}>/{total}</span>}
                </p>

                {/* Label */}
                <p style={{
                  fontSize: 'var(--sphere-label)', fontWeight: 800,
                  color: 'var(--t4)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                  lineHeight: 1,
                  position: 'relative', zIndex: 1,
                  marginTop: 1
                }}>{label}</p>
              </div>

              {/* Floor Shadow / Grounding Reflection */}
              <div className="sphere-floor" style={{
                marginTop: 8,
                width: 50, height: 5,
                background: `radial-gradient(ellipse at center, color-mix(in srgb, ${color} 10%, transparent), transparent 80%)`,
                borderRadius: '50%',
                opacity: 0.5
              }} />

            </div>
          ))}
        </div>
      </div>

      {/* ─── PROGRESS + ACTIVITY ──────────── */}
      <div className="reveal" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'var(--gap-page)' }}>
        {/* ... existing mastery ring and activity bars ... */}
        <div className="card fadeup d4 mastery-progress-card" style={{ padding: 'var(--card-padding)', display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
          <RingProgress pct={avgPct} size={isMobile ? 100 : 150} stroke={isMobile ? 8 : 12} label="Overall Mastery" sublabel={`${progress?.totalHours || 0}h total`} color="var(--p)" />
          {/* ... rest of the content ... */}
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--p)', animation: 'pulseDot 1.8s ease-in-out infinite' }} />
              <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--p)', textTransform: 'uppercase', letterSpacing: '0.09em' }}>Daily Goal Reached</p>
            </div>
            <h3 style={{ fontSize: 'clamp(1.05rem,2.35vw,1.4rem)', fontWeight: 800, color: 'var(--t1)', letterSpacing: '-0.02em', marginBottom: 6 }}>Mastery Progress</h3>
            <p style={{ fontSize: 13, color: 'var(--t3)', marginBottom: 16, lineHeight: 1.6 }}>
              {progress?.streak > 3 ? `You've reached flow state for ${progress.streak} consecutive days.` : "Build consistency to reach your flow state."}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {Object.entries(progress?.subjects || {}).slice(0, 3).map(([sub, data]) => {
                const c = SUBJECT_COLORS[sub] || 'var(--p)';
                return (
                  <div key={sub}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--t2)' }}>{sub}</span>
                      <span style={{ fontSize: 12, fontWeight: 800, color: c }}>{data.progress}%</span>
                    </div>
                    <div className="progress-track" style={{ height: 6, borderRadius: 99, background: 'var(--s3)' }}>
                      <div className="progress-fill" style={{
                        width: `${data.progress}%`,
                        height: '100%',
                        borderRadius: 99,
                        background: `linear-gradient(90deg, color-mix(in srgb, ${c} 50%, transparent), ${c})`,
                        boxShadow: `0 0 10px color-mix(in srgb, ${c} 30%, transparent)`
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="card fadeup d5 activity-chart-card" style={{ padding: '20px' }}>
          <div className="card-header-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 3 }}>Activity Velocity</p>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--t2)' }}>Weekly Focus Distribution</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '7px 18px', borderRadius: 99, background: 'rgba(0, 255, 153, 0.05)', border: '1px solid rgba(0, 255, 153, 0.12)'
              }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00FF99', boxShadow: '0 0 12px #00FF99' }} />
                <p style={{ fontSize: 12.5, fontWeight: 900, color: '#00FF99', fontFamily: "'Geist Mono', monospace", letterSpacing: '-0.01em' }}>
                  <span style={{ opacity: 0.6, fontSize: 10, marginRight: 6 }}>TOTAL</span>
                  <Counter value={progress?.thisWeekHours || 0} decimals={1} suffix="H" />
                </p>
              </div>
              <Link to="/progress" style={{ fontSize: 12, fontWeight: 700, color: 'var(--p)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, marginLeft: 4 }}>
                View all <span className="material-symbols-outlined" style={{ fontSize: 14 }}>arrow_forward</span>
              </Link>
            </div>
          </div>
          <ActivityBars data={weekHours} total={progress?.thisWeekHours || 0} compact={isMobile} />
        </div>
      </div>

      {/* ─── TODAY'S FOCUS ────────────────── */}
      <div className="card fadeup d6" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--p-purple)', fontVariationSettings: "'FILL' 1" }}>target</span>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--t1)', letterSpacing: '-0.02em' }}>Today's Focus</h3>
            <span style={{ padding: '2px 10px', borderRadius: 999, background: 'var(--p-purple-sub)', color: 'var(--p-purple)', fontSize: 11, fontWeight: 700 }}>{focusTasks.length}</span>
          </div>
          <Link to="/tasks" style={{ fontSize: 12, fontWeight: 700, color: 'var(--p-purple)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3 }}>
            All tasks <span className="material-symbols-outlined" style={{ fontSize: 14 }}>arrow_forward</span>
          </Link>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {focusTasks.length > 0 ? focusTasks.map(t => (
            <TaskRow key={t.id} task={t} onComplete={A.task.done} />
          )) : (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--t4)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 40, display: 'block', marginBottom: 8, opacity: 0.4 }}>check_circle</span>
              <p style={{ fontSize: 13 }}>All caught up! <Link to="/tasks" style={{ color: 'var(--p)', textDecoration: 'none', fontWeight: 700 }}>Add a task</Link></p>
            </div>
          )}
        </div>
      </div>

      {/* ─── QUICK ACTIONS ────────────────── */}
      <div className="grid-4 fadeup d7" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--gap-card)' }}>
        {[
          { to: '/notes', icon: 'add_notes', label: 'New Note', color: '#09cd83' },
          { to: '/tasks', icon: 'playlist_add', label: 'Add Task', color: '#60a5fa' },
          { to: '/focus', icon: 'timer', label: 'Start Focus', color: '#a78bfa' },
          { to: '/checkin', icon: 'sentiment_satisfied', label: 'Check In', color: '#e9cd6e' },
        ].map(({ to, icon, label, color }, i) => (
          <Link key={to} to={to} style={{ textDecoration: 'none' }}>
            <div className="card card-hover" style={{ padding: '16px 12px', textAlign: 'center', cursor: 'pointer', animationDelay: `${i * 0.05}s`, border: `1px solid ${color}22` }}>
              <div style={{ width: 40, height: 40, borderRadius: 'var(--r-md)', background: `${color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 20, color, fontVariationSettings: "'FILL' 1" }}>{icon}</span>
              </div>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--t2)' }}>{label}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
