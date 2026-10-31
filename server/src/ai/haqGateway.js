// Haq gateway — the only file in Haq AI that talks to outside services.
//   Gemini  : readPolicyDocument (notification → clauses), answerCitizen (explain computed facts),
//             translateClauses (Telugu / Hindi clause text)
//   Sarvam  : listen (speech → text), speak (text → speech) in en-IN / te-IN / hi-IN
// Gemini never decides eligibility, changes, impact or dates: those are computed in src/engine.
// Whatever comes back from Gemini is checked again by src/intake before it is used.
// Keys travel only in request headers; they are never logged or returned.

import { KeyNotSet, NotAboutSchemes } from '../problems.js';
import { hasGeminiKey, hasSarvamKey } from '../settings.js';
import { CITIZEN_HELPER, CLAUSE_TRANSLATOR, NOT_A_NOTIFICATION, NOT_A_SCHEME_QUESTION, POLICY_READER } from './instructions.js';

export const GEMINI_KEY_NOT_SET = 'Haq AI cannot read notifications yet: add AI_API_KEY (Gemini) to server/.env and restart the server.';
export const SARVAM_KEY_NOT_SET = 'Voice is off: add SARVAM_API_KEY to server/.env and restart the server.';

const GEMINI_MODELS_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const SARVAM_URL = 'https://api.sarvam.ai';
// Reading a whole notification may take a while; an answer should not.
const WAIT_MS = { read: 90_000, answer: 35_000, translate: 60_000 };
const SARVAM_WAIT_MS = 30_000;
const TRY_AGAIN_STATUSES = new Set([429, 500, 502, 503, 504]);
const SARVAM_LOCALE = { en: 'en-IN', te: 'te-IN', hi: 'hi-IN' };

/** URL and headers for one Gemini call; the key is a header so it never appears in a URL or log. */
export function geminiEndpoint(key, model) {
  return { url: `${GEMINI_MODELS_URL}/${encodeURIComponent(model)}:generateContent`, headers: { 'x-goog-api-key': key } };
}

/** Gemini is asked for JSON; this also accepts JSON wrapped in ``` fences or a sentence around it. */
export function readGeminiJson(text) {
  const reply = String(text ?? '').trim();
  if (!reply) throw new Error('Gemini sent an empty reply');
  const bare = reply.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try {
    return JSON.parse(bare);
  } catch {
    const open = bare.indexOf('{');
    const close = bare.lastIndexOf('}');
    if (open !== -1 && close > open) {
      try { return JSON.parse(bare.slice(open, close + 1)); } catch { /* reported below */ }
    }
    throw new Error('Gemini did not reply in the expected JSON form');
  }
}

function geminiFailure(status, body) {
  const said = body?.error?.message ?? '';
  if (status === 400 && /api key/i.test(said)) return 'Gemini did not accept the key. Check AI_API_KEY in server/.env.';
  if (status === 401 || status === 403) return 'Gemini refused the key. Check AI_API_KEY in server/.env.';
  if (status === 404) return `Gemini could not find the model (${said || 'not found'}). Check AI_MODEL in server/.env, e.g. gemini-3.5-flash-lite.`;
  if (status === 429) return 'Gemini is busy or the daily quota is used up. Try again in a minute.';
  if (status >= 500) return `Gemini is overloaded right now${said ? ` ("${said.slice(0, 120)}")` : ''}. Please try again in a minute.`;
  return said ? `Gemini: ${said}` : `Gemini call failed (HTTP ${status}).`;
}

function sarvamFailure(status, body) {
  const said = body?.error?.message ?? body?.message ?? body?.detail ?? '';
  if (status === 400 || status === 422) return `Voice could not use this request${said ? `: ${String(typeof said === 'string' ? said : JSON.stringify(said)).slice(0, 160)}` : ''}.`;
  if (status === 401 || status === 403) return 'Sarvam refused the key. Check SARVAM_API_KEY in server/.env.';
  if (status === 429) return 'Voice is busy. Try again in a minute.';
  if (status >= 500) return 'Voice is down for a moment. Please type instead.';
  return `Voice call failed (HTTP ${status}).`;
}

