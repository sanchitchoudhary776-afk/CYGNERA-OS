// ═══════════════════════════════════════════════════════════════
//  AXINITE OS · AI CACHE & RATE LIMITER
//  Centralized layer to prevent redundant AI calls and enforce
//  per-user usage budgets across all AI-powered features.
//
//  Cache keys are composite: feature + content-hash + date.
//  Rate limits are tracked per 5-hour rolling window per feature.
// ═══════════════════════════════════════════════════════════════

// ─── Premium Tier Budget (₹300/month) ────────────────────────
// These limits represent a "more than sufficient" daily budget
// for a serious student paying ₹300/month.
const PREMIUM_LIMITS = {
  // ── Chatbot ──────────────────────────────────────────────
  aura_chat:         { maxPerWindow: 30,  windowMs: 5 * 60 * 60 * 1000, label: 'Aura Chat' },

  // ── Auto-triggered (passive) features ────────────────────
  daily_briefing:    { maxPerWindow: 4,   windowMs: 5 * 60 * 60 * 1000, label: 'Daily Briefing' },
  progress_insights: { maxPerWindow: 3,   windowMs: 5 * 60 * 60 * 1000, label: 'Progress Insights' },
  daily_report:      { maxPerWindow: 3,   windowMs: 5 * 60 * 60 * 1000, label: 'Daily Report' },
  weekly_digest:     { maxPerWindow: 1,   windowMs: 24 * 60 * 60 * 1000, label: 'Weekly Digest' },
  timer_settings:    { maxPerWindow: 4,   windowMs: 5 * 60 * 60 * 1000, label: 'Timer Settings' },
  mood_coaching:     { maxPerWindow: 5,   windowMs: 5 * 60 * 60 * 1000, label: 'Mood Coaching' },

  // ── User-triggered (active) features ─────────────────────
  note_enhance:      { maxPerWindow: 10,  windowMs: 5 * 60 * 60 * 1000, label: 'Note AI' },
  note_inline:       { maxPerWindow: 20,  windowMs: 5 * 60 * 60 * 1000, label: 'Inline Complete' },
  task_breakdown:    { maxPerWindow: 8,   windowMs: 5 * 60 * 60 * 1000, label: 'Task Breakdown' },
  video_summary:     { maxPerWindow: 6,   windowMs: 5 * 60 * 60 * 1000, label: 'Video Summary' },
  schedule_gen:      { maxPerWindow: 3,   windowMs: 5 * 60 * 60 * 1000, label: 'Schedule Gen' },
  path_gen:          { maxPerWindow: 3,   windowMs: 5 * 60 * 60 * 1000, label: 'Path Gen' },
  achievement_msg:   { maxPerWindow: 6,   windowMs: 5 * 60 * 60 * 1000, label: 'Achievement Msg' },
  quiz_gen:          { maxPerWindow: 5,   windowMs: 5 * 60 * 60 * 1000, label: 'Quiz Gen' },
};

// ─── Simple deterministic hash for cache keys ────────────────
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + c;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

// ─── Rate Limiter ────────────────────────────────────────────
const RATE_KEY_PREFIX = 'ax_rl_';

function getRateBucket(feature) {
  const key = RATE_KEY_PREFIX + feature;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch { return []; }
}

function setRateBucket(feature, timestamps) {
  const key = RATE_KEY_PREFIX + feature;
  localStorage.setItem(key, JSON.stringify(timestamps));
}

/**
 * Check if a feature has remaining quota.
 * Returns { allowed: boolean, remaining: number, resetIn: number (ms) }
 */
export function checkRateLimit(feature) {
  const config = PREMIUM_LIMITS[feature];
  if (!config) return { allowed: true, remaining: 999, resetIn: 0 };

  const now = Date.now();
  const windowStart = now - config.windowMs;
  const bucket = getRateBucket(feature).filter(ts => ts > windowStart);

  if (bucket.length >= config.maxPerWindow) {
    const oldestInWindow = Math.min(...bucket);
    const resetIn = oldestInWindow + config.windowMs - now;
    return { allowed: false, remaining: 0, resetIn, label: config.label };
  }

  return { allowed: true, remaining: config.maxPerWindow - bucket.length, resetIn: 0, label: config.label };
}

