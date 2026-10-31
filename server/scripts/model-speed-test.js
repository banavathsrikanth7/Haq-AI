// Which Gemini model reads fastest with your key? Run from the server folder:
//   node scripts/model-speed-test.js
// Then set AI_MODEL in server/.env to the quickest one that answers.
import dotenv from 'dotenv';

dotenv.config({ override: true, quiet: true });

const key = (process.env.AI_API_KEY ?? '').trim();
if (!key || key === 'replace_me') {
  console.error('Add AI_API_KEY to server/.env first.');
  process.exit(1);
}

const candidates = [...new Set([process.env.AI_MODEL, 'gemini-3.5-flash-lite', 'gemini-3.8-flash'].filter(Boolean))];
for (const model of candidates) {
  const started = Date.now();
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'Say "Haq AI ready".' }] }] }),
      signal: AbortSignal.timeout(60_000),
    });
    const body = await response.json().catch(() => ({}));
    const took = ((Date.now() - started) / 1000).toFixed(1);
    console.log(response.ok ? `${model}: answered in ${took} s` : `${model}: HTTP ${response.status} ${body?.error?.message ?? ''}`);
  } catch (error) {
    console.log(`${model}: ${error.name === 'TimeoutError' ? 'no answer within 60 s' : error.message}`);
  }
}
