// ═══════════════════════════════════════════════════════════════
//  CYGNERA OS · AI SERVICE — Groq (Llama 3.3 70B + Llama 3.1 8B)
//  Smart model routing: 70B for deep insights, 8B for fast tasks
// ═══════════════════════════════════════════════════════════════
import Groq from 'groq-sdk';
const MODELS = {
  fast: 'llama-3.1-8b-instant',      // Groq — fast
  deep: 'llama-3.3-70b-versatile',   // Groq — deep
  ultra: 'llama-3.3-70b-versatile',   // Groq — deep (Fallback for ultra requests)
};

// ─── Utilities ──────────────────────────────────────────────
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

export const AI = {
  enabled: () => {
    const groq = import.meta.env.VITE_GROQ_API_KEY;
    return !!(groq && groq !== 'your_key_here' && groq !== 'your_groq_api_key_here');
  },
  hasGemini: () => false
};

// ─── Client ─────────────────────────────────────────────────
// ─── Native Fetch Implementation (Bypasses SDK issues in Production) ─────────
const callGroqAPI = async (payload, apiKey) => {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `HTTP ${response.status}`);
  }

  return await response.json();
};

const callWithRetry = async (params, retries = 3) => {
  const envKey = import.meta.env.VITE_GROQ_API_KEY;
  if (!envKey || envKey.includes('your_key_here')) {
    console.error('[AI] Key missing or placeholder in environment.');
    return null;
  }

  const keys = envKey.split(',').map(k => k.trim()).filter(Boolean);
  
  for (let i = 0; i < retries; i++) {
    const key = keys[Math.floor(Math.random() * keys.length)];
    
    try {
      return await callGroqAPI(params, key);
    } catch (err) {
      console.error(`[AI] Attempt ${i+1} failed:`, err.message);
      
      if (err.message.includes('429') && i < retries - 1) {
        await sleep(1000);
      } else if (i === retries - 1) {
        return null;
      }
    }
  }
  return null;
};

// ─── Core Callers ───────────────────────────────────────────
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

  const groqModel = model === MODELS.ultra ? MODELS.deep : model;
  const res = await callWithRetry({
    model: groqModel,
    messages: cleanMessages,
    temperature: temp,
    max_tokens: max,
  });
  
  return res?.choices?.[0]?.message?.content?.trim() ?? null;
};

const callJSON = async (sys, user, { model = MODELS.fast, temp = 0.5, max = 800 } = {}) => {
  const text = await call([
    { role: 'system', content: (sys || '') + '\n\nRespond ONLY with valid JSON. No markdown, no backticks, no explanation.' },
    { role: 'user', content: user }
  ], { model, temp, max });
  if (!text) return null;
  // Strip markdown code blocks just in case
  const cleaned = text.replace(/```json|```/g, '').trim();
  try { return JSON.parse(cleaned); }
  catch (e) {
    console.error('[AI] JSON Parse Error:', e, 'Raw:', text);
    return null;
  }
};


// ═══════════════════════════════════════════════════════════════
//  1. NOTE INTELLIGENCE — Model: 8B (fast, high-volume)
// ═══════════════════════════════════════════════════════════════
export async function enhanceNote(content) {
  if (!content || content.length < 40) return null;
  return callJSON(
    `You are an expert learning scientist embedded in a study productivity app called CYGNERA OS.
Analyze the student's note and extract maximum study value.
Be concise, precise, and provide genuinely useful flashcards that test deep understanding.`,
    `Note content:\n"${content}"\n\nReturn JSON:\n{"summary":"2-3 sentence summary","concepts":["c1","c2","c3","c4","c5"],"flashcards":[{"question":"Q?","answer":"A"},{"question":"Q?","answer":"A"},{"question":"Q?","answer":"A"}],"nextTopics":["topic1","topic2","topic3"],"difficulty":"beginner|intermediate|advanced","estimatedReview":15}`,
    { model: MODELS.fast, temp: 0.3 }
  );
}

export async function generateQuiz(content, n = 5) {
  return callJSON(
    'You are an expert educator. Create challenging quiz questions testing deep understanding, not surface recall.',
    `Generate ${n} multiple-choice questions from:\n"${content}"\n\nReturn JSON:\n{"questions":[{"question":"Q?","options":["A) ...","B) ...","C) ...","D) ..."],"correct":"A","explanation":"Why correct"}]}`,
    { model: MODELS.fast, temp: 0.4 }
  );
}

export async function inlineComplete(command, textContext) {
  return call([{
    role: 'system', content: 'You are an AI assistant built into a text editor. The user has triggered a slash command. Complete the request based on the text context provided. Respond ONLY with the generated text, do not use quotes, greetings, or filler text. Just the exact text to be inserted into the document.'
  }, {
    role: 'user', content: `Context:\n"""\n${textContext.slice(-3000)}\n"""\n\nCommand: ${command}`
  }], { model: MODELS.fast, temp: 0.7, max: 500 });
}


