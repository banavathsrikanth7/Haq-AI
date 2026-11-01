// Haq AI engine: the five features computed in code, checked on the synthetic TEST-SCHOLARSHIP fixture.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { planActions } from '../src/engine/actionAgent.js';
import { compareNotifications, olderThenNewer, tallyRevisions } from '../src/engine/changeIntelligence.js';
import { buildCitizenContext } from '../src/engine/citizenContext.js';
import { keepsEveryNumber, numbersIn, translateWithEvidence } from '../src/engine/clauseTranslation.js';
import { checkEligibility, testCondition } from '../src/engine/eligibility.js';
import { analyzeImpact, benefitValue, impactOnCitizen } from '../src/engine/impactAnalyzer.js';
import { ruleSentence } from '../src/engine/ruleText.js';
import { lakhGrouping, percentChange, rupees } from '../src/engine/rupees.js';
import { v1, v2 } from './fixtures.js';

const TODAY = new Date('2026-10-31T00:00:00Z');
const student = { annual_family_income_inr: 300000, age: 20, education_level: 'ug' };

describe('rupees', () => {
  it('uses lakh grouping', () => {
    assert.equal(lakhGrouping(250000), '2,50,000');
    assert.equal(lakhGrouping(12345678), '1,23,45,678');
    assert.equal(rupees(999), '₹999');
    assert.equal(percentChange(250000, 350000), 40);
    assert.equal(percentChange(0, 5), null);
  });
});

describe('Feature 1 — Policy Change Intelligence', () => {
  it('lists every revision with pages, in reading order', () => {
    const revisions = compareNotifications(v1(), v2());
    assert.deepEqual(tallyRevisions(revisions), { added: 1, removed: 0, modified: 3 });
    const income = revisions.find((r) => r.key === 'income_max');
    assert.equal(income.old_display, 'Family income ≤ ₹2,50,000 per year');
    assert.equal(income.new_display, 'Family income ≤ ₹3,50,000 per year');
    assert.equal(income.change_pct, 40);
    assert.equal(income.new_citation.page, 2);
    assert.equal(revisions.find((r) => r.category === 'documents').change_type, 'added');
    assert.deepEqual([...new Set(revisions.map((r) => r.category))], ['rules', 'benefits', 'documents']);
  });
  it('puts the older notification first', () => {
    const [older, , swapped] = olderThenNewer(v2(), v1());
    assert.equal(older.doc_id, 'fixture-v1');
    assert.equal(swapped, true);
  });
});

describe('Feature 2 — Personalized Eligibility', () => {
  it('passes, fails or asks for each condition', () => {
    assert.equal(checkEligibility(v2(), student).verdict, 'eligible');
    assert.equal(checkEligibility(v1(), student).verdict, 'not_eligible');
    const partial = checkEligibility(v2(), { age: 20 });
    assert.equal(partial.verdict, 'need_more_info');
    assert.deepEqual(partial.missing_fields, ['annual_family_income_inr', 'education_level']);
    assert.equal(partial.follow_up_questions.length, 2);
    assert.equal(checkEligibility({ ...v2(), rules: [] }, student).verdict, 'rule_not_verified');
  });
  it('handles between, eq and not_in', () => {
    const rule = { rule_id: 'age', field: 'age', operator: 'between', value: [18, 25], unit: 'years', description: 'Age' };
    assert.equal(ruleSentence(rule), 'Age between 18 – 25 years');
    assert.equal(testCondition(rule, { age: 26 }), 'failed');
    assert.equal(testCondition({ ...rule, field: 'disability', operator: 'eq', value: true }, { disability: true }), 'passed');
    assert.equal(testCondition({ ...rule, field: 'category', operator: 'not_in', value: ['general'] }, { category: 'sc' }), 'passed');
  });
});

