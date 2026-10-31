// haqGateway with fetch stubbed: no network and no real key.

import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { afterEach, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { HaqGateway, geminiEndpoint, readGeminiJson } from '../src/ai/haqGateway.js';
import { CITIZEN_HELPER, CLAUSE_TRANSLATOR, POLICY_READER } from '../src/ai/instructions.js';
import { KeyNotSet, NotAboutSchemes } from '../src/problems.js';
import { readSettings } from '../src/settings.js';

const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; });
const geminiSays = (obj, calls = []) => {
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init });
    return new Response(JSON.stringify({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify(obj) }] } }] }), { status: 200 });
  };
  return calls;
};
const gateway = () => new HaqGateway(readSettings({ AI_API_KEY: 'test-key', SARVAM_API_KEY: 'voice-key' }));

describe('Gemini helpers', () => {
  it('keeps the key out of the URL', () => {
    const endpoint = geminiEndpoint('secret', 'gemini-3.5-flash-lite');
    assert.ok(!endpoint.url.includes('secret'));
    assert.equal(endpoint.headers['x-goog-api-key'], 'secret');
  });
  it('reads JSON in fences or with a sentence around it', () => {
    assert.deepEqual(readGeminiJson('```json\n{"a":1}\n```'), { a: 1 });
    assert.deepEqual(readGeminiJson('Here: {"a":2} done'), { a: 2 });
    assert.throws(() => readGeminiJson('no json'));
  });
});

describe('HaqGateway', () => {
  it('without a key it refuses before calling out', async () => {
    const g = new HaqGateway(readSettings({}));
    assert.equal(g.canRead(), false);
    await assert.rejects(g.readPolicyDocument('text'), KeyNotSet);
    await assert.rejects(g.speak('hi'), KeyNotSet);
  });
  it('rejects files that are not notifications', async () => {
    geminiSays({ is_policy_document: false, rejection_reason: 'a bank statement' });
    await assert.rejects(gateway().readPolicyDocument('text'), (e) => e instanceof NotAboutSchemes && /bank statement/.test(e.message));
  });
  it('sends the PDF inline and returns raw clauses', async () => {
    const calls = geminiSays({ is_policy_document: true, scheme: { name: 'X' }, rules: [{}], benefits: 'bad' });
    const reading = await gateway().readPolicyDocument(null, Buffer.from('%PDF-'), 'application/pdf');
    assert.equal(reading.rules.length, 1);
    assert.deepEqual(reading.benefits, []);
    assert.equal(JSON.parse(calls[0].init.body).contents[0].parts[0].inlineData.mimeType, 'application/pdf');
  });
  it('off-topic questions are declined', async () => {
    geminiSays({ in_scope: false, reply: 'I only help with schemes.' });
    await assert.rejects(gateway().answerCitizen({ question: 'poem', citizenContext: {} }), NotAboutSchemes);
  });
  it('maps history roles for Gemini', async () => {
    const calls = geminiSays({ in_scope: true, reply: 'ok' });
    await gateway().answerCitizen({ question: 'q', history: [{ role: 'haq', text: 'hello' }, { role: 'citizen', text: 'hi' }], citizenContext: {} });
    const turns = JSON.parse(calls[0].init.body).contents;
    assert.equal(turns[0].role, 'user'); // a leading Haq turn is dropped
  });
  it('translates clauses into a map', async () => {
    geminiSays({ clauses: [{ id: 'rule:a', text: 'ఆదాయం' }, { id: 5 }] });
    const map = await gateway().translateClauses([{ id: 'rule:a', text: 'income' }], 'te');
    assert.deepEqual([...map], [['rule:a', 'ఆదాయం']]);
  });
});

