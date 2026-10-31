// Facts the multilingual assistant (voice + text) is allowed to use, all computed in code:
// rules with pages, the citizen's verdict per scheme, revisions between versions,
// what each revision is worth, and the personal action plan.

import { compareNotifications, isSameScheme, olderThenNewer } from './changeIntelligence.js';
import { checkEligibility, hasAnyDetail } from './eligibility.js';
import { impactOnCitizen } from './impactAnalyzer.js';
import { planActions } from './actionAgent.js';
import { benefitSentence, matchKey, ruleSentence } from './ruleText.js';

export function buildCitizenContext(documents, citizen = {}, today = new Date()) {
  const schemes = documents.map((doc) => {
    const verdict = checkEligibility(doc, citizen);
    const plan = planActions(doc, hasAnyDetail(citizen) ? verdict : null, today);
    return {
      scheme: doc.scheme.name,
      version: doc.scheme.version_label,
      department: doc.scheme.department,
      published: doc.scheme.publication_date,
      apply_url: doc.scheme.apply_url,
      rules: doc.rules.map((r) => ({ rule: ruleSentence(r), description: r.description, page: r.page })),
      benefits: doc.benefits.map((b) => ({ description: b.description, amount: benefitSentence(b), page: b.page })),
      deadlines: doc.deadlines.map((d) => ({ description: d.description, date: d.date, page: d.page })),
      required_documents: doc.required_documents.map((d) => ({ name: d.name, page: d.page })),
      application_steps: doc.application_steps.map((s) => ({ order: s.order, text: s.text, page: s.page })),
      unclear_in_document: doc.notes,
      eligibility_for_user: {
        verdict: verdict.verdict,
        conditions: verdict.conditions.map((c) => ({ rule: c.rule_text, status: c.status, page: c.page })),
        missing_information: verdict.missing_fields,
      },
      action_plan: plan.actions.map((a) => ({ title: a.title, detail: a.detail, due: a.due, page: a.page })),
    };
  });

  const revisions = [];
  const byScheme = new Map();
  for (const doc of documents) byScheme.set(matchKey(doc.scheme.name), [...(byScheme.get(matchKey(doc.scheme.name)) ?? []), doc]);
  for (const group of byScheme.values()) {
    if (group.length < 2) continue;
    const ordered = [...group].sort((a, b) => (a.scheme.publication_date ?? '').localeCompare(b.scheme.publication_date ?? ''));
    const [olderDoc, newerDoc] = olderThenNewer(ordered.at(-2), ordered.at(-1));
    if (!isSameScheme(olderDoc, newerDoc)) continue;
    const impact = hasAnyDetail(citizen) ? impactOnCitizen(olderDoc, newerDoc, citizen) : null;
    revisions.push({
      scheme: newerDoc.scheme.name,
      from_version: olderDoc.scheme.version_label,
      to_version: newerDoc.scheme.version_label,
      changes: compareNotifications(olderDoc, newerDoc).map((c) => ({
        item: c.label, type: c.change_type, before: c.old_display, after: c.new_display, change_pct: c.change_pct,
        page: c.new_citation?.page ?? c.old_citation?.page ?? null,
      })),
      effect_on_user: impact ? { transition: impact.transition, what_it_means: impact.what_it_means } : 'details not given',
    });
  }

  return {
    today: today.toISOString().slice(0, 10),
    has_documents: documents.length > 0,
    user_details: Object.fromEntries(Object.entries(citizen ?? {}).filter(([, v]) => v !== null && v !== undefined && v !== '')),
    schemes,
    version_changes: revisions,
  };
}
