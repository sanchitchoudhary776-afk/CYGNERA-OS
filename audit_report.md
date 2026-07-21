# AXINITE OS — Production Readiness & UI/UX Audit Report
*Prepared for Axinite OS Public Launch*

---

## Executive Summary
This audit provides a deep-dive analysis of the **Axinite OS v1.0** codebase. While the application boasts a premium, high-fidelity user interface (Cognitive Sanctuary design system) and a rich feature set (43 features), several critical architectural bugs, security vulnerabilities, and logic flaws must be resolved before releasing the platform to a large public audience. 

The most pressing issues include **unauthenticated public API proxy gateways**, **cosmetic client-side rate limits**, **broken background alarm service workers**, **audio auto-play policy blocks**, and **desynchronization bugs** during offline notes deletion.

---

## 🚨 Category 1: Critical Security & Abuse Vulnerabilities

### 1. Unauthenticated Public AI Proxy Gateway (`/api/ai`)
* **File:** [api/ai.js](file:///c:/Users/Lenovo/Downloads/learner-os-FINAL-v4/api/ai.js) and [vite.config.js](file:///c:/Users/Lenovo/Downloads/learner-os-FINAL-v4/vite.config.js)
* **Description:** The serverless endpoint `/api/ai` proxies requests directly to Groq. However, it lacks any session validation, API keys, or Supabase JWT token verification. It also sets CORS headers to allow requests from any origin (`Access-Control-Allow-Origin: *`).
* **Impact:** Anyone on the internet can make direct POST requests to this API endpoint, exploiting the rotated keys for free LLM access. This will lead to immediate API credit draining, rate-limiting, and severe financial abuse on launch.
* **Recommendation:** Integrate Supabase JWT verification into the Vercel serverless function:
  ```javascript
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return res.status(401).json({ error: 'Unauthorized' });
  ```

### 2. Cosmetic Client-Side Rate Limiting
* **File:** [src/services/aiCache.js](file:///c:/Users/Lenovo/Downloads/learner-os-FINAL-v4/src/services/aiCache.js)
* **Description:** Rate limiting is enforced purely client-side via `localStorage` (under the `ax_rl_` keys). 
* **Impact:** Any user can bypass the limits entirely by running `localStorage.clear()` in the browser console. This fails to protect the backend API from automated scraping or high-volume scripts.
* **Recommendation:** Move rate-limiting counters to the backend (e.g., using Redis or a simple Supabase table tracking completions per user ID per day).

### 3. Google Drive Access Token Stored in Plain Text
* **File:** [src/services/driveSync.js](file:///c:/Users/Lenovo/Downloads/learner-os-FINAL-v4/src/services/driveSync.js)
* **Description:** The Google OAuth access token is stored in cleartext under `localStorage.setItem('ax_drive_access_token')`.
* **Impact:** If the application is compromised by any Cross-Site Scripting (XSS) vulnerability or an untrusted npm package dependency, a malicious script can read this token and gain full read/write access to the user's private Google Drive.
* **Recommendation:** Avoid persistent storage of raw OAuth access tokens in `localStorage`. If persistency is required, secure it or use a short-lived token memory strategy.

### 4. DOM XSS Vulnerability in Notes Rendering
* **File:** [src/pages/Notes.jsx](file:///c:/Users/Lenovo/Downloads/learner-os-FINAL-v4/src/pages/Notes.jsx) (via `convertMarkdownToHtml` and `ReactQuill`)
* **Description:** The custom parser `convertMarkdownToHtml` performs regex replacements but does not sanitize HTML tags before feeding content to Quill or rendering it.
* **Impact:** If a user pastes or syncs notes containing malicious `<script>`, `<iframe onload="...">`, or `<img src=x onerror="...">` payloads, they will execute arbitrary JavaScript code in the browser context.
* **Recommendation:** Sanitize all HTML content using a library like `dompurify` before rendering:
  ```javascript
  import DOMPurify from 'dompurify';
  const cleanHtml = DOMPurify.sanitize(rawHtml);
  ```

---

## 🛠️ Category 2: Core Architectural & Functional Bugs

### 5. Terminated Service Worker Heartbeat Lifecycle Bug
* **File:** [public/alarm-sw.js](file:///c:/Users/Lenovo/Downloads/learner-os-FINAL-v4/public/alarm-sw.js)
* **Description:** The service worker attempts to maintain a background clock using `setInterval` (checking alarms every 15 seconds).
* **Impact:** Modern browsers freeze and terminate background service workers after approximately 30 seconds of inactivity, destroying any active `setInterval` or `setTimeout` handles. Consequently, background alarms, pre-task notifications, and PWA focus redirects **will cease to fire entirely** shortly after the user leaves the tab.
* **Recommendation:** High-precision background timers are not natively supported in Service Workers. Instead, schedule local system notifications via the Web Push API triggered by a cron server, or leverage the browser's native `Notification` schedule API if available.

### 6. Auto-Play Policy Blocks Automatic Web Audio Alarms
* **File:** [src/context/AppContext.jsx](file:///c:/Users/Lenovo/Downloads/learner-os-FINAL-v4/src/context/AppContext.jsx) (via `playAlarmSound`)
* **Description:** The alarm uses the Web Audio API (`AudioContext`). Modern browsers block any AudioContext from starting/resuming unless initiated by a direct user gesture (such as a click event).
* **Impact:** When a scheduled study session starts or custom alarm triggers automatically in the background, the AudioContext will fail to play, throwing a browser console error: `AudioContext was not allowed to start. It must be resumed after a user gesture on the page`. Alarms will be **completely silent**.
* **Recommendation:** Play a standard HTMLAudioElement (`new Audio('/alarm.mp3')`) which has better fallback permissions, or request user click permission immediately upon alarm popups before enabling AudioContext audio.

### 7. Offline Note Deletion Desynchronization (Resurrection Bug)
* **File:** [src/services/notesCloud.js](file:///c:/Users/Lenovo/Downloads/learner-os-FINAL-v4/src/services/notesCloud.js#L132-L148)
* **Description:** In `deleteNote`, if the client is offline (`connectionStatus.canSync` is false), the function simply aborts. It clears the pending `upsert` of that note from the queue but does not enqueue a `delete` operation.
* **Impact:** If a user deletes a note while offline, the deletion is never sent to Supabase. When the user reconnects and restarts the app, the note is fetched back from the cloud, causing deleted notes to magically **resurrect**.
* **Recommendation:** Update the offline queue schema to support action types:
  ```javascript
  queue.push({ type: 'delete', noteId });
  ```
  Then, during `flushQueue`, execute actual deletions for notes queued with `delete` actions.

### 8. Real-time Subscription Omits Reaction Updates & Self-DMs
* **File:** [src/services/messageService.js](file:///c:/Users/Lenovo/Downloads/learner-os-FINAL-v4/src/services/messageService.js#L301-L341)
* **Description:** The Supabase Realtime channel only listens to `INSERT` events, and only filters for `recipient_id=eq.${userId}`.
* **Impact:**
  1. If a peer adds an emoji reaction to a message (which is an `UPDATE` event), it will not sync in real time. The user must manually refresh the chat to see reactions.
  2. If the user has multiple browser tabs or devices open, messages they send from one device will not sync to the other active tab (since they are filtered by `recipient_id` only).
* **Recommendation:** Subscribe to both `INSERT` and `UPDATE` events, and subscribe to messages where the user is either the sender or the recipient.

---

## 🎨 Category 3: Visual, UX & Layout Glitches

### 9. Static Mock Social Network (Leaderboard & Chat Simulation)
* **File:** [src/pages/NetworkData.js](file:///c:/Users/Lenovo/Downloads/learner-os-FINAL-v4/src/pages/NetworkData.js) and [src/pages/Network.jsx](file:///c:/Users/Lenovo/Downloads/learner-os-FINAL-v4/src/pages/Network.jsx)
* **Description:** The entire "Network" community feed, DMs, followers list, and leaderboard are mocked inside `NetworkData.js` and stored in a local JSON blob (`axos_network_v5`).
* **Impact:** Launching to a public audience with mock peers like `"Aarav Sharma"` and `"Ananya Iyer"` who simulate chat responses is highly deceptive. Real students will realize they cannot message real friends or compete on a true global leaderboard, leading to immediate user drop-off.
* **Recommendation:** Replace the local storage mocks in the network layer with a shared relational database schema in Supabase (`public.profiles`, `public.posts`, `public.comments`, `public.chats`).

### 10. React useEffect Missing Dependencies Warning (Aura Intelligence Panel)
* **File:** [src/pages/Progress.jsx](file:///c:/Users/Lenovo/Downloads/learner-os-FINAL-v4/src/pages/Progress.jsx#L418-L432)
* **Description:** The `useEffect` fetching `progressInsights` has an empty dependency array `[]`, but it relies on external variables: `data`, `progress`, `tasks`, `notes`, `videos`, `checkIns`, and `user`.
* **Impact:** If the user page mounts before the initial async data pull from Supabase finishes, `progressInsights` is triggered with the initial empty state. It will **not re-run** when data populates, leaving the student with an empty/stale AI analysis.
* **Recommendation:** Include `data` (the progress metrics telemetry) as a dependency:
  ```javascript
  useEffect(() => {
    // trigger AI analysis
  }, [data]);
  ```

### 11. Empty State Crash in Telemetry Spline Chart (`PillBars`)
* **File:** [src/pages/Progress.jsx](file:///c:/Users/Lenovo/Downloads/learner-os-FINAL-v4/src/pages/Progress.jsx#L86-L149)
* **Description:** The `PillBars` component (which renders the spline chart) performs a division-by-zero layout calculation if `points.length === 1` and accesses `realPts[0].y` directly.
* **Impact:** If a user logs into a brand new account and clicks on the Progress tab with no weekly study data logged, `first` will be `undefined`, throwing a `TypeError: Cannot read properties of undefined (reading 'y')` and crashing the entire analytics dashboard.
* **Recommendation:** Add an early return guard in `PillBars` to display a clean empty-state chart if data is empty or too short:
  ```javascript
  if (!data || data.length < 2) return <div className="empty-chart-placeholder">Record study sessions to view analytics.</div>;
  ```

### 12. Vite Service Worker Caching DX Annoyance
* **File:** [src/main.jsx](file:///c:/Users/Lenovo/Downloads/learner-os-FINAL-v4/src/main.jsx#L27)
* **Description:** The PWA Service Worker (`/sw.js`) is registered in all environments, including local development.
* **Impact:** The `stale-while-revalidate` caching strategy caches JavaScript and CSS assets. When developers make changes in local code, the browser serves the stale version, requiring the developer to reload the page twice to inspect changes. This severely harms local Development Experience (DX).
* **Recommendation:** Guard the registration so it only activates in production builds:
  ```javascript
  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js');
  }
  ```

---

## 📈 Public Launch Checklist & Roadmap

| Feature Area | Priority | Fix Estimate | Status |
| :--- | :---: | :---: | :---: |
| Securing `/api/ai` backend gateway with JWT | **Blocker** | 2 Hours | 🔴 Pending |
| Moving LLM rate limits from LocalStorage to Cloud | **Blocker** | 4 Hours | 🔴 Pending |
| Fixing `deleteNote` offline resurrection | **Blocker** | 1 Hour | 🔴 Pending |
| Preventing telemetric chart blank crashes | **Blocker** | 0.5 Hours | 🔴 Pending |
| Disabling PWA caching in local development | **High** | 0.5 Hours | 🔴 Pending |
| Converting Mock Social Network to real Supabase tables | **High** | 12 Hours | 🔴 Pending |
| Adding HTML sanitization to ReactQuill editor | **High** | 1 Hour | 🔴 Pending |
| Resolving Web Audio API silent alarms background bugs | **Medium** | 3 Hours | 🔴 Pending |