describe('Haq AI boundaries', () => {
  const serverDir = join(dirname(fileURLToPath(import.meta.url)), '..');
  const filesIn = (dir) => readdirSync(dir).flatMap((n) => (statSync(join(dir, n)).isDirectory() ? filesIn(join(dir, n)) : [join(dir, n)]));
  it('only haqGateway.js calls outside services', () => {
    for (const file of filesIn(join(serverDir, 'src'))) {
      if (file.endsWith('haqGateway.js')) continue;
      assert.ok(!/\bfetch\(/.test(readFileSync(file, 'utf8')), `${file} calls fetch`);
    }
  });
  it('the engine never imports the gateway', () => {
    for (const file of filesIn(join(serverDir, 'src', 'engine'))) assert.ok(!/haqGateway/.test(readFileSync(file, 'utf8')), file);
  });
  it('Prompts/*.txt match the instructions in code', () => {
    const copy = (name) => readFileSync(join(serverDir, '..', 'Prompts', name), 'utf8').trim();
    assert.equal(copy('policy-reader.txt'), POLICY_READER.trim());
    assert.equal(copy('citizen-helper.txt'), CITIZEN_HELPER.trim());
    assert.equal(copy('clause-translator.txt'), CLAUSE_TRANSLATOR.trim());
  });
});

describe('answer speed', () => {
  it('answers ask for quick thinking; reading does not', async () => {
    const calls = geminiSays({ in_scope: true, reply: 'ok', is_policy_document: true, scheme: { name: 'X' } });
    const g = gateway();
    await g.answerCitizen({ question: 'q', citizenContext: {} });
    await g.readPolicyDocument('text');
    assert.deepEqual(JSON.parse(calls[0].init.body).generationConfig.thinkingConfig, { thinkingLevel: 'low' });
    assert.equal(JSON.parse(calls[1].init.body).generationConfig.thinkingConfig, undefined);
  });
  it('drops the thinking level when the model refuses it', async () => {
    const bodies = [];
    globalThis.fetch = async (url, init) => {
      const body = JSON.parse(init.body);
      bodies.push(body);
      if (body.generationConfig.thinkingConfig) return new Response(JSON.stringify({ error: { message: 'Thinking level is not supported for this model.' } }), { status: 400 });
      return new Response(JSON.stringify({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: '{"in_scope":true,"reply":"ok"}' }] } }] }), { status: 200 });
    };
    assert.equal((await gateway().answerCitizen({ question: 'q', citizenContext: {} })).reply, 'ok');
    assert.equal(bodies.length, 2);
  });
});

describe('when Gemini is overloaded', () => {
  it('switches to the backup model', async () => {
    const models = [];
    globalThis.fetch = async (url) => {
      models.push(decodeURIComponent(url.split('/models/')[1].split(':')[0]));
      if (url.includes('gemini-3.8-flash')) return new Response(JSON.stringify({ error: { message: 'The model is overloaded.' } }), { status: 503 });
      return new Response(JSON.stringify({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: '{"in_scope":true,"reply":"ok"}' }] } }] }), { status: 200 });
    };
    const g = new HaqGateway(readSettings({ AI_API_KEY: 'k', AI_MODEL: 'gemini-3.8-flash' }));
    assert.equal((await g.answerCitizen({ question: 'q', citizenContext: {} })).reply, 'ok');
    assert.deepEqual(models, ['gemini-3.8-flash', 'gemini-3.8-flash', 'gemini-3.8-flash', 'gemini-3.5-flash-lite']);
  });
});

describe('when Gemini is slow', () => {
  it('asks the backup model after a timeout', async () => {
    const models = [];
    globalThis.fetch = async (url) => {
      models.push(url.includes('3.8') ? 'main' : 'backup');
      if (url.includes('3.8')) throw Object.assign(new Error('slow'), { name: 'TimeoutError' });
      return new Response(JSON.stringify({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: '{"in_scope":true,"reply":"ok"}' }] } }] }), { status: 200 });
    };
    const g = new HaqGateway(readSettings({ AI_API_KEY: 'k', AI_MODEL: 'gemini-3.8-flash' }));
    assert.equal((await g.answerCitizen({ question: 'q', citizenContext: {} })).reply, 'ok');
    assert.deepEqual(models, ['main', 'backup']);
  });
});

describe('general answers and voice request', () => {
  it('marks answers from general knowledge', async () => {
    geminiSays({ in_scope: true, source: 'general', reply: 'General information (not from an uploaded notification): …' });
    assert.equal((await gateway().answerCitizen({ question: 'Explain Rythu Bharosa', citizenContext: {} })).source, 'general');
  });
  it('sends Sarvam the language_code field', async () => {
    const calls = [];
    globalThis.fetch = async (url, init) => { calls.push(JSON.parse(init.body)); return new Response(JSON.stringify({ audios: ['AAAA'] }), { status: 200 }); };
    await gateway().speak('నమస్తే', 'te');
    assert.equal(calls[0].language_code, 'te-IN');
    assert.equal(calls[0].target_language_code, undefined);
  });
});

describe('Sarvam voice models', async () => {
  const { sarvamVoiceSettings } = await import('../src/ai/haqGateway.js');
  it('uses current models and upgrades retired ones', () => {
    assert.deepEqual(sarvamVoiceSettings({}), { listenModel: 'saaras:v4', speakModel: 'bulbul:v3', voice: 'priya' });
    assert.deepEqual(sarvamVoiceSettings({ SARVAM_STT_MODEL: 'saarika:v2.5', SARVAM_TTS_MODEL: 'bulbul:v2', SARVAM_SPEAKER: 'anushka' }),
      { listenModel: 'saaras:v4', speakModel: 'bulbul:v3', voice: 'priya' });
    assert.equal(sarvamVoiceSettings({ SARVAM_SPEAKER: 'Kavya' }).voice, 'kavya');
  });
});
