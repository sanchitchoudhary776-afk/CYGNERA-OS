// ═══════════════════════════════════════════════════════════════
//  AXINITE OS · AI SERVICE — Groq (Llama 3.3 70B + Llama 3.1 8B)
//  Native fetch implementation — No SDK dependency
//  Smart model routing: 70B for deep insights, 8B for fast tasks
//  + Personalization Engine integration for mood-aware responses
//  + Central Cache & Rate Limiting Integration to minimize tokens
// ═══════════════════════════════════════════════════════════════
import { PersonalizationEngine } from './personalization';
import { cachedAICall, checkRateLimit, recordUsage } from './aiCache';

const MODELS = {
  fast: 'llama-3.1-8b-instant',      // Groq — fast
  deep: 'llama-3.3-70b-versatile',   // Groq — deep
  ultra: 'llama-3.3-70b-versatile',   // Groq — deep (Fallback for ultra requests)
};

// ─── Utilities ──────────────────────────────────────────────
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

export const AI = {
  enabled: () => true,
  hasGemini: () => false,
  setKey: (key) => { },
  getMaskedKey: () => '••••••••••••••••',
  getKey: () => 'BACKEND_SECURED_ROTATION',
  isUserKey: () => false,
  clearKey: () => { },
  // Dev-mode key helpers (localStorage-based, never bundled in production)
  getDevKey: () => localStorage.getItem('ax_dev_groq_key') || '',
  setDevKey: (key) => {
    if (key && key.trim()) localStorage.setItem('ax_dev_groq_key', key.trim());
    else localStorage.removeItem('ax_dev_groq_key');
  },
  hasDevKey: () => Boolean(localStorage.getItem('ax_dev_groq_key')),
  isDev: () => import.meta.env.DEV,
};

// ─── Client ─────────────────────────────────────────────────
// ─── Native Fetch Implementation (Calls Secure Backend Proxy) ─────────
const FETCH_TIMEOUT_MS = 45000; // 45s timeout — 70B models can take 15-30s on free tier
const DEV_KEY_STORAGE = 'ax_dev_groq_key'; // localStorage key for dev-mode direct API access

const callWithRetry = async (params) => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    // ── Dev Mode: use a key stored in localStorage to call Groq directly ──
    // This lets AI work on localhost without any .env config.
    // On production (Vercel), devKey is always null and the secure proxy is used.
    const devKey = import.meta.env.DEV ? localStorage.getItem(DEV_KEY_STORAGE) : null;

    let response;
    if (devKey) {
      response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${devKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
        signal: controller.signal,
      });
    } else {
      response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
        signal: controller.signal,
      });
    }

    clearTimeout(timeoutId);
    const data = await response.json();

    if (!response.ok) {
      const errMsg = data.error?.message || `HTTP ${response.status}`;
      const err = new Error(errMsg);
      err.status = response.status;
      throw err;
    }

    return data;
  } catch (err) {
    if (err.name === 'AbortError') {
      const timeout = new Error(`Request timed out after ${FETCH_TIMEOUT_MS / 1000}s. The model may be overloaded.`);
      timeout.isTimeout = true;
      throw timeout;
    }
    console.error(`[AI Service Proxy Error]:`, err.message);
    throw err;
  }
};

// ─── Core Callers with Automatic Model Fallback ─────────────
// If a 70B (deep/ultra) call fails due to rate-limit, timeout, or server error,
// it automatically retries once with the fast 8B model so features never break.
const call = async (messages, { model = MODELS.fast, temp = 0.7, max = 1000 } = {}) => {
  let cleanMessages = messages.map(m => ({
    role: m.role === 'model' ? 'assistant' : m.role,
    content: m.content
  }));

  while (cleanMessages.length > 0 && cleanMessages[0].role === 'assistant') {
    cleanMessages.shift();
  }

  if (cleanMessages.length === 0 || (cleanMessages[0].role !== 'system' && cleanMessages[0].role !== 'user')) {
    cleanMessages.unshift({ role: 'system', content: 'You are a helpful study assistant.' });
  }

  const resolvedModel = model === MODELS.ultra ? MODELS.deep : model;
  const is70B = resolvedModel === MODELS.deep;

  try {
    const res = await callWithRetry({
      model: resolvedModel,
      messages: cleanMessages,
      temperature: temp,
      max_tokens: max,
    });
    return res?.choices?.[0]?.message?.content?.trim() ?? null;
  } catch (err) {
    // ── Automatic fallback: if 70B failed, retry with 8B ──
    if (is70B) {
      console.warn(`[AI] 70B model failed (${err.message}). Falling back to 8B...`);
      try {
        const res = await callWithRetry({
          model: MODELS.fast,
          messages: cleanMessages,
          temperature: temp,
          max_tokens: max,
        });
        return res?.choices?.[0]?.message?.content?.trim() ?? null;
      } catch (fallbackErr) {
        console.error('[AI] 8B fallback also failed:', fallbackErr.message);
        throw fallbackErr;
      }
    }
    throw err;
  }
};

