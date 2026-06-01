import { useState, useEffect, useRef, memo, useCallback } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '@context/AppContext';
import { auraChat, AI } from '@services/ai';
import toast from 'react-hot-toast';

const NAV = [
  { to: '/dashboard', icon: 'space_dashboard', label: 'Dashboard', color: 'var(--p)' },
  { to: '/network', icon: 'public', label: 'Network', color: '#3b82f6' },
  { to: '/notes', icon: 'edit_note', label: 'Notes', color: 'var(--info)' },
  { to: '/tasks', icon: 'task_alt', label: 'Tasks', color: 'var(--purple)' },
  { to: '/progress', icon: 'analytics', label: 'Progress', color: 'var(--teal)' },
  { to: '/focus', icon: 'timer', label: 'Focus', color: 'var(--pink)' },
  { to: '/schedule', icon: 'calendar_month', label: 'Schedule', color: 'var(--orange)' },
  { to: '/paths', icon: 'route', label: 'Paths', color: 'var(--p)' },
  { to: '/videos', icon: 'smart_display', label: 'Videos', color: 'var(--danger)' },
  { to: '/settings', icon: 'settings', label: 'Settings', color: 'var(--t4)' },
];

const MOBILE_CONSTELLATION = [
  { x: 0, y: -190 },
  { x: -75, y: -160 },
  { x: 75, y: -160 },
  { x: -125, y: -70 },
  { x: 125, y: -70 },
  { x: -125, y: 30 },
  { x: 125, y: 30 },
  { x: -100, y: 120 },
  { x: 100, y: 120 },
  { x: 0, y: 200 }
];

const triggerTouchHaptic = (dur = 15) => {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate(dur);
    } catch (e) {}
  }
};

/* ── Optimized OrbitItem — Pure CSS Transitions (zero framer-motion) ── */
const OrbitItem = memo(({ item, index, isMobile, isDesktop, location, iconSize, onClick, isOpen }) => {
  let offsetX, offsetY;
  if (isMobile) {
    offsetX = MOBILE_CONSTELLATION[index].x;
    offsetY = MOBILE_CONSTELLATION[index].y;
  } else {
    const radius = isDesktop ? 320 : 240;
    const totalArc = Math.PI;
    const startAngleRad = -Math.PI;
    const angleRad = startAngleRad + (index / (NAV.length - 1)) * totalArc;
    offsetX = Math.cos(angleRad) * radius;
    offsetY = Math.sin(angleRad) * radius;
  }

  const isActive = location.pathname.startsWith(item.to);

  return (
    <div style={{
      position: 'absolute',
      top: '50%',
      left: '50%',
      width: 0,
      height: 0,
      zIndex: 10
    }}>
      {/* Position layer — GPU-accelerated CSS transition replaces spring physics */}
      <div
        style={{
          position: 'absolute',
          left: -iconSize / 2,
          top: -iconSize / 2,
          transform: isOpen
            ? `translate3d(${offsetX}px, ${offsetY}px, 0) scale(1)`
            : 'translate3d(0, 0, 0) scale(0)',
          opacity: isOpen ? 1 : 0,
          transition: isOpen
            ? 'transform 280ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 200ms ease'
            : 'transform 200ms cubic-bezier(0.4, 0, 0.2, 1), opacity 140ms ease',
          pointerEvents: isOpen ? 'auto' : 'none',
        }}
      >
        {/* Hover layer — CSS class handles hover/tap on compositor thread */}
        <div className="orbit-item" style={{ touchAction: 'manipulation' }}>
          <NavLink
            to={item.to}
            state={item.state}
            className={({ isActive }) => `${isActive && (!item.state || location.state?.tab === item.state.tab) ? 'active' : ''}`}
            onClick={(e) => {
              triggerTouchHaptic(12);
              onClick?.(e);
            }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textDecoration: 'none',
              position: 'relative',
              paddingBottom: 2
            }}
          >
            {/* Circular Icon Container */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: iconSize,
              height: iconSize,
              borderRadius: '50%',
              transition: 'box-shadow 200ms ease',
              background: isActive
                ? `linear-gradient(135deg, var(--s1), ${item.color}22)`
                : 'linear-gradient(135deg, var(--glass), var(--s1))',
              border: isActive
                ? `2px solid ${item.color}`
                : '1px solid var(--surface-b)',
              boxShadow: isActive
                ? `0 0 20px ${item.color}44, var(--sh)`
                : 'var(--sh)',
              flexShrink: 0
            }}>
              <span className="material-symbols-outlined" style={{
                fontSize: isDesktop ? 24 : 22,
                color: isActive ? item.color : 'var(--t1)',
                fontVariationSettings: isActive ? "'FILL' 1, 'wght' 700, 'GRAD' 200, 'opsz' 24" : "'FILL' 0, 'wght' 600, 'GRAD' 0, 'opsz' 24",
                transition: 'color 200ms ease'
              }}>
                {item.icon}
              </span>
            </div>

            {/* Label */}
            <div style={{
              position: 'absolute',
              bottom: isDesktop ? -28 : -26,
              fontSize: isDesktop ? 10 : 9,
              fontWeight: 800,
              color: isActive ? item.color : 'var(--t1)',
              background: 'var(--s1)',
              padding: '4px 10px',
              borderRadius: 999,
              border: `1px solid ${isActive ? `${item.color}55` : 'var(--surface-b)'}`,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              whiteSpace: 'nowrap',
              boxShadow: 'var(--sh)',
              cursor: 'pointer'
            }}>
              {item.label}
            </div>
          </NavLink>
        </div>
      </div>
    </div>
  );
});

