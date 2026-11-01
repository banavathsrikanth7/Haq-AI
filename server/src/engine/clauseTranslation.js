// Evidence-preserving translation.
// Rules, benefits, dates, documents and steps are translated into Telugu or Hindi, but a
// translation is only shown when every number in the English clause (₹ amount, age, %, date)
// is still present in it. Otherwise the original clause is kept and marked, so a legal
// condition can never be changed by translation. Page numbers and quotes are always kept.

import { benefitSentence, ruleSentence } from './ruleText.js';

/** Digits in a clause, with Indian grouping removed: "₹2,50,000 and 18 – 25" → ["250000", "18", "25"]. */
export function numbersIn(text) {
  const western = String(text ?? '')
    .replace(/[०-९]/g, (d) => String('०१२३४५६७८९'.indexOf(d)))
    .replace(/[౦-౯]/g, (d) => String('౦౧౨౩౪౫౬౭౮౯'.indexOf(d)));
  return (western.match(/\d[\d,]*(?:\.\d+)?/g) ?? []).map((n) => n.replace(/,/g, '').replace(/\.0+$/, ''));
}

/** True when every number of the source appears in the translation (as many times). */
export function keepsEveryNumber(source, translated) {
  const left = numbersIn(translated);
  for (const n of numbersIn(source)) {
    const at = left.indexOf(n);
    if (at === -1) return false;
    left.splice(at, 1);
  }
  return true;
}

/** Clauses of a notification that a citizen reads, each with a stable id and its page. */
export function readableClauses(doc) {
  return [
    ...doc.rules.map((r) => ({ id: `rule:${r.rule_id}`, section: 'rules', text: `${r.description} — ${ruleSentence(r)}`, page: r.page, quote: r.quote })),
    ...doc.benefits.map((b, i) => ({ id: `benefit:${i}`, section: 'benefits', text: `${b.description} — ${benefitSentence(b)}`, page: b.page, quote: b.quote })),
    ...(doc.rights ?? []).map((r, i) => ({ id: `right:${i}`, section: 'rights', text: r.text, page: r.page, quote: r.quote })),
    ...doc.deadlines.map((d, i) => ({ id: `deadline:${i}`, section: 'deadlines', text: `${d.description}${d.date ? ` — ${d.date}` : ''}`, page: d.page, quote: d.quote })),
    ...doc.required_documents.map((d, i) => ({ id: `document:${i}`, section: 'documents', text: d.name, page: d.page, quote: d.quote })),
    ...doc.application_steps.map((s) => ({ id: `step:${s.order}`, section: 'steps', text: s.text, page: s.page, quote: s.quote })),
    ...doc.notes.map((n, i) => ({ id: `note:${i}`, section: 'notes', text: n, page: null, quote: null })),
  ];
}

/**
 * @param doc checked notification
 * @param language 'te' | 'hi'
 * @param translate async ([{id, text}], language) => Map(id → text)
 */
export async function translateWithEvidence(doc, language, translate) {
  const clauses = readableClauses(doc);
  const translated = await translate(clauses.map(({ id, text }) => ({ id, text })), language);
  const rows = clauses.map((clause) => {
    const text = translated.get(clause.id);
    const safe = Boolean(text) && keepsEveryNumber(clause.text, text);
    return {
      id: clause.id,
      section: clause.section,
      original: clause.text,
      translated: safe ? text : clause.text,
      kept_original: !safe,
      reason: safe ? null : text ? 'A number in the translation did not match the notification, so the original wording is shown.' : 'No translation was returned for this clause.',
      page: clause.page,
      quote: clause.quote,
    };
  });
  return { language, clauses: rows, kept_original: rows.filter((r) => r.kept_original).length };
}
