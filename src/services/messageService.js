// ═══════════════════════════════════════════════════════════════
//  AXINITE OS · MESSAGE SERVICE
//  Architecture: Supabase-backed real-time messaging with offline queue.
//  - Optimistic local-first updates (zero-lag UX)
//  - Background sync to Supabase `network_messages` table
//  - Offline queue with auto-flush on reconnect
//  - Supabase Realtime subscription for incoming messages
//  - Auto-purge: DB trigger deletes messages older than 24 hours
// ═══════════════════════════════════════════════════════════════
import { supabase, connectionStatus } from './supabase';

// ─── Local Cache ─────────────────────────────────────────────
const CACHE_KEY = 'axos_msg_cache_v1';
const QUEUE_KEY = 'axos_msg_queue_v1';

function loadCache() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY)) || {}; }
  catch { return {}; }
}

function saveCache(cache) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); }
  catch (e) { console.warn('[MsgService] Cache save failed:', e); }
}

// Cache structure: { "recipientId": [ { id, sender_id, recipient_id, text, reactions, created_at } ] }
// ─── Offline Queue ───────────────────────────────────────────
const queue = {
  get: () => {
    try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]'); }
    catch { return []; }
  },
  push: (op) => {
    const q = queue.get();
    // Deduplicate by message ID
    const next = q.filter(o => o.id !== op.id);
    next.push(op);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(next));
  },
  remove: (msgId) => {
    const q = queue.get().filter(o => o.id !== msgId);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
  },
  clear: () => localStorage.removeItem(QUEUE_KEY),
  count: () => queue.get().length,
};

// ─── Helpers ─────────────────────────────────────────────────
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const genMsgId = () => 'msg_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);

/**
 * Get the conversation key for a pair of users.
 * Always sorted so sender/recipient order doesn't matter.
 */
function convoKey(userA, userB) {
  return [String(userA), String(userB)].sort().join('::');
}

// ─── Realtime subscription ref ───────────────────────────────
let _realtimeChannel = null;
let _onMessageCallback = null;

