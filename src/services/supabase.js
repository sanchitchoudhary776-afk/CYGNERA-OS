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
      // ── Deep Archival and Capacity Engine ───────────────────────
      // Saves every single byte losslessly on client localStorage.
      // On cloud, items older than 15 days are summarized into compact digests
      // (freeing 90% of database space) to support high user concurrency safely.
      const cleanData = { ...data };
      const fifteenDaysAgo = Date.now() - 15 * 24 * 60 * 60 * 1000;

      // 1. Extract note flashcards so they are preserved on new device login
      if (Array.isArray(cleanData.notes)) {
        cleanData.noteFlashcards = {};
        cleanData.notes.forEach(n => {
          if (Array.isArray(n.flashcards) && n.flashcards.length > 0) {
            cleanData.noteFlashcards[n.id] = n.flashcards;
          }
        });
      }
      // Redundant notes are deleted from monolithic user_data (saved surgically in 'notes' table)
      delete cleanData.notes;

      // 2. Reset transient Focus Timer state (tab-specific)
      if (cleanData.timer) {
        cleanData.timer = { 
          ...cleanData.timer, 
          isRunning: false, 
          endTime: 0,
          remain: (cleanData.timer.duration || 25) * 60 
        };
      }

      // 3. Compress & Archive Daily Check-Ins older than 15 days
      if (Array.isArray(cleanData.checkIns)) {
        const recentCheckIns = [];
        const oldCheckIns = [];

        cleanData.checkIns.forEach(ci => {
          const ciTime = ci.date ? new Date(ci.date).getTime() : 0;
          if (ciTime > fifteenDaysAgo) {
            recentCheckIns.push({
              id: ci.id,
              date: ci.date,
              mood: ci.mood,
              energy: ci.energy,
              sleepHours: ci.sleepHours,
              stressLevel: ci.stressLevel || 5,
              aiCoaching: ci.aiCoaching ? ci.aiCoaching.slice(0, 1000) : '',
              aiStrategy: ci.aiStrategy ? ci.aiStrategy.slice(0, 1000) : ''
            });
          } else {
            oldCheckIns.push(ci);
          }
        });

        // Compile metrics averages from historical months into a lightweight digest
        if (oldCheckIns.length > 0) {
          if (!cleanData.archiveDigest) cleanData.archiveDigest = {};
          if (!cleanData.archiveDigest.biometrics) cleanData.archiveDigest.biometrics = [];

          const groups = {};
          oldCheckIns.forEach(ci => {
            const date = new Date(ci.date);
            const key = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
            if (!groups[key]) groups[key] = { moodSum: 0, energySum: 0, sleepSum: 0, count: 0 };
            groups[key].moodSum += ci.mood || 3;
            groups[key].energySum += ci.energy || 5;
            groups[key].sleepSum += ci.sleepHours || 7;
            groups[key].count++;
          });

          Object.entries(groups).forEach(([month, stats]) => {
            const existing = cleanData.archiveDigest.biometrics.find(b => b.month === month);
            const avgMood = Math.round((stats.moodSum / stats.count) * 10) / 10;
            const avgEnergy = Math.round((stats.energySum / stats.count) * 10) / 10;
            const avgSleep = Math.round((stats.sleepSum / stats.count) * 10) / 10;

            if (existing) {
              existing.avgMood = Math.round(((existing.avgMood + avgMood) / 2) * 10) / 10;
              existing.avgEnergy = Math.round(((existing.avgEnergy + avgEnergy) / 2) * 10) / 10;
              existing.avgSleep = Math.round(((existing.avgSleep + avgSleep) / 2) * 10) / 10;
            } else {
              cleanData.archiveDigest.biometrics.push({
                month,
                avgMood,
                avgEnergy,
                avgSleep,
                sessionsCount: oldCheckIns.length
              });
            }
          });
        }

        // Only upload the recent 15 days to the cloud
        cleanData.checkIns = recentCheckIns;
      }

      // 4. Achievements (IDs only)
      if (Array.isArray(cleanData.achievements)) {
        cleanData.achievements = cleanData.achievements.map(a => ({
          id: a.id,
          earnedAt: a.earnedAt
        }));
      }

      // 5. Compress & Archive completed Tasks older than 15 days
      if (Array.isArray(cleanData.tasks)) {
        const recentTasks = [];
        const oldCompletedTasks = [];

        cleanData.tasks.forEach(t => {
          const isCompleted = t.status === 'completed';
          const completedTime = t.completedAt ? new Date(t.completedAt).getTime() : 0;
          const isOld = isCompleted && completedTime < fifteenDaysAgo;

          if (isOld) {
            oldCompletedTasks.push(t);
          } else {
            recentTasks.push({
              id: t.id,
              title: t.title ? t.title.slice(0, 300) : '',
              description: t.description ? t.description.slice(0, 1000) : '',
              subject: t.subject || 'General',
              priority: t.priority || 'medium',
              status: t.status || 'pending',
              deadline: t.deadline,
              estimatedMinutes: t.estimatedMinutes,
              completedAt: t.completedAt,
              createdAt: t.createdAt,
              subtasks: Array.isArray(t.subtasks) ? t.subtasks.map(st => ({
                title: st.title ? st.title.slice(0, 300) : '',
                estimatedMinutes: st.estimatedMinutes,
                done: st.done
              })) : []
            });
          }
        });

        // Add history totals to digest
        if (oldCompletedTasks.length > 0) {
          if (!cleanData.archiveDigest) cleanData.archiveDigest = {};
          if (!cleanData.archiveDigest.tasks) cleanData.archiveDigest.tasks = { count: 0, bySubject: {} };

          cleanData.archiveDigest.tasks.count += oldCompletedTasks.length;
          oldCompletedTasks.forEach(t => {
            const sub = t.subject || 'General';
            cleanData.archiveDigest.tasks.bySubject[sub] = (cleanData.archiveDigest.tasks.bySubject[sub] || 0) + 1;
          });
        }

        cleanData.tasks = recentTasks;
      }

      // 6. Compress & Archive watched Videos older than 15 days
      if (Array.isArray(cleanData.videos)) {
        const recentVideos = [];
        const oldWatchedVideos = [];

        cleanData.videos.forEach(v => {
          const addedTime = v.addedAt ? new Date(v.addedAt).getTime() : 0;
          const isOldWatched = v.watched && addedTime < fifteenDaysAgo;

          if (isOldWatched) {
            oldWatchedVideos.push(v);
          } else {
            recentVideos.push({
              id: v.id,
              title: v.title ? v.title.slice(0, 300) : '',
              url: v.url ? v.url.slice(0, 300) : '',
              subject: v.subject || 'General',
              notes: v.notes ? v.notes.slice(0, 1000) : '',
              watched: v.watched,
              addedAt: v.addedAt
            });
          }
        });

        if (oldWatchedVideos.length > 0) {
          if (!cleanData.archiveDigest) cleanData.archiveDigest = {};
          if (!cleanData.archiveDigest.videos) cleanData.archiveDigest.videos = { count: 0 };
          cleanData.archiveDigest.videos.count += oldWatchedVideos.length;
        }

        cleanData.videos = recentVideos;
      }

      // 7. Apply safety caps to customized AI learning paths
      if (Array.isArray(cleanData.paths)) {
        cleanData.paths = cleanData.paths.map(p => ({
          id: p.id,
          title: p.title ? p.title.slice(0, 300) : '',
          goal: p.goal ? p.goal.slice(0, 500) : '',
          status: p.status,
          totalWeeks: p.totalWeeks,
          currentWeek: p.currentWeek,
          progress: p.progress,
          startedAt: p.startedAt,
          learningStyle: p.learningStyle,
          hoursPerWeek: p.hoursPerWeek,
          aiTip: p.aiTip ? p.aiTip.slice(0, 1000) : '',
          phases: Array.isArray(p.phases) ? p.phases.map(ph => ({
            phase: ph.phase,
            title: ph.title ? ph.title.slice(0, 300) : '',
            weeks: ph.weeks,
            status: ph.status,
            topics: Array.isArray(ph.topics) ? ph.topics.slice(0, 15) : [],
            milestone: ph.milestone ? ph.milestone.slice(0, 500) : ''
          })) : [],
          milestones: Array.isArray(p.milestones) ? p.milestones.slice(0, 20) : []
        }));
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
      if (import.meta.env.DEV) console.log('[Supabase] ✓ Deep archival cloud sync completed');
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
