// FEATURE 2 — Personalized Eligibility.
// Checks a citizen's details against each rule of the scheme in plain code.
// Gemini never decides eligibility; it only explains the verdict computed here.

import { ruleSentence } from './ruleText.js';

export const MISSING_DETAIL_QUESTIONS = {
  age: 'How old are you (in completed years)?',
  state: 'Which state do you live in?',
  annual_family_income_inr: "What is your family's total annual income in rupees?",
  category: 'Which category do you belong to (General, OBC, SC, ST or EWS)?',
  gender: 'What is your gender?',
  education_level: 'What are you studying now (school, diploma, UG, PG or PhD)?',
  course: 'Which course are you enrolled in?',
  institution_type: 'Is your institution government or private?',
  occupation: 'What is your occupation (student, farmer, worker…)?',
  disability: 'Do you have a certified disability?',
  last_exam_percent: 'What percentage did you score in your last exam?',
};

const lower = (v) => (typeof v === 'string' ? v.trim().toLowerCase() : v);
const asNumber = (v) => (typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v)) ? Number(v) : null);

/** "passed" | "failed" | "unknown" for one rule and one citizen. */
export function testCondition(rule, citizen) {
  const given = citizen?.[rule.field];
  if (given === null || given === undefined || given === '') return 'unknown';
  const { operator, value } = rule;
  if (operator === 'lte' || operator === 'gte') {
    const mine = asNumber(given);
    const limit = asNumber(value);
    if (mine === null || limit === null) return 'unknown';
    return (operator === 'lte' ? mine <= limit : mine >= limit) ? 'passed' : 'failed';
  }
  if (operator === 'between') {
    const mine = asNumber(given);
    const [low, high] = (Array.isArray(value) ? value : []).map(asNumber);
    if (mine === null || low === null || high === null) return 'unknown';
    return mine >= low && mine <= high ? 'passed' : 'failed';
  }
  if (operator === 'eq') {
    if (typeof given === 'boolean' || typeof value === 'boolean') {
      const required = typeof value === 'boolean' ? value : ['true', 'yes', '1'].includes(lower(String(value)));
      return Boolean(given) === required ? 'passed' : 'failed';
    }
    const mine = asNumber(given);
    return lower(given) === lower(value) || (mine !== null && mine === asNumber(value)) ? 'passed' : 'failed';
  }
  const allowed = (Array.isArray(value) ? value : [value]).map(lower);
  const listed = allowed.includes(lower(given));
  if (operator === 'in') return listed ? 'passed' : 'failed';
  if (operator === 'not_in') return listed ? 'failed' : 'passed';
  return 'unknown';
}

/** Verdict for one scheme: eligible / not_eligible / need_more_info / rule_not_verified. */
export function checkEligibility(doc, citizen = {}) {
  if (!doc.rules.length) return { verdict: 'rule_not_verified', conditions: [], missing_fields: [], follow_up_questions: [] };
  const conditions = doc.rules.map((rule) => ({
    rule_id: rule.rule_id,
    field: rule.field,
    description: rule.description,
    rule_text: ruleSentence(rule),
    status: testCondition(rule, citizen),
    user_value: citizen?.[rule.field] ?? null,
    rule_value: rule.value,
    page: rule.page ?? null,
    quote: rule.quote ?? null,
  }));
  const statuses = conditions.map((c) => c.status);
  const verdict = statuses.includes('failed') ? 'not_eligible' : statuses.includes('unknown') ? 'need_more_info' : 'eligible';
  const missing = verdict === 'need_more_info' ? [...new Set(conditions.filter((c) => c.status === 'unknown').map((c) => c.field))] : [];
  return {
    verdict,
    conditions,
    missing_fields: missing,
    follow_up_questions: missing.slice(0, 3).map((field) => ({ field, question: MISSING_DETAIL_QUESTIONS[field] })),
  };
}

export const hasAnyDetail = (citizen) => Boolean(citizen) && Object.values(citizen).some((v) => v !== null && v !== undefined && v !== '');