const callJSON = async (sys, user, { model = MODELS.fast, temp = 0.5, max = 800 } = {}) => {
  const text = await call([
    { role: 'system', content: (sys || '') + '\n\nRespond ONLY with valid JSON. No markdown, no backticks, no explanation.' },
    { role: 'user', content: user }
  ], { model, temp, max });

  if (!text) {
    throw new Error('AI Service returned an empty response. The backend may be rate-limited or unavailable.');
  }

  // Robust JSON Extraction: extract substring between first '{' and last '}'
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');

  if (start === -1 || end === -1 || end <= start) {
    throw new Error('AI returned an invalid response format (could not find JSON block). Please try again.');
  }

  const jsonText = text.substring(start, end + 1).trim();

  try {
    return JSON.parse(jsonText);
  } catch (e) {
    console.error('[AI] JSON Parse Error:', e, 'Raw Text:', text);
    throw new Error(`Failed to parse AI response: ${e.message}`);
  }
};


// ═══════════════════════════════════════════════════════════════
//  1. NOTE INTELLIGENCE — Model: 8B (fast, high-volume)
// ═══════════════════════════════════════════════════════════════
export async function enhanceNote(content) {
  if (!content || content.length < 40) return null;

  const cacheRes = await cachedAICall(
    'note_enhance',
    content,
    () => callJSON(
      `You are an expert learning scientist embedded in a study productivity app called AXINITE OS.
Analyze the student's note and extract maximum study value.
Be concise, precise, and provide genuinely useful flashcards that test deep understanding.`,
      `Note content:\n"${content}"\n\nReturn JSON:\n{"summary":"2-3 sentence summary","concepts":["c1","c2","c3","c4","c5"],"flashcards":[{"question":"Q?","answer":"A"},{"question":"Q?","answer":"A"},{"question":"Q?","answer":"A"}],"nextTopics":["topic1","topic2","topic3"],"difficulty":"beginner|intermediate|advanced","estimatedReview":15}`,
      { model: MODELS.fast, temp: 0.3 }
    ),
    { ttlMs: 24 * 60 * 60 * 1000 }
  );

  if (cacheRes.rateLimited) {
    throw new Error(cacheRes.error);
  }
  return cacheRes.result;
}

export async function generateQuiz(content, n = 5) {
  const cacheRes = await cachedAICall(
    'quiz_gen',
    `${content}_n_${n}`,
    () => callJSON(
      'You are an expert educator. Create challenging quiz questions testing deep understanding, not surface recall.',
      `Generate ${n} multiple-choice questions from:\n"${content}"\n\nReturn JSON:\n{"questions":[{"question":"Q?","options":["A) ...","B) ...","C) ...","D) ..."],"correct":"A","explanation":"Why correct"}]}`,
      { model: MODELS.fast, temp: 0.4 }
    ),
    { ttlMs: 24 * 60 * 60 * 1000 }
  );

  if (cacheRes.rateLimited) {
    throw new Error(cacheRes.error);
  }
  return cacheRes.result;
}

export async function inlineComplete(command, textContext) {
  // Inline completion is highly dynamic and not cached, but it is rolling-window rate-limited
  const limit = checkRateLimit('note_inline');
  if (!limit.allowed) {
    const mins = Math.ceil(limit.resetIn / 60000);
    throw new Error(`${limit.label} rate limit reached. Resets in ${mins}m.`);
  }

  try {
    const res = await call([{
      role: 'system', content: 'You are an AI assistant built into a text editor. The user has triggered a slash command. Complete the request based on the text context provided. Respond ONLY with the generated text, do not use quotes, greetings, or filler text. Just the exact text to be inserted into the document.'
    }, {
      role: 'user', content: `Context:\n"""\n${textContext.slice(-3000)}\n"""\n\nCommand: ${command}`
    }], { model: MODELS.fast, temp: 0.7, max: 500 });

    if (res) recordUsage('note_inline');
    return res;
  } catch (err) {
    throw err;
  }
}


