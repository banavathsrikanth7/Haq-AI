// Haq AI endpoints with a stand-in gateway (no network, no key needed).

import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

import { buildHaqServer } from '../src/haqServer.js';
import { KeyNotSet, NotAboutSchemes } from '../src/problems.js';
import { readSettings } from '../src/settings.js';
import { geminiReadingOfFixture, v1, v2 } from './fixtures.js';

class StandInGateway {
  constructor(mode = 'ready') { this.mode = mode; this.lastQuestion = null; }
  canRead() { return this.mode !== 'no_key'; }
  canSpeak() { return this.mode === 'ready'; }
  async readPolicyDocument() {
    if (this.mode === 'no_key') throw new KeyNotSet('add AI_API_KEY');
    if (this.mode === 'not_notification') throw new NotAboutSchemes('Haq AI reads government scheme notifications only.');
    if (this.mode === 'down') throw new Error('Gemini is down for a moment.');
    return geminiReadingOfFixture();
  }
  async answerCitizen(args) {
    this.lastQuestion = args;
    if (/poem/i.test(args.question)) throw new NotAboutSchemes('Haq AI answers questions about schemes only.');
    return { reply: 'You qualify (p. 2).' };
  }
  async explainNotification(facts) { return `${facts.scheme} gives ₹12,000 a year.`; }
  async translateClauses(clauses) { return new Map(clauses.map((c) => [c.id, `తెలుగు: ${c.text}`])); }
  async listen() { return { text: 'నాకు ఏ స్కాలర్‌షిప్ వస్తుంది?' }; }
  async speak() { if (this.mode !== 'ready') throw new KeyNotSet('add SARVAM_API_KEY'); return { audio_base64: 'AAAA', mime_type: 'audio/wav' }; }
}

const PDF = Buffer.from('%PDF-1.4\nsynthetic test pdf\n%%EOF');
const TODAY = () => new Date('2026-10-31T00:00:00Z');
const student = { annual_family_income_inr: 300000, age: 20, education_level: 'ug' };

