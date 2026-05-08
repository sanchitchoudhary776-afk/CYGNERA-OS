import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// ── Graceful Client Creation ────────────────────────────
// Prevents the entire app from crashing if env vars are missing
let supabaseClient = null;
try {
  if (supabaseUrl && supabaseKey && supabaseUrl !== 'your_supabase_url_here') {
    supabaseClient = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      realtime: { params: { eventsPerSecond: 2 } },
      global: {
        headers: { 'x-app-version': import.meta.env.VITE_APP_VERSION || '1.0.0' }
      }
    });
  } else {
    console.warn('[Supabase] Missing or placeholder credentials — running in offline mode');
  }
} catch (err) {
  console.error('[Supabase] Client creation failed:', err);
}

export const supabase = supabaseClient;

// ── Connection Health ───────────────────────────────────
let _isOnline = navigator.onLine;
let _lastSuccessfulSync = 0;

window.addEventListener('online', () => { _isOnline = true; });
window.addEventListener('offline', () => { _isOnline = false; });

export const connectionStatus = {
  get isOnline() { return _isOnline; },
  get isConfigured() { return !!supabaseClient; },
  get lastSync() { return _lastSuccessfulSync; },
  get canSync() { return _isOnline && !!supabaseClient; },
};

// ── Retry Logic with Exponential Backoff ────────────────
const MAX_RETRIES = 3;
const BASE_DELAY = 500; // ms

async function withRetry(fn, retries = MAX_RETRIES) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const result = await fn();
      return result;
    } catch (err) {
      const isLastAttempt = attempt === retries - 1;
      const isRetryable = err?.status === 429 || err?.status >= 500 || err?.message?.includes('fetch');
      
      if (isLastAttempt || !isRetryable) throw err;
      
      const delay = BASE_DELAY * Math.pow(2, attempt) + Math.random() * 200;
      console.warn(`[Supabase] Attempt ${attempt + 1} failed, retrying in ${Math.round(delay)}ms...`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

// ── Database Operations ─────────────────────────────────
export const db = {
  /**
   * Save user data to cloud with conflict resolution.
   * Uses upsert with updated_at timestamp for last-write-wins.
   */
  async saveUserData(userId, data) {
    if (!connectionStatus.canSync) {
      console.warn('[Supabase] Offline or not configured — skipping cloud save');
      return false;
    }

    try {
      // Strip volatile/transient data before saving to reduce payload
      const cleanData = { ...data };
      // Don't persist timer running state to cloud (it's tab-specific)
      if (cleanData.timer) {
        cleanData.timer = { 
          ...cleanData.timer, 
          isRunning: false, 
          endTime: 0,
          remain: (cleanData.timer.duration || 25) * 60 
        };
      }

      const result = await withRetry(async () => {
        const { error } = await supabaseClient
          .from('user_data')
          .upsert({ 
            user_id: userId, 
            data: cleanData, 
            updated_at: new Date().toISOString() 
          }, {
            onConflict: 'user_id'
          });
        if (error) throw error;
        return true;
      });

      _lastSuccessfulSync = Date.now();
      if (import.meta.env.DEV) console.log('[Supabase] ✓ Cloud sync successful');
      return result;
    } catch (err) {
      console.error('[Supabase] Save failed after retries:', err?.message || err);
      return false;
    }
  },

  /**
   * Fetch user data from cloud.
   * Returns null if not found or on error (app falls back to localStorage).
   */
  async getUserData(userId) {
    if (!connectionStatus.canSync) {
      console.warn('[Supabase] Offline or not configured — using local data only');
      return null;
    }

    try {
      const result = await withRetry(async () => {
        const { data, error } = await supabaseClient
          .from('user_data')
          .select('data, updated_at')
          .eq('user_id', userId)
          .single();
        
        if (error && error.code !== 'PGRST116') throw error; // PGRST116 = row not found
        return data;
      });

      if (result) {
        _lastSuccessfulSync = Date.now();
        if (import.meta.env.DEV) console.log('[Supabase] ✓ Cloud data fetched, last updated:', result.updated_at);
      }
      return result?.data || null;
    } catch (err) {
      console.error('[Supabase] Fetch failed after retries:', err?.message || err);
      return null;
    }
  },

  /**
   * Health check — can the client reach Supabase?
   */
  async ping() {
    if (!supabaseClient) return false;
    try {
      const { error } = await supabaseClient.from('user_data').select('user_id').limit(1);
      return !error;
    } catch {
      return false;
    }
  }
};
