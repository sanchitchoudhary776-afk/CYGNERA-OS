import { useState, useEffect, useRef, memo } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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
  { to: '/checkin', icon: 'sentiment_satisfied', label: 'Check-In', color: 'var(--warn)' },
  { to: '/paths', icon: 'route', label: 'Paths', color: 'var(--p)' },
  { to: '/videos', icon: 'smart_display', label: 'Videos', color: 'var(--danger)' },
  { to: '/settings', icon: 'settings', label: 'Settings', color: 'var(--t4)' },
];

const MOBILE_CONSTELLATION = [
  { x: 0, y: -190 },       // 0: Dashboard (Top Center)
  { x: -75, y: -160 },     // 1: Network
  { x: 75, y: -160 },      // 2: Notes
  { x: -125, y: -70 },     // 3: Tasks
  { x: 125, y: -70 },      // 4: Progress
  { x: -125, y: 30 },      // 5: Focus
  { x: 125, y: 30 },       // 6: Schedule
  { x: -100, y: 120 },     // 7: Check-In
  { x: 100, y: 120 },      // 8: Paths
  { x: -60, y: 200 },      // 9: Videos
  { x: 60, y: 200 }        // 10: Settings
];

const OrbitItem = memo(({ item, index, isMobile, isDesktop, isOpen, location, iconSize, onClick }) => {
  let offsetX, offsetY;
  if (isMobile) {
    offsetX = MOBILE_CONSTELLATION[index].x;
    offsetY = MOBILE_CONSTELLATION[index].y;
  } else {
    // Increased radius to accommodate 12 icons without overlap
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
      <motion.div
        initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
        animate={{
          x: offsetX,
          y: offsetY,
          opacity: 1,
          scale: 1
        }}
        whileHover={{ 
          scale: 1.18, 
          y: offsetY - 8, // Move slightly "up" relative to its orbit position
          zIndex: 100,
          transition: { type: 'spring', stiffness: 400, damping: 15 }
        }}
        whileTap={{ scale: 0.92 }}
        exit={{ x: 0, y: 0, opacity: 0, scale: 0 }}
        transition={{
          type: 'spring',
          stiffness: 500,
          damping: 30,
          delay: 0
        }}
        style={{
          position: 'absolute',
          left: -iconSize / 2,
          top: -iconSize / 2,
          willChange: 'transform, opacity'
        }}
      >
      <NavLink
        to={item.to}
        state={item.state}
        className={({ isActive }) => `${isActive && (!item.state || location.state?.tab === item.state.tab) ? 'active' : ''}`}
        onClick={onClick}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textDecoration: 'none',
          position: 'relative',
          transition: 'all 240ms var(--smooth)',
          paddingBottom: 2 // Small gutter
        }}
      >
        {/* Circular Icon Container */}
        <div className="glass-aura glow-border" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: iconSize,
          height: iconSize,
          borderRadius: '50%',
          transition: 'all 240ms cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: (isActive && (!item.state || location.state?.tab === item.state.tab))
            ? `0 0 30px color-mix(in srgb, ${item.color} 50%, transparent), var(--sh-lg)`
            : 'var(--sh)',
          border: (isActive && (!item.state || location.state?.tab === item.state.tab))
            ? `2px solid ${item.color}`
            : '1px solid var(--surface-b)',
          background: (isActive && (!item.state || location.state?.tab === item.state.tab))
            ? `linear-gradient(135deg, var(--s1), ${item.color}22)`
            : 'linear-gradient(135deg, var(--glass), var(--s1))',
          flexShrink: 0
        }}>
          <span className="material-symbols-outlined" style={{
            fontSize: isDesktop ? 24 : 22,
            color: (isActive && (!item.state || location.state?.tab === item.state.tab)) ? item.color : 'var(--t1)',
            fontVariationSettings: (isActive && (!item.state || location.state?.tab === item.state.tab)) ? "'FILL' 1, 'wght' 700, 'GRAD' 200, 'opsz' 24" : "'FILL' 0, 'wght' 600, 'GRAD' 0, 'opsz' 24",
            filter: (isActive && (!item.state || location.state?.tab === item.state.tab)) ? `drop-shadow(0 0 6px color-mix(in srgb, ${item.color} 50%, transparent))` : 'none',
            transition: 'all 250ms ease'
          }}>
            {item.icon}
          </span>
        </div>

        {/* Label (Hit area included) */}
        <div style={{
          position: 'absolute',
          bottom: isDesktop ? -28 : -26,
          fontSize: isDesktop ? 10 : 9,
          fontWeight: 800,
          color: (isActive && (!item.state || location.state?.tab === item.state.tab)) ? item.color : 'var(--t1)',
          background: 'var(--s1)',
          padding: '4px 10px',
          borderRadius: 999,
          border: `1px solid ${(isActive && (!item.state || location.state?.tab === item.state.tab)) ? `color-mix(in srgb, ${item.color} 50%, transparent)` : 'var(--surface-b)'}`,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          whiteSpace: 'nowrap',
          boxShadow: 'var(--sh-lg)',
          cursor: 'pointer'
        }}>
          {item.label}
        </div>
      </NavLink>
      </motion.div>
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

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [history, isTyping]);

  const handleChat = async (e) => {
    e?.preventDefault();
    if (!chatMsg.trim() || isTyping) return;
    if (!AI.enabled()) { toast('Enable Smart Hub in Settings first ✦', { icon: '🔑' }); return; }

    const userMsg = chatMsg.trim();
    setChatMsg('');
    const newHistory = [...history, { role: 'user', content: userMsg }];
    setHistory(newHistory);
    setIsTyping(true);

    try {
      const pending = tasks.filter(t => t.status === 'pending').map(t => t.title);
      const res = await auraChat(newHistory, { name: user?.name || 'Student', tasks: pending, progress: progress?.subjects || {} });

      if (res && res.error) {
        setHistory(prev => [...prev, { role: 'assistant', content: `⚠️ Error: ${res.error}` }]);
      } else {
        // Execute Tool Calls if any
        if (res.toolCalls && Array.isArray(res.toolCalls)) {
          console.log('[Aura] Executing tool calls:', res.toolCalls);
          res.toolCalls.forEach(call => {
            const { name, args } = call;
            try {
              switch (name) {
                case 'schedule_session':
                  console.log('[Aura] Scheduling session:', args);
                  A.schedule.add({
                    subject: args.subject,
                    topic: args.topic,
                    startTime: args.startTime,
                    durationMinutes: args.duration,
                    day: args.day || new Date().toISOString().slice(0, 10)
                  });
                  toast.success(`Scheduled: ${args.topic}`, { icon: '📅' });
                  break;
                case 'update_progress':
                  console.log('[Aura] Updating progress:', args);
                  const newSubjects = { ...(progress?.subjects || {}) };
                  if (newSubjects[args.subject]) {
                    newSubjects[args.subject].progress = args.progress;
                  } else {
                    newSubjects[args.subject] = { progress: args.progress, hoursStudied: 0, tasksCompleted: 0, trend: 'New' };
                  }
                  A.progress.update({ subjects: newSubjects });
                  toast.success(`Progress updated for ${args.subject}`, { icon: '📈' });
                  break;
                case 'navigate_to':
                  console.log('[Aura] Navigating to:', args.page);
                  navigate(args.page);
                  setShowChat(false);
                  break;
                case 'start_focus_timer':
                  console.log('[Aura] Starting focus timer:', args);
                  if (args.duration) A.timer.setDur(args.duration);
                  if (args.subject) A.timer.setSub(args.subject);
                  A.timer.start();
                  navigate('/focus');
                  setShowChat(false);
                  toast.success('Focus session started!', { icon: '⏱️' });
                  break;
                case 'edit_schedule':
                  console.log('[Aura] Editing schedule:', args);
                  // Find the schedule item by subject and old topic
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
                    console.warn('[Aura] Session to edit not found');
                    toast.error(`Couldn't find that session to edit.`, { icon: '⚠️' });
                  }
                  break;
                case 'delete_schedule':
                  console.log('[Aura] Deleting schedule:', args);
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
                case 'add_task':
                  console.log('[Aura] Adding task:', args);
                  A.task.add({ title: args.title, priority: args.priority || 'medium' });
                  toast.success(`Task added: ${args.title}`, { icon: '📝' });
                  break;
              }
            } catch (err) {
              console.error('[Aura] Tool execution failed:', err);
            }
          });
        }
        // Generate a smart conversational response if the AI didn't provide text
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
  };

  // Advanced Responsive Breakpoints
  const [breakpoints, setBreakpoints] = useState({
    isMobile: window.innerWidth < 768,
    isTablet: window.innerWidth >= 768 && window.innerWidth < 1024,
    isDesktop: window.innerWidth >= 1024
  });

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

  // Adaptive Sizing
  const iconSize = isDesktop ? 52 : (isTablet ? 48 : 46);
  const hubSize = isDesktop ? 68 : (isTablet ? 60 : 56);

  // Interaction Shield (Expanded to cover the new 320px radius)
  const shieldSize = isDesktop ? 760 : 560;

  // Close when clicking outside or navigating
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  // Handle Hub click (toggle on mobile, toggle on desktop if clicked)
  const handleHubClick = (e) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  return (
    <>
      {/* Mobile Backdrop Overlay for Focus */}
      <AnimatePresence>
        {isMobile && isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.7)',
              zIndex: 98
            }}
          />
        )}
      </AnimatePresence>

      {/* Main Dial Container - Fixed at viewport bottom center */}
      <motion.div
        initial={{ x: '-50%' }}
        animate={{
          x: '-50%',
          bottom: isMobile ? 40 : 60,
          y: isMobile && isOpen ? -window.innerHeight * 0.4 : 0
        }}
        transition={{ type: 'spring', stiffness: 280, damping: 28, mass: 0.8 }}
        style={{
          position: 'fixed',
          left: '50%',
          zIndex: 99,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          willChange: 'transform'
        }}
      >
        {/* Mathematical Zero Point - Everything is absolute relative to this */}
        <div
          onMouseEnter={() => !isMobile && setIsOpen(true)}
          onMouseLeave={() => !isMobile && setIsOpen(false)}
          style={{
            position: 'relative',
            width: 0,
            height: 0,
            pointerEvents: 'auto'
          }}
        >
          {/* Base Hover Area (when closed) */}
          <div style={{
            position: 'absolute',
            left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
            width: hubSize + 30, height: hubSize + 30,
            borderRadius: '50%',
            zIndex: 1
          }} />

          {/* Interaction Shield (Desktop open state) */}
          {isOpen && !isMobile && (
            <div style={{
              position: 'absolute',
              left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
              width: shieldSize, height: shieldSize,
              borderRadius: '50%',
              zIndex: 1
            }} />
          )}

          {/* Orbiting Icons */}
          <AnimatePresence>
            {isOpen && NAV.map((item, i) => (
              <OrbitItem
                key={item.to}
                item={item}
                index={i}
                isMobile={isMobile}
                isDesktop={isDesktop}
                isOpen={isOpen}
                location={location}
                iconSize={iconSize}
                onClick={() => isMobile && setIsOpen(false)}
              />
            ))}
          </AnimatePresence>

          {/* Central Smart Hub (Trigger) */}
          <motion.div
            onClick={handleHubClick}
            animate={{
              scale: isOpen ? 0.8 : 1,
              rotate: isOpen ? (isMobile ? 135 : 45) : 0,
              boxShadow: isOpen ? `0 0 60px color-mix(in srgb, ${activeItem.color} 60%, transparent)` : `0 0 30px color-mix(in srgb, ${activeItem.color} 30%, transparent)`
            }}
            style={{
              position: 'absolute',
              left: '50%', top: '50%',
              x: '-50%', y: '-50%', // Framer Motion handles translation cleanly this way
              width: hubSize,
              height: hubSize,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              zIndex: 20,
              willChange: 'transform',
              background: 'linear-gradient(135deg, var(--s0), var(--s2))',
              border: `1px solid color-mix(in srgb, ${activeItem.color} 30%, transparent)`,
              boxShadow: isOpen ? '0 20px 80px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.1)' : 'var(--sh-lg), inset 0 1px 0 rgba(255,255,255,0.05)'
            }}
          >
            <span className="material-symbols-outlined" style={{
              fontSize: isDesktop ? 28 : 26,
              color: activeItem.color,
              fontVariationSettings: "'FILL' 1, 'wght' 600, 'GRAD' 200, 'opsz' 28",
              filter: `drop-shadow(0 0 6px color-mix(in srgb, ${activeItem.color} 30%, transparent))`,
              transition: 'all 300ms ease'
            }}>
              {isOpen ? 'close' : activeItem.icon}
            </span>

            {/* Rotating Dotted Aura Ring */}
            <motion.div
              animate={isOpen ? { rotate: 360 } : { rotate: 0 }}
              transition={isOpen ? { duration: 20, repeat: Infinity, ease: "linear" } : { duration: 0.5 }}
              style={{
                position: 'absolute',
                inset: -9,
                borderRadius: '50%',
                pointerEvents: 'none',
                zIndex: -1
              }}
            >
              <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                <defs>
                  <linearGradient id="aura-ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <motion.stop 
                      offset="0%" 
                      animate={{ 
                        stopColor: [
                          activeItem.color, 
                          '#a855f7', // Luxury Purple
                          '#3b82f6', // Premium Blue
                          '#2dd4bf', // Teal
                          activeItem.color
                        ] 
                      }}
                      transition={{ duration: 40, repeat: Infinity, ease: "easeInOut" }}
                    />
                    <motion.stop 
                      offset="100%" 
                      animate={{ 
                        stopColor: [
                          '#3b82f6', 
                          '#2dd4bf', 
                          activeItem.color, 
                          '#a855f7', 
                          '#3b82f6'
                        ] 
                      }}
                      transition={{ duration: 40, repeat: Infinity, ease: "easeInOut" }}
                    />
                  </linearGradient>
                </defs>
                <circle
                  cx="50"
                  cy="50"
                  r="46"
                  fill="none"
                  stroke="url(#aura-ring-grad)"
                  strokeWidth="2.5"
                  strokeDasharray="1 6"
                  strokeLinecap="round"
                  style={{ 
                    filter: 'drop-shadow(0 0 3px color-mix(in srgb, var(--p) 20%, transparent))',
                    opacity: 0.7
                  }}
                />
              </svg>
            </motion.div>

            {/* Chat Trigger (Only if open) */}
            <AnimatePresence>
              {isOpen && (
                <motion.button
                  initial={{ scale: 0, x: -30, opacity: 0 }}
                  animate={{ scale: 1, x: -60, opacity: 1 }}
                  exit={{ scale: 0, x: -30, opacity: 0 }}
                  onClick={(e) => { e.stopPropagation(); setShowChat(true); setIsOpen(false); }}
                  style={{
                    position: 'absolute',
                    width: 32, height: 32, borderRadius: '50%',
                    background: 'var(--s1)', border: '1px solid var(--p)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--p)', cursor: 'pointer', zIndex: 30,
                    boxShadow: '0 4px 12px rgba(9,205,131,0.3)'
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>chat</span>
                </motion.button>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </motion.div>

      {/* Aura Chat Interface */}
      <AnimatePresence>
        {showChat && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--overlay)', padding: 16 }}
            onClick={() => setShowChat(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              style={{ width: '100%', maxWidth: 440, height: 'min(650px, 85dvh)', background: 'var(--s2)', borderRadius: 'var(--r-xl)', border: '1px solid var(--card-b-h)', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: 'var(--modal-sh)' }}
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
                <button onClick={() => setShowChat(false)} className="icon-btn"><span className="material-symbols-outlined">close</span></button>
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
                    <div style={{ display: 'flex', gap: 4 }}>
                      {[0, 1, 2].map(d => <motion.div key={d} animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: d * 0.2 }} style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--t4)' }} />)}
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
                <button type="submit" disabled={!chatMsg.trim() || isTyping} className="btn btn-primary" style={{ width: 44, height: 44, borderRadius: '50%', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>send</span>
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default memo(AuraDial);
