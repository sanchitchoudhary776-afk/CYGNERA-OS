// ═══════════════════════════════════════════════════════════════
//  Axinite OS — Alarm & Reminder Service Worker
//  Runs in background even when the tab is not focused / closed.
//  Checks localStorage-synced alarms every 15 seconds and fires
//  native OS notifications with sound.
// ═══════════════════════════════════════════════════════════════

const SW_VERSION = 'axinite-alarm-sw-v1';
const ALARM_STORAGE_KEY = 'axinite_alarm_data';
const TRIGGERED_KEY = 'axinite_alarm_triggered';

// ── Self-scheduling heartbeat ────────────────────────────────────
// Service workers get killed after ~30s of idle. We use a keep-alive
// trick: the main thread pings us, and we also use setInterval internally.
let heartbeatInterval = null;

function startHeartbeat() {
  if (heartbeatInterval) clearInterval(heartbeatInterval);
  heartbeatInterval = setInterval(() => {
    checkAlarms();
  }, 15000); // every 15 seconds
}

// ── Alarm checking logic ─────────────────────────────────────────
async function checkAlarms() {
  try {
    // Attempt CacheStorage read (persists even when the browser garbage collects the SW memory)
    if (typeof caches !== 'undefined') {
      const store = await caches.open('axinite-alarm-store');
      const response = await store.match('/alarm-data.json');
      if (response) {
        const data = await response.json();
        self._cachedAlarms = data;
      }
    }
  } catch (e) {
    console.warn('[Alarm SW] Failed reading cache fallback:', e);
  }

  try {
    if (self._cachedAlarms) {
      processAlarms(self._cachedAlarms.alarms || [], self._cachedAlarms.schedule || []);
    }
  } catch (e) {
    console.error('[Alarm SW] Check error:', e);
  }
}

function processAlarms(alarms, schedule) {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const currentTime = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
  const dayOfWeek = now.getDay();

  // Track what we've already triggered this minute to avoid duplicates
  if (!self._triggeredThisMinute) self._triggeredThisMinute = {};
  const minuteKey = `${today}_${currentTime}`;
  if (self._lastMinuteKey !== minuteKey) {
    self._triggeredThisMinute = {};
    self._lastMinuteKey = minuteKey;
  }

  // 1. Custom Alarms
  (alarms || []).forEach(alarm => {
    if (!alarm.enabled || alarm.time !== currentTime) return;
    const triggerId = `alarm_${alarm.id}_${minuteKey}`;
    if (self._triggeredThisMinute[triggerId]) return;

    const isRepeatToday = alarm.repeat.length === 0 || alarm.repeat.includes(dayOfWeek);
    if (!isRepeatToday) return;

    self._triggeredThisMinute[triggerId] = true;
    showNotification(alarm.label || 'Study Alarm', `Scheduled alarm for ${alarm.time}`, 'alarm', alarm.id);
  });

  // 2. 5-Minute Pre-Task Reminders for scheduled sessions
  (schedule || []).forEach(s => {
    if (s.day !== today) return;
    const [sh, sm] = s.startTime.split(':').map(Number);
    const sTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), sh, sm, 0);
    const diffMs = sTime.getTime() - now.getTime();
    const diffMins = Math.round(diffMs / 60000);

    if (diffMins === 5) {
      const remId = `rem_5m_${s.id}_${minuteKey}`;
      if (self._triggeredThisMinute[remId]) return;
      self._triggeredThisMinute[remId] = true;
      showNotification(
        'Upcoming Study Session',
        `"${s.subject}" (${s.topic || ''}) starts in 5 minutes!`,
        'reminder',
        s.id
      );
    }
  });
}

// ── Native Notification ──────────────────────────────────────────
function showNotification(title, body, tag, id) {
  self.registration.showNotification(`⏰ ${title}`, {
    body: body,
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    tag: `axinite-${tag}-${id}`,
    renotify: true,
    requireInteraction: true, // Stays until user interacts
    vibrate: [200, 100, 200, 100, 200], // Vibration pattern (mobile)
    actions: [
      { action: 'dismiss', title: 'Dismiss' },
      { action: 'snooze', title: 'Snooze 5 min' }
    ],
    data: { alarmId: id, tag, url: '/' }
  });

  // Also tell the main page to play the alarm sound + show the overlay
  self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
    clients.forEach(client => {
      client.postMessage({
        type: 'ALARM_TRIGGERED',
        payload: { title, desc: body, alarmId: id, tag }
      });
    });
  });
}

// ── Event: Install ───────────────────────────────────────────────
self.addEventListener('install', (event) => {
  console.log('[Alarm SW] Installing', SW_VERSION);
  self.skipWaiting(); // Activate immediately
});

// ── Event: Activate ──────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  console.log('[Alarm SW] Activated', SW_VERSION);
  event.waitUntil(self.clients.claim()); // Take control of all pages
  startHeartbeat();
});

// ── Event: Message from main thread ──────────────────────────────
self.addEventListener('message', (event) => {
  const { type, payload } = event.data || {};

  if (type === 'SYNC_ALARM_DATA') {
    // Main thread sends us the latest alarms + schedule data
    self._cachedAlarms = payload;
    // Restart heartbeat to ensure we're alive
    startHeartbeat();
  }

  if (type === 'KEEPALIVE') {
    // Just a ping to keep the SW alive
    startHeartbeat();
  }
});

// ── Event: Notification click ────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const action = event.action;
  const data = event.notification.data || {};

  if (action === 'snooze') {
    // Tell the main thread to snooze
    self.clients.matchAll({ type: 'window' }).then(clients => {
      clients.forEach(client => {
        client.postMessage({ type: 'SNOOZE_ALARM', payload: data });
      });
    });
  } else {
    // Dismiss or click — focus the app window
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
        if (clients.length > 0) {
          clients[0].focus();
          clients[0].postMessage({ type: 'DISMISS_ALARM', payload: data });
        } else {
          self.clients.openWindow(data.url || '/');
        }
      })
    );
  }
});

// ── Event: Notification close ────────────────────────────────────
self.addEventListener('notificationclose', (event) => {
  // User swiped away the notification
  self.clients.matchAll({ type: 'window' }).then(clients => {
    clients.forEach(client => {
      client.postMessage({ type: 'DISMISS_ALARM', payload: event.notification.data });
    });
  });
});

// Start heartbeat immediately
startHeartbeat();
