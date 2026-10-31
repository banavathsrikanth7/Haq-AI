// Scheme figures shown on the page (rupees, dates, days left, which versions to compare).
// All computed here in code; nothing on the page is a number Gemini made up.

/** 250000 → "2,50,000" (Indian digit grouping). */
export function lakhGrouping(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value);
  const [head, tail] = (Number.isInteger(n) ? String(Math.abs(n)) : Math.abs(n).toFixed(2)).split('.');
  const grouped = head.length > 3 ? `${head.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${head.slice(-3)}` : head;
  return `${n < 0 ? '-' : ''}${grouped}${tail ? `.${tail}` : ''}`;
}

export const rupees = (value) => (value === null || value === undefined ? '—' : `₹${lakhGrouping(value)}`);

export function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

export const fileSizeKb = (bytes) => (bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);

export function daysBetween(fromIso, toIso) {
  return Math.round((Date.parse(`${toIso}T00:00:00Z`) - Date.parse(`${fromIso}T00:00:00Z`)) / 86_400_000);
}

export const todayIso = (now = new Date()) => now.toISOString().slice(0, 10);

/** Top-of-page metric cards. */
export function snapshotFigures(documents, today = todayIso()) {
  const schemes = new Set(documents.map((d) => d.scheme.name.trim().toLowerCase()));
  const rules = documents.reduce((sum, d) => sum + d.rules.length, 0);
  const benefits = documents.flatMap((d) => d.benefits.filter((b) => b.amount_inr !== null).map((b) => ({ ...b, scheme: d.scheme.name })));
  const largest = benefits.sort((a, b) => b.amount_inr - a.amount_inr)[0] ?? null;
  const deadlines = documents
    .flatMap((d) => d.deadlines.filter((x) => x.date && x.date >= today).map((x) => ({ ...x, scheme: d.scheme.name })))
    .sort((a, b) => a.date.localeCompare(b.date));
  const next = deadlines[0] ?? null;
  return {
    documentCount: documents.length,
    schemeCount: schemes.size,
    ruleCount: rules,
    largestBenefit: largest,
    nextDeadline: next ? { ...next, days: daysBetween(today, next.date) } : null,
  };
}

/** Add new documents, skipping exact duplicates (same doc_id). */
export function addNotifications(existing, incoming) {
  const ids = new Set(existing.map((d) => d.doc_id));
  const fresh = incoming.filter((d) => !ids.has(d.doc_id));
  return { rows: [...existing, ...fresh], added: fresh.length, skipped: incoming.length - fresh.length };
}

/** Bars for the "Benefits" panel: every amount, widths relative to the largest. */
export function benefitScale(documents) {
  const rows = documents.flatMap((d) => d.benefits.map((b) => ({ ...b, scheme: d.scheme.name, version: d.scheme.version_label, doc_id: d.doc_id })));
  const max = Math.max(0, ...rows.map((r) => r.amount_inr ?? 0));
  return rows.map((r) => ({ ...r, width: max && r.amount_inr ? Math.max(4, Math.round((r.amount_inr / max) * 100)) : 0 }));
}

/** Documents sorted oldest → newest (by publication date, then upload order). */
export function sortByDate(documents) {
  return documents.map((d, i) => ({ d, i }))
    .sort((a, b) => (a.d.scheme.publication_date ?? '').localeCompare(b.d.scheme.publication_date ?? '') || a.i - b.i)
    .map((x) => x.d);
}

/** Suggest the best pair to compare: the two newest documents of the scheme that has most versions. */
export function pickVersionPair(documents) {
  const groups = new Map();
  for (const d of documents) {
    const k = d.scheme.name.trim().toLowerCase();
    groups.set(k, [...(groups.get(k) ?? []), d]);
  }
  const best = [...groups.values()].filter((g) => g.length >= 2).sort((a, b) => b.length - a.length)[0];
  if (!best) return documents.length >= 2 ? [documents.at(-2).doc_id, documents.at(-1).doc_id] : [null, null];
  const sorted = sortByDate(best);
  return [sorted.at(-2).doc_id, sorted.at(-1).doc_id];
}

/** Drop empty profile fields before sending. */
export function citizenDetailsOnly(profile) {
  return Object.fromEntries(Object.entries(profile).filter(([, v]) => v !== null && v !== undefined && v !== ''));
}

export const notificationLabel = (d) => `${d.scheme.name}${d.scheme.version_label ? ` · ${d.scheme.version_label}` : ''}`;

const icsText = (text) => String(text ?? '').replace(/\\/g, '\\\\').replace(/[;,]/g, (c) => `\\${c}`).replace(/\r?\n/g, '\\n');
const icsDay = (iso) => iso.replace(/-/g, '');
const nextDay = (iso) => new Date(Date.parse(`${iso}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);

/** Calendar file (.ics) with one all-day reminder per dated action in a Haq AI action plan. */
export function actionPlanCalendar(schemeName, actions, stamp = new Date()) {
  const created = stamp.toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const events = actions.filter((a) => a.due).map((a) => [
    'BEGIN:VEVENT',
    `UID:${a.id}-${icsDay(a.due)}@haq-ai`,
    `DTSTAMP:${created}`,
    `DTSTART;VALUE=DATE:${icsDay(a.due)}`,
    `DTEND;VALUE=DATE:${icsDay(nextDay(a.due))}`,
    `SUMMARY:${icsText(`${schemeName}: ${a.title}`)}`,
    `DESCRIPTION:${icsText(`${a.detail}${a.page ? ` (notification p. ${a.page})` : ''}`)}`,
    'END:VEVENT',
  ].join('\r\n'));
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Haq AI//Action plan//EN', 'CALSCALE:GREGORIAN', ...events, 'END:VCALENDAR'].join('\r\n') + '\r\n';
}
