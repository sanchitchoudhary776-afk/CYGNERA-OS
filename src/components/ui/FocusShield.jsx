import { useFocusShield } from '@context/FocusShieldContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';

export default function FocusShield() {
  const { showShield, showFullscreenPrompt, reEnterFullscreen, violations, sessionViolations, dismissShield, isActive, settings } = useFocusShield();

  const lastViolation = sessionViolations[sessionViolations.length - 1];
  const awaySeconds = lastViolation?.duration || 0;

  // Haptic vibration on breach for mobile/tablet
  useEffect(() => {
    if (isActive && showShield && navigator.vibrate) {
      navigator.vibrate([200, 100, 200, 100, 300]);
    }
  }, [isActive, showShield]);

  return (
    <>
      {/* ── Fullscreen Re-lock Overlay ── */}
      <AnimatePresence>
        {showFullscreenPrompt && isActive && (
          <motion.div
            key="fs-prompt"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 999999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(0, 0, 0, 0.96)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              padding: '20px',
              overflowY: 'auto',
            }}
          >
            {/* Pulsing border */}
            <div style={{
              position: 'absolute', inset: 0,
              border: '4px solid rgba(96,165,250,0.35)',
              animation: 'fsPulse 2.5s ease-in-out infinite',
              pointerEvents: 'none',
            }} />

            <motion.div
              initial={{ scale: 0.85, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 280, damping: 22 }}
              style={{
                width: '100%',
                maxWidth: 420,
                padding: 'clamp(28px, 5vw, 52px) clamp(20px, 4vw, 40px)',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 'clamp(14px, 3vw, 22px)',
              }}
            >
              {/* Lock Icon */}
              <motion.div
                animate={{ scale: [1, 1.12, 1] }}
                transition={{ duration: 2.5, repeat: Infinity }}
                style={{
                  width: 'clamp(60px, 12vw, 80px)',
                  height: 'clamp(60px, 12vw, 80px)',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, rgba(96,165,250,0.15), rgba(59,130,246,0.06))',
                  border: '2px solid rgba(96,165,250,0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 50px rgba(96,165,250,0.15)',
                }}
              >
                <span className="material-symbols-outlined" style={{
                  fontSize: 'clamp(28px, 6vw, 38px)',
                  color: '#60a5fa',
                  fontVariationSettings: "'FILL' 1",
                }}>lock</span>
              </motion.div>

              {/* Title */}
              <div>
                <h2 style={{
                  fontSize: 'clamp(18px, 4vw, 24px)',
                  fontWeight: 900,
                  color: '#60a5fa',
                  letterSpacing: '-0.03em',
                  margin: 0,
                  lineHeight: 1.2,
                }}>Fullscreen Lock Active</h2>
                <p style={{
                  fontSize: 'clamp(12px, 2.5vw, 14px)',
                  color: 'rgba(255,255,255,0.45)',
                  marginTop: 10,
                  lineHeight: 1.6,
                }}>
                  You exited fullscreen, but Focus Shield requires it.
                  Click the button below to continue your focus session.
                </p>
              </div>

              {/* Re-enter Button */}
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={reEnterFullscreen}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  width: '100%',
                  padding: 'clamp(14px, 3vw, 16px) 32px',
                  borderRadius: 14,
                  border: 'none',
                  background: 'linear-gradient(135deg, rgba(96,165,250,0.25), rgba(59,130,246,0.12))',
                  color: '#60a5fa',
                  fontSize: 'clamp(14px, 2.8vw, 16px)',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 8px 28px rgba(96,165,250,0.18), inset 0 1px 0 rgba(255,255,255,0.06)',
                  letterSpacing: '0.02em',
                  WebkitTapHighlightColor: 'transparent',
                  minHeight: 48,
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 22, fontVariationSettings: "'FILL' 1" }}>fullscreen</span>
                Return to Fullscreen
              </motion.button>

              <p style={{
                fontSize: 11,
                color: 'rgba(255,255,255,0.18)',
                marginTop: 2,
              }}>
                You cannot use the app outside fullscreen while Focus Shield is on.
              </p>
            </motion.div>

            <style>{`
              @keyframes fsPulse {
                0%, 100% { border-color: rgba(96,165,250,0.2); }
                50% { border-color: rgba(96,165,250,0.5); }
              }
            `}</style>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Focus Breach Overlay ── */}
      <AnimatePresence>
        {isActive && showShield && (
          <motion.div
            key="breach"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 99999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(0, 0, 0, 0.92)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              padding: '16px',
              overflowY: 'auto',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {/* Animated red border pulse */}
            <div style={{
              position: 'absolute', inset: 0,
              border: '3px solid rgba(255, 107, 107, 0.4)',
              animation: 'shieldPulse 2s ease-in-out infinite',
              pointerEvents: 'none',
            }} />

            <motion.div
              initial={{ scale: 0.8, y: 40 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              style={{
                width: '100%',
                maxWidth: 480,
                padding: 'clamp(24px, 5vw, 48px) clamp(20px, 4vw, 40px)',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 'clamp(16px, 3vw, 24px)',
              }}
            >
              {/* Shield Icon */}
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                style={{
                  width: 'clamp(64px, 14vw, 88px)',
                  height: 'clamp(64px, 14vw, 88px)',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, rgba(255,107,107,0.15), rgba(255,60,60,0.05))',
                  border: '2px solid rgba(255,107,107,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 40px rgba(255,107,107,0.15)',
                }}
              >
                <span className="material-symbols-outlined" style={{
                  fontSize: 'clamp(30px, 7vw, 42px)',
                  color: '#ff6b6b',
                  fontVariationSettings: "'FILL' 1",
                }}>shield</span>
              </motion.div>

              {/* Title */}
              <div>
                <h2 style={{
                  fontSize: 'clamp(20px, 4.5vw, 28px)',
                  fontWeight: 900,
                  color: '#ff6b6b',
                  letterSpacing: '-0.03em',
                  margin: 0,
                  lineHeight: 1.2,
                }}>Focus Breach Detected</h2>
                <p style={{
                  fontSize: 'clamp(12px, 2.5vw, 15px)',
                  color: 'rgba(255,255,255,0.5)',
                  marginTop: 10,
                  lineHeight: 1.6,
                }}>
                  You left your focus zone for <strong style={{ color: '#ff6b6b' }}>{awaySeconds}s</strong>.
                  Stay disciplined — your goals are worth it.
                </p>
              </div>

              {/* Violation Counter */}
              <div style={{
                display: 'flex',
                gap: 'clamp(16px, 3vw, 24px)',
                padding: 'clamp(12px, 2vw, 18px) clamp(20px, 4vw, 32px)',
                borderRadius: 16,
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: 'clamp(22px, 5vw, 28px)', fontWeight: 900, color: '#ff6b6b', lineHeight: 1 }}>{violations}</p>
                  <p style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 4 }}>Violations</p>
                </div>
                <div style={{ width: 1, background: 'rgba(255,255,255,0.06)' }} />
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: 'clamp(22px, 5vw, 28px)', fontWeight: 900, color: '#fb923c', lineHeight: 1 }}>{awaySeconds}s</p>
                  <p style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 4 }}>Away Time</p>
                </div>
              </div>

              {/* Blocked Sites Reminder */}
              {settings.blockedSites.length > 0 && (
                <div style={{
                  padding: 'clamp(10px, 2vw, 14px) clamp(14px, 3vw, 20px)',
                  borderRadius: 12,
                  background: 'rgba(255,107,107,0.05)',
                  border: '1px solid rgba(255,107,107,0.12)',
                  width: '100%',
                }}>
                  <p style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 14, verticalAlign: 'middle', marginRight: 4 }}>block</span>
                    Blocked During Focus
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {settings.blockedSites.slice(0, 8).map(site => (
                      <span key={site} style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '4px 10px',
                        borderRadius: 99,
                        background: 'rgba(255,107,107,0.08)',
                        color: 'rgba(255,107,107,0.7)',
                        border: '1px solid rgba(255,107,107,0.15)',
                      }}>{site}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Return Button */}
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={dismissShield}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  width: '100%',
                  padding: 'clamp(14px, 3vw, 16px) 32px',
                  borderRadius: 14,
                  border: 'none',
                  background: 'linear-gradient(135deg, rgba(9,205,131,0.2), rgba(6,182,212,0.1))',
                  color: 'var(--p)',
                  fontSize: 'clamp(14px, 2.8vw, 16px)',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 8px 24px rgba(9,205,131,0.15), inset 0 1px 0 rgba(255,255,255,0.05)',
                  letterSpacing: '0.02em',
                  WebkitTapHighlightColor: 'transparent',
                  minHeight: 48,
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 22, fontVariationSettings: "'FILL' 1" }}>arrow_back</span>
                Return to Focus
              </motion.button>

              {/* Motivational footer */}
              <p style={{
                fontSize: 'clamp(10px, 2vw, 12px)',
                color: 'rgba(255,255,255,0.2)',
                fontStyle: 'italic',
                marginTop: 4,
              }}>
                "Discipline is choosing between what you want now and what you want most."
              </p>
            </motion.div>

            <style>{`
              @keyframes shieldPulse {
                0%, 100% { border-color: rgba(255, 107, 107, 0.2); }
                50% { border-color: rgba(255, 107, 107, 0.5); }
              }
            `}</style>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