// ─── Core API ────────────────────────────────────────────────
export const messageService = {

  /**
   * Send a direct message.
   * 1. Immediately adds to local cache (optimistic)
   * 2. Pushes to Supabase in background
   * 3. Falls back to offline queue if not connected
   *
   * @returns {object} The message object (for immediate UI display)
   */
  sendMessage(senderId, recipientId, text) {
    const msg = {
      id: genMsgId(),
      sender_id: String(senderId),
      recipient_id: String(recipientId),
      text: text.trim(),
      reactions: {},
      created_at: new Date().toISOString(),
      _pending: true, // Optimistic flag — cleared after cloud confirm
    };

    // 1. Save to local cache immediately
    const cache = loadCache();
    const key = convoKey(senderId, recipientId);
    if (!cache[key]) cache[key] = [];
    cache[key].push(msg);

    // Enforce local 24h retention
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    cache[key] = cache[key].filter(m => new Date(m.created_at).getTime() > oneDayAgo);
    saveCache(cache);

    // 2. Push to Supabase in background
    if (connectionStatus.canSync) {
      const { _pending, ...payload } = msg;
      supabase
        .from('network_messages')
        .insert(payload)
        .then(({ error }) => {
          if (error) {
            console.warn('[MsgService] Cloud send failed, queued:', error.message);
            queue.push(payload);
          } else {
            // Mark as confirmed in cache
            const c = loadCache();
            const k = convoKey(senderId, recipientId);
            if (c[k]) {
              const idx = c[k].findIndex(m => m.id === msg.id);
              if (idx >= 0) { delete c[k][idx]._pending; saveCache(c); }
            }
            queue.remove(msg.id);
            if (import.meta.env.DEV) console.log('[MsgService] ✓ Sent:', msg.id);
          }
        });
    } else {
      // Offline — queue for later
      const { _pending, ...payload } = msg;
      queue.push(payload);
      if (import.meta.env.DEV) console.log('[MsgService] Queued offline:', msg.id);
    }

    return msg;
  },

  /**
   * Get messages for a conversation from local cache.
   * Returns messages sorted by created_at ascending.
   */
  getConversation(userA, userB) {
    const cache = loadCache();
    const key = convoKey(userA, userB);
    const msgs = cache[key] || [];

    // Filter out messages older than 24 hours from local cache too
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    return msgs
      .filter(m => new Date(m.created_at).getTime() > oneDayAgo)
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  },

  /**
   * Get all conversation keys that have messages (for chat list).
   */
  getAllConversations(myId) {
    const cache = loadCache();
    const convos = {};
    Object.entries(cache).forEach(([key, msgs]) => {
      // Check if this conversation involves myId
      const parts = key.split('::');
      const involvesMe = parts.includes(String(myId));
      if (!involvesMe) return;

      const otherId = parts.find(p => p !== String(myId)) || parts[0];
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      const validMsgs = msgs.filter(m => new Date(m.created_at).getTime() > oneDayAgo);
      if (validMsgs.length > 0) {
        const lastMsg = validMsgs[validMsgs.length - 1];
        convos[otherId] = {
          lastMessage: lastMsg.text,
          lastTime: lastMsg.created_at,
          count: validMsgs.length,
          unread: validMsgs.filter(m => m.sender_id !== String(myId) && !m._read).length,
        };
      }
    });
    return convos;
  },

  /**
   * React to a message with an emoji.
   */
  reactToMessage(msgId, emoji, senderId, recipientId) {
    const cache = loadCache();
    const key = convoKey(senderId, recipientId);
    if (!cache[key]) return;

    const msg = cache[key].find(m => m.id === msgId);
    if (!msg) return;

    if (!msg.reactions) msg.reactions = {};
    msg.reactions[emoji] = (msg.reactions[emoji] || 0) + 1;
    saveCache(cache);

    // Sync reaction to cloud
    if (connectionStatus.canSync) {
      supabase
        .from('network_messages')
        .update({ reactions: msg.reactions })
        .eq('id', msgId)
        .then(({ error }) => {
          if (error) console.warn('[MsgService] Reaction sync failed:', error.message);
        });
    }
  },

  /**
   * Mark all messages in a conversation as read.
   */
  markRead(userA, userB) {
    const cache = loadCache();
    const key = convoKey(userA, userB);
    if (!cache[key]) return;
    cache[key].forEach(m => { m._read = true; });
    saveCache(cache);
  },

  /**
   * Fetch messages from Supabase for a specific user.
   * Merges with local cache (cloud is source of truth for shared conversations).
   */
  async fetchCloudMessages(userId) {
    if (!connectionStatus.canSync) return;

    try {
      const { data, error } = await supabase
        .from('network_messages')
        .select('*')
        .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
        .order('created_at', { ascending: true })
        .limit(500);

      if (error) throw error;
      if (!data || data.length === 0) return;

      // Merge cloud messages into local cache
      const cache = loadCache();
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

      data.forEach(msg => {
        if (new Date(msg.created_at).getTime() < oneDayAgo) return; // Skip expired

        const key = convoKey(msg.sender_id, msg.recipient_id);
        if (!cache[key]) cache[key] = [];

        // Deduplicate by ID
        const exists = cache[key].find(m => m.id === msg.id);
        if (!exists) {
          cache[key].push(msg);
        } else {
          // Update reactions if cloud has newer data
          Object.assign(exists, msg);
          delete exists._pending;
        }
      });

      // Clean up expired messages in all conversations
      Object.keys(cache).forEach(key => {
        cache[key] = cache[key].filter(m => new Date(m.created_at).getTime() > oneDayAgo);
        if (cache[key].length === 0) delete cache[key];
      });

      saveCache(cache);
      if (import.meta.env.DEV) console.log(`[MsgService] ✓ Synced ${data.length} cloud messages`);
    } catch (err) {
      console.error('[MsgService] Cloud fetch failed:', err?.message);
    }
  },

  /**
   * Flush the offline queue — call this when the user comes back online.
   */
  async flushQueue(userId) {
    if (!connectionStatus.canSync) return;
    const pending = queue.get();
    if (pending.length === 0) return;

    if (import.meta.env.DEV) console.log(`[MsgService] Flushing ${pending.length} queued messages...`);

    for (const msg of pending) {
      try {
        const { error } = await supabase
          .from('network_messages')
          .upsert(msg, { onConflict: 'id' });
        if (!error) {
          queue.remove(msg.id);
          // Clear pending flag in cache
          const cache = loadCache();
          const key = convoKey(msg.sender_id, msg.recipient_id);
          if (cache[key]) {
            const idx = cache[key].findIndex(m => m.id === msg.id);
            if (idx >= 0) { delete cache[key][idx]._pending; saveCache(cache); }
          }
        }
        await sleep(100); // Gentle rate limiting
      } catch (err) {
        console.error('[MsgService] Flush error for', msg.id, err?.message);
      }
    }

    if (import.meta.env.DEV) console.log('[MsgService] ✓ Queue flushed');
  },

  /**
   * Subscribe to real-time incoming messages via Supabase Realtime.
   * Calls `onMessage(msg)` whenever a new message arrives.
   */
  subscribeRealtime(userId, onMessage) {
    if (!supabase) return;
    _onMessageCallback = onMessage;

    // Unsubscribe previous channel if any
    messageService.unsubscribeRealtime();

    try {
      _realtimeChannel = supabase
        .channel('network_messages_realtime')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'network_messages',
          filter: `recipient_id=eq.${userId}`,
        }, (payload) => {
          const msg = payload.new;
          if (!msg) return;

          // Add to local cache
          const cache = loadCache();
          const key = convoKey(msg.sender_id, msg.recipient_id);
          if (!cache[key]) cache[key] = [];
          
          // Deduplicate
          if (!cache[key].find(m => m.id === msg.id)) {
            cache[key].push(msg);
            saveCache(cache);
          }

          // Notify UI
          if (_onMessageCallback) _onMessageCallback(msg);
          if (import.meta.env.DEV) console.log('[MsgService] ⚡ Realtime message received:', msg.id);
        })
        .subscribe((status) => {
          if (import.meta.env.DEV) console.log('[MsgService] Realtime status:', status);
        });
    } catch (err) {
      console.error('[MsgService] Realtime subscription failed:', err);
    }
  },

  /**
   * Unsubscribe from real-time messages.
   */
  unsubscribeRealtime() {
    if (_realtimeChannel && supabase) {
      try {
        supabase.removeChannel(_realtimeChannel);
      } catch (e) {}
      _realtimeChannel = null;
    }
  },

  /**
   * Clear all local message data (used on logout).
   */
  clearAll() {
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(QUEUE_KEY);
    messageService.unsubscribeRealtime();
  },

  /**
   * Get count of pending (unsent) messages.
   */
  getPendingCount: () => queue.count(),
};

// ─── Auto-flush queue when coming back online ────────────────
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    try {
      const rawUser = localStorage.getItem('los_auth_user');
      if (rawUser) {
        const u = JSON.parse(rawUser);
        if (u?.id) {
          setTimeout(() => messageService.flushQueue(u.id), 2500);
        }
      }
    } catch (e) {
      console.error('[MsgService] Failed to auto-flush on reconnect:', e);
    }
  });
}