// ═══════════════════════════════════════════════════════════════
//  2. TASK INTELLIGENCE — Model: 8B (structured output)
// ═══════════════════════════════════════════════════════════════
export async function breakTask(title, subject = '') {
  const cacheRes = await cachedAICall(
    'task_breakdown',
    `${title}_subj_${subject}`,
    () => callJSON(
      'You are a productivity coach. Break tasks into clear, time-boxed subtasks, write a description, and assign priority/subject.',
      `Task: "${title}"\nContext: ${subject || 'None'}\n\nReturn JSON:\n{"description":"Short task summary","subject":"Closest academic subject (e.g. Computer Science, Math, Literature, etc.)","priority":"high|medium|low","subtasks":[{"title":"Subtask","description":"What to do","estimatedMinutes":20,"priority":"high|medium|low"}],"totalEstimatedMinutes":80,"tip":"Key tip"}`,
      { model: MODELS.fast, temp: 0.4 }
    ),
    { ttlMs: 7 * 24 * 60 * 60 * 1000 } // Cache for 7 days
  );

  if (cacheRes.rateLimited) {
    throw new Error(cacheRes.error);
  }
  return cacheRes.result;
}


// ═══════════════════════════════════════════════════════════════
//  3. PROGRESS INTELLIGENCE — Model: 70B (deep pattern analysis)
//  Now personalization-aware: uses real scores, mood, student profile
// ═══════════════════════════════════════════════════════════════
export async function progressInsights(data, appState) {
  const profileCtx = appState ? PersonalizationEngine.generateWeeklyDigestPrompt(appState) : '';
  const { realScores } = appState ? PersonalizationEngine.analyzeStudent(appState) : { realScores: {} };

  // Create a robust fingerprint of today's progress telemetry
  const todayStr = new Date().toDateString();
  const fingerprint = `progress_${todayStr}_tasks_${appState?.tasks?.length || 0}_done_${appState?.tasks?.filter(t => t.status === 'completed').length || 0}_hours_${appState?.progress?.totalHours || 0}_streak_${realScores.streak || 0}`;

  const cacheRes = await cachedAICall(
    'progress_insights',
    fingerprint,
    () => callJSON(
      `You are a deeply personalized AI study coach inside AXINITE OS. You KNOW this student personally.\n${profileCtx}\n\nGive DETAILED, specific, PERSONALIZED insights. Reference their name, mood, actual performance data. Your score MUST reflect reality — if they have overdue tasks and low completion, score them LOW. If they're crushing it, score HIGH. Never give generic advice. Be thorough in your analysis.`,
      `Student activity data:\n${JSON.stringify(data, null, 2)}\nReal Scores: completion=${realScores.completionRate || 0}%, discipline=${realScores.disciplineScore || 0}/100, overdue=${realScores.overdueCount || 0}, streak=${realScores.streak || 0}\n\nReturn JSON:\n{"headline":"One detailed sentence about THEIR specific status (use their name)","trend":"improving|stable|declining","score":${realScores.disciplineScore || 50},"strengths":["specific strength 1","specific strength 2","specific strength 3"],"improvements":["specific area 1","specific area 2","specific area 3"],"prediction":"Two sentence personalized prediction about their trajectory","weeklyFocus":"Detailed specific task or subject recommendation for THEM with reasoning","nextSteps":["actionable step 1","actionable step 2","actionable step 3"],"burnoutRisk":"low|medium|high","burnoutDetail":"One sentence explaining WHY this burnout level","encouragement":"Personal motivating message using their name (2 sentences)"}`,
      { model: MODELS.ultra, temp: 0.5, max: 800 }
    ),
    { ttlMs: 4 * 60 * 60 * 1000 } // Cache for 4 hours
  );

  if (cacheRes.rateLimited) {
    throw new Error(cacheRes.error);
  }
  return cacheRes.result;
}