function AuraDial() {
  const [isOpen, setIsOpen] = useState(false);
  const { user, tasks, A, progress, schedule } = useApp();
  const [showChat, setShowChat] = useState(false);
  const [chatMsg, setChatMsg] = useState('');
  const [history, setHistory] = useState([{ role: 'assistant', content: `Welcome back, ${user?.name || 'Explorer'}! What are we mastering today?` }]);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const activeItem = NAV.find(n => location.pathname.startsWith(n.to)) || NAV[0];

  const hubRef = useRef(null);
  const isOpenRef = useRef(false);

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [history, isTyping]);

  const handleChat = useCallback(async (e) => {
    e?.preventDefault();
    triggerTouchHaptic(15);
    if (!chatMsg.trim() || isTyping) return;
    if (!AI.enabled()) { toast('Enable Smart Hub in Settings first ✦', { icon: '🔑' }); return; }

    const userMsg = chatMsg.trim();
    setChatMsg('');
    const newHistory = [...history, { role: 'user', content: userMsg }];
    setHistory(newHistory);
    setIsTyping(true);

    try {
      const pending = tasks.filter(t => t.status === 'pending').map(t => t.title);
      const res = await auraChat(newHistory, {
        name: user?.name || 'Student',
        tasks: pending,
        progress: progress?.subjects || {},
        appState: { user, tasks, progress }
      });

      if (res && res.error) {
        setHistory(prev => [...prev, { role: 'assistant', content: `⚠️ Error: ${res.error}` }]);
      } else {
        if (res.toolCalls && Array.isArray(res.toolCalls)) {
          res.toolCalls.forEach(call => {
            const { name, args } = call;
            try {
              switch (name) {
                case 'schedule_session':
                  A.schedule.add({
                    subject: args.subject,
                    topic: args.topic,
                    startTime: args.startTime,
                    durationMinutes: args.duration,
                    day: args.day || new Date().toISOString().slice(0, 10)
                  });
                  toast.success(`Scheduled: ${args.topic}`, { icon: '📅' });
                  break;
                case 'update_progress': {
                  const newSubjects = { ...(progress?.subjects || {}) };
                  if (newSubjects[args.subject]) {
                    newSubjects[args.subject].progress = args.progress;
                  } else {
                    newSubjects[args.subject] = { progress: args.progress, hoursStudied: 0, tasksCompleted: 0, trend: 'New' };
                  }
                  A.progress.update({ subjects: newSubjects });
                  toast.success(`Progress updated for ${args.subject}`, { icon: '📈' });
                  break;
                }
                case 'navigate_to':
                  navigate(args.page);
                  setShowChat(false);
                  break;
                case 'start_focus_timer':
                  if (args.duration) A.timer.setDur(args.duration);
                  if (args.subject) A.timer.setSub(args.subject);
                  A.timer.start();
                  navigate('/focus');
                  setShowChat(false);
                  toast.success('Focus session started!', { icon: '⏱️' });
                  break;
                case 'edit_schedule': {
                  const targetSession = schedule.find(s =>
                    s.subject.toLowerCase() === args.subject.toLowerCase() &&
                    s.topic.toLowerCase().includes(args.oldTopic.toLowerCase())
                  );
                  if (targetSession) {
                    const updateData = { id: targetSession.id };
                    if (args.newTopic) updateData.topic = args.newTopic;
                    if (args.startTime) updateData.startTime = args.startTime;
                    if (args.duration) updateData.durationMinutes = args.duration;
                    A.schedule.update(updateData);
                    toast.success(`Updated session: ${args.newTopic || args.oldTopic}`, { icon: '✏️' });
                  } else {
                    toast.error(`Couldn't find that session to edit.`, { icon: '⚠️' });
                  }
                  break;
                }
                case 'delete_schedule': {
                  const sessionToDelete = schedule.find(s =>
                    s.subject.toLowerCase() === args.subject.toLowerCase() &&
                    s.topic.toLowerCase().includes(args.topic.toLowerCase())
                  );
                  if (sessionToDelete) {
                    A.schedule.remove(sessionToDelete.id);
                    toast.success(`Deleted session: ${args.topic}`, { icon: '🗑️' });
                  } else {
                    toast.error(`Couldn't find that session to delete.`, { icon: '⚠️' });
                  }
                  break;
                }
                case 'add_task':
                  A.task.add({ title: args.title, priority: args.priority || 'medium' });
                  toast.success(`Task added: ${args.title}`, { icon: '📝' });
                  break;
              }
            } catch (err) {
              console.error('[Aura] Tool execution failed:', err);
            }
          });
        }
        let finalContent = res.content;
        if (!finalContent || finalContent === "Processing..." || finalContent === "Handled that for you!") {
          if (res.toolCalls && res.toolCalls.length > 0) {
            const firstTool = res.toolCalls[0];
            switch (firstTool.name) {
              case 'schedule_session':
                finalContent = `Done! I've scheduled your ${firstTool.args?.subject || ''} session. It's on your calendar.`;
                break;
              case 'update_progress':
                finalContent = `Got it. I've updated your progress for ${firstTool.args?.subject || 'that subject'}.`;
                break;
              case 'navigate_to':
                finalContent = `Taking you there now!`;
                break;
              case 'start_focus_timer':
                finalContent = `Focus mode activated. Let's crush this session!`;
                break;
              case 'edit_schedule':
                finalContent = `Done! I've updated your ${firstTool.args?.subject || ''} schedule.`;
                break;
              case 'delete_schedule':
                finalContent = `I've removed that session from your schedule.`;
                break;
              case 'add_task':
                finalContent = `Added "${firstTool.args?.title || 'it'}" to your tasks.`;
                break;
              default:
                finalContent = "I've handled that for you!";
            }
          } else {
            finalContent = "I've handled that for you!";
          }
        }

        setHistory(prev => [...prev, { role: 'assistant', content: finalContent }]);
      }
    } catch (err) {
      console.error(err);
      setHistory(prev => [...prev, { role: 'assistant', content: "Smart Hub is having trouble connecting to the brain. Check your internet or API keys!" }]);
    } finally {
      setIsTyping(false);
    }
  }, [chatMsg, isTyping, history, tasks, user, progress, schedule, A, navigate]);

  // Responsive Breakpoints
  const [breakpoints, setBreakpoints] = useState({
    isMobile: window.innerWidth < 768,
    isTablet: window.innerWidth >= 768 && window.innerWidth < 1024,
    isDesktop: window.innerWidth >= 1024
  });

  const [hasTouch, setHasTouch] = useState(false);

  useEffect(() => {
    const handleTouchStart = () => {
      setHasTouch(true);
      window.removeEventListener('touchstart', handleTouchStart);
    };
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    return () => window.removeEventListener('touchstart', handleTouchStart);
  }, []);

  useEffect(() => {
    let ticking = false;
    const handleResize = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          setBreakpoints(prev => {
            const isMobile = window.innerWidth < 768;
            const isTablet = window.innerWidth >= 768 && window.innerWidth < 1024;
            const isDesktop = window.innerWidth >= 1024;
            if (prev.isMobile === isMobile && prev.isTablet === isTablet && prev.isDesktop === isDesktop) return prev;
            return { isMobile, isTablet, isDesktop };
          });
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('resize', handleResize, { passive: true });
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const { isMobile, isTablet, isDesktop } = breakpoints;
  const iconSize = isDesktop ? 52 : 48;
  const hubSize = isDesktop ? 68 : 56;

  // Close when navigating to a new page
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  const hubCenterRef = useRef(null);

  // Cache the hub coordinates when open or resized
  useEffect(() => {
    if (isMobile || hasTouch) return;
    
    const updateCenter = () => {
      if (hubRef.current) {
        const rect = hubRef.current.getBoundingClientRect();
        hubCenterRef.current = {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2
        };
      }
    };

    if (isOpen) {
      updateCenter();
    }

    window.addEventListener('resize', updateCenter, { passive: true });
    return () => window.removeEventListener('resize', updateCenter);
  }, [isOpen, isMobile, hasTouch]);

  // Desktop: close when mouse leaves the orbit radius (RAF-throttled)
  useEffect(() => {
    if (isMobile || hasTouch) return;
    const orbitRadius = isDesktop ? 360 : 280;
    let rafId = null;

    const handleMouseMove = (e) => {
      if (!isOpenRef.current) return;
      if (rafId) return; // Skip if already queued — throttle to 1 per frame
      rafId = requestAnimationFrame(() => {
        rafId = null;
        if (!isOpenRef.current) return;
        
        let center = hubCenterRef.current;
        if (!center && hubRef.current) {
          const rect = hubRef.current.getBoundingClientRect();
          center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
          hubCenterRef.current = center;
        }
        if (!center) return;

        const dx = e.clientX - center.x;
        const dy = e.clientY - center.y;
        if (Math.sqrt(dx * dx + dy * dy) > orbitRadius) {
          setIsOpen(false);
        }
      });
    };

    document.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [isMobile, isDesktop, hasTouch]);

  const handleHubClick = useCallback((e) => {
    e.stopPropagation();
    triggerTouchHaptic(15);
    setIsOpen(prev => !prev);
  }, []);

  const handleHubMouseEnter = useCallback(() => {
    if (!isMobile && !hasTouch) setIsOpen(true);
  }, [isMobile, hasTouch]);

  const handleOrbitClick = useCallback(() => {
    if (isMobile || hasTouch) setIsOpen(false);
  }, [isMobile, hasTouch]);

  return (
    <>
      {/* Mobile Backdrop — pure CSS transition */}
      <div
        onClick={() => setIsOpen(false)}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          zIndex: 98,
          opacity: ((isMobile || hasTouch) && isOpen) ? 1 : 0,
          pointerEvents: ((isMobile || hasTouch) && isOpen) ? 'auto' : 'none',
          transition: 'opacity 200ms ease',
        }}
      />

      {/* Main Dial Container */}
      <div
        style={{
          position: 'fixed',
          left: '50%',
          bottom: isMobile ? 40 : (isTablet || hasTouch) ? 70 : 60,
          transform: `translateX(-50%) translateY(${(isMobile && isOpen) ? -window.innerHeight * 0.4 : 0}px)`,
          zIndex: 99,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'transform 300ms cubic-bezier(0.34, 1.4, 0.64, 1)',
        }}
      >
        <div style={{ position: 'relative', width: 0, height: 0, pointerEvents: 'auto' }}>

          {/* Orbit Items — always mounted, visibility via CSS transition */}
          {NAV.map((item, i) => (
            <OrbitItem
              key={item.to}
              item={item}
              index={i}
              isMobile={isMobile}
              isDesktop={isDesktop}
              location={location}
              iconSize={iconSize}
              onClick={handleOrbitClick}
              isOpen={isOpen}
            />
          ))}

          {/* Central Hub */}
          <div
            ref={hubRef}
            onClick={handleHubClick}
            onMouseEnter={handleHubMouseEnter}
            style={{
              position: 'absolute',
              left: '50%', top: '50%',
              transform: `translate(-50%, -50%) scale(${isOpen ? 0.82 : 1}) rotate(${isOpen ? ((isMobile || hasTouch) ? 135 : 45) : 0}deg)`,
              width: hubSize,
              height: hubSize,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              zIndex: 20,
              background: 'linear-gradient(135deg, var(--s0), var(--s2))',
              border: `1px solid ${activeItem.color}44`,
              boxShadow: isOpen
                ? `0 0 40px ${activeItem.color}55, 0 8px 32px rgba(0,0,0,0.6)`
                : 'var(--sh-lg)',
              transition: 'transform 280ms cubic-bezier(0.34, 1.4, 0.64, 1), box-shadow 280ms ease',
              touchAction: 'manipulation'
            }}
          >
            <span className="material-symbols-outlined" style={{
              fontSize: isDesktop ? 28 : 26,
              color: activeItem.color,
              fontVariationSettings: "'FILL' 1, 'wght' 600, 'GRAD' 200, 'opsz' 28",
              transition: 'color 200ms ease'
            }}>
              {isOpen ? 'close' : activeItem.icon}
            </span>

            {/* Static dotted aura ring — CSS-only rotation */}
            <div style={{
              position: 'absolute',
              inset: -9,
              borderRadius: '50%',
              pointerEvents: 'none',
              zIndex: -1,
              animation: isOpen ? 'auraRotate 25s linear infinite' : 'none',
            }}>
              <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                <circle
                  cx="50" cy="50" r="46"
                  fill="none"
                  stroke={activeItem.color}
                  strokeWidth="2"
                  strokeDasharray="1 6"
                  strokeLinecap="round"
                  opacity="0.5"
                />
              </svg>
            </div>

            {/* Chat Trigger */}
            <button
              onClick={(e) => { e.stopPropagation(); triggerTouchHaptic(15); setShowChat(true); setIsOpen(false); }}
              style={{
                position: 'absolute',
                left: -60,
                width: 32, height: 32, borderRadius: '50%',
                background: 'var(--s1)', border: '1px solid var(--p)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--p)', cursor: 'pointer', zIndex: 30,
                boxShadow: '0 4px 12px rgba(9,205,131,0.3)',
                transform: isOpen ? 'scale(1)' : 'scale(0)',
                opacity: isOpen ? 1 : 0,
                transition: 'transform 250ms cubic-bezier(0.34, 1.4, 0.64, 1) 100ms, opacity 200ms ease 100ms',
                pointerEvents: isOpen ? 'auto' : 'none',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>chat</span>
            </button>
          </div>
        </div>
      </div>

      {/* Aura Chat Interface */}
      {showChat && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 2000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--overlay)', padding: 16,
            animation: 'modalFadeIn 200ms ease both',
          }}
          onClick={() => setShowChat(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 440,
              height: 'min(650px, 85dvh)',
              background: 'var(--s2)',
              borderRadius: 'var(--r-xl)',
              border: '1px solid var(--card-b-h)',
              display: 'flex', flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: 'var(--modal-sh)',
              animation: 'modalCenterIn 280ms cubic-bezier(0.34, 1.4, 0.64, 1) both',
            }}
          >
            {/* Chat Header */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--s1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid var(--p)', boxShadow: '0 0 15px rgba(9,205,131,0.2)' }}>
                <span className="material-symbols-outlined" style={{ color: 'var(--p)', fontSize: 22, fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--p)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Smart Hub</p>
                <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--t1)', letterSpacing: '-0.02em' }}>How can I help you today?</h3>
              </div>
              <button onClick={() => { triggerTouchHaptic(10); setShowChat(false); }} className="icon-btn"><span className="material-symbols-outlined">close</span></button>
            </div>

            {/* Chat Body */}
            <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {history.map((m, i) => (
                <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                  <div style={{
                    padding: '12px 16px',
                    borderRadius: m.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    background: m.role === 'user' ? 'var(--p)' : 'var(--s3)',
                    color: m.role === 'user' ? '#000' : 'var(--t2)',
                    fontSize: 13.5,
                    fontWeight: 500,
                    lineHeight: 1.5,
                    border: m.role === 'user' ? 'none' : '1px solid rgba(255,255,255,0.03)',
                    boxShadow: m.role === 'user' ? '0 4px 12px rgba(9,205,131,0.2)' : 'none'
                  }}>
                    {m.content}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div style={{ alignSelf: 'flex-start', background: 'var(--s3)', padding: '12px 20px', borderRadius: '18px 18px 18px 4px', border: '1px solid rgba(255,255,255,0.03)' }}>
                  <div className="ai-dots">
                    <span /><span /><span />
                  </div>
                </div>
              )}
            </div>

            {/* Chat Input */}
            <form onSubmit={handleChat} style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: 10 }}>
              <input
                className="input"
                style={{ borderRadius: 99, padding: '12px 20px', fontSize: 13, flex: 1 }}
                placeholder="Ask anything..."
                value={chatMsg}
                onChange={e => setChatMsg(e.target.value)}
                autoFocus
              />
              <button type="submit" onClick={() => triggerTouchHaptic(12)} disabled={!chatMsg.trim() || isTyping} className="btn btn-primary" style={{ width: 44, height: 44, borderRadius: '50%', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>send</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default memo(AuraDial);
