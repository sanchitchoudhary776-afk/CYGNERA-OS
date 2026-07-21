import { useState, useEffect } from 'react';

/**
 * AXINITE OS · Platform Detection Utility
 * Detects the runtime environment and provides clean features hooks.
 * Includes dynamic hooks for React component responsive layouts.
 */

export const isCapacitor = typeof window !== 'undefined' && !!window.Capacitor;
export const isTauri = typeof window !== 'undefined' && (!!window.__TAURI__ || !!window.__TAURI_METADATA__);
export const isWeb = !isCapacitor && !isTauri;

export const getPlatformType = () => {
  if (isCapacitor) {
    // Use layout width as a high-fidelity proxy for tablet vs mobile
    const isTablet = window.innerWidth >= 768 && window.innerWidth < 1024;
    return isTablet ? 'tablet' : 'mobile';
  }
  if (isTauri) {
    return 'desktop';
  }
  return 'web';
};

export const platformType = getPlatformType();

// Static fallback flags (evaluated on load)
export const isMobile = platformType === 'mobile';
export const isTablet = platformType === 'tablet';
export const isDesktop = platformType === 'desktop' || (!isCapacitor && window.innerWidth >= 1024);

// Dynamic React Hooks for responsive layout switching
export function useIsMobile() {
  const [isMob, setIsMob] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const fn = () => setIsMob(window.innerWidth < 768);
    window.addEventListener('resize', fn, { passive: true });
    return () => window.removeEventListener('resize', fn);
  }, []);

  return isMob;
}

export function useIsDesktop() {
  const [isDesk, setIsDesk] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 1024);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const fn = () => setIsDesk(window.innerWidth >= 1024);
    window.addEventListener('resize', fn, { passive: true });
    return () => window.removeEventListener('resize', fn);
  }, []);

  return isDesk;
}
