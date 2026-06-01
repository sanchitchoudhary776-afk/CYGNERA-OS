# 🚀 AXINITE OS v1.0 — AI-Powered Study Platform

> Premium, full-stack study dashboard. Cognitive Sanctuary design. DeepSeek AI integration. 43 features. Zero compromises.

---

## ⚡ QUICK START

```bash
npm install
cp .env.example .env   # Add your DeepSeek key (optional for MVP)
npm run dev            # http://localhost:3000
```

**Login:** Any email + any password (6+ chars)

---

## 🎯 43 FEATURES — WHAT'S BUILT

### Authentication & Profile
- ✅ Sign Up (multi-step: account → subjects → learning style)
- ✅ Sign In (email + password, remember me)
- ✅ Profile Setup (name, learning style, subjects)

### Dashboard
- ✅ Today's Focus (3 priority tasks)
- ✅ Subject Progress Overview
- ✅ Weekly Stats (streak, hours, tasks)
- ✅ Upcoming Deadlines
- ✅ **AI Daily Briefing** (personalized coaching)
- ✅ Quick Actions

### Notes
- ✅ Create Note (title, content, subject, tags, auto-save)
- ✅ View Notes (grid with search + filter)
- ✅ Real-time Search
- ✅ Edit Note
- ✅ Delete Note
- ✅ Note Tags
- ✅ **AI Enhance** (flashcards, summary, key concepts, next topics)

### Tasks
- ✅ Create Task (title, description, subject, deadline, priority, estimate)
- ✅ View Tasks (filter: pending / completed)
- ✅ Complete Task (with animation)
- ✅ Edit Task
- ✅ Delete Task
- ✅ Priority Colors (High/Medium/Low)
- ✅ Deadline Countdown (overdue detection)
- ✅ **AI Subtask Breakdown** (auto-generate subtasks + time estimates)

### Study Schedule
- ✅ Calendar View (7-day week grid)
- ✅ Block Study Time (subject, topic, time, duration)
- ✅ View Schedule (today's sessions)
- ✅ **AI Auto-Schedule** (generate weekly study plan)

### Progress Tracking
- ✅ Weekly Hours (bar chart)
- ✅ Progress by Subject (with trends)
- ✅ Consistency Streak Calendar (28-day view)
- ✅ Time Allocation (pie chart)
- ✅ Key Stats (total hours, tasks, best streak)
- ✅ **AI Insights** (predictions, burnout detection, recommendations)

### Daily Check-In
- ✅ Mood Check (5-point emoji scale)
- ✅ Energy Level (1-10 slider)
- ✅ Sleep Hours
- ✅ **AI Mood Coaching** (personalized advice based on state)
- ✅ Check-In History (7-day mood grid)
- ✅ Burnout Risk Indicator

### Focus Timer
- ✅ Pomodoro Timer (25/5/15 min)
- ✅ Custom Duration (15/25/40/60 min)
- ✅ Session Tracking (today's log)
- ✅ Subject Selection
- ✅ Pre-Session Check-In modal
- ✅ **AI Timer Personalization** (optimal session length based on history)

### Learning Paths
- ✅ Create Learning Path (goal, style, level, hours/week)
- ✅ View Active Paths
- ✅ Phase Tracking (locked/active/completed)
- ✅ Progress Milestones
- ✅ **AI Path Generation** (auto-create 8-week roadmap)

### Achievements
- ✅ 12 achievement badges (Notes, Streak, Tasks, Focus, Paths)
- ✅ Auto-unlock on completion
- ✅ Progress bar (earned/total)
- ✅ Category grouping

### Video Library
- ✅ Save YouTube videos (URL → auto-extract thumbnail)
- ✅ Filter by subject
- ✅ Watch/unwatch tracking
- ✅ Add notes to videos
- ✅ Delete videos

### Settings
- ✅ Edit Profile (name, learning style)
- ✅ AI Status (shows active/inactive with setup instructions)
- ✅ Notification preferences (toggle each type)
- ✅ Data stats
- ✅ Export Data (JSON download)
- ✅ Clear Data
- ✅ Sign Out

---

## 🤖 AI INTEGRATION (DeepSeek V3.2)

9 AI features, all activated with one env variable:

```bash
VITE_DEEPSEEK_API_KEY=your_key_here
```

| Feature | Where | What it does |
|---|---|---|
| Daily Briefing | Dashboard | Personalized morning message |
| Note Enhance | Notes | Flashcards + summary + concepts |
| Task Breakdown | Tasks | Auto-subtasks + time estimates |
| Progress Insights | Progress | Predictions + burnout detection |
| Mood Coaching | Check-In | Adaptive study advice |
| Timer Settings | Focus Timer | Personalized session length |
| Path Generation | Learning Paths | 8-week AI roadmap |
| Achievement Messages | Achievements | Celebratory descriptions |
| Schedule Planning | Schedule | Weekly AI auto-schedule |

**Cost:** $0.28–0.42 per 1M tokens · 90% cache discount · Free 5M tokens on signup

---

## 📁 FILE STRUCTURE

```
src/
├── App.jsx                      # Router + all providers
├── main.jsx                     # Entry point
├── styles/globals.css           # Cognitive Sanctuary design system
├── utils/index.js               # Shared utilities + constants
├── context/
│   ├── AuthContext.jsx          # Auth state
│   └── AppContext.jsx           # Full app state (43 features)
├── services/ai.js               # DeepSeek AI (9 features)
├── components/
│   ├── ui/index.jsx             # 15 reusable components
│   └── layout/AppLayout.jsx    # Sidebar + mobile nav
└── pages/
    ├── Dashboard.jsx            # Home (bento grid)
    ├── Notes.jsx                # Notes CRUD + AI
    ├── Tasks.jsx                # Tasks CRUD + AI
    ├── Progress.jsx             # Analytics + charts
    ├── FocusTimer.jsx           # Pomodoro + check-in
    ├── LearningPaths.jsx        # AI roadmaps
    ├── Schedule.jsx             # Weekly calendar
    ├── CheckIn.jsx              # Mood + burnout
    ├── Achievements.jsx         # Badge system
    ├── Videos.jsx               # YouTube library
    ├── Settings.jsx             # App preferences
    └── auth/
        ├── Login.jsx            # Premium login
        └── Signup.jsx           # Multi-step onboarding
```

---

## 🎨 DESIGN SYSTEM — COGNITIVE SANCTUARY

| Token | Value |
|---|---|
| Primary BG | `#0e1510` |
| Accent | `#09cd83` (emerald green) |
| Glass | `rgba(22,29,24,0.5)` + `backdrop-filter: blur(24px)` |
| Text | `#dde5dc` / `#bbcabd` (muted) |
| Font | Plus Jakarta Sans (Google Fonts) |
| Icons | Material Symbols Outlined |

---

## 🚀 DEPLOYMENT

### Vercel
```bash
npm i -g vercel && vercel
# Add VITE_DEEPSEEK_API_KEY in Vercel Dashboard → Environment Variables
```

### Netlify
```bash
npm run build
# Drag dist/ folder to Netlify
# Add env var in Site Settings
```

---

## 📊 TECH STACK

| Layer | Tech |
|---|---|
| Frontend | React 18 + Vite 5 |
| Routing | React Router v6 |
| Styling | Tailwind CSS + Custom CSS |
| Charts | Recharts |
| AI | DeepSeek V3.2 via OpenAI SDK |
| State | Context API + localStorage |
| Build | Vite (1241 modules, <20s build) |

---

**AXINITE OS v1.0 · Built for ambitious learners · Powered by Axinite AI**
