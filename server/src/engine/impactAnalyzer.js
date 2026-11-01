// FEATURE 4 — Policy Impact Analyzer.
// Answers two questions about a policy change:
//   who will benefit (or lose out), and what it is worth in rupees.
// The groups come only from the two notifications' own rules and amounts (no invented people),
// and the citizen's own result comes from the details they entered.

import { checkEligibility, hasAnyDetail } from './eligibility.js';
import { compareNotifications } from './changeIntelligence.js';
import { CITIZEN_FIELD_NAMES, ruleSentence } from './ruleText.js';
import { lakhGrouping, rupees } from './rupees.js';

export function verdictShift(before, after) {
  if (before === 'not_eligible' && after === 'eligible') return 'newly_eligible';
  if (before === 'eligible' && after === 'not_eligible') return 'no_longer_eligible';
  if (before === 'eligible' && after === 'eligible') return 'still_eligible';
  if (before === 'not_eligible' && after === 'not_eligible') return 'still_not_eligible';
  return 'needs_info';
}

/** Money a scheme pays per year (monthly × 12 + annual) and once (one-time). Unpriced benefits are counted separately. */
export function benefitValue(doc) {
  let yearly = 0;
  let oneTime = 0;
  let unpriced = 0;
  for (const b of doc.benefits) {
    if (b.amount_inr === null) { unpriced += 1; continue; }
    if (b.frequency === 'monthly') yearly += b.amount_inr * 12;
    else if (b.frequency === 'annual') yearly += b.amount_inr;
    else if (b.frequency === 'one_time') oneTime += b.amount_inr;
    else unpriced += 1;
  }
  return { yearly, one_time: oneTime, unpriced };
}

/** What this person receives under one version: zero if not eligible, null if we cannot tell yet. */
function receives(verdict, value) {
  if (verdict === 'eligible') return value;
  if (verdict === 'not_eligible') return { yearly: 0, one_time: 0, unpriced: 0 };
  return null;
}

function meaning(shift, before, after) {
  if (!before || !after) return 'More details are needed to know how this change affects this person.';
  const yearlyGain = after.yearly - before.yearly;
  const onceGain = after.one_time - before.one_time;
  const parts = [];
  if (yearlyGain) parts.push(`${yearlyGain > 0 ? 'gets' : 'loses'} ${rupees(Math.abs(yearlyGain))} ${yearlyGain > 0 ? 'more ' : ''}a year`);
  if (onceGain) parts.push(`${onceGain > 0 ? 'gets' : 'loses'} ${rupees(Math.abs(onceGain))} one-time`);
  if (shift === 'newly_eligible') return parts.length ? `Can now apply and ${parts.join(' and ')}.` : 'Can now apply (the document prints no amount).';
  if (shift === 'no_longer_eligible') return parts.length ? `Can no longer apply and ${parts.join(' and ')}.` : 'Can no longer apply.';
  if (shift === 'still_eligible') return parts.length ? `Still eligible and ${parts.join(' and ')}.` : 'Still eligible; the amount is unchanged.';
  return 'Not eligible under either version.';
}

/** Impact of the change for one citizen. */
export function impactOnCitizen(olderDoc, newerDoc, citizen) {
  const before = checkEligibility(olderDoc, citizen);
  const after = checkEligibility(newerDoc, citizen);
  const was = new Map(before.conditions.map((c) => [c.rule_id, c]));
  const now = new Map(after.conditions.map((c) => [c.rule_id, c]));
  const reasons = [];
  for (const id of new Set([...was.keys(), ...now.keys()])) {
    const x = was.get(id);
    const y = now.get(id);
    if (x && y && x.status !== y.status) reasons.push({ rule_id: id, description: y.description, old_status: x.status, new_status: y.status, old_text: x.rule_text, new_text: y.rule_text });
    else if (x && !y) reasons.push({ rule_id: id, description: x.description, old_status: x.status, new_status: 'removed', old_text: x.rule_text, new_text: '—' });
    else if (y && !x) reasons.push({ rule_id: id, description: y.description, old_status: 'absent', new_status: y.status, old_text: '—', new_text: y.rule_text });
  }
  const shift = verdictShift(before.verdict, after.verdict);
  const gotBefore = receives(before.verdict, benefitValue(olderDoc));
  const getsNow = receives(after.verdict, benefitValue(newerDoc));
  return {
    old_verdict: before.verdict,
    new_verdict: after.verdict,
    transition: shift,
    reasons,
    benefit_before: gotBefore,
    benefit_after: getsNow,
    yearly_gain: gotBefore && getsNow ? getsNow.yearly - gotBefore.yearly : null,
    one_time_gain: gotBefore && getsNow ? getsNow.one_time - gotBefore.one_time : null,
    what_it_means: meaning(shift, gotBefore, getsNow),
  };
}