describe('Feature 4 — Policy Impact Analyzer', () => {
  it('values benefits per year', () => {
    assert.deepEqual(benefitValue({ benefits: [
      { amount_inr: 1000, frequency: 'monthly' }, { amount_inr: 5000, frequency: 'one_time' }, { amount_inr: null, frequency: 'annual' },
    ] }), { yearly: 12000, one_time: 5000, unpriced: 1 });
  });
  it('shows who gains and how much', () => {
    const me = impactOnCitizen(v1(), v2(), student);
    assert.equal(me.transition, 'newly_eligible');
    assert.equal(me.yearly_gain, 12000);
    assert.equal(me.what_it_means, 'Can now apply and gets ₹12,000 more a year.');
    assert.equal(me.reasons[0].rule_id, 'income_max');
    const already = impactOnCitizen(v1(), v2(), { ...student, annual_family_income_inr: 100000 });
    assert.equal(already.yearly_gain, 2000);
    const unknown = impactOnCitizen(v1(), v2(), { age: 20 });
    assert.equal(unknown.yearly_gain, null);
  });
  it('derives affected groups from the revised rules only', () => {
    const result = analyzeImpact(v1(), v2(), student);
    assert.equal(result.profiles[0].label, 'You');
    const income = result.groups.find((g) => /family income/.test(g.who));
    assert.deepEqual([income.direction, income.who, income.why, income.page], ['gain', 'People with family income above ₹2,50,000 and up to ₹3,50,000', 'Now covered', 2]);
    assert.ok(result.groups.some((g) => g.direction === 'gain' && /PHD/.test(g.who)));
    assert.ok(result.groups.some((g) => g.who === 'Everyone who receives this benefit' && /₹10,000 → ₹12,000/.test(g.why)));
    assert.equal(result.summary.groups_lose, 0);
    assert.equal(analyzeImpact(v1(), v2(), {}).profiles.length, 0);
  });
});

describe('Feature 5 — Citizen Action Agent', () => {
  const withDeadline = (date) => ({ ...v2(), deadlines: [{ description: 'Last date to apply online', date, page: 4, quote: null }],
    application_steps: [{ order: 1, text: 'Register on the portal', page: 5, quote: null }] });
  it('eligible: collect, steps, submit, portal — with dates', () => {
    const plan = planActions(withDeadline('2026-12-31'), checkEligibility(v2(), student), TODAY);
    assert.deepEqual(plan.actions.map((a) => a.kind), ['collect', 'step', 'submit', 'portal']);
    assert.equal(plan.actions[0].due, '2026-12-24');
    assert.equal(plan.actions[2].due, '2026-12-31');
    assert.equal(plan.days_left, 61);
    assert.equal(plan.headline, 'You qualify. 61 days left to apply.');
  });
  it('not eligible: shows the failed conditions only', () => {
    const plan = planActions(v1(), checkEligibility(v1(), student), TODAY);
    assert.equal(plan.actions[0].kind, 'blocked');
    assert.match(plan.actions[0].detail, /₹2,50,000/);
    assert.ok(!plan.actions.some((a) => a.kind === 'submit'));
  });
  it('missing details and passed deadlines are said plainly', () => {
    const plan = planActions(withDeadline('2026-01-31'), checkEligibility(v2(), { age: 20 }), TODAY);
    assert.equal(plan.actions[0].kind, 'confirm');
    assert.ok(plan.actions.some((a) => a.kind === 'deadline_passed'));
    assert.equal(planActions(v2(), null, TODAY).actions[0].kind, 'check');
  });
});

describe('assistant context', () => {
  it('carries verdicts, revisions, impact and plan', () => {
    const context = buildCitizenContext([v1(), v2()], student, TODAY);
    assert.equal(context.schemes[1].eligibility_for_user.verdict, 'eligible');
    assert.equal(context.version_changes[0].changes.length, 4);
    assert.equal(context.version_changes[0].effect_on_user.transition, 'newly_eligible');
    assert.ok(context.schemes[1].action_plan.length > 0);
    assert.equal(buildCitizenContext([], {}, TODAY).has_documents, false);
  });
});

describe('evidence-preserving translation', () => {
  it('reads Indian, Devanagari and Telugu digits', () => {
    assert.deepEqual(numbersIn('₹2,50,000 and 18 – 25'), ['250000', '18', '25']);
    assert.deepEqual(numbersIn('₹२,५०,०००'), ['250000']);
    assert.deepEqual(numbersIn('౧౮'), ['18']);
    assert.equal(keepsEveryNumber('Income ≤ ₹2,50,000', 'ఆదాయం ≤ ₹2,50,000'), true);
    assert.equal(keepsEveryNumber('Income ≤ ₹2,50,000', 'ఆదాయం ≤ ₹25,000'), false);
  });
  it('keeps the original when a number changes, and keeps pages', async () => {
    const fake = async (clauses) => new Map(clauses.map((c) => [c.id, c.id === 'rule:income_max' ? 'आय ₹25,000 तक' : `हिंदी: ${c.text}`]));
    const result = await translateWithEvidence(v2(), 'hi', fake);
    const income = result.clauses.find((c) => c.id === 'rule:income_max');
    assert.equal(income.kept_original, true);
    assert.equal(income.translated, income.original);
    assert.equal(income.page, 2);
    assert.equal(result.clauses.find((c) => c.id === 'rule:age_max').kept_original, false);
    assert.equal(result.kept_original, 1);
  });
});

