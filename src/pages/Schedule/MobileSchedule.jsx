import { useState, useMemo, memo } from 'react';
import { SUBJECT_COLORS } from '@utils';
import toast from 'react-hot-toast';

// ── Session Pill (Mobile Optimized) ────────────
function MobileSessionPill({ session, onDelete }) {
  const color = SUBJECT_COLORS[session.subject] || 'var(--p)';
  const [h, m] = session.startTime.split(':').map(Number);
  const diff = h >= 5 ? h - 5 : h + 19;
  const topPx = diff * 64 + (m / 60) * 64;
  const heightPx = Math.max((session.durationMinutes / 60) * 64, 32);

  return (
    <div 
      onClick={e => { 
        e.stopPropagation(); 
        if (window.confirm(`Delete "${session.topic}"?`)) onDelete(session.id); 
      }}
      style={{ 
        position: 'absolute', left: 4, right: 4, top: `${topPx}px`, height: `${heightPx}px`, 
        background: `${color}1e`, border: `1.5px solid ${color}45`, borderLeft: `4px solid ${color}`, 
        borderRadius: '12px', padding: '6px 10px', cursor: 'pointer', overflow: 'hidden', 
        transition: 'all 200ms ease', zIndex: 2,
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p style={{ fontSize: 11, fontWeight: 800, color, textTransform: 'uppercase', letterSpacing: '0.02em', margin: 0 }}>{session.subject}</p>
        <span style={{ fontSize: 9, color: 'var(--t4)', fontWeight: 700 }}>{session.startTime} · {session.durationMinutes}m</span>
      </div>
      {heightPx > 46 && (
        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--t1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: '4px 0 0 0' }}>
          {session.topic}
        </p>
      )}
    </div>
  );
}

export default function MobileSchedule({ 
  weekDates, 
  sessionsForDay, 
  today, 
  HOURS, 
  DAYS_SHORT, 
  DAYS_FULL,
  onDeleteSession, 
  onAddSession,
  activeMobileDay,
  setActiveMobileDay
}) {
  const activeSessions = useMemo(() => sessionsForDay(activeMobileDay), [sessionsForDay, activeMobileDay]);
  const activeDayIndex = useMemo(() => {
    const dateObj = new Date(activeMobileDay);
    const day = dateObj.getDay(); // 0 = Sun, 1 = Mon
    return day === 0 ? 6 : day - 1;
  }, [activeMobileDay]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }} className="fadeup">
      
      {/* Day Selector Chips */}
      <div 
        className="mobile-calendar-nav"
        style={{
          display: 'flex',
          gap: 6,
          overflowX: 'auto',
          scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch',
          padding: '4px 2px',
          width: '100%'
        }}
      >
        {weekDates.map((d, i) => {
          const dayKey = d.toISOString().slice(0, 10);
          const isActive = dayKey === activeMobileDay;
          const isT = dayKey === today;
          const count = sessionsForDay(dayKey).length;

          return (
            <div
              key={i}
              className={`mobile-calendar-nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setActiveMobileDay(dayKey)}
              style={{
                borderRadius: '14px',
                padding: '8px 4px',
                minWidth: '40px',
                flex: '1 1 auto',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                cursor: 'pointer',
                background: isActive ? 'var(--p-sub)' : 'var(--s2)',
                border: isActive ? '1px solid var(--p)' : '1px solid var(--surface-b)',
                transition: 'all 0.2s ease'
              }}
            >
              <span style={{ fontSize: 9, fontWeight: isActive ? 800 : 600, color: isActive ? 'var(--p)' : 'var(--t4)', textTransform: 'uppercase' }}>
                {DAYS_SHORT[i]}
              </span>
              <div style={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                background: isT ? 'var(--p)' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '2px 0',
                boxShadow: isT ? '0 0 8px rgba(9,205,131,0.3)' : 'none'
              }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: isT ? 'var(--bg-deep)' : (isActive ? 'var(--p)' : 'var(--t2)') }}>
                  {d.getDate()}
                </span>
              </div>
              {count > 0 && (
                <div style={{ width: 4, height: 4, borderRadius: '50%', background: isActive ? 'var(--p)' : 'var(--t4)', marginTop: 1 }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Timeline Header Label */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '4px 2px' }}>
        <p className="section-label" style={{ margin: 0, fontSize: 13, fontWeight: 800, color: 'var(--t1)' }}>
          {activeMobileDay === today ? "Today's Time Slots" : `${DAYS_FULL[activeDayIndex]}'s Time Slots`}
        </p>
        <span style={{ fontSize: 11, color: 'var(--t4)', fontWeight: 700 }}>
          {activeSessions.length} sessions
        </span>
      </div>

      {/* Interactive Single-Day Timeline Calendar Column */}
      <div className="card" style={{ padding: '12px 6px', background: 'var(--s2)', border: '1px solid var(--surface-b)', borderRadius: '16px' }}>
        
        {/* Helper Tip */}
        <div style={{ padding: '0 8px 10px 8px', display: 'flex', alignItems: 'center', gap: 6, borderBottom: '1px solid var(--surface-b)' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 14, color: 'var(--p)' }}>info</span>
          <span style={{ fontSize: 10, color: 'var(--t4)', fontWeight: 600 }}>Tap any empty time slot block below to schedule a session.</span>
        </div>

        {/* Timeline Grid Container */}
        <div style={{ overflowY: 'auto', maxHeight: 480, WebkitOverflowScrolling: 'touch', position: 'relative', marginTop: 8 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '50px 1fr', position: 'relative' }}>
            
            {/* Hour labels (Left Column) */}
            <div style={{ borderRight: '1px solid rgba(255, 255, 255, 0.05)' }}>
              {HOURS.map(h => (
                <div key={h} style={{ height: 64, display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', padding: '4px 8px 0 0' }}>
                  <span style={{ fontSize: 9.5, color: 'var(--t4)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                    {h}:00
                  </span>
                </div>
              ))}
            </div>

            {/* Interactive Grid & Pills Area (Right Column) */}
            <div style={{ position: 'relative', height: `${HOURS.length * 64}px` }}>
              
              {/* Slot lines */}
              {HOURS.flatMap((h, ti) => [
                { time: `${h}:00`, top: ti * 64, border: '1px dashed rgba(255, 255, 255, 0.03)' },
                { time: `${h}:30`, top: ti * 64 + 32, border: '1px solid var(--surface-b)' }
              ]).map((slot, ti) => (
                <div 
                  key={ti}
                  style={{ 
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    top: `${slot.top}px`, 
                    height: '32px', 
                    borderBottom: slot.border,
                    cursor: 'pointer',
                    zIndex: 1,
                    transition: 'background 100ms ease'
                  }}
                  onClick={() => onAddSession(activeMobileDay, slot.time)}
                  onTouchStart={e => e.currentTarget.style.background = 'rgba(9, 205, 131, 0.05)'}
                  onTouchEnd={e => e.currentTarget.style.background = 'transparent'}
                />
              ))}

              {/* Scheduled Session Pills */}
              {activeSessions.map(s => (
                <MobileSessionPill 
                  key={s.id} 
                  session={s} 
                  onDelete={onDeleteSession}
                />
              ))}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
