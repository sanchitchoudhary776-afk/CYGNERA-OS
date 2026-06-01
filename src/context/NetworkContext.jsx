import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';

const NetworkCtx = createContext(null);

export function NetworkProvider({ children }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastOnlineAt, setLastOnlineAt] = useState(navigator.onLine ? Date.now() : null);
  const wasOnline = useRef(navigator.onLine);

  useEffect(() => {
    const goOnline = () => {
      setIsOnline(true);
      setLastOnlineAt(Date.now());
      if (!wasOnline.current) {
        toast.success('Back online — syncing your data', {
          icon: '🟢',
          style: { background: 'var(--s2)', color: 'var(--t1)', border: '1px solid rgba(9,205,131,0.3)' }
        });
      }
      wasOnline.current = true;
    };

    const goOffline = () => {
      setIsOnline(false);
      wasOnline.current = false;
      toast('You\'re offline — working locally', {
        icon: '📡',
        duration: 4000,
        style: { background: 'var(--s2)', color: 'var(--t1)', border: '1px solid rgba(251,146,60,0.3)' }
      });
    };

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  const value = { isOnline, isOffline: !isOnline, lastOnlineAt };

  return <NetworkCtx.Provider value={value}>{children}</NetworkCtx.Provider>;
}

export const useNetwork = () => {
  const ctx = useContext(NetworkCtx);
  if (!ctx) throw new Error('useNetwork must be inside NetworkProvider');
  return ctx;
};
