// ═══════════════════════════════════════════════════════════════
//  AXINITE OS — PWA Service Worker
//  Handles: Offline caching, instant app shell loading, and
//  background sync. Works alongside alarm-sw.js.
// ═══════════════════════════════════════════════════════════════

const CACHE_NAME = 'axinite-pwa-v1';
const OFFLINE_URL = '/';

// Static assets to precache for instant shell loading
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/manifest.json',
  '/material-symbols-outlined.woff2',
];

// ── Install: Precache the app shell ──────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[PWA SW] Precaching app shell');
      return cache.addAll(PRECACHE_URLS).catch((err) => {
        console.warn('[PWA SW] Precache partial failure (non-critical):', err);
      });
    })
  );
  // Activate immediately without waiting for old tabs to close
  self.skipWaiting();
});

// ── Activate: Clean old caches ───────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== 'axinite-alarm-store')
          .map((name) => {
            console.log('[PWA SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      )
    )
  );
  // Take control of all open clients immediately
  self.clients.claim();
});

// ── Fetch: Network-first with cache fallback ─────────────────
// This strategy ensures users always get fresh content when online,
// but the app still works offline using cached assets.
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Skip non-GET requests (POST to /api/ai etc.)
  if (request.method !== 'GET') return;

  // Skip Supabase API requests (realtime, auth, database)
  const url = new URL(request.url);
  if (url.hostname.includes('supabase') || url.hostname.includes('googleapis') || url.hostname.includes('google')) {
    return;
  }

  // Skip chrome-extension and other non-http requests
  if (!request.url.startsWith('http')) return;

  // For navigation requests (page loads), use network-first
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache the fresh response for offline use
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone)).catch(() => {});
          return response;
        })
        .catch(() => {
          // Offline: return cached page
          return caches.match(OFFLINE_URL) || caches.match(request);
        })
    );
    return;
  }

  // For static assets (JS, CSS, images, fonts), use stale-while-revalidate
  if (
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'image' ||
    request.destination === 'font' ||
    request.url.includes('/assets/')
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            // Update cache with fresh version
            if (networkResponse.ok) {
              const clone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone)).catch(() => {});
            }
            return networkResponse;
          })
          .catch(() => cachedResponse); // Network failed, use cache

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }
});

// ── Background Sync (future-proofing) ────────────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-messages') {
    console.log('[PWA SW] Background sync: messages');
  }
});

// ── Push Notifications (future-proofing) ─────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  try {
    const data = event.data.json();
    event.waitUntil(
      self.registration.showNotification(data.title || 'Axinite OS', {
        body: data.body || '',
        icon: '/favicon.svg',
        badge: '/favicon.svg',
        tag: data.tag || 'axinite-push',
        data: { url: data.url || '/' }
      })
    );
  } catch (e) {
    console.warn('[PWA SW] Push parse error:', e);
  }
});
