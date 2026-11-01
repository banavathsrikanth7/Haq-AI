// The page talks only to the Haq AI server (SERVER_URL in client/.env); never to Gemini or Sarvam directly.
// Checked notifications live in this browser tab and are sent with each request.

export const SERVER_URL = (import.meta.env?.SERVER_URL || 'http://localhost:8000').replace(/\/+$/, '');

export class HaqServerError extends Error {
  constructor(message, status, code = null) {
    super(message);
    this.name = 'HaqServerError';
    this.status = status;
    this.code = code;
  }
}

// Reading a notification can take a while; everything else should answer quickly.
const WAIT_MS = { '/notifications/read': 150_000, '/ask': 60_000, '/explain': 60_000, '/translate': 90_000 };
const pause = (ms) => new Promise((wake) => setTimeout(wake, ms));

/** One request with a time limit; a dropped connection is retried once after a short pause. */
async function call(path, options = {}, { retries = 1 } = {}) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new HaqServerError('You are offline. Check the internet connection and try again.', 0, 'offline');
  }
  let response;
  try {
    response = await fetch(`${SERVER_URL}/api${path}`, { ...options, signal: AbortSignal.timeout(WAIT_MS[path] ?? 30_000) });
  } catch (error) {
    if (error?.name === 'TimeoutError') throw new HaqServerError('Haq AI took too long to reply. Please try again.', 0, 'timeout');
    if (retries > 0) { await pause(1500); return call(path, options, { retries: retries - 1 }); }
    throw new HaqServerError(`Could not reach the Haq AI server at ${SERVER_URL}. Check the connection, or start the server with "npm start".`, 0, 'server_not_running');
  }
  // Busy or briefly down: try once more before telling the citizen.
  if ([502, 503, 504].includes(response.status) && retries > 0 && path !== '/notifications/read') {
    await pause(1500);
    return call(path, options, { retries: retries - 1 });
  }
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new HaqServerError(typeof body?.message === 'string' ? body.message : `Haq AI server error (HTTP ${response.status}).`, response.status, body?.code ?? null);
  if (body === null) throw new HaqServerError('The Haq AI server sent an unreadable reply.', response.status);
  return body;
}

const send = (path, payload) => call(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });

export const haqApi = {
  health: () => call('/health'),
  readNotification: ({ text, file }) => {
    const form = new FormData();
    if (text) form.append('text', text);
    if (file) form.append('file', file);
    return call('/notifications/read', { method: 'POST', body: form });
  },
  changes: (older, newer) => send('/changes', { older, newer }),                              // Feature 1
  eligibility: (notification, citizen) => send('/eligibility', { notification, citizen }),   // Feature 2
  impact: (older, newer, citizen) => send('/impact', { older, newer, citizen }),              // Feature 4
  actionPlan: (notification, citizen) => send('/action-plan', { notification, citizen }),    // Feature 5
  ask: ({ question, history, notifications, citizen, language }) => send('/ask', { question, history, notifications, citizen, language }), // Feature 3
  explain: ({ notification, older, citizen, language }) => send('/explain', { notification, older, citizen, language }), // Feature 3 spoken summary
  translate: (notification, language) => send('/translate', { notification, language }),
  listen: (audio, language) => {
    const form = new FormData();
    form.append('audio', audio, 'question.webm');
    form.append('language', language);
    return call('/voice/listen', { method: 'POST', body: form });
  },
  speak: (text, language) => send('/voice/speak', { text, language }),
};