/**
 * Record a usage event for a feature.
 */
export function recordUsage(feature) {
  const config = PREMIUM_LIMITS[feature];
  if (!config) return;
  
  const now = Date.now();
  const windowStart = now - config.windowMs;
  const bucket = getRateBucket(feature).filter(ts => ts > windowStart);
  bucket.push(now);
  setRateBucket(feature, bucket);
}

/**
 * Get overall usage stats (for settings page or admin dashboard).
 */
export function getUsageStats() {
  const now = Date.now();
  const stats = {};
  for (const [feature, config] of Object.entries(PREMIUM_LIMITS)) {
    const windowStart = now - config.windowMs;
    const bucket = getRateBucket(feature).filter(ts => ts > windowStart);
    stats[feature] = {
      used: bucket.length,
      max: config.maxPerWindow,
      remaining: config.maxPerWindow - bucket.length,
      label: config.label,
      windowHours: Math.round(config.windowMs / 3600000),
    };
  }
  return stats;
}


// ─── Result Cache ────────────────────────────────────────────
const CACHE_KEY_PREFIX = 'ax_ai_cache_';

/**
 * Get a cached AI result.
 * @param {string} feature - Feature name (e.g., 'progress_insights')
 * @param {string} dataFingerprint - A string that represents the "state" of the input data.
 *                                   If data hasn't changed, cache is valid.
 * @param {number} ttlMs - How long the cache is valid (default 4 hours)
 * @returns {any|null} - Cached result or null if miss
 */
export function getCachedResult(feature, dataFingerprint, ttlMs = 4 * 60 * 60 * 1000) {
  const hash = simpleHash(dataFingerprint);
  const key = CACHE_KEY_PREFIX + feature + '_' + hash;

  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { result, ts } = JSON.parse(raw);
    if (Date.now() - ts > ttlMs) {
      localStorage.removeItem(key);
      return null;
    }
    return result;
  } catch {
    return null;
  }
}

/**
 * Store an AI result in cache.
 */
export function setCachedResult(feature, dataFingerprint, result) {
  const hash = simpleHash(dataFingerprint);
  const key = CACHE_KEY_PREFIX + feature + '_' + hash;

  try {
    localStorage.setItem(key, JSON.stringify({ result, ts: Date.now() }));
  } catch {
    // localStorage full — clean old caches
    cleanOldCaches();
    try {
      localStorage.setItem(key, JSON.stringify({ result, ts: Date.now() }));
    } catch {
      // Give up silently
    }
  }
}

/**
 * Purge all expired AI caches to reclaim localStorage space.
 */
export function cleanOldCaches() {
  const now = Date.now();
  const MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (key?.startsWith(CACHE_KEY_PREFIX)) {
      try {
        const { ts } = JSON.parse(localStorage.getItem(key));
        if (now - ts > MAX_AGE) localStorage.removeItem(key);
      } catch {
        localStorage.removeItem(key);
      }
    }
  }
}

/**
 * Convenience wrapper: check cache → check rate limit → call AI → store result.
 * Returns { result, fromCache, rateLimited, error }
 */
export async function cachedAICall(feature, dataFingerprint, aiFn, { ttlMs = 4 * 60 * 60 * 1000 } = {}) {
  // 1. Check cache first
  const cached = getCachedResult(feature, dataFingerprint, ttlMs);
  if (cached) {
    console.log(`[AI Cache] HIT for ${feature}`);
    return { result: cached, fromCache: true };
  }

  // 2. Check rate limit
  const limit = checkRateLimit(feature);
  if (!limit.allowed) {
    const mins = Math.ceil(limit.resetIn / 60000);
    console.warn(`[AI Rate] ${feature} rate limited. Resets in ${mins}m`);
    return { 
      result: null, 
      rateLimited: true, 
      error: `${limit.label} limit reached (resets in ${mins} min). Please try again later.` 
    };
  }

  // 3. Call AI
  try {
    const result = await aiFn();
    if (result) {
      recordUsage(feature);
      setCachedResult(feature, dataFingerprint, result);
      console.log(`[AI Cache] STORED for ${feature}`);
    }
    return { result, fromCache: false };
  } catch (err) {
    console.error(`[AI Cache] Error calling AI for ${feature}:`, err);
    throw err;
  }
}
