import { createContext,useContext,useState,useEffect,useCallback } from 'react';
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
  const [loading, setLoading] = useState(!!supabase);

  useEffect(() => {
    // If Supabase is configured, try to fetch the real session
    if (supabase) {
      setLoading(true);
      supabase.auth.getSession().then(({ data: { session } }) => {
        // If we found a real session, use it (overwrites demo user)
        if (session?.user) {
          setUser(session.user);
        }
        setLoading(false);
      }).catch(() => setLoading(false));

      // Listen for changes (login, logout, etc)
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) setUser(session.user);
        else if (_event === 'SIGNED_OUT') setUser(null);
      });

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


  const login = useCallback(async (email, password) => {
    setLoading(true);
    
    // If Supabase is configured, try real auth first
    if (supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (!error && data?.user) {
          setLoading(false);
          return { success: true };
        }
        // If Supabase fails, fall through to demo mode
        console.warn('[Auth] Supabase auth failed, falling back to demo mode:', error?.message);
      } catch (err) {
        console.warn('[Auth] Supabase unreachable, using demo mode:', err.message);
      }
    }
    
    // Demo mode — any email + password >= 6 chars
    if (password.length >= 6) {
      const name = email.split('@')[0].replace(/[^a-zA-Z]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || 'Student';
      const dummyUser = { 
        id: 'demo-' + Date.now(), 
        email, 
        user_metadata: { name } 
      };
      setUser(dummyUser);
      setLoading(false);
      return { success: true };
    }

    setLoading(false);
    return { success: false, error: 'Password must be at least 6 characters.' };
  }, []);

  const signup = useCallback(async ({ name, email, password }) => {
    setLoading(true);

    // If Supabase is configured, try real signup first
    if (supabase) {
      try {
        const { data, error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: { data: { name } }
        });
        if (!error && data?.user) {
          setLoading(false);
          return { success: true, isNew: true };
        }
        console.warn('[Auth] Supabase signup failed, falling back to demo mode:', error?.message);
      } catch (err) {
        console.warn('[Auth] Supabase unreachable, using demo mode:', err.message);
      }
    }
    
    // Demo mode fallback
    if (password.length >= 6) {
      const dummyUser = { 
        id: 'demo-' + Date.now(), 
        email, 
        user_metadata: { name: name || 'Student' } 
      };
      setUser(dummyUser);
      setLoading(false);
      return { success: true, isNew: true };
    }

    setLoading(false);
    return { success: false, error: 'Password must be at least 6 characters.' };
  }, []);


  const logout = useCallback(async () => { 
    setLoading(true);
    if (supabase) await supabase.auth.signOut();
    setUser(null);
    if (!supabase) localStorage.removeItem('los_auth_user');
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
    <AuthCtx.Provider value={{ user: formattedUser, loading, isAuth: !!user, login, signup, logout, update }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};
