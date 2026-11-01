// One-tap spoken explainer of a notification (Feature 3, voice).
// Code collects the facts; Gemini turns them into a few spoken sentences in EN / TE / HI;
// then code checks that every number Gemini said is a number from the facts. If any number
// is new, the script is rejected and Haq AI speaks a summary built here instead.

import { compareNotifications, isSameScheme, olderThenNewer } from './changeIntelligence.js';
import { numbersIn } from './clauseTranslation.js';
import { checkEligibility, hasAnyDetail } from './eligibility.js';
import { benefitSentence, ruleSentence } from './ruleText.js';

export function explainerFacts(doc, olderDoc = null, citizen = {}) {
  const facts = {
    scheme: doc.scheme.name,
    department: doc.scheme.department,
    published: doc.scheme.publication_date,
    who_can_apply: doc.rules.map((r) => ruleSentence(r)),
    what_you_get: doc.benefits.map((b) => `${b.description}: ${benefitSentence(b)}`),
    your_rights: (doc.rights ?? []).map((r) => r.text),
    last_dates: doc.deadlines.map((d) => `${d.description}${d.date ? `: ${d.date}` : ''}`),
    documents_needed: doc.required_documents.map((d) => d.name),
    how_to_apply: [...doc.application_steps].sort((a, b) => a.order - b.order).map((s) => s.text),
  };
  if (olderDoc && olderDoc.doc_id !== doc.doc_id && isSameScheme(olderDoc, doc)) {
    const [older, newer] = olderThenNewer(olderDoc, doc);
    facts.what_changed = compareNotifications(older, newer)
      .map((c) => `${c.label}: ${c.old_display} → ${c.new_display}${c.change_pct !== null ? ` (${c.change_pct}%)` : ''}`);
  }
  if (hasAnyDetail(citizen)) facts.listener_eligibility = checkEligibility(doc, citizen).verdict;
  return facts;
}

/** Numbers in the script that do not appear anywhere in the facts. */
export function newNumbers(script, facts) {
  const known = new Set(numbersIn(JSON.stringify(facts)));
  return [...new Set(numbersIn(script))].filter((n) => !known.has(n));
}

/** Plain English summary built in code, used when Gemini's script fails the number check. */
export function codeSummary(facts) {
  const parts = [`${facts.scheme}.`];
  if (facts.who_can_apply.length) parts.push(`Who can apply: ${facts.who_can_apply.join('; ')}.`);
  if (facts.what_you_get.length) parts.push(`What you get: ${facts.what_you_get.join('; ')}.`);
  if (facts.what_changed?.length) parts.push(`What changed: ${facts.what_changed.slice(0, 3).join('; ')}.`);
  if (facts.your_rights.length) parts.push(`Your rights: ${facts.your_rights.slice(0, 2).join('; ')}.`);
  if (facts.last_dates.length) parts.push(`Important dates: ${facts.last_dates.join('; ')}.`);
  return parts.join(' ').replace(/₹/g, 'rupees ');
}

/**
 * @param explain async (facts, language, strict) => script text (Gemini)
 */
export async function spokenExplainer(doc, { olderDoc = null, citizen = {}, language = 'en' }, explain) {
  const facts = explainerFacts(doc, olderDoc, citizen);
  for (const strict of [false, true]) {
    const script = (await explain(facts, language, strict)).trim();
    if (script && newNumbers(script, facts).length === 0) return { script, language, checked: true, fallback: false };
  }
  return { script: codeSummary(facts), language: 'en', checked: true, fallback: true };
}
