import { memo } from 'react';
import { SUBJECT_COLORS } from '@utils';
import toast from 'react-hot-toast';

// ── Session Pill (in calendar) ────────────────
function SessionPill({ session, onDelete }) {
  const color   = SUBJECT_COLORS[session.subject] || 'var(--p)';
  const [h,m]   = session.startTime.split(':').map(Number);
  const diff    = h >= 5 ? h - 5 : h + 19;
  const topPx   = diff * 64 + (m/60)*64;
  const heightPx= Math.max((session.durationMinutes / 60) * 64, 28);

  return (
    <div 
      onClick={e => { 
        e.stopPropagation(); 
        if (window.confirm(`Delete "${session.topic}"?`)) onDelete(session.id); 
      }}
      style={{ 
        position:'absolute', left:2, right:2, top:`${topPx}px`, height:`${heightPx}px`, 
        background:`${color}18`, border:`1px solid ${color}45`, borderLeft:`3px solid ${color}`, 
        borderRadius:'var(--r-sm)', padding:'3px 7px', cursor:'pointer', overflow:'hidden', 
        transition:'all 200ms ease', zIndex:2 
      }}
      onMouseEnter={e => { 
        e.currentTarget.style.background = `${color}28`; 
        e.currentTarget.style.boxShadow = `0 4px 12px ${color}30`; 
      }}
      onMouseLeave={e => { 
        e.currentTarget.style.background = `${color}18`; 
        e.currentTarget.style.boxShadow = 'none'; 
      }}
    >
      <p style={{ fontSize:11, fontWeight:700, color, lineHeight:1.2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{session.subject}</p>
      {heightPx > 44 && <p style={{ fontSize:10, color:'var(--t3)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{session.topic}</p>}
      {heightPx > 62 && <p style={{ fontSize:10, color:'var(--t4)' }}>{session.startTime} · {session.durationMinutes}m</p>}
    </div>
  );
}

export default function DesktopSchedule({ weekDates, sessionsForDay, today, HOURS, DAYS_SHORT, onDeleteSession, onAddSession }) {
  return (
    <div className="card fadeup d4" style={{ padding:0, overflow:'hidden', background: 'var(--s2)', border: '1px solid var(--surface-b)' }}>
      {/* Day headers */}
      <div style={{ display:'grid', gridTemplateColumns:'48px repeat(7,1fr)', borderBottom:'1px solid var(--surface-b)' }}>
        <div style={{ padding:'12px 6px' }}/>
        {weekDates.map((d, i) => {
          const isT = d.toISOString().slice(0,10) === today;
          return (
            <div key={i} style={{ padding:'10px 4px', textAlign:'center', borderLeft:'1px solid var(--surface-b)' }}>
              <p style={{ fontSize:10, fontWeight:700, color:'var(--t4)', textTransform:'uppercase', letterSpacing:'0.05em' }}>{DAYS_SHORT[i]}</p>
              <div style={{ width:28, height:28, borderRadius:'50%', margin:'4px auto 0', background:isT?'var(--p)':'transparent', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:isT?'0 0 12px rgba(9,205,131,0.5)':'none' }}>
                <p style={{ fontSize:13, fontWeight:800, color:isT?'var(--bg-deep)':'var(--t2)' }}>{d.getDate()}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Time grid */}
      <div style={{ overflowY:'auto', maxHeight:520, overflowX:'auto' }}>
        <div style={{ display:'grid', gridTemplateColumns:'48px repeat(7,minmax(80px,1fr))', minWidth:640 }}>
          {/* Hour labels */}
          <div>
            {HOURS.map(h => (
              <div key={h} style={{ height:64, display:'flex', alignItems:'flex-start', padding:'4px 8px 0', borderBottom:'1px solid var(--surface-b)' }}>
                <span style={{ fontSize:9.5, color:'var(--t4)', fontWeight:600, fontVariantNumeric:'tabular-nums' }}>{h}:00</span>
              </div>
            ))}
          </div>
          {/* Day columns */}
          {weekDates.map((d, i) => {
            const dayKey  = d.toISOString().slice(0,10);
            const isTodayColumn = dayKey === today;
            const daySess = sessionsForDay(dayKey);
            return (
              <div 
                key={i}
                style={{ 
                  borderLeft:'1px solid var(--surface-b)', position:'relative', 
                  height:`${HOURS.length*64}px`, background:isTodayColumn?'rgba(9,205,131,0.018)':'transparent' 
                }}
              >
                {/* Hour cells */}
                {HOURS.flatMap((h, ti) => [
                  { time: `${h}:00`, top: ti * 64, border: '1px dashed rgba(255, 255, 255, 0.05)' },
                  { time: `${h}:30`, top: ti * 64 + 32, border: '1px solid var(--surface-b)' }
                ]).map((slot, ti) => (
                  <div 
                    key={ti}
                    className="calendar-hour-cell"
                    style={{ 
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      top: `${slot.top}px`, 
                      height: '32px', 
                      borderBottom: slot.border,
                      cursor: 'pointer',
                      zIndex: 1
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddSession(dayKey, slot.time);
                    }}
                  />
                ))}
                {/* Sessions */}
                {daySess.map(s => (
                  <SessionPill 
                    key={s.id} 
                    session={s} 
                    onDelete={onDeleteSession}
                  />
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