describe('official portal', async () => {
  const { officialPortal } = await import('../src/engine/officialPortal.js');
  const scheme = (extra) => ({ scheme: { name: 'X', state: null, department: null, apply_url: null, ...extra } });
  it('prefers the portal printed in the notification', () => {
    assert.deepEqual(officialPortal(v2()), { url: 'https://scholarships.gov.in/', name: 'scholarships.gov.in', source: 'notification' });
  });
  it('uses the verified list, respecting the state', () => {
    assert.equal(officialPortal(scheme({ name: 'Jagananna Vidya Deevena', state: 'Andhra Pradesh' })).url, 'https://jnanabhumi.ap.gov.in/');
    assert.equal(officialPortal(scheme({ name: 'Post Matric Scholarship', state: 'Bihar' })).source, 'search');
    assert.equal(officialPortal(scheme({ name: 'PM-KISAN' })).url, 'https://pmkisan.gov.in/');
  });
  it('falls back to a myScheme search with the scheme name', () => {
    assert.deepEqual(officialPortal(scheme({ name: 'Some Unknown Yojana' })), { url: 'https://www.myscheme.gov.in/search', name: 'myScheme (Government of India)', source: 'search', search_for: 'Some Unknown Yojana' });
  });
});

describe('spoken explainer guard', async () => {
  const { spokenExplainer, newNumbers, explainerFacts } = await import('../src/engine/spokenExplainer.js');
  it('accepts a script that only uses numbers from the facts', async () => {
    const result = await spokenExplainer(v2(), { olderDoc: v1(), language: 'te' }, async () => 'ఆదాయం ₹3,50,000 వరకు, ₹12,000 సాయం.');
    assert.deepEqual([result.checked, result.fallback, result.language], [true, false, 'te']);
  });
  it('retries once, then speaks a code-built summary if a new number appears', async () => {
    let calls = 0;
    const result = await spokenExplainer(v2(), {}, async () => { calls += 1; return 'You get ₹99,999.'; });
    assert.equal(calls, 2);
    assert.equal(result.fallback, true);
    assert.match(result.script, /rupees 12,000/);
  });
  it('finds numbers that are not in the facts', () => {
    assert.deepEqual(newNumbers('Limit 350000 and 7 days', explainerFacts(v2())), ['7']);
  });
});

describe('small businesses and rights', async () => {
  const { cleanRule, cleanRight } = await import('../src/intake/clauseCleaner.js');
  it('reads MSME conditions', () => {
    const turnover = cleanRule({ field: 'turnover', operator: 'up to', value: 'Rs. 5 crore', description: 'Turnover limit' });
    assert.deepEqual([turnover.field, turnover.value, turnover.unit], ['annual_turnover_inr', 50000000, 'INR_per_year']);
    assert.equal(ruleSentence(turnover), 'Annual turnover ≤ ₹5,00,00,000 per year');
    assert.deepEqual(cleanRule({ field: 'msme category', operator: 'one of', value: 'Micro enterprise, Small enterprise', description: 'x' }).value, ['micro', 'small']);
    assert.equal(cleanRule({ field: 'udyam', operator: 'eq', value: 'yes', description: 'x' }).value, true);
    assert.equal(testCondition({ field: 'udyam_registered', operator: 'eq', value: true }, { udyam_registered: true }), 'passed');
  });
  it('keeps rights with their page', () => {
    assert.deepEqual(cleanRight({ text: 'Grievance settled within 30 days', page: '8' }), { text: 'Grievance settled within 30 days', page: 8, quote: null });
    const revisions = compareNotifications(v1(), { ...v2(), rights: [{ text: 'Give it up option', page: 2, quote: null }] });
    assert.ok(revisions.some((r) => r.category === 'rights' && r.change_type === 'added'));
  });
});