// ═══════════════════════════════════════════════════════════════
//  4. CHECK-IN / MOOD COACHING — Model: 70B (empathetic, nuanced)
// ═══════════════════════════════════════════════════════════════
export async function moodCoaching({ mood, energy, sleepHours, stressLevel = 5, focusMode = 'Deep Work', mainObjective = '', tasks = [] }) {
  const todayStr = new Date().toDateString();
  const fingerprint = `mood_${todayStr}_m${mood}_e${energy}_s${sleepHours}_str${stressLevel}_obj_${mainObjective}_t_${tasks.length}`;

  const cacheRes = await cachedAICall(
    'mood_coaching',
    fingerprint,
    () => callJSON(
      `You are an elite productivity AI in AXINITE OS. Based on the user's daily biometrics and intentions, provide a highly tactical strategy for today.`,
      `mood ${mood}/5, energy ${energy}/10, sleep ${sleepHours}h, stress ${stressLevel}/10. Focus Mode: ${focusMode}. Main Objective: "${mainObjective}". Pending: ${tasks.join(', ') || 'none'}\n\nReturn JSON:\n{"greeting":"Short high-performance greeting","recommendation":"Tactical strategy to achieve the main objective given their current energy/stress","durationMinutes":45,"breakActivity":"Specific break tailored to their current state","message":"A powerful empowering statement","warningFlag":null}`,
      { model: MODELS.fast, temp: 0.6, max: 400 }
    ),
    { ttlMs: 12 * 60 * 60 * 1000 } // Cache for 12 hours
  );

  if (cacheRes.rateLimited) {
    throw new Error(cacheRes.error);
  }
  return cacheRes.result;
}


// ═══════════════════════════════════════════════════════════════
//  5. FOCUS TIMER SETTINGS — Model: 8B (structured, fast)
// ═══════════════════════════════════════════════════════════════
export async function timerSettings(history = {}) {
  const historyFingerprint = typeof history === 'object' ? JSON.stringify(history) : String(history);

  const cacheRes = await cachedAICall(
    'timer_settings',
    historyFingerprint,
    () => callJSON(
      'You are a cognitive performance coach. Recommend optimal focus session lengths based on study patterns.',
      `Study history:\n${historyFingerprint}\n\nReturn JSON:\n{"recommendedMinutes":35,"breakMinutes":7,"reasoning":"Why these durations","peakHours":["9am-11am"],"tip":"Pre-session tip"}`,
      { model: MODELS.fast, temp: 0.4 }
    ),
    { ttlMs: 24 * 60 * 60 * 1000 } // Cache for 24 hours
  );

  if (cacheRes.rateLimited) {
    throw new Error(cacheRes.error);
  }
  return cacheRes.result;
}


// ═══════════════════════════════════════════════════════════════
//  6. LEARNING PATH GENERATION — Model: 70B (curriculum design)
// ═══════════════════════════════════════════════════════════════
export async function generatePath({ goal, style, level, hoursPerWeek }) {
  const fingerprint = `path_${goal}_s_${style}_l_${level}_h_${hoursPerWeek}`;

  const cacheRes = await cachedAICall(
    'path_gen',
    fingerprint,
    () => callJSON(
      `You are a curriculum design expert for AXINITE OS. Create structured, achievable 8-week learning paths.
Each phase should have clear topics and a tangible milestone.`,
      `Goal: ${goal}, Style: ${style}, Level: ${level}, Hours/week: ${hoursPerWeek}\n\nReturn JSON:\n{"title":"Path title","totalWeeks":8,"phases":[{"phase":1,"title":"Phase","weeks":"1-2","topics":["t1","t2","t3"],"milestone":"What you can do"}],"milestones":["Week 2 milestone","Week 4","Week 6","Week 8"],"tip":"Success tip"}`,
      { model: MODELS.ultra, temp: 0.7 }
    ),
    { ttlMs: 30 * 24 * 60 * 60 * 1000 } // Cache for 30 days
  );

  if (cacheRes.rateLimited) {
    throw new Error(cacheRes.error);
  }
  return cacheRes.result;
}


