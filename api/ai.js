// Server-side Groq AI proxy with smart key rotation and retries.
// This runs on Vercel's backend, keeping API keys completely protected and secure.

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const KEY_HEALTH = {}; // key -> unhealthyUntil timestamp

const getHealthyKey = (keys) => {
  const now = Date.now();
  const healthyKeys = keys.filter(k => !KEY_HEALTH[k] || KEY_HEALTH[k] < now);
  const candidateKeys = healthyKeys.length > 0 ? healthyKeys : keys;
  return candidateKeys[Math.floor(Math.random() * candidateKeys.length)];
};

const markKeyUnhealthy = (key, durationMs = 5 * 60 * 1000) => {
  KEY_HEALTH[key] = Date.now() + durationMs;
};

export default async function handler(req, res) {
  // Handle CORS and preflight requests
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: { message: 'Method Not Allowed' } });
    return;
  }

  try {
    const payload = req.body;
    
    // Resolve Groq keys from process.env (not exposed to frontend)
    const envKey = process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY || '';
    if (!envKey || !envKey.trim()) {
      res.status(500).json({ error: { message: 'Groq API Key is not configured on the backend.' } });
      return;
    }

    const keys = envKey.split(',').map(k => k.trim()).filter(Boolean);
    let lastError = null;
    const retries = Math.min(5, keys.length * 2);

    for (let i = 0; i < retries; i++) {
      const key = getHealthyKey(keys);
      
      try {
        const fetchController = new AbortController();
        const fetchTimeout = setTimeout(() => fetchController.abort(), 50000); // 50s

        const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload),
          signal: fetchController.signal,
        });

        clearTimeout(fetchTimeout);

        const data = await groqRes.json();
        
        if (!groqRes.ok) {
          throw new Error(data.error?.message || `HTTP ${groqRes.status}`);
        }

        res.status(200).json(data);
        return;
      } catch (err) {
        const errMsg = err.name === 'AbortError' ? 'Request timed out (50s)' : err.message;
        console.error(`[AI Backend Rotator] Attempt ${i+1} failed with key ...${key.slice(-6)}:`, errMsg);
        lastError = err.name === 'AbortError' ? new Error(errMsg) : err;
        
        if (err.name === 'AbortError' || err.message.includes('429') || err.message.includes('401') || err.message.includes('403') || err.message.includes('Limit')) {
          markKeyUnhealthy(key, 5 * 60 * 1000);
        } else {
          markKeyUnhealthy(key, 30 * 1000);
        }
        
        if (i < retries - 1) {
          await sleep(200);
        }
      }
    }

    res.status(500).json({ error: { message: `All backend key rotation attempts failed. Last error: ${lastError?.message || 'Unknown'}` } });
  } catch (globalErr) {
    console.error('[AI Backend Error]:', globalErr);
    res.status(500).json({ error: { message: globalErr.message } });
  }
}
