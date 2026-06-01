import { useNetwork } from '@context/NetworkContext';
import { AnimatePresence, motion } from 'framer-motion';

export default function OfflineBanner() {
  const { isOffline } = useNetwork();

  return (
    <AnimatePresence>
      {isOffline && (
        <motion.div
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            padding: '10px 20px',
            background: 'linear-gradient(135deg, rgba(251,146,60,0.15), rgba(234,179,8,0.08))',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderBottom: '1px solid rgba(251,146,60,0.25)',
            color: '#fb923c',
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: '0.02em',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}>wifi_off</span>
          <span>You're offline — AI, Network & Sync are paused</span>
          <span style={{
            fontSize: 10,
            fontWeight: 800,
            padding: '3px 10px',
            borderRadius: 99,
            background: 'rgba(251,146,60,0.12)',
            border: '1px solid rgba(251,146,60,0.2)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}>LOCAL MODE</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
