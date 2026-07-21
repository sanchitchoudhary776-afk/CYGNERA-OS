import { useEffect } from 'react';
import AppLayout from './AppLayout';

/**
 * MobileShell
 * Dynamically loads and configures native mobile features inside Capacitor.
 * Uses dynamic imports to guarantee native code chunks are isolated.
 */
export default function MobileShell({ children }) {
  useEffect(() => {
    let active = true;

    async function initMobile() {
      try {
        // Dynamic imports ensure these packages are code-split and only loaded on mobile runtimes
        const { App } = await import('@capacitor/app');
        const { StatusBar, Style } = await import('@capacitor/status-bar');

        if (!active) return;

        // Custom status bar matching AXINITE OS dark mode aesthetics
        await StatusBar.setStyle({ style: Style.Dark });
        await StatusBar.setBackgroundColor({ color: '#090a10' });

        // Register Android back button listener to gracefully close panels or exit
        App.addListener('backButton', ({ canGoBack }) => {
          if (canGoBack) {
            window.history.back();
          } else {
            App.exitApp();
          }
        });

        console.log('[MobileShell] Capacitor environment initialized successfully.');
      } catch (err) {
        console.log('[MobileShell] Capacitor wrappers loaded safely in fallback webview:', err.message);
      }
    }

    initMobile();

    return () => {
      active = false;
    };
  }, []);

  return <AppLayout>{children}</AppLayout>;
}