// ═══════════════════════════════════════════════════════════════
//  7. DAILY BRIEFING — Model: 8B (fast, personalized)
//  Now mood-aware, name-using, and based on real student profile
// ═══════════════════════════════════════════════════════════════
export async function dailyBriefing({ name, streak, tasks, progress }, appState) {
  const mood = PersonalizationEngine.getMood();
  const profile = PersonalizationEngine.getProfile(name);
  const firstName = name?.split(' ')[0] || 'Student';
  const { realScores } = appState ? PersonalizationEngine.analyzeStudent(appState) : { realScores: {} };

  // Generate fingerprint based on daily data + mood + pending tasks count
  const todayStr = new Date().toDateString();
  const fingerprint = `briefing_${todayStr}_m_${mood.level}_st_${streak}_tasks_${Array.isArray(tasks) ? tasks.length : tasks}_disc_${realScores.disciplineScore || 50}`;

  const cacheRes = await cachedAICall(
    'daily_briefing',
    fingerprint,
    async () => {
      // Build mood-adaptive system prompt
      let systemTone = 'Be direct and focused.';
      let extraInstruction = '';
      if (mood.level <= 2) {
        systemTone = 'Be gentle, warm, and encouraging. Suggest lighter workload. Maybe add a small joke or warm thought.';
        extraInstruction = `The student is feeling ${mood.label.toLowerCase()} right now. Don't push hard. Acknowledge their feelings briefly.`;
      } else if (mood.level >= 4) {
        systemTone = 'Be energetic, ambitious, and challenging. Push them to go further.';
        extraInstruction = `The student is in a great mood! Challenge them with their hardest pending task.`;
      }

      return call([{
        role: 'system', content: `You are Aura, the personal AI inside AXINITE OS. Give a 2-3 sentence PERSONALIZED briefing. ${systemTone} Always address the student as "${firstName}". Reference specific tasks by name. ${extraInstruction} No generic motivational quotes. Every word should feel written specifically for ${firstName}.`,
      }, {
        role: 'user', content: `${firstName}'s current state:\n- Mood: ${mood.level}/5 (${mood.label})\n- Pending tasks (${Array.isArray(tasks) ? tasks.length : tasks}): ${Array.isArray(tasks) && tasks.length ? tasks.slice(0, 4).join(', ') : 'none'}\n- Streak: ${streak} days\n- Discipline: ${realScores.disciplineScore || 50}/100\n- Overdue: ${realScores.overdueCount || 0} tasks\n- Completion rate: ${realScores.completionRate || 0}%\n- Strong subjects: ${profile.patterns?.strongSubjects?.join(', ') || 'unknown'}\n- Weak subjects: ${profile.patterns?.weakSubjects?.join(', ') || 'unknown'}\n- Avg sleep: ${profile.stats?.avgSleep || 7}h\n- Personality: [${(profile.tags || []).join(', ')}]\n\nGive ${firstName} a personalized briefing for right now.`,
      }], { model: MODELS.fast, temp: 0.7, max: 120 });
    },
    { ttlMs: 12 * 60 * 60 * 1000 } // Cache for 12 hours
  );

  if (cacheRes.rateLimited) {
    throw new Error(cacheRes.error);
  }
  return cacheRes.result;
}


// ═══════════════════════════════════════════════════════════════
//  8. DAILY REPORT CARD — Model: Ultra (evaluative + personalized)
//  Now uses real discipline scores and references student by name
// ═══════════════════════════════════════════════════════════════
export async function generateDailyReport(data, appState) {
  const mood = PersonalizationEngine.getMood();
  const profile = PersonalizationEngine.getProfile();
  const firstName = profile.name?.split(' ')[0] || 'Student';
  const { realScores } = appState ? PersonalizationEngine.analyzeStudent(appState) : { realScores: {} };

  // Fingerprint is based on date and completed task stats
  const todayStr = new Date().toDateString();
  const fingerprint = `report_${todayStr}_m_${mood.level}_c_${realScores.completedCount || 0}_d_${realScores.disciplineScore || 50}`;

  const cacheRes = await cachedAICall(
    'daily_report',
    fingerprint,
    () => {
      // Mood-aware strictness
      let evaluationTone = 'Be honest and balanced.';
      if (mood.level <= 2) {
        evaluationTone = 'Be honest but compassionate. Acknowledge the struggle. Focus on what they DID do, even if small. End with genuine warmth.';
      } else if (mood.level >= 4) {
        evaluationTone = 'Be ambitious and direct. If they could have done more, say it. Challenge them for tomorrow.';
      }

      return callJSON(
        `You are an elite academic performance evaluator in AXINITE OS. Generate a PERSONALIZED daily report card for ${firstName}. ${evaluationTone}\n\nCRITICAL: Your score MUST be based on REAL data. If task completion rate is ${realScores.completionRate || 0}% and discipline is ${realScores.disciplineScore || 0}/100 with ${realScores.overdueCount || 0} overdue tasks, the grade MUST reflect that. Do NOT inflate grades. An F means they did nothing. An A+ means exceptional performance backed by data.\n\nAlways address ${firstName} by name in the summary.`,
        `${firstName}'s data today:\n${JSON.stringify(data, null, 2)}\nReal Scores: completion=${realScores.completionRate}%, discipline=${realScores.disciplineScore}/100, overdue=${realScores.overdueCount}, streak=${realScores.streak}\nMood: ${mood.level}/5 (${mood.label})\nPersonality: [${(profile.tags || []).join(', ')}]\n\nReturn JSON:\n{"grade":"A+|A|A-|B+|B|C|D|F","score":${realScores.disciplineScore || 50},"summary":"2-3 sentences addressing ${firstName} by name about their REAL performance today.","metrics":{"focus":"rating","tasks":"rating","consistency":"rating"},"achievements":["specific thing ${firstName} did well"],"missedOpportunities":["specific area to improve"],"tomorrowActionPlan":["personalized action 1", "personalized action 2"]}`,
        { model: MODELS.ultra, temp: 0.5, max: 800 }
      );
    },
    { ttlMs: 12 * 60 * 60 * 1000 } // Cache for 12 hours
  );

  if (cacheRes.rateLimited) {
    throw new Error(cacheRes.error);
  }
  return cacheRes.result;
}


