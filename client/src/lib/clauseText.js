// Reads a notification's clauses in the citizen's language. `tx` is the result of POST /api/translate
// (only number-checked translations come back as `translated`); anything missing falls back to the original.

const stripDate = (text, date) => (date ? text.split(date).join('').replace(/\s*[—–-]\s*$/, '').trim() : text);

/** Map of clause id → text to show, or null when the page is in English or nothing is translated yet. */
export function clauseMap(tx) {
  if (!tx?.clauses) return null;
  return new Map(tx.clauses.map((c) => [c.id, c.translated]));
}

export function clauseReader(tx, doc) {
  const map = clauseMap(tx);
  const get = (id) => map?.get(id) ?? null;
  return {
    on: Boolean(map),
    rule: (rule) => get(`rule:${rule.rule_id}`) ?? rule.description,
    benefit: (b, i) => get(`benefit:${i}`) ?? b.description,
    right: (r, i) => get(`right:${i}`) ?? r.text,
    deadline: (d, i) => { const text = get(`deadline:${i}`); return text ? stripDate(text, d.date) : d.description; },
    document: (d, i) => get(`document:${i}`) ?? d.name,
    documentByName: (name) => { const i = doc?.required_documents.findIndex((d) => d.name === name) ?? -1; return i >= 0 ? (get(`document:${i}`) ?? name) : name; },
    step: (order, fallback) => get(`step:${order}`) ?? fallback,
    ruleById: (ruleId, fallback) => get(`rule:${ruleId}`) ?? fallback,
    deadlineAt: (i, fallback) => { const d = doc?.deadlines[i]; return d ? (get(`deadline:${i}`) ? stripDate(get(`deadline:${i}`), d.date) : d.description) : fallback; },
    note: (n, i) => get(`note:${i}`) ?? n,
    /** Notification wording (a rule, benefit, right, date, document or step) → its translation, if any. */
    byText: (text) => {
      if (!map || !doc) return null;
      const key = String(text ?? '').trim();
      const hit = (list, id, pick) => { const i = list.findIndex((x) => String(pick(x) ?? '').trim() === key); return i >= 0 ? get(id(list[i], i)) : null; };
      return hit(doc.rules, (r) => `rule:${r.rule_id}`, (r) => r.description)
        ?? hit(doc.benefits, (_, i) => `benefit:${i}`, (b) => b.description)
        ?? hit(doc.rights ?? [], (_, i) => `right:${i}`, (r) => r.text)
        ?? hit(doc.deadlines, (_, i) => `deadline:${i}`, (d) => d.description)
        ?? hit(doc.required_documents, (_, i) => `document:${i}`, (d) => d.name)
        ?? hit(doc.application_steps ?? [], (s) => `step:${s.order}`, (s) => s.text);
    },
  };
}
