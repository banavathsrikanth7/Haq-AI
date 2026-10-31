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

async function call(path, options = {}) {
  let response;
  try {
    response = await fetch(`${SERVER_URL}/api${path}`, options);
  } catch {
    throw new HaqServerError(`The Haq AI server is not running at ${SERVER_URL}. Start it with "npm start" in the server folder.`, 0, 'server_not_running');
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
  translate: (notification, language) => send('/translate', { notification, language }),
  listen: (audio, language) => {
    const form = new FormData();
    form.append('audio', audio, 'question.webm');
    form.append('language', language);
    return call('/voice/listen', { method: 'POST', body: form });
  },
  speak: (text, language) => send('/voice/speak', { text, language }),
};
