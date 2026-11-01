// FEATURE 5 — Citizen Action Agent.
// Turns the eligibility verdict and the notification into a dated, ordered plan:
// what to do now, what to collect, how to apply and by when. Every step that comes
// from the document carries its page; Haq AI does not add steps the document does not state.

import { MISSING_DETAIL_QUESTIONS } from './eligibility.js';
import { officialPortal } from './officialPortal.js';

const DAY = 86_400_000;
const iso = (date) => date.toISOString().slice(0, 10);
const daysBetween = (fromIso, toIso) => Math.round((Date.parse(`${toIso}T00:00:00Z`) - Date.parse(`${fromIso}T00:00:00Z`)) / DAY);
const addDays = (isoDate, days) => iso(new Date(Date.parse(`${isoDate}T00:00:00Z`) + days * DAY));

function urgencyOf(due, today) {
  if (!due) return 'anytime';
  const left = daysBetween(today, due);
  if (left <= 7) return 'now';
  if (left <= 30) return 'soon';
  return 'later';
}

/** Documents, steps, the nearest upcoming deadline and the apply link — the plain checklist. */
export function applicationChecklist(doc, today = new Date()) {
  const todayIso = iso(today);
  const upcoming = doc.deadlines.filter((d) => d.date && d.date >= todayIso).sort((x, y) => x.date.localeCompare(y.date));
  const next = upcoming[0] ?? null;
  return {
    required_documents: doc.required_documents,
    application_steps: [...doc.application_steps].sort((x, y) => x.order - y.order),
    deadline: next,
    days_left: next ? daysBetween(todayIso, next.date) : null,
    all_deadlines: doc.deadlines,
    apply_url: doc.scheme.apply_url,
    portal: officialPortal(doc),
  };
}

/**
 * A personal action plan.
 * @param doc validated policy document
 * @param eligibility result of checkEligibility(doc, citizen) or null when not checked yet
 */
// Position of a deadline in the notification, so the page can show its translated wording.
const deadlineIndex = (doc, d) => doc.deadlines.findIndex((x) => x === d || (x.description === d.description && x.date === d.date));

export function planActions(doc, eligibility, today = new Date()) {
  const todayIso = iso(today);
  const checklist = applicationChecklist(doc, today);
  const deadline = checklist.deadline?.date ?? null;
  const passed = doc.deadlines.filter((d) => d.date && d.date < todayIso).sort((x, y) => y.date.localeCompare(x.date))[0] ?? null;
  const verdict = eligibility?.verdict ?? 'not_checked';
  const actions = [];
  const add = (action) => actions.push({ id: `a${actions.length + 1}`, page: null, due: null, ...action });

  if (verdict === 'not_checked') {
    add({ kind: 'check', title: 'Check if you qualify', detail: 'Answer a few questions so Haq AI can match you against every rule in this document.', urgency: 'now' });
  }
  if (verdict === 'need_more_info') {
    add({
      kind: 'confirm',
      title: 'Share the missing details',
      detail: eligibility.missing_fields.map((f) => MISSING_DETAIL_QUESTIONS[f]).join(' '),
      fields: eligibility.missing_fields,
      urgency: 'now',
    });
  }
  if (verdict === 'not_eligible') {
    const failed = eligibility.conditions.filter((c) => c.status === 'failed');
    add({
      kind: 'blocked',
      title: 'You do not meet these conditions',
      detail: failed.map((c) => `${c.description} (${c.rule_text})`).join('; '),
      rule_ids: failed.map((c) => c.rule_id),
      page: failed[0]?.page ?? null,
      urgency: 'anytime',
    });
    add({ kind: 'alternative', title: 'Look at other schemes', detail: 'Upload another scheme or a newer notification; rules are often revised.', urgency: 'anytime' });
  }
  if (!deadline && passed) {
    add({ kind: 'deadline_passed', title: 'The last date has passed', detail: `${passed.description} (${passed.date}). Watch the department website for the next notification.`, deadline_index: doc.deadlines.indexOf(passed), page: passed.page, urgency: 'anytime' });
  }
  if (verdict === 'eligible' || verdict === 'need_more_info' || verdict === 'not_checked') {
    const collectBy = deadline ? (daysBetween(todayIso, deadline) > 10 ? addDays(deadline, -7) : todayIso) : null;
    if (doc.required_documents.length) {
      add({
        kind: 'collect',
        title: `Collect ${doc.required_documents.length} document${doc.required_documents.length === 1 ? '' : 's'}`,
        detail: doc.required_documents.map((d) => d.name).join(', '),
        count: doc.required_documents.length,
        page: doc.required_documents[0]?.page ?? null,
        due: collectBy,
        urgency: urgencyOf(collectBy, todayIso),
      });
    }
    for (const step of checklist.application_steps) {
      add({ kind: 'step', title: `Step ${step.order}`, detail: step.text, order: step.order, page: step.page, due: deadline, urgency: urgencyOf(deadline, todayIso) });
    }
    if (deadline) {
      add({ kind: 'submit', title: 'Submit before the last date', detail: checklist.deadline.description, deadline_index: deadlineIndex(doc, checklist.deadline), page: checklist.deadline.page, due: deadline, urgency: urgencyOf(deadline, todayIso) });
    }
    // The apply link is given only once the citizen is confirmed eligible.
    const portal = checklist.portal;
    if (verdict === 'eligible') add({
      kind: 'portal',
      title: portal.source === 'search' ? `Find "${portal.search_for}" on ${portal.name}` : `Apply on the ${portal.name}`,
      detail: portal.url,
      portal,
      urgency: deadline ? urgencyOf(deadline, todayIso) : 'anytime',
    });
  }

  return {
    verdict,
    actions,
    checklist,
    days_left: checklist.days_left,
    headline: {
      eligible: deadline ? `You qualify. ${checklist.days_left} days left to apply.` : 'You qualify. The document does not print a last date.',
      not_eligible: 'You do not qualify under this document.',
      need_more_info: 'A few details are missing before Haq AI can confirm.',
      rule_not_verified: 'This document has no rules Haq AI can check automatically.',
      not_checked: 'Check your eligibility to get a personal plan.',
    }[verdict],
  };
}