// ═══════════════════════════════════════════════════════════════
//  2. TASK INTELLIGENCE — Model: 8B (structured output)
// ═══════════════════════════════════════════════════════════════
export async function breakTask(title, subject = '') {
  return callJSON(
    'You are a productivity coach. Break tasks into clear, time-boxed subtasks, write a description, and assign priority/subject.',
    `Task: "${title}"\nContext: ${subject || 'None'}\n\nReturn JSON:\n{"description":"Short task summary","subject":"Closest academic subject (e.g. Computer Science, Math, Literature, etc.)","priority":"high|medium|low","subtasks":[{"title":"Subtask","description":"What to do","estimatedMinutes":20,"priority":"high|medium|low"}],"totalEstimatedMinutes":80,"tip":"Key tip"}`,
    { model: MODELS.fast, temp: 0.4 }
  );
}


// ═══════════════════════════════════════════════════════════════
//  3. PROGRESS INTELLIGENCE — Model: 70B (deep pattern analysis)
// ═══════════════════════════════════════════════════════════════
export async function progressInsights(data) {
  return callJSON(
    `You are a concise AI study coach. Give SHORT, specific insights based on the student's pending tasks and subjects. No fluff.`,
    `Student data:\n${JSON.stringify(data, null, 2)}\n\nAnalyze their PENDING TASKS and SUBJECT progress. Keep every field under 15 words.\n\nReturn JSON:\n{"headline":"One short sentence about their status","trend":"improving|stable|declining","score":75,"strengths":["short strength","short strength"],"improvements":["short area","short area"],"prediction":"One sentence max","weeklyFocus":"One task or subject to prioritize","burnoutRisk":"low|medium|high","encouragement":"One short motivating line"}`,
    { model: MODELS.ultra, temp: 0.5, max: 400 }
  );
}


// ═══════════════════════════════════════════════════════════════
//  4. CHECK-IN / MOOD COACHING — Model: 70B (empathetic, nuanced)
// ═══════════════════════════════════════════════════════════════
export async function moodCoaching({ mood, energy, sleepHours, stressLevel=5, focusMode='Deep Work', mainObjective='', tasks = [] }) {
  return callJSON(
    `You are an elite productivity AI in CYGNERA OS. Based on the user's daily biometrics and intentions, provide a highly tactical strategy for today.`,
    `mood ${mood}/5, energy ${energy}/10, sleep ${sleepHours}h, stress ${stressLevel}/10. Focus Mode: ${focusMode}. Main Objective: "${mainObjective}". Pending: ${tasks.join(', ') || 'none'}\n\nReturn JSON:\n{"greeting":"Short high-performance greeting","recommendation":"Tactical strategy to achieve the main objective given their current energy/stress","durationMinutes":45,"breakActivity":"Specific break tailored to their current state","message":"A powerful empowering statement","warningFlag":null}`,
    { model: MODELS.fast, temp: 0.6, max: 400 }
  );
}


// ═══════════════════════════════════════════════════════════════
//  5. FOCUS TIMER SETTINGS — Model: 8B (structured, fast)
// ═══════════════════════════════════════════════════════════════
export async function timerSettings(history = {}) {
  return callJSON(
    'You are a cognitive performance coach. Recommend optimal focus session lengths based on study patterns.',
    `Study history:\n${JSON.stringify(history)}\n\nReturn JSON:\n{"recommendedMinutes":35,"breakMinutes":7,"reasoning":"Why these durations","peakHours":["9am-11am"],"tip":"Pre-session tip"}`,
    { model: MODELS.fast, temp: 0.4 }
  );
}


// ═══════════════════════════════════════════════════════════════
//  6. LEARNING PATH GENERATION — Model: 70B (curriculum design)
// ═══════════════════════════════════════════════════════════════
export async function generatePath({ goal, style, level, hoursPerWeek }) {
  return callJSON(
    `You are a curriculum design expert for CYGNERA OS. Create structured, achievable 8-week learning paths.
Each phase should have clear topics and a tangible milestone.`,
    `Goal: ${goal}, Style: ${style}, Level: ${level}, Hours/week: ${hoursPerWeek}\n\nReturn JSON:\n{"title":"Path title","totalWeeks":8,"phases":[{"phase":1,"title":"Phase","weeks":"1-2","topics":["t1","t2","t3"],"milestone":"What you can do"}],"milestones":["Week 2 milestone","Week 4","Week 6","Week 8"],"tip":"Success tip"}`,
    { model: MODELS.ultra, temp: 0.7 }
  );
}