// ═══════════════════════════════════════════════════════════════
//  9. SCHEDULE GENERATOR — Model: 70B (balanced planning)
// ═══════════════════════════════════════════════════════════════
export async function generateSchedule({ subjects, hours, priorities }) {
  const fingerprint = `sched_${subjects.join()}_h_${hours}_p_${priorities.join()}`;

  const cacheRes = await cachedAICall(
    'schedule_gen',
    fingerprint,
    () => callJSON(
      'You are a study planner in AXINITE OS. Create balanced, realistic weekly schedules that maximize retention through spaced repetition.',
      `Subjects: ${subjects.join(', ')}, Available: ${hours}h/week, Priority: ${priorities.join(', ')}\n\nReturn JSON:\n{"schedule":{"Monday":[{"time":"9:00 AM","subject":"Math","duration":60,"topic":"Topic name"}],"Tuesday":[],"Wednesday":[],"Thursday":[],"Friday":[],"Saturday":[],"Sunday":[]},"totalPerSubject":{"Math":3},"advice":"Key insight"}`,
      { model: MODELS.ultra, temp: 0.6 }
    ),
    { ttlMs: 7 * 24 * 60 * 60 * 1000 } // Cache for 7 days
  );

  if (cacheRes.rateLimited) {
    throw new Error(cacheRes.error);
  }
  return cacheRes.result;
}


// ═══════════════════════════════════════════════════════════════
//  9. VIDEO INTELLIGENCE — Model: Ultra (reasoning)
// ═══════════════════════════════════════════════════════════════
export async function summarizeVideo(title, subject, transcript = '', notes = '') {
  const fingerprint = `video_${title}_subj_${subject}_t_${transcript.slice(0, 1000)}_n_${notes}`;

  const cacheRes = await cachedAICall(
    'video_summary',
    fingerprint,
    () => {
      const content = transcript
        ? `TRANSCRIPT: ${transcript.slice(0, 15000)}` // Limit for safety
        : `TITLE: "${title}" (No transcript available)`;

      return callJSON(
        `You are an expert tutor in AXINITE OS. Generate a high-quality study guide based on the video content.
        If a transcript is provided, summarize it accurately. If not, predict the core concepts based on the title.`,
        `Video: ${content}\nSubject: ${subject}\nStudent Context: ${notes}\n\nReturn JSON:\n{"summary":"Concise summary or prediction","concepts":["Key Concept 1","Key Concept 2","Key Concept 3"],"questions":["Practice Question 1","Practice Question 2","Practice Question 3"],"takeaway":"One major actionable takeaway"}`,
        { model: MODELS.ultra, temp: 0.7 }
      );
    },
    { ttlMs: 30 * 24 * 60 * 60 * 1000 } // Cache for 30 days
  );

  if (cacheRes.rateLimited) {
    throw new Error(cacheRes.error);
  }
  return cacheRes.result;
}


