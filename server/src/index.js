// Starts Haq AI: `npm start`, or `npm run dev` to restart when a file changes.
// server/.env is loaded with override so its values win over old terminal variables.
import dotenv from 'dotenv';

dotenv.config({ override: true, quiet: true });

import { buildHaqServer } from './haqServer.js';
import { hasGeminiKey, hasSarvamKey, readSettings } from './settings.js';

const settings = readSettings();
const listener = buildHaqServer(settings, { logRequests: true }).listen(settings.port, (problem) => {
  if (problem) return; // reported by the 'error' handler below
  console.log(`Haq AI is running on http://localhost:${settings.port}`);
  console.log(hasGeminiKey(settings)
    ? `Notification reading: on (Gemini model ${settings.geminiModel})`
    : 'Notification reading: off. Add AI_API_KEY to server/.env.');
  console.log(hasSarvamKey(settings) ? 'Voice (Sarvam): on' : 'Voice (Sarvam): off. Add SARVAM_API_KEY to server/.env.');
  console.log(`Page allowed from: ${settings.browserOrigins.join(', ')}`);
});

listener.on('error', (error) => {
  console.error(error.code === 'EADDRINUSE'
    ? `Port ${settings.port} is busy. Change PORT in server/.env and SERVER_URL in client/.env.`
    : `Haq AI could not start: ${error.message}`);
  process.exit(1);
});