const TOO_SLOW = {
  read: 'Gemini took too long to read this notification. Try again, or upload only the eligibility and benefit pages.',
  answer: 'Haq AI took too long to answer. Please ask again; a shorter question is answered faster.',
  translate: 'Translation took too long. Please try again.',
};
const TOO_LONG = {
  read: 'This notification is too long to read at once. Upload the eligibility and benefit pages only.',
  answer: 'The answer was getting too long. Please ask a narrower question.',
  translate: 'This notification has too many clauses to translate at once.',
};

// Sarvam retired saarika (speech → text) and bulbul:v1/v2 (text → speech). Older names in
// server/.env are upgraded here so voice keeps working; voices must belong to the chosen model.
const RETIRED_LISTEN = /^saarika/i;
const RETIRED_SPEAK = /^bulbul:v[12]$/i;
const V3_VOICES = new Set(['shubh', 'aditya', 'ritu', 'priya', 'neha', 'rahul', 'pooja', 'rohan', 'simran', 'kavya', 'amit', 'dev', 'ishita', 'shreya', 'ratan', 'varun', 'manan', 'sumit', 'roopa', 'kabir', 'aayan', 'ashutosh', 'advait', 'anand', 'tanya', 'tarun', 'sunny', 'mani', 'gokul', 'vijay', 'shruti', 'suhani', 'mohit', 'kavitha', 'rehan', 'soham', 'rupali']);

export function sarvamVoiceSettings(env = {}) {
  let listenModel = (env.SARVAM_STT_MODEL ?? '').trim() || 'saaras:v4';
  let speakModel = (env.SARVAM_TTS_MODEL ?? '').trim() || 'bulbul:v3';
  let voice = (env.SARVAM_SPEAKER ?? '').trim().toLowerCase() || 'priya';
  if (RETIRED_LISTEN.test(listenModel)) { console.warn(`${listenModel} is retired by Sarvam; using saaras:v4.`); listenModel = 'saaras:v4'; }
  if (RETIRED_SPEAK.test(speakModel)) { console.warn(`${speakModel} is retired by Sarvam; using bulbul:v3.`); speakModel = 'bulbul:v3'; }
  if (speakModel === 'bulbul:v3' && !V3_VOICES.has(voice)) voice = 'priya';
  return { listenModel, speakModel, voice };
}

const listOf = (value) => (Array.isArray(value) ? value : []);

export class HaqGateway {
  constructor(settings) {
    this.model = settings.geminiModel;
    // Backup model, used only when the main one is overloaded. BACKUP_AI_MODEL=none turns it off.
    const backup = (process.env.BACKUP_AI_MODEL ?? 'gemini-3.5-flash-lite').trim();
    this.models = [...new Set([this.model, ...(backup && backup !== 'none' ? [backup] : [])])];
    this.geminiKey = settings.geminiKey;
    this.sarvamKey = settings.sarvamKey;
    this.geminiReady = hasGeminiKey(settings);
    this.sarvamReady = hasSarvamKey(settings);
    Object.assign(this, sarvamVoiceSettings(process.env));
    this.quickThinking = true;
  }

  canRead() { return this.geminiReady; }
  canSpeak() { return this.sarvamReady; }

