// FEATURE 4 — Policy Impact Analyzer.
// For the citizen and for typical example citizens, answers two questions about a policy change:
//   who will benefit (or lose out), and what it is worth to them in rupees.
// Only amounts printed in the notifications are used; nothing is estimated.

import { checkEligibility, hasAnyDetail } from './eligibility.js';
import { rupees } from './rupees.js';

/** Example citizens shown next to the user's own result. They are illustrations, not data. */
export const EXAMPLE_CITIZENS = [
  { label: 'UG student', profile: { age: 20, occupation: 'student', education_level: 'ug', annual_family_income_inr: 300000, category: 'general', institution_type: 'government' } },
  { label: 'Small farmer', profile: { age: 45, occupation: 'farmer', education_level: 'school', annual_family_income_inr: 150000, category: 'obc' } },
  { label: 'Senior citizen', profile: { age: 65, occupation: 'other', education_level: 'none', annual_family_income_inr: 100000, category: 'sc' } },
];

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

/** The citizen (when details are given) plus the example citizens, with a summary of who gains. */
export function analyzeImpact(olderDoc, newerDoc, citizen) {
  const people = [];
  if (hasAnyDetail(citizen)) people.push({ label: 'You', is_user: true, illustrative: false, profile: citizen });
  for (const example of EXAMPLE_CITIZENS) people.push({ label: example.label, is_user: false, illustrative: true, profile: example.profile });
  const profiles = people.map((p) => ({ ...p, ...impactOnCitizen(olderDoc, newerDoc, p.profile) }));
  const gains = (p) => p.transition === 'newly_eligible' || (p.yearly_gain ?? 0) > 0 || (p.one_time_gain ?? 0) > 0;
  const loses = (p) => p.transition === 'no_longer_eligible' || (p.yearly_gain ?? 0) < 0 || (p.one_time_gain ?? 0) < 0;
  return {
    profiles,
    summary: {
      benefit: profiles.filter(gains).length,
      lose: profiles.filter(loses).length,
      unchanged: profiles.filter((p) => !gains(p) && !loses(p) && p.transition !== 'needs_info').length,
      unknown: profiles.filter((p) => p.transition === 'needs_info').length,
      benefit_per_year_before: benefitValue(olderDoc).yearly,
      benefit_per_year_after: benefitValue(newerDoc).yearly,
    },
  };
}