const fieldName = (field) => (CITIZEN_FIELD_NAMES[field] ?? field).toLowerCase();
const show = (rule, v) => (rule.field === 'annual_family_income_inr' || rule.field === 'annual_turnover_inr' || /^INR/i.test(rule.unit ?? '') ? rupees(v) : lakhGrouping(v));
const listText = (values) => values.map((v) => String(v).toUpperCase().length <= 4 ? String(v).toUpperCase() : String(v)).join(', ');

/** Groups of people the change helps or hurts, read straight from the revised rules and benefits. */
export function affectedGroups(olderDoc, newerDoc) {
  const groups = [];
  const add = (direction, who, why, revision) => groups.push({
    direction, who, why, page: revision.new_citation?.page ?? revision.old_citation?.page ?? null,
  });
  const older = new Map(olderDoc.rules.map((r) => [r.rule_id, r]));
  const newer = new Map(newerDoc.rules.map((r) => [r.rule_id, r]));
  for (const revision of compareNotifications(olderDoc, newerDoc)) {
    if (revision.category === 'rules') {
      const was = older.get(revision.key);
      const now = newer.get(revision.key);
      const name = fieldName((now ?? was).field);
      if (!was) { add('lose', `People who do not meet: ${ruleSentence(now)}`, 'New condition added', revision); continue; }
      if (!now) { add('gain', `People who did not meet: ${ruleSentence(was)}`, 'Condition removed', revision); continue; }
      if (was.operator === now.operator && typeof was.value === 'number' && typeof now.value === 'number') {
        const [lo, hi] = [Math.min(was.value, now.value), Math.max(was.value, now.value)];
        const raised = now.value > was.value;
        const gains = (now.operator === 'lte' && raised) || (now.operator === 'gte' && !raised);
        const band = now.operator === 'lte' ? `above ${show(now, lo)} and up to ${show(now, hi)}` : `from ${show(now, lo)} to below ${show(now, hi)}`;
        add(gains ? 'gain' : 'lose', `People with ${name} ${band}`, gains ? 'Now covered' : 'No longer covered', revision);
        continue;
      }
      if (['in', 'not_in'].includes(was.operator) && was.operator === now.operator && Array.isArray(was.value) && Array.isArray(now.value)) {
        const before = new Set(was.value.map(String));
        const after = new Set(now.value.map(String));
        const added = [...after].filter((v) => !before.has(v));
        const removed = [...before].filter((v) => !after.has(v));
        const [inGain, inLose] = now.operator === 'in' ? [added, removed] : [removed, added];
        if (inGain.length) add('gain', `People whose ${name} is ${listText(inGain)}`, 'Now covered', revision);
        if (inLose.length) add('lose', `People whose ${name} is ${listText(inLose)}`, 'No longer covered', revision);
        continue;
      }
      add('changed', `People affected by: ${ruleSentence(now)}`, `Was: ${ruleSentence(was)}`, revision);
    }
    if (revision.category === 'benefits' && revision.change_type === 'modified' && typeof revision.old_value === 'number' && typeof revision.new_value === 'number') {
      const more = revision.new_value > revision.old_value;
      add(more ? 'gain' : 'lose', 'Everyone who receives this benefit',
        `${revision.label}: ${rupees(revision.old_value)} → ${rupees(revision.new_value)}`, revision);
    }
  }
  return groups;
}

/** The citizen's own result (when details are given) and the groups the change affects. */
export function analyzeImpact(olderDoc, newerDoc, citizen) {
  const profiles = hasAnyDetail(citizen)
    ? [{ label: 'You', is_user: true, illustrative: false, profile: citizen, ...impactOnCitizen(olderDoc, newerDoc, citizen) }]
    : [];
  const groups = affectedGroups(olderDoc, newerDoc);
  return {
    profiles,
    groups,
    summary: {
      groups_gain: groups.filter((g) => g.direction === 'gain').length,
      groups_lose: groups.filter((g) => g.direction === 'lose').length,
      benefit_per_year_before: benefitValue(olderDoc).yearly,
      benefit_per_year_after: benefitValue(newerDoc).yearly,
    },
  };
}