// ═══════════════════════════════════════════════════════════════
//  10. AURA CHAT — Model: Groq (Fast Chat + Tool Use)
// ═══════════════════════════════════════════════════════════════
const AURA_TOOLS_GROQ = [
  {
    type: "function",
    function: {
      name: "schedule_session",
      description: "Schedule a study session for a specific subject and topic.",
      parameters: {
        type: "object",
        properties: {
          subject: { type: "string", description: "The academic subject (e.g., Mathematics, Web Dev)" },
          topic: { type: "string", description: "Specific topic to study" },
          startTime: { type: "string", description: "Start time in HH:mm format (24h)" },
          duration: { type: "number", description: "Duration in minutes" },
          day: { type: "string", description: "Date in YYYY-MM-DD format (default to today)" }
        },
        required: ["subject", "topic", "startTime", "duration"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "update_progress",
      description: "Update the progress percentage for a specific subject.",
      parameters: {
        type: "object",
        properties: {
          subject: { type: "string", description: "The subject name" },
          progress: { type: "number", description: "New progress percentage (0-100)" }
        },
        required: ["subject", "progress"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "navigate_to",
      description: "Navigate the user to a specific page within the application.",
      parameters: {
        type: "object",
        properties: {
          page: {
            type: "string",
            description: "The page route (e.g., /dashboard, /focus, /tasks, /notes, /schedule, /progress, /paths)"
          }
        },
        required: ["page"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "start_focus_timer",
      description: "Start the focus timer immediately.",
      parameters: {
        type: "object",
        properties: {
          duration: { type: "number", description: "Timer duration in minutes" },
          subject: { type: "string", description: "Subject to focus on" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "edit_schedule",
      description: "Edit an existing scheduled session's topic, time, or duration based on the subject and old topic.",
      parameters: {
        type: "object",
        properties: {
          subject: { type: "string", description: "The subject of the session to edit" },
          oldTopic: { type: "string", description: "The current topic to identify the session" },
          newTopic: { type: "string", description: "The new topic (optional)" },
          startTime: { type: "string", description: "The new start time in HH:mm format (optional)" },
          duration: { type: "number", description: "The new duration in minutes (optional)" }
        },
        required: ["subject", "oldTopic"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "delete_schedule",
      description: "Delete a scheduled session.",
      parameters: {
        type: "object",
        properties: {
          subject: { type: "string", description: "The subject of the session to delete" },
          topic: { type: "string", description: "The topic of the session to delete" }
        },
        required: ["subject", "topic"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "add_task",
      description: "Add a new pending task to the user's to-do list.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "The task title/description" },
          priority: { type: "string", description: "Priority level: 'high', 'medium', or 'low'" }
        },
        required: ["title", "priority"]
      }
    }
  }
];

export async function auraChat(messages, userContext) {
  // Aura Chat is limited to 50 messages per 5 hours window
  const limit = checkRateLimit('aura_chat');
  if (!limit.allowed) {
    const mins = Math.ceil(limit.resetIn / 60000);
    return { error: `${limit.label} limit reached (resets in ${mins} min). Please try again later.` };
  }

  const mood = PersonalizationEngine.getMood();
  const profile = PersonalizationEngine.getProfile(userContext.name);
  const firstName = userContext.name?.split(' ')[0] || 'Student';
  const profileCtx = PersonalizationEngine.generateWeeklyDigestPrompt(userContext.appState || {});

  const systemPrompt = `You are Aura, the intelligent heart of AXINITE OS — a deeply personal, realistic companion for ${firstName}.

  CORE RULES:
  - Keep answers extremely humanistic, clear-cut, and ultra-short.
  - Avoid paragraphs or filler information entirely.
  - Limit every response to exactly 1 short sentence (maximum 10-15 words).
  - Use casual, natural, premium companion-like styling (no markdown).
  - If asked to recalibrate mood or feelings, tell them you are taking them to calibrate, and call navigate_to with page="/checkin".
  - If scheduling a session and no time is specified, ask "At what time do you want to study?" in a simple 5-word sentence.
  - When confirming a tool call, keep it under 8 words (e.g., "Done, scheduled physics for you." or "I've started your timer, let's go.").`;

  try {
    const groqRes = await callWithRetry({
      model: MODELS.fast,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map(m => ({ role: m.role === 'model' ? 'assistant' : m.role, content: m.content }))
      ],
      tools: AURA_TOOLS_GROQ,
      tool_choice: "auto",
      temperature: 0.7
    });

    if (!groqRes) {
      return { error: 'Failed to connect to AI service. The backend may be unavailable.' };
    }

    const msg = groqRes?.choices?.[0]?.message;
    if (msg) {
      // Chat successful, record rate limit usage
      recordUsage('aura_chat');

      let content = msg.content || "";
      let toolCalls = msg.tool_calls?.map(tc => ({
        name: tc.function.name,
        args: JSON.parse(tc.function.arguments)
      })) || [];

      // 🚨 Advanced Fix for Multiple Groq/Llama "Hallucinated" Tool Calls
      const leakRegex = /(?:<function=|<)?([a-zA-Z0-9_]+)>?\s*(\{.*?\})(?:<\/(?:function|\1)>)?/gs;
      const matches = [...content.matchAll(leakRegex)];

      if (matches.length > 0) {
        for (const match of matches) {
          try {
            toolCalls.push({
              name: match[1],
              args: JSON.parse(match[2])
            });
            content = content.replace(match[0], '').trim();
          } catch (err) {
            console.error('[AI] Failed to parse hallucinated tool call:', err);
          }
        }
      }

      return {
        content: content,
        toolCalls: toolCalls.length ? toolCalls : null
      };
    }

    return { error: 'Unexpected response from Groq.' };
  } catch (e) {
    console.error('[AI] Groq Chat failed:', e.message);
    return { error: `Connection Error: ${e.message}` };
  }
}


// ═══════════════════════════════════════════════════════════════
//  11. ACHIEVEMENT MESSAGES — Model: 8B (fast, celebratory)
// ═══════════════════════════════════════════════════════════════
export async function achievementMsg(type, stats) {
  const fingerprint = `ach_${type}_s_${JSON.stringify(stats)}`;

  const cacheRes = await cachedAICall(
    'achievement_msg',
    fingerprint,
    () => call([{
      role: 'user',
      content: `Write a 2-sentence celebratory achievement message for: "${type}" earned with stats: ${JSON.stringify(stats)}. Make it feel special and personal. Do NOT use markdown.`,
    }], { model: MODELS.fast, temp: 0.9, max: 80 }),
    { ttlMs: 30 * 24 * 60 * 60 * 1000 } // Cache for 30 days
  );

  if (cacheRes.rateLimited) {
    throw new Error(cacheRes.error);
  }
  return cacheRes.result;
}


// ═══════════════════════════════════════════════════════════════
//  12. WEEKLY DIGEST GENERATOR — For AI context compression
//  Generates a short summary of the student's week, stored locally
//  so future AI calls don't need to re-process all historical data
// ═══════════════════════════════════════════════════════════════
export async function generateWeeklyDigest(appState) {
  const { profile, realScores } = PersonalizationEngine.analyzeStudent(appState);
  const firstName = profile.name?.split(' ')[0] || 'Student';

  // Fingerprint weekly digests by year + week number + username
  const today = new Date();
  const year = today.getFullYear();
  // Get week number
  const firstDayOfYear = new Date(year, 0, 1);
  const pastDaysOfYear = (today - firstDayOfYear) / 86400000;
  const weekNum = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  const fingerprint = `weekly_${year}_w${weekNum}_u_${firstName}`;

  const cacheRes = await cachedAICall(
    'weekly_digest',
    fingerprint,
    async () => {
      const digest = await call([{
        role: 'system', content: 'You are an internal AI analyst for AXINITE OS. Generate a compressed 3-4 sentence weekly summary of this student\'s performance. This summary will be stored and fed to future AI calls as context, so be factual, specific, and include key patterns. Do NOT address the student — this is internal documentation.'
      }, {
        role: 'user', content: `Student: ${firstName}\nWeek data:\n- Tasks completed: ${realScores.completedCount}/${realScores.completedCount + realScores.pendingCount}\n- Overdue: ${realScores.overdueCount}\n- Discipline: ${realScores.disciplineScore}/100\n- Streak: ${realScores.streak} days\n- Focus sessions: ${profile.stats.focusSessionsDone}\n- Avg mood: ${profile.stats.avgMood}/5\n- Avg sleep: ${profile.stats.avgSleep}h\n- Strong: ${profile.patterns.strongSubjects.join(', ')}\n- Weak: ${profile.patterns.weakSubjects.join(', ')}\n- Study style: ${profile.patterns.studyStyle}\n- Chronotype: ${profile.patterns.chronotype}\n- Tags: [${profile.tags.join(', ')}]\n\nGenerate a factual 3-4 sentence internal digest.`
      }], { model: MODELS.fast, temp: 0.3, max: 200 });

      if (digest) {
        PersonalizationEngine.saveWeeklyDigest(digest);
      }
      return digest;
    },
    { ttlMs: 7 * 24 * 60 * 60 * 1000 } // Cache for 7 days
  );

  if (cacheRes.rateLimited) {
    throw new Error(cacheRes.error);
  }
  return cacheRes.result;
}


// ═══════════════════════════════════════════════════════════════
//  MASTER EXPORT
// ═══════════════════════════════════════════════════════════════
export default {
  AI,
  enhanceNote,
  generateQuiz,
  breakTask,
  progressInsights,
  moodCoaching,
  timerSettings,
  generatePath,
  dailyBriefing,
  generateSchedule,
  summarizeVideo,
  auraChat,
  achievementMsg,
  generateWeeklyDigest,
};
