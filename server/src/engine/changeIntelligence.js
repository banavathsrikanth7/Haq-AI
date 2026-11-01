// FEATURE 1 — Policy Change Intelligence Engine.
// Compares an older and a newer notification of the same scheme, item by item,
// and reports what was added, withdrawn or revised, with the page in each version.

import { percentChange } from './rupees.js';
import { benefitSentence, evidenceOf, matchKey, ruleSentence } from './ruleText.js';

const SECTION_ORDER = ['rules', 'benefits', 'rights', 'deadlines', 'documents', 'steps'];

function revision(section, key, label, kind, before, after, beforeValue, afterValue, beforeText, afterText) {
  return {
    category: section,
    key,
    label,
    change_type: kind,
    old_value: beforeValue ?? null,
    new_value: afterValue ?? null,
    old_display: beforeText,
    new_display: afterText,
    change_pct: kind === 'modified' ? percentChange(beforeValue, afterValue) : null,
    old_citation: evidenceOf(before),
    new_citation: evidenceOf(after),
  };
}

function compareSection(section, olderItems, newerItems, keyOf, { label, value, text, isRevised }) {
  const older = new Map(olderItems.map((item) => [keyOf(item), item]));
  const newer = new Map(newerItems.map((item) => [keyOf(item), item]));
  const keys = [...new Set([...older.keys(), ...newer.keys()])].sort((a, b) => String(a).localeCompare(String(b), 'en', { numeric: true }));
  const found = [];
  for (const key of keys) {
    const was = older.get(key);
    const now = newer.get(key);
    if (was && !now) found.push(revision(section, key, label(was), 'removed', was, null, value(was), null, text(was), '—'));
    else if (now && !was) found.push(revision(section, key, label(now), 'added', null, now, null, value(now), '—', text(now)));
    else if (isRevised(was, now)) found.push(revision(section, key, label(now), 'modified', was, now, value(was), value(now), text(was), text(now)));
  }
  return found;
}

/** Every difference between two notifications, in reading order: rules, benefits, dates, documents, steps. */
export function compareNotifications(olderDoc, newerDoc) {
  const revisions = [
    ...compareSection('rules', olderDoc.rules, newerDoc.rules, (r) => r.rule_id, {
      label: (r) => r.description, value: (r) => r.value, text: ruleSentence,
      isRevised: (a, b) => a.operator !== b.operator || a.field !== b.field || JSON.stringify(a.value) !== JSON.stringify(b.value),
    }),
    ...compareSection('benefits', olderDoc.benefits, newerDoc.benefits, (b) => matchKey(b.description), {
      label: (b) => b.description.trim(), value: (b) => b.amount_inr, text: benefitSentence,
      isRevised: (a, b) => a.amount_inr !== b.amount_inr || a.frequency !== b.frequency,
    }),
    ...compareSection('rights', olderDoc.rights ?? [], newerDoc.rights ?? [], (r) => matchKey(r.text), {
      label: (r) => r.text, value: (r) => r.text, text: (r) => r.text, isRevised: () => false,
    }),
    ...compareSection('deadlines', olderDoc.deadlines, newerDoc.deadlines, (d) => matchKey(d.description), {
      label: (d) => d.description, value: (d) => d.date, text: (d) => d.date ?? 'not stated',
      isRevised: (a, b) => a.date !== b.date,
    }),
    ...compareSection('documents', olderDoc.required_documents, newerDoc.required_documents, (d) => matchKey(d.name), {
      label: (d) => d.name, value: (d) => d.name, text: (d) => d.name, isRevised: () => false,
    }),
    ...compareSection('steps', olderDoc.application_steps, newerDoc.application_steps, (s) => s.order, {
      label: (s) => `Step ${s.order}`, value: (s) => s.text, text: (s) => s.text,
      isRevised: (a, b) => matchKey(a.text) !== matchKey(b.text),
    }),
  ];
  return revisions.sort((x, y) => SECTION_ORDER.indexOf(x.category) - SECTION_ORDER.indexOf(y.category));
}

export const tallyRevisions = (revisions) => ({
  added: revisions.filter((r) => r.change_type === 'added').length,
  removed: revisions.filter((r) => r.change_type === 'removed').length,
  modified: revisions.filter((r) => r.change_type === 'modified').length,
});

export const isSameScheme = (a, b) => matchKey(a.scheme.name) === matchKey(b.scheme.name);

/** Older notification first (by publication date when both are printed). */
export function olderThenNewer(a, b) {
  const swap = a.scheme.publication_date && b.scheme.publication_date && a.scheme.publication_date > b.scheme.publication_date;
  return swap ? [b, a, true] : [a, b, false];
}
