import { useEffect } from 'react';
import AppLayout from './AppLayout';

/**
 * DesktopShell
 * Integrates Tauri native desktop API features dynamically.
 */
export default function DesktopShell({ children }) {
  useEffect(() => {
    let active = true;

    async function initDesktop() {
      try {
        // Tauri 2.x API for desktop window management
        const { getCurrentWindow } = await import('@tauri-apps/api/window');
        
        if (!active) return;
        
        const appWindow = getCurrentWindow();
        console.log('[DesktopShell] Running inside Tauri Desktop context:', appWindow.label);
      } catch (err) {
        console.log('[DesktopShell] Tauri APIs loaded safely in browser desktop fallback.');
      }
    }

    initDesktop();

    return () => {
      active = false;
    };
  }, []);

  return <AppLayout>{children}</AppLayout>;
}
