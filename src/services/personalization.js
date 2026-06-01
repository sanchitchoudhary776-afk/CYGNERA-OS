// ═══════════════════════════════════════════════════════════════
//  AXINITE OS · PERSONALIZATION ENGINE
//  Makes the app feel alive — tracks mood, patterns, real scores,
//  and generates compressed AI digests for context-aware responses
// ═══════════════════════════════════════════════════════════════

const PROFILE_KEY = 'axinite_student_profile_v5';
const DIGEST_KEY = 'axinite_weekly_digests_v5';
const MOOD_KEY = 'axinite_current_mood_v5';

// ── Mood System ─────────────────────────────────
const MOOD_LABELS = {
  1: { label: 'Struggling', emoji: '😔', energy: 'very low', tone: 'gentle and encouraging' },
  2: { label: 'Low', emoji: '😐', energy: 'low', tone: 'supportive and motivating' },
  3: { label: 'Okay', emoji: '🙂', energy: 'moderate', tone: 'balanced and focused' },
  4: { label: 'Good', emoji: '😊', energy: 'high', tone: 'enthusiastic and challenging' },
  5: { label: 'Excellent', emoji: '🔥', energy: 'peak', tone: 'ambitious and celebratory' },
};

// ── Student Profile (persisted, accumulates over time) ──────
function loadProfile() {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveProfile(profile) {
  try { localStorage.setItem(PROFILE_KEY, JSON.stringify(profile)); } catch {}
}

function createDefaultProfile(userName) {
  return {
    name: userName || 'Student',
    createdAt: new Date().toISOString(),
    // Behavioral patterns (auto-detected)
    patterns: {
      chronotype: null,        // 'early_bird' | 'night_owl' | 'balanced'
      studyStyle: null,        // 'sprinter' | 'marathoner' | 'inconsistent'
      procrastinationLevel: 0, // 0-10
      consistencyScore: 50,    // 0-100
      strongSubjects: [],
      weakSubjects: [],
      avgSessionMinutes: 25,
      preferredBreakMinutes: 5,
      peakProductivityHour: null,
    },
    // Mood history (last 14 entries)
    moodHistory: [],
    // Weekly digest summaries (for AI context compression)
    weeklyDigests: [],
    // Personality tags (auto-generated)
    tags: [],
    // Interaction counters
    stats: {
      totalDaysActive: 0,
      totalCheckIns: 0,
      longestStreak: 0,
      avgMood: 3,
      avgSleep: 7,
      tasksCreated: 0,
      tasksCompleted: 0,
      notesCreated: 0,
      focusSessionsDone: 0,
      lastActiveDate: null,
    },
    updatedAt: new Date().toISOString(),
  };
}

// ── Core Analysis Engine ────────────────────────
export const PersonalizationEngine = {

  // Get or create the student profile
  getProfile(userName) {
    let profile = loadProfile();
    if (!profile) {
      profile = createDefaultProfile(userName);
      saveProfile(profile);
    } else {
      // Heal profile with default missing properties for backwards compatibility
      const defaults = createDefaultProfile(userName || profile.name);
      let changed = false;

      // Ensure all top-level properties exist
      for (const key of Object.keys(defaults)) {
        if (profile[key] === undefined) {
          profile[key] = defaults[key];
          changed = true;
        }
      }

      // Deeply heal sub-objects: patterns and stats
      if (profile.patterns) {
        for (const key of Object.keys(defaults.patterns)) {
          if (profile.patterns[key] === undefined) {
            profile.patterns[key] = defaults.patterns[key];
            changed = true;
          }
        }
      } else {
        profile.patterns = defaults.patterns;
        changed = true;
      }

      if (profile.stats) {
        for (const key of Object.keys(defaults.stats)) {
          if (profile.stats[key] === undefined) {
            profile.stats[key] = defaults.stats[key];
            changed = true;
          }
        }
      } else {
        profile.stats = defaults.stats;
        changed = true;
      }

      if (changed) {
        saveProfile(profile);
      }
    }
    return profile;
  },

  // ── Set current mood ──────────────────────────
  setMood(level) {
    const clamped = Math.max(1, Math.min(5, level));
    localStorage.setItem(MOOD_KEY, JSON.stringify({
      level: clamped,
      ...MOOD_LABELS[clamped],
      setAt: new Date().toISOString(),
    }));
    // Also add to profile mood history
    const profile = this.getProfile();
    profile.moodHistory = [
      { level: clamped, date: new Date().toISOString() },
      ...(profile.moodHistory || []).slice(0, 13)
    ];
    profile.stats.avgMood = Math.round(
      profile.moodHistory.reduce((s, m) => s + m.level, 0) / profile.moodHistory.length * 10
    ) / 10;
    saveProfile(profile);
    return MOOD_LABELS[clamped];
  },

  getMood() {
    try {
      const raw = localStorage.getItem(MOOD_KEY);
      if (!raw) return { level: 3, ...MOOD_LABELS[3], setAt: null };
      const mood = JSON.parse(raw);
      // If mood was set more than 8 hours ago, reset to neutral
      const hours = (Date.now() - new Date(mood.setAt).getTime()) / 3600000;
      if (hours > 8) return { level: 3, ...MOOD_LABELS[3], setAt: null, stale: true };
      return mood;
    } catch { return { level: 3, ...MOOD_LABELS[3], setAt: null }; }
  },

  // ── Analyze real student data and compute true scores ─────
  analyzeStudent(state) {
    const profile = this.getProfile(state.user?.name);
    const now = new Date();
    const today = now.toISOString().slice(0, 10);

    // --- Task completion rate (REAL, not inflated) ---
    const allTasks = state.tasks || [];
    const pending = allTasks.filter(t => t.status === 'pending');
    const completed = allTasks.filter(t => t.status === 'completed');
    const overdue = pending.filter(t => t.deadline && new Date(t.deadline) < now);
    const completionRate = allTasks.length > 0
      ? Math.round((completed.length / allTasks.length) * 100)
      : 0;

    // --- Discipline score (based on overdue tasks, consistency, check-ins) ---
    const overdueRatio = pending.length > 0 ? overdue.length / pending.length : 0;
    const checkIns = state.checkIns || [];
    const recentCheckIns = checkIns.filter(c => {
      const d = new Date(c.date);
      return (now - d) < 7 * 86400000;
    });
    const checkInConsistency = Math.min(100, (recentCheckIns.length / 7) * 100);

    let disciplineScore = Math.round(
      (completionRate * 0.4) +
      ((1 - overdueRatio) * 100 * 0.3) +
      (checkInConsistency * 0.3)
    );
    disciplineScore = Math.max(0, Math.min(100, disciplineScore));

    // --- Detect chronotype from check-in times ---
    if (checkIns.length >= 3) {
      const hours = checkIns.slice(0, 7).map(c => new Date(c.date).getHours());
      const avgHour = hours.reduce((s, h) => s + h, 0) / hours.length;
      profile.patterns.chronotype = avgHour < 10 ? 'early_bird' : avgHour > 18 ? 'night_owl' : 'balanced';
    }

    // --- Detect study style from focus session patterns ---
    const focusSessions = state.progress?.focusSessions || 0;
    const totalHours = state.progress?.totalHours || 0;
    if (focusSessions > 5) {
      profile.patterns.avgSessionMinutes = Math.round((totalHours * 60) / focusSessions);
      profile.patterns.studyStyle = profile.patterns.avgSessionMinutes > 40 ? 'marathoner'
        : profile.patterns.avgSessionMinutes < 20 ? 'sprinter' : 'balanced';
    }

    // --- Detect strong/weak subjects ---
    const subjects = state.progress?.subjects || {};
    const subEntries = Object.entries(subjects);
    if (subEntries.length > 0) {
      const sorted = [...subEntries].sort((a, b) => b[1].progress - a[1].progress);
      profile.patterns.strongSubjects = sorted.slice(0, 2).map(s => s[0]);
      profile.patterns.weakSubjects = sorted.slice(-2).map(s => s[0]);
    }

    // --- Procrastination level ---
    profile.patterns.procrastinationLevel = Math.round(overdueRatio * 10);

    // --- Consistency score ---
    const streak = state.progress?.streak || 0;
    profile.patterns.consistencyScore = Math.min(100, Math.round(
      (streak * 3) + (checkInConsistency * 0.5) + (completionRate * 0.3)
    ));

    // --- Generate personality tags ---
    profile.tags = [];
    if (streak >= 7) profile.tags.push('consistent');
    if (streak >= 14) profile.tags.push('dedicated');
    if (streak >= 30) profile.tags.push('unstoppable');
    if (profile.patterns.chronotype === 'early_bird') profile.tags.push('early_riser');
    if (profile.patterns.chronotype === 'night_owl') profile.tags.push('night_warrior');
    if (completionRate > 70) profile.tags.push('task_crusher');
    if (completionRate < 30 && allTasks.length > 3) profile.tags.push('needs_momentum');
    if (overdue.length > 3) profile.tags.push('overwhelmed');
    if (focusSessions > 20) profile.tags.push('focus_master');
    if (profile.stats.avgMood <= 2) profile.tags.push('needs_support');
    if (profile.stats.avgMood >= 4) profile.tags.push('high_energy');

    // --- Update stats ---
    if (profile.stats.lastActiveDate !== today) {
      profile.stats.totalDaysActive++;
      profile.stats.lastActiveDate = today;
    }
    profile.stats.totalCheckIns = checkIns.length;
    profile.stats.longestStreak = Math.max(profile.stats.longestStreak, streak);
    profile.stats.tasksCreated = allTasks.length;
    profile.stats.tasksCompleted = completed.length;
    profile.stats.notesCreated = (state.notes || []).length;
    profile.stats.focusSessionsDone = focusSessions;
    if (recentCheckIns.length > 0) {
      profile.stats.avgSleep = Math.round(
        recentCheckIns.reduce((s, c) => s + (c.sleepHours || 7), 0) / recentCheckIns.length * 10
      ) / 10;
    }
    profile.updatedAt = now.toISOString();

    saveProfile(profile);

    return {
      profile,
      realScores: {
        completionRate,
        disciplineScore,
        overdueCount: overdue.length,
        pendingCount: pending.length,
        completedCount: completed.length,
        streak,
        checkInConsistency: Math.round(checkInConsistency),
      },
    };
  },

  // ── Generate compressed weekly digest for AI ──────────────
  generateWeeklyDigestPrompt(state) {
    const { profile, realScores } = this.analyzeStudent(state);
    const mood = this.getMood();
    const userName = state.user?.name?.split(' ')[0] || profile.name || 'Student';

    // Build the previous digests context (last 3 weeks max)
    const pastDigests = (profile.weeklyDigests || []).slice(0, 3);
    const pastContext = pastDigests.length > 0
      ? `\nPREVIOUS WEEKLY SUMMARIES (most recent first):\n${pastDigests.map((d, i) => `Week ${i + 1} ago: ${d.summary}`).join('\n')}`
      : '\nNo previous weekly summaries yet — this is a new student.';

    return `STUDENT PROFILE FOR AI CONTEXT:
Name: ${userName}
Days Active: ${profile.stats.totalDaysActive}
Current Mood: ${mood.level}/5 (${mood.label}) — energy is ${mood.energy}
Avg Mood (recent): ${profile.stats.avgMood}/5
Avg Sleep: ${profile.stats.avgSleep}h
Chronotype: ${profile.patterns.chronotype || 'unknown'}
Study Style: ${profile.patterns.studyStyle || 'unknown'}
Strong Subjects: ${profile.patterns.strongSubjects.join(', ') || 'none detected yet'}
Weak Subjects: ${profile.patterns.weakSubjects.join(', ') || 'none detected yet'}
Personality Tags: [${profile.tags.join(', ')}]
Task Completion Rate: ${realScores.completionRate}%
Discipline Score: ${realScores.disciplineScore}/100
Overdue Tasks: ${realScores.overdueCount}
Pending Tasks: ${realScores.pendingCount}
Completed Tasks: ${realScores.completedCount}
Streak: ${realScores.streak} days
Consistency: ${realScores.checkInConsistency}%
Procrastination Level: ${profile.patterns.procrastinationLevel}/10
Focus Sessions Done: ${profile.stats.focusSessionsDone}
Notes Created: ${profile.stats.notesCreated}
${pastContext}

PERSONALIZATION RULES:
- Address the student by name ("${userName}")
- Match your tone to their mood: ${mood.tone}
- If mood ≤ 2: be gentle, reduce pressure, suggest lighter tasks, maybe add humor/warmth
- If mood = 3: be balanced and focused, give clear actionable advice
- If mood ≥ 4: be ambitious, challenge them, push for growth
- If overdue tasks > 2: acknowledge the backlog compassionately, don't guilt-trip
- If discipline < 40: focus on building small wins, not big goals
- If discipline > 70: challenge them with stretch goals
- Reference their actual data (streak, subjects, patterns) to show you KNOW them
- Never give generic advice. Every sentence should feel like it was written for THIS student.`;
  },

  // ── Save a weekly digest (called by AI after analysis) ────
  saveWeeklyDigest(summary) {
    const profile = this.getProfile();
    profile.weeklyDigests = [
      { summary, generatedAt: new Date().toISOString() },
      ...(profile.weeklyDigests || []).slice(0, 7) // Keep last 8 weeks
    ];
    saveProfile(profile);
  },

  // ── Get mood-aware greeting ───────────────────
  getGreeting(userName) {
    const h = new Date().getHours();
    const mood = this.getMood();
    const name = userName?.split(' ')[0] || 'there';
    const timeGreet = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';

    if (mood.level <= 2) {
      const gentle = [
        `Hey ${name}, take it easy today 💙`,
        `${timeGreet}, ${name}. One step at a time.`,
        `Hi ${name} — remember, rest is productive too.`,
      ];
      return gentle[Math.floor(Math.random() * gentle.length)];
    }
    if (mood.level >= 4) {
      const energized = [
        `${timeGreet}, ${name}! Let's crush it 🔥`,
        `${name}, you're on fire today! Ready to level up?`,
        `Hey ${name}! That energy is contagious — let's go! ⚡`,
      ];
      return energized[Math.floor(Math.random() * energized.length)];
    }
    return `${timeGreet}, ${name}.`;
  },

  // ── Get personalized study recommendation ─────
  getQuickRecommendation(state) {
    const mood = this.getMood();
    const { profile, realScores } = this.analyzeStudent(state);
    const pending = (state.tasks || []).filter(t => t.status === 'pending');
    const overdue = pending.filter(t => t.deadline && new Date(t.deadline) < new Date());

    if (mood.level <= 2) {
      return {
        icon: 'self_improvement',
        title: 'Light Review Day',
        message: `Not feeling 100%? That's okay, ${profile.name.split(' ')[0]}. Try reviewing old notes for 15 min instead of new material.`,
        suggestedMinutes: 15,
        color: '#60a5fa',
      };
    }

    if (overdue.length > 0) {
      return {
        icon: 'priority_high',
        title: 'Clear Your Backlog',
        message: `You have ${overdue.length} overdue task${overdue.length > 1 ? 's' : ''} — "${overdue[0].title}". Start with the smallest one to build momentum.`,
        suggestedMinutes: 30,
        color: '#f97316',
      };
    }

    if (realScores.streak > 7 && mood.level >= 4) {
      return {
        icon: 'rocket_launch',
        title: 'Push Your Limits',
        message: `${realScores.streak}-day streak and high energy? Tackle your weakest subject: ${profile.patterns.weakSubjects[0] || 'something new'}.`,
        suggestedMinutes: 45,
        color: '#a78bfa',
      };
    }

    if (pending.length > 0) {
      const next = pending.sort((a, b) => {
        const pri = { high: 0, medium: 1, low: 2 };
        return (pri[a.priority] ?? 1) - (pri[b.priority] ?? 1);
      })[0];
      return {
        icon: 'task_alt',
        title: 'Next Priority',
        message: `Focus on "${next.title}" (${next.priority} priority). ${next.estimatedMinutes ? `~${next.estimatedMinutes}min estimated.` : ''}`,
        suggestedMinutes: next.estimatedMinutes || 30,
        color: 'var(--p)',
      };
    }

    return {
      icon: 'celebration',
      title: 'All Clear!',
      message: 'No pending tasks! Great time to create new study material or review old notes.',
      suggestedMinutes: 20,
      color: '#10b981',
    };
  },

  MOOD_LABELS,
};

export default PersonalizationEngine;