// ═══════════════════════════════════════════════════════════════
//  7. DAILY BRIEFING — Model: 8B (fast, concise)
// ═══════════════════════════════════════════════════════════════
export async function dailyBriefing({ name, streak, tasks, progress }) {
  return call([{
    role: 'system', content: 'You are a study assistant. Give a 1-2 sentence briefing focused on what tasks to tackle today. Be direct, not generic. No greetings.',
  }, {
    role: 'user', content: `${name} has ${Array.isArray(tasks) ? tasks.length : tasks} pending tasks${Array.isArray(tasks) && tasks.length ? ': ' + tasks.slice(0, 3).join(', ') : ''}. Streak: ${streak} days. Progress: ${progress}%. Tell them what to focus on first.`,
  }], { model: MODELS.fast, temp: 0.7, max: 80 });
}


// ═══════════════════════════════════════════════════════════════
//  8. DAILY REPORT CARD — Model: Ultra (evaluative)
// ═══════════════════════════════════════════════════════════════
export async function generateDailyReport(data) {
  return callJSON(
    `You are an elite academic performance evaluator for CYGNERA OS. Generate a comprehensive daily report card based on the user's activity today. Be extremely honest. If they did nothing, give them an F.`,
    `Data:\n${JSON.stringify(data, null, 2)}\n\nReturn JSON:\n{"grade":"A+|A|A-|B+|B|C|D|F","score":85,"summary":"A 2-3 sentence executive summary of today's performance.","metrics":{"focus":"Excellent","tasks":"Good","consistency":"Needs Work"},"achievements":["What went well 1", "What went well 2"],"missedOpportunities":["Area to improve 1"],"tomorrowActionPlan":["Action 1", "Action 2"]}`,
    { model: MODELS.ultra, temp: 0.5, max: 800 }
  );
}


// ═══════════════════════════════════════════════════════════════
//  9. SCHEDULE GENERATOR — Model: 70B (balanced planning)
// ═══════════════════════════════════════════════════════════════
export async function generateSchedule({ subjects, hours, priorities }) {
  return callJSON(
    'You are a study planner in CYGNERA OS. Create balanced, realistic weekly schedules that maximize retention through spaced repetition.',
    `Subjects: ${subjects.join(', ')}, Available: ${hours}h/week, Priority: ${priorities.join(', ')}\n\nReturn JSON:\n{"schedule":{"Monday":[{"time":"9:00 AM","subject":"Math","duration":60,"topic":"Topic name"}],"Tuesday":[],"Wednesday":[],"Thursday":[],"Friday":[],"Saturday":[],"Sunday":[]},"totalPerSubject":{"Math":3},"advice":"Key insight"}`,
    { model: MODELS.ultra, temp: 0.6 }
  );
}


// ═══════════════════════════════════════════════════════════════
//  9. VIDEO INTELLIGENCE — Model: Ultra (reasoning)
// ═══════════════════════════════════════════════════════════════
export async function summarizeVideo(title, subject, transcript = '', notes = '') {
  const content = transcript
    ? `TRANSCRIPT: ${transcript.slice(0, 15000)}` // Limit for safety
    : `TITLE: "${title}" (No transcript available)`;

  return callJSON(
    `You are an expert tutor in CYGNERA OS. Generate a high-quality study guide based on the video content.
    If a transcript is provided, summarize it accurately. If not, predict the core concepts based on the title.`,
    `Video: ${content}\nSubject: ${subject}\nStudent Context: ${notes}\n\nReturn JSON:\n{"summary":"Concise summary or prediction","concepts":["Key Concept 1","Key Concept 2","Key Concept 3"],"questions":["Practice Question 1","Practice Question 2","Practice Question 3"],"takeaway":"One major actionable takeaway"}`,
    { model: MODELS.ultra, temp: 0.7 }
  );
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
  const systemPrompt = `You are Aura, the intelligent heart of CYGNERA OS. 
    You are a wise, encouraging, and slightly witty study companion.
    Context: User is ${userContext.name}. 
    Current pending tasks: ${userContext.tasks.join(', ') || 'None'}.
    Current Progress: ${JSON.stringify(userContext.progress || {})}.
    Current Date/Time: ${new Date().toLocaleString()}.
    
    IMPORTANT: You have DIRECT CONTROL over the application. 
    - NEVER say you are "just an AI" or "cannot perform actions."
    - If asked to schedule, navigate, or start a timer, ALWAYS use the provided tools.
    - If you use a tool, provide a brief, human confirmation (e.g., "Done! I've scheduled that for you.").
    - Keep responses very concise. No markdown headers or bolding.`;

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
      return { error: 'Failed to connect to Groq. Check your API keys or rate limits.' };
    }

    const msg = groqRes?.choices?.[0]?.message;
    if (msg) {
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
  return call([{
    role: 'user',
    content: `Write a 2-sentence celebratory achievement message for: "${type}" earned with stats: ${JSON.stringify(stats)}. Make it feel special and personal. Do NOT use markdown.`,
  }], { model: MODELS.fast, temp: 0.9, max: 80 });
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
};
