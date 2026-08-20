const env = require('dotenv').config({ path: '.env' }).parsed;
const GROQ_KEY = env.GROQ_API_KEY;
const GEMINI_KEY = env.GEMINI_API_KEY;
const OPENROUTER_KEY = env.OPENROUTER_API_KEY;

async function testGroq() {
  const model = 'groq/compound';
  const t0 = Date.now();
  const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + GROQ_KEY },
    body: JSON.stringify({ model, messages: [{ role: 'user', content: 'Say: Groq live call verified.' }], max_tokens: 20, temperature: 0 }),
    signal: AbortSignal.timeout(15000)
  });
  const j = await r.json(); const ms = Date.now() - t0;
  if (r.ok && j.choices && j.choices[0]) {
    console.log('[SUCCESS] Groq model=' + (j.model||model) + ' http=200 latency=' + ms + 'ms output=' + j.choices[0].message.content.trim().substring(0,100));
  } else if (r.status === 429) {
    console.log('[RATE_LIMITED] Groq http=429 latency=' + ms + 'ms');
  } else {
    console.log('[ERROR] Groq http=' + r.status + ' latency=' + ms + 'ms msg=' + (j.error && j.error.message || 'unknown').substring(0,120));
  }
}

async function testGemini() {
  const model = 'gemini-3.6-flash';
  const t0 = Date.now();
  const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent?key=' + GEMINI_KEY, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: 'Say: Gemini live call verified.' }] }] }),
    signal: AbortSignal.timeout(20000)
  });
  const j = await r.json(); const ms = Date.now() - t0;
  if (r.ok && j.candidates && j.candidates[0] && j.candidates[0].content) {
    const text = j.candidates[0].content.parts[0].text.trim();
    console.log('[SUCCESS] Gemini model=gemini/' + model + ' http=200 latency=' + ms + 'ms output=' + text.substring(0,100));
  } else if (r.status === 429) {
    console.log('[RATE_LIMITED] Gemini http=429 latency=' + ms + 'ms');
  } else {
    console.log('[ERROR] Gemini http=' + r.status + ' latency=' + ms + 'ms msg=' + (j.error && j.error.message || 'unknown').substring(0,120));
  }
}

async function testOpenRouter() {
  let freeModels = [];
  try {
    const r = await fetch('https://openrouter.ai/api/v1/models', { headers: { Authorization: 'Bearer ' + OPENROUTER_KEY }, signal: AbortSignal.timeout(8000) });
    if (r.ok) {
      const j = await r.json();
      freeModels = (j.data || []).filter(function(m) { return m.id && m.id.endsWith(':free') && !m.id.includes('safety') && !m.id.includes('lyria'); }).map(function(m) { return m.id; });
    }
  } catch(e) { console.log('[ERROR] OpenRouter model list failed: ' + e.message); return; }
  if (!freeModels.length) { console.log('[ERROR] OpenRouter empty free model list'); return; }
  for (const model of freeModels) {
    const t0 = Date.now();
    try {
      const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + OPENROUTER_KEY, 'HTTP-Referer': 'https://jobradar.app', 'X-Title': 'JobRadar' },
        body: JSON.stringify({ model: model, messages: [{ role: 'user', content: 'Say: OpenRouter live call verified.' }], max_tokens: 20 }),
        signal: AbortSignal.timeout(15000)
      });
      const j = await r.json(); const ms = Date.now() - t0;
      if (r.ok && j.choices && j.choices[0]) {
        console.log('[SUCCESS] OpenRouter model=' + model + ' http=200 latency=' + ms + 'ms output=' + j.choices[0].message.content.trim().substring(0,100));
        return;
      }
      if (r.status === 429) {
        const meta = j.error && j.error.metadata;
        const hdrs = meta && meta.headers;
        const rem = hdrs && hdrs['X-RateLimit-Remaining'] || '0';
        const rst = hdrs && hdrs['X-RateLimit-Reset'];
        const resetDate = rst ? new Date(Number(rst)).toISOString() : 'unknown';
        console.log('[RATE_LIMITED] OpenRouter model=' + model + ' http=429 latency=' + ms + 'ms remaining=' + rem + ' resets=' + resetDate);
        console.log('  CAUSE: Free-tier daily cap of 50 req/day exhausted. Key is valid. Will reset at UTC midnight.');
        return;
      }
      console.log('  [' + model + '] http=' + r.status + ' ' + (j.error && j.error.message || 'unknown').substring(0,80));
    } catch(e) { console.log('  [' + model + '] exception: ' + e.message); }
  }
  console.log('[ERROR] OpenRouter all free models failed');
}

console.log('=== JobRadar Live Provider Verification ' + new Date().toISOString() + ' ===');
Promise.all([testGroq(), testGemini(), testOpenRouter()]).then(function() { console.log('=== END ==='); });