async function start(gateway) {
  const listener = buildHaqServer(readSettings({}), { gateway, today: TODAY }).listen(0);
  await new Promise((ready) => listener.once('listening', ready));
  return { listener, api: `http://127.0.0.1:${listener.address().port}/api` };
}
const post = (api, path, body) => fetch(`${api}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
function uploadNotification(api, { file = PDF, name = 'notification.pdf', type = 'application/pdf', text } = {}) {
  const form = new FormData();
  if (file) form.append('file', new Blob([file], { type }), name);
  if (text) form.append('text', text);
  return fetch(`${api}/notifications/read`, { method: 'POST', body: form });
}

describe('Haq AI endpoints', () => {
  let s; const gateway = new StandInGateway();
  before(async () => { s = await start(gateway); });
  after(() => s.listener.close());

  it('health says what is ready', async () => {
    assert.deepEqual(await (await fetch(`${s.api}/health`)).json(), { status: 'ok', reading_ready: true, voice_ready: true });
  });

  it('reads a notification and checks each clause', async () => {
    const body = await (await uploadNotification(s.api)).json();
    const n = body.notification;
    assert.equal(n.scheme.level, 'central');
    assert.equal(n.scheme.publication_date, '2026-06-05');
    assert.equal(n.rules[0].value, 250000);
    assert.deepEqual(n.rules[1].value, ['sc', 'obc']);
    assert.equal(n.benefits[0].amount_inr, 20000);
    assert.equal(n.deadlines[0].date, '2026-12-31');
    assert.equal(n.deadlines[1].date, null);
    assert.equal(body.skipped_clauses.length, 1);
    assert.equal(body.skipped_clauses[0].section, 'rules');
    assert.equal(n.source_name, 'notification.pdf');
    assert.match(n.doc_id, /^[0-9a-f]{16}$/);
  });

  it('refuses other file types, empty uploads, fake PDFs and big files', async () => {
    assert.equal((await uploadNotification(s.api, { file: Buffer.from('hi'), name: 'a.docx', type: 'application/msword' })).status, 415);
    assert.equal((await uploadNotification(s.api, { file: Buffer.from('not a pdf'), name: 'a.pdf' })).status, 400);
    assert.equal((await uploadNotification(s.api, { file: null })).status, 400);
    assert.equal((await uploadNotification(s.api, { file: Buffer.concat([PDF, Buffer.alloc(16 * 1024 * 1024)]) })).status, 413);
  });

  it('Feature 1: changes, older first; same file twice → 422', async () => {
    const body = await (await post(s.api, '/changes', { older: v2(), newer: v1() })).json();
    assert.equal(body.older_id, 'fixture-v1');
    assert.equal(body.swapped, true);
    assert.deepEqual(body.tally, { added: 1, removed: 0, modified: 3 });
    const same = await post(s.api, '/changes', { older: v1(), newer: v1() });
    assert.equal(same.status, 422);
    assert.equal((await same.json()).code, 'same_notification');
  });

  it('Feature 2: eligibility with clear input errors', async () => {
    const ok = await (await post(s.api, '/eligibility', { notification: v2(), citizen: student })).json();
    assert.equal(ok.verdict, 'eligible');
    assert.equal(ok.apply.url, 'https://scholarships.gov.in/');
    assert.equal((await (await post(s.api, '/eligibility', { notification: v1(), citizen: student })).json()).apply, null);
    const bad = await post(s.api, '/eligibility', { notification: v2(), citizen: { annual_family_income_inr: -5 } });
    assert.equal(bad.status, 422);
    assert.deepEqual(await bad.json(), { message: "Income can't be negative.", code: 'invalid_request' });
  });

  it('Feature 4: impact in rupees', async () => {
    const body = await (await post(s.api, '/impact', { older: v1(), newer: v2(), citizen: student })).json();
    assert.equal(body.profiles[0].transition, 'newly_eligible');
    assert.equal(body.profiles[0].yearly_gain, 12000);
  });

  it('Feature 5: dated action plan', async () => {
    const notification = { ...v2(), deadlines: [{ description: 'Last date', date: '2026-12-31', page: 4, quote: null }] };
    const plan = await (await post(s.api, '/action-plan', { notification, citizen: student })).json();
    assert.equal(plan.days_left, 61);
    assert.equal(plan.verdict, 'eligible');
    assert.equal(plan.actions.at(-1).kind, 'portal');
  });

  it('Feature 3: ask sends code-built facts and the reply language', async () => {
    const res = await post(s.api, '/ask', { question: 'Do I qualify?', notifications: [v1(), v2()], citizen: student, language: 'te' });
    assert.equal((await res.json()).reply, 'You qualify (p. 2).');
    assert.equal(gateway.lastQuestion.language, 'te');
    assert.equal(gateway.lastQuestion.citizenContext.schemes[1].eligibility_for_user.verdict, 'eligible');
  });

  it('ask guardrails', async () => {
    assert.equal((await post(s.api, '/ask', { question: 'Write a poem' })).status, 422);
    assert.equal((await (await post(s.api, '/ask', { question: '  ' })).json()).message, 'Please type or say your question.');
    assert.equal((await (await post(s.api, '/ask', { question: 'hi', language: 'fr' })).json()).message, 'Please choose English, Telugu or Hindi.');
  });

  it('translate keeps pages and numbers', async () => {
    const body = await (await post(s.api, '/translate', { notification: v2(), language: 'te' })).json();
    assert.equal(body.kept_original, 0);
    assert.equal(body.clauses[0].page, 2);
    assert.equal((await post(s.api, '/translate', { notification: v2(), language: 'en' })).status, 422);
  });

  it('spoken explainer with number check', async () => {
    const body = await (await post(s.api, '/explain', { notification: v2(), older: v1(), language: 'hi' })).json();
    assert.deepEqual([body.script, body.fallback], ['TEST-SCHOLARSHIP gives ₹12,000 a year.', false]);
  });

  it('accepts small-business details', async () => {
    const res = await post(s.api, '/eligibility', { notification: v2(), citizen: { occupation: 'business_owner', enterprise_size: 'micro', annual_turnover_inr: 4000000, udyam_registered: true } });
    assert.equal(res.status, 200);
  });

  it('voice listen and speak', async () => {
    const form = new FormData();
    form.append('audio', new Blob([Buffer.from('audio')], { type: 'audio/webm' }), 'q.webm');
    form.append('language', 'te');
    assert.equal((await fetch(`${s.api}/voice/listen`, { method: 'POST', body: form })).status, 200);
    assert.equal((await (await post(s.api, '/voice/speak', { text: 'hello', language: 'hi' })).json()).mime_type, 'audio/wav');
  });

  it('unknown endpoint', async () => {
    const res = await fetch(`${s.api}/nope`);
    assert.equal(res.status, 404);
    assert.equal((await res.json()).code, 'unknown_endpoint');
  });
});

describe('when services are not ready', () => {
  it('no key → 503, not a notification → 422, Gemini down → 502', async () => {
    for (const [mode, status, code] of [['no_key', 503, 'key_not_set'], ['not_notification', 422, 'not_about_schemes'], ['down', 502, 'service_failed']]) {
      const s = await start(new StandInGateway(mode));
      const res = await uploadNotification(s.api);
      assert.equal(res.status, status, mode);
      assert.equal((await res.json()).code, code);
      s.listener.close();
    }
  });
  it('voice without a key → 503', async () => {
    const s = await start(new StandInGateway('no_key'));
    assert.equal((await post(s.api, '/voice/speak', { text: 'hello' })).status, 503);
    s.listener.close();
  });
});