  // job: 'read' (a notification), 'answer' (a citizen question) or 'translate'.
  // Answers and translations ask Gemini to think briefly, so a reply comes in seconds; reading a
  // notification keeps full thinking because the clauses must be exact.
  async #askGemini({ job, instruction, parts, turns, maxOutputTokens = 8192 }) {
    if (!this.geminiReady) throw new KeyNotSet(GEMINI_KEY_NOT_SET);
    const generationConfig = { temperature: 0, maxOutputTokens, responseMimeType: 'application/json' };
    if (job !== 'read' && this.quickThinking) generationConfig.thinkingConfig = { thinkingLevel: 'low' };
    const body = {
      systemInstruction: { parts: [{ text: instruction }] },
      contents: turns ?? [{ role: 'user', parts }],
      generationConfig,
    };
    const started = Date.now();
    console.log(`Gemini (${job}) asked, model ${this.models[0]}…`);
    let lastFailure;
    // When the chosen model is overloaded (429 / 5xx after retries), the backup model answers instead.
    for (const [index, model] of this.models.entries()) {
      const lastModel = index === this.models.length - 1;
      let timedOut = false;
      for (let attempt = 1; attempt <= 3 && !timedOut; attempt += 1) {
        let response;
        try {
          const endpoint = geminiEndpoint(this.geminiKey, model);
          response = await fetch(endpoint.url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...endpoint.headers },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(WAIT_MS[job]),
          });
        } catch (error) {
          if (error?.name === 'TimeoutError') {
            console.warn(`Gemini ${model} (${job}) gave no answer within ${WAIT_MS[job] / 1000} s`);
            if (lastModel) throw new Error(TOO_SLOW[job]);
            lastFailure = new Error(TOO_SLOW[job]);
            timedOut = true; // try the backup model instead of waiting again
            continue;
          }
          lastFailure = new Error('Could not reach Gemini. Check the internet connection.');
          continue;
        }
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          // Models that do not accept a thinking level: drop it and ask again.
          if (body.generationConfig.thinkingConfig && (response.status >= 500 || (response.status === 400 && /think/i.test(payload?.error?.message ?? '')))) {
            if (response.status === 400) this.quickThinking = false;
            delete body.generationConfig.thinkingConfig;
            if (response.status === 400) { attempt -= 1; continue; }
          }
          lastFailure = new Error(geminiFailure(response.status, payload));
          console.warn(`Gemini ${model} replied HTTP ${response.status}: ${payload?.error?.message ?? 'no details'}`);
          if (!TRY_AGAIN_STATUSES.has(response.status)) throw lastFailure;
          if (attempt < 3) await new Promise((wake) => setTimeout(wake, 1500 * attempt));
          continue;
        }
        const answer = payload?.candidates?.[0];
        if (!answer) {
          const blocked = payload?.promptFeedback?.blockReason;
          throw new Error(blocked ? `Gemini would not read this input (${blocked}).` : 'Gemini sent no answer.');
        }
        if (answer.finishReason === 'MAX_TOKENS') throw new Error(TOO_LONG[job]);
        const text = (answer.content?.parts ?? []).map((p) => p.text ?? '').join('');
        if (!text.trim()) throw new Error(answer.finishReason && answer.finishReason !== 'STOP' ? `Gemini stopped early (${answer.finishReason}).` : 'Gemini sent an empty answer.');
        console.log(`Gemini ${model} (${job}) answered in ${((Date.now() - started) / 1000).toFixed(1)} s`);
        return readGeminiJson(text);
      }
    }
    throw lastFailure ?? new Error('Gemini call failed.');
  }

  /** Notification (text and/or PDF/image bytes) → raw clauses. Checked again in src/intake. */
  async readPolicyDocument(text = null, fileBytes = null, mimeType = null) {
    if (!this.geminiReady) throw new KeyNotSet(GEMINI_KEY_NOT_SET);
    const parts = [];
    if (fileBytes) parts.push({ inlineData: { mimeType: mimeType || 'application/pdf', data: Buffer.from(fileBytes).toString('base64') } });
    parts.push({
      text: text
        ? `Read the scheme notification below${fileBytes ? ' together with the attached file' : ''}.\n\n<notification>\n${text}\n</notification>`
        : 'Read the attached scheme notification.',
    });
    const reading = await this.#askGemini({ job: 'read', instruction: POLICY_READER, parts, maxOutputTokens: 32768 });
    if (reading?.is_policy_document === false) {
      const looksLike = typeof reading.rejection_reason === 'string' ? reading.rejection_reason.trim() : '';
      throw new NotAboutSchemes(looksLike ? `${NOT_A_NOTIFICATION} (This looks like: ${looksLike})` : NOT_A_NOTIFICATION);
    }
    return {
      scheme: reading?.scheme && typeof reading.scheme === 'object' ? reading.scheme : {},
      rules: listOf(reading?.rules),
      benefits: listOf(reading?.benefits),
      deadlines: listOf(reading?.deadlines),
      required_documents: listOf(reading?.required_documents),
      application_steps: listOf(reading?.application_steps),
      notes: listOf(reading?.notes).filter((n) => typeof n === 'string'),
    };
  }

  /** Explains citizenContext (built in code) in the citizen's language. */
  async answerCitizen({ question, history = [], citizenContext, language = 'en' }) {
    if (!this.geminiReady) throw new KeyNotSet(GEMINI_KEY_NOT_SET);
    const turns = history.slice(-8).map((t) => ({ role: t.role === 'haq' ? 'model' : 'user', parts: [{ text: t.text }] }));
    turns.push({
      role: 'user',
      parts: [{ text: `<citizen_context>\n${JSON.stringify(citizenContext)}\n</citizen_context>\n\n<reply_language>${language}</reply_language>\n\n<question>\n${question}\n</question>` }],
    });
    while (turns.length > 1 && turns[0].role !== 'user') turns.shift(); // Gemini needs a user turn first
    const result = await this.#askGemini({ job: 'answer', instruction: CITIZEN_HELPER, turns, maxOutputTokens: 8192 });
    const reply = typeof result?.reply === 'string' ? result.reply.trim() : '';
    if (result?.in_scope === false) throw new NotAboutSchemes(reply || NOT_A_SCHEME_QUESTION);
    if (!reply) throw new Error('Gemini sent an empty answer.');
    return { reply, source: result?.source === 'general' ? 'general' : 'notification' };
  }

  /** [{id, text}] → Map(id → translated text). Numbers are verified afterwards in engine/clauseTranslation.js. */
  async translateClauses(clauses, language) {
    if (!clauses.length) return new Map();
    const result = await this.#askGemini({
      job: 'translate',
      instruction: CLAUSE_TRANSLATOR,
      parts: [{ text: JSON.stringify({ language, clauses }) }],
      maxOutputTokens: 16384,
    });
    return new Map(listOf(result?.clauses).filter((c) => typeof c?.id === 'string' && typeof c?.text === 'string').map((c) => [c.id, c.text.trim()]));
  }

  async #callSarvam(path, init) {
    if (!this.sarvamReady) throw new KeyNotSet(SARVAM_KEY_NOT_SET);
    let response;
    try {
      response = await fetch(`${SARVAM_URL}${path}`, {
        ...init,
        headers: { ...(init.headers ?? {}), 'api-subscription-key': this.sarvamKey },
        signal: AbortSignal.timeout(SARVAM_WAIT_MS),
      });
    } catch (error) {
      throw new Error(error?.name === 'TimeoutError' ? 'Voice took too long. Please type instead.' : 'Could not reach the voice service.');
    }
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      console.warn(`Sarvam ${path} replied HTTP ${response.status}: ${JSON.stringify(payload ?? {}).slice(0, 300)}`);
      throw new Error(sarvamFailure(response.status, payload));
    }
    return payload ?? {};
  }

  /** Citizen's recorded question → text. */
  async listen(audioBytes, mimeType, language = 'en') {
    const form = new FormData();
    form.append('file', new Blob([audioBytes], { type: mimeType || 'audio/webm' }), 'question.webm');
    form.append('model', this.listenModel);
    form.append('mode', 'transcribe');
    form.append('language_code', SARVAM_LOCALE[language] ?? 'unknown');
    const result = await this.#callSarvam('/speech-to-text', { method: 'POST', body: form });
    const text = typeof result.transcript === 'string' ? result.transcript.trim() : '';
    if (!text) throw new Error('No words were heard. Please try again or type.');
    return { text };
  }

  /** Text → spoken WAV (base64). */
  async speak(text, language = 'en') {
    const result = await this.#callSarvam('/text-to-speech', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, language_code: SARVAM_LOCALE[language] ?? 'en-IN', model: this.speakModel, speaker: this.voice }),
    });
    const audio = Array.isArray(result.audios) ? result.audios[0] : null;
    if (typeof audio !== 'string' || !audio) throw new Error('The voice service sent no audio.');
    return { audio_base64: audio, mime_type: 'audio/wav' };
  }
}
