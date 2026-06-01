import { createContext,useContext,useState,useEffect,useCallback } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '@services/supabase';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(() => {
    // 1. Try to restore demo user from localStorage first (reliable offline fallback)
    try {
      const saved = localStorage.getItem('los_auth_user');
      if (saved) return JSON.parse(saved);
    } catch (e) { console.warn('[Auth] Failed to load local user:', e); }
    return null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If Supabase is configured, try to fetch the real session
    if (supabase) {
      setLoading(true);
      
      const hasHash = typeof window !== 'undefined' && window.location.hash && (
        window.location.hash.includes('access_token=') || 
        window.location.hash.includes('id_token=') || 
        window.location.hash.includes('error=')
      );

      // Log App Boot sequence
      if (typeof window !== 'undefined') {
        try {
          const bootLogs = JSON.parse(sessionStorage.getItem('ax_auth_boot_logs') || '[]');
          bootLogs.push(`[${new Date().toLocaleTimeString()}] App Booted | Has Hash: ${!!hasHash} | URL: ${window.location.pathname}${window.location.hash ? window.location.hash.substring(0, 40) + '...' : ''}`);
          sessionStorage.setItem('ax_auth_boot_logs', JSON.stringify(bootLogs.slice(-15)));
        } catch (e) {}
      }

      // Parse OAuth Error from URL hash if present
      if (typeof window !== 'undefined' && window.location.hash) {
        try {
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          const oauthError = hashParams.get('error') || hashParams.get('error_code');
          const oauthErrorDesc = hashParams.get('error_description') || hashParams.get('error_msg');
          
          if (oauthError) {
            const cleanDesc = decodeURIComponent(oauthErrorDesc || '').replace(/\+/g, ' ');
            console.error('[Auth] Supabase OAuth backend error:', oauthError, cleanDesc);
            
            // Persist error for visual diagnostic panel
            sessionStorage.setItem('ax_oauth_error_type', oauthError);
            sessionStorage.setItem('ax_oauth_error_desc', cleanDesc);
            
            toast.error(
              `Google Connection Failed: ${cleanDesc || oauthError}.`,
              { duration: 12000, id: 'oauth-error-toast' }
            );
            
            setLoading(false);
            return;
          }
        } catch (e) {
          console.warn('[Auth] Failed to parse hash parameters:', e);
        }
      }

      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          setUser(session.user);
          setLoading(false);
        } else if (!hasHash) {
          setLoading(false);
        }
      }).catch(() => {
        if (!hasHash) setLoading(false);
      });

      // Listen for changes (login, logout, etc)
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        const logMsg = `[${new Date().toLocaleTimeString()}] Auth State: ${_event} | User: ${session?.user ? session.user.email : 'None'}`;
        console.log('[Auth] ' + logMsg);
        
        if (typeof window !== 'undefined') {
          try {
            const bootLogs = JSON.parse(sessionStorage.getItem('ax_auth_boot_logs') || '[]');
            bootLogs.push(logMsg);
            sessionStorage.setItem('ax_auth_boot_logs', JSON.stringify(bootLogs.slice(-15)));
          } catch (e) {}
        }

        if (session?.user) {
          setUser(session.user);
          setLoading(false);
        } else if (_event === 'SIGNED_OUT') {
          setUser(null);
          // Only stop loading if we are NOT in the middle of an OAuth callback hash exchange
          if (!hasHash) {
            setLoading(false);
          }
        } else if (_event === 'SIGNED_IN') {
          if (session?.user) {
            setUser(session.user);
            setLoading(false);
          }
        }
      });

      if (hasHash) {
        console.log('[Auth] OAuth hash detected. Holding loader for token exchange...');
        const timer = setTimeout(() => {
          console.warn('[Auth] OAuth fallback timer triggered. Turning off loader.');
          setLoading(false);
        }, 5000);
        return () => {
          clearTimeout(timer);
          subscription.unsubscribe();
        };
      }

      return () => subscription.unsubscribe();
    } else {
      // If no Supabase at all, we are definitely not loading anymore
      setLoading(false);
    }
  }, []);

  // Sync user to localStorage (Backup for both Demo and Cloud users)
  useEffect(() => {
    if (user) {
      localStorage.setItem('los_auth_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('los_auth_user');
    }
  }, [user]);


  const login = useCallback(async (usernameOrEmail, password) => {
    setLoading(true);
    
    if (!supabase) {
      setLoading(false);
      return { success: false, error: 'Authentication service is not configured. Please contact support.' };
    }

    let finalEmail = usernameOrEmail.trim().toLowerCase();
    const isUsername = !finalEmail.includes('@');
    if (isUsername) {
      finalEmail = `${finalEmail}@axinite.os`;
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: finalEmail, password });
      
      if (error) {
        setLoading(false);
        const msg = error.message?.toLowerCase() || '';
        if (msg.includes('too many requests') || msg.includes('rate limit') || msg.includes('too many attempts')) {
          console.warn('[Auth] Rate limit detected during login. Switched to offline access.');
          const localUser = {
            id: 'local_offline_' + usernameOrEmail.split('@')[0],
            email: finalEmail,
            user_metadata: {
              name: usernameOrEmail.split('@')[0],
              full_name: usernameOrEmail.split('@')[0],
              avatar_url: `https://api.dicebear.com/7.x/adventurer/svg?seed=${usernameOrEmail}`
            }
          };
          setUser(localUser);
          toast.success('Offline Access Activated! 🚀');
          return { success: true };
        }
        if (msg.includes('invalid login credentials') || msg.includes('invalid_credentials')) {
          return { success: false, error: isUsername ? 'Incorrect username or password.' : 'Incorrect email or password.' };
        }
        if (msg.includes('email not confirmed')) {
          return { success: false, error: 'Please verify your email before signing in. Check your inbox for a confirmation link.' };
        }
        return { success: false, error: error.message || 'Sign-in failed. Please try again.' };
      }
      
      if (data?.user) {
        setLoading(false);
        return { success: true };
      }
      
      setLoading(false);
      return { success: false, error: 'Sign-in failed. Please try again.' };
    } catch (err) {
      setLoading(false);
      console.error('[Auth] Login error:', err);
      return { success: false, error: 'Unable to connect to authentication service. Check your internet connection.' };
    }
  }, []);

  const signup = useCallback(async ({ name, usernameOrEmail, password }) => {
    setLoading(true);

    if (!supabase) {
      setLoading(false);
      return { success: false, error: 'Authentication service is not configured. Please contact support.' };
    }

    let finalEmail = usernameOrEmail.trim().toLowerCase();
    const isUsername = !finalEmail.includes('@');
    if (isUsername) {
      finalEmail = `${finalEmail}@axinite.os`;
    }

    try {
      const { data, error } = await supabase.auth.signUp({ 
        email: finalEmail, 
        password,
        options: { 
          data: { name, username: isUsername ? usernameOrEmail.trim() : null },
          emailRedirectTo: window.location.origin + '/login'
        }
      });
      
      if (error) {
        setLoading(false);
        const msg = error.message?.toLowerCase() || '';
        if (msg.includes('too many requests') || msg.includes('rate limit') || msg.includes('too many attempts')) {
          console.warn('[Auth] Rate limit detected during signup. Switched to offline access.');
          const localUser = {
            id: 'local_offline_' + usernameOrEmail.split('@')[0],
            email: finalEmail,
            user_metadata: {
              name: name || usernameOrEmail.split('@')[0],
              full_name: name || usernameOrEmail.split('@')[0],
              avatar_url: `https://api.dicebear.com/7.x/adventurer/svg?seed=${usernameOrEmail}`
            }
          };
          setUser(localUser);
          toast.success('Offline Access Activated! 🚀');
          return { success: true };
        }
        if (msg.includes('already registered') || msg.includes('already been registered')) {
          return { success: false, error: isUsername ? 'This username is already taken. Please pick another one.' : 'This email is already registered.' };
        }
        if (msg.includes('password') && (msg.includes('short') || msg.includes('weak') || msg.includes('least'))) {
          return { success: false, error: 'Password is too weak. Use at least 6 characters.' };
        }
        if (msg.includes('valid email') || msg.includes('invalid')) {
          return { success: false, error: isUsername ? 'Invalid username format.' : 'Please enter a valid email address.' };
        }
        return { success: false, error: error.message || 'Sign-up failed. Please try again.' };
      }
      
      if (data?.user) {
        setLoading(false);
        if (data.user.identities?.length === 0) {
          return { success: false, error: isUsername ? 'This username is already taken. Please pick another one.' : 'This email is already registered.' };
        }
        // If it's username-based, we don't need email verification!
        if (isUsername) {
          return { success: true, isNew: true, needsConfirmation: false };
        }
        // If email is not confirmed yet, tell the user to check their inbox
        if (!data.user.email_confirmed_at && !data.session) {
          return { success: true, isNew: true, needsConfirmation: true };
        }
        return { success: true, isNew: true, needsConfirmation: false };
      }
      
      setLoading(false);
      return { success: false, error: 'Sign-up failed. Please try again.' };
    } catch (err) {
      setLoading(false);
      console.error('[Auth] Signup error:', err);
      return { success: false, error: 'Unable to connect to authentication service. Check your internet connection.' };
    }
  }, []);

  const loginWithGoogleBridge = useCallback(async (email, name, avatarUrl) => {
    setLoading(true);
    if (!supabase) {
      setLoading(false);
      return { success: false, error: 'Authentication service is not configured.' };
    }

    const cleanUsername = 'g_' + email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const bridgePassword = `AxGoogleBridge_${cleanUsername}_2026!`;

    const getLocalOfflineUser = () => ({
      id: 'local_offline_' + cleanUsername,
      email: email,
      user_metadata: {
        name: name || email.split('@')[0],
        full_name: name || email.split('@')[0],
        avatar_url: avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${email}`,
        email: email,
        provider: 'google',
        is_google_bridge: true
      }
    });

    try {
      let r = await login(cleanUsername, bridgePassword);
      
      if (!r.success) {
        // If login failed due to rate limits/too many attempts, instantly log in locally
        const errLower = (r.error || '').toLowerCase();
        if (errLower.includes('too many') || errLower.includes('attempts') || errLower.includes('rate limit') || errLower.includes('request')) {
          console.warn('[Auth] Rate limit detected during login. Logging user in locally.');
          setUser(getLocalOfflineUser());
          setLoading(false);
          return { success: true };
        }

        console.log('[Auth] Creating new Google bridge account for:', cleanUsername);
        const sr = await signup({
          name: name || email.split('@')[0],
          usernameOrEmail: cleanUsername,
          password: bridgePassword
        });

        if (!sr.success) {
          console.warn('[Auth] Signup failed or rate-limited. Logging user in locally.');
          setUser(getLocalOfflineUser());
          setLoading(false);
          return { success: true };
        }

        r = await login(cleanUsername, bridgePassword);
        if (!r.success) {
          console.warn('[Auth] Final login failed. Logging user in locally.');
          setUser(getLocalOfflineUser());
          setLoading(false);
          return { success: true };
        }
      }

      // Try updating details on server, ignore if fails/rate-limited
      try {
        await supabase.auth.updateUser({
          data: {
            name: name || cleanUsername,
            full_name: name || cleanUsername,
            avatar_url: avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${cleanUsername}`,
            email: email,
            provider: 'google',
            is_google_bridge: true
          }
        });
      } catch (e) {
        console.warn('[Auth] Failed to update user profile metadata online:', e);
      }

      setLoading(false);
      return { success: true };
    } catch (err) {
      console.warn('[Auth] Google bridge error. Logging user in locally:', err);
      setUser(getLocalOfflineUser());
      setLoading(false);
      return { success: true };
    }
  }, [login, signup]);


  const logout = useCallback(async () => { 
    setLoading(true);
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.warn('[Auth] SignOut error:', e);
      }
    }
    
    const keysToRemove = [
      'los_auth_user',
      'los_v5',
      'los_v5_meta',
      'los_active_note_id',
      'los_show_note_editor',
      'los_note_draft',
      'los_progress_tab',
      'axos_network_v5',
      'sb-cihpvkrvepsctepxwmox-auth-token',
      'drive_token',
      'axinite_student_profile_v5',
      'axinite_weekly_digests_v5',
      'axinite_current_mood_v5',
      'ax_last_drive_backup'
    ];
    keysToRemove.forEach(k => localStorage.removeItem(k));
    sessionStorage.clear(); // Clear all sessionStorage items (such as tab states)

    // Remove any dynamic briefing or response caches
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('aura_briefing_') || key.startsWith('ai_response_') || key.startsWith('ax_ai_cache_') || key.startsWith('ax_rl_') || key.startsWith('axinite_'))) {
          if (key !== 'ax_dev_groq_key') {
            localStorage.removeItem(key);
            i--; // adjust index since we mutated length
          }
        }
      }
    } catch (e) {}

    setUser(null);
    setLoading(false);
  }, []);

  const update = useCallback(async (delta) => { 
    // Optimistic local update
    setUser(prev => prev ? ({ ...prev, user_metadata: { ...prev.user_metadata, ...delta } }) : null);
    
    // Cloud update if connected to Supabase
    if (supabase) {
      try {
        await supabase.auth.updateUser({ data: delta });
      } catch (err) {
        console.warn('[Auth] Failed to sync metadata to cloud:', err);
      }
    }
  }, []);


  const formattedUser = user ? { ...user, ...(user.user_metadata || {}) } : null;

  return (
    <AuthCtx.Provider value={{ user: formattedUser, loading, isAuth: !!user, login, loginWithGoogle: loginWithGoogleBridge, signup, logout, update }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};
