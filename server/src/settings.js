// Haq AI server settings, read from server/.env (copy .env.example to start).
// The Gemini and Sarvam keys are read only here and passed to haqGateway.js.
// They are never printed and never sent to the browser.

export const UNSET_KEY = 'replace_me';
export const BROWSER_ORIGIN = 'http://localhost:5173';
export const SERVER_PORT = 8000;
export const GEMINI_MODEL = 'gemini-3.5-flash-lite';

const usable = (key) => Boolean(key) && key !== UNSET_KEY;

export function readSettings(env = process.env) {
  const origins = (env.CLIENT_ORIGIN ?? BROWSER_ORIGIN).split(',').map((o) => o.trim()).filter(Boolean);
  const port = Number.parseInt(env.PORT ?? '', 10);
  const model = (env.AI_MODEL ?? '').trim();
  return {
    port: Number.isInteger(port) && port > 0 ? port : SERVER_PORT,
    geminiKey: (env.AI_API_KEY ?? '').trim(),
    geminiModel: !model || model === 'your-model-name' ? GEMINI_MODEL : model,
    sarvamKey: (env.SARVAM_API_KEY ?? '').trim(),
    browserOrigins: origins.length ? origins : [BROWSER_ORIGIN],
  };
}

export const hasGeminiKey = (settings) => usable(settings.geminiKey);
export const hasSarvamKey = (settings) => usable(settings.sarvamKey);
