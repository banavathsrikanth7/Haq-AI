import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { clauseReader } from '../src/lib/clauseText.js';

const doc = {
  rules: [{ rule_id: 'r1', description: 'Must be a farmer' }],
  benefits: [{ description: 'Rs. 5000 per acre' }],
  rights: [{ text: 'Disposed within 30 days' }],
  deadlines: [{ description: 'Last date', date: '2026-12-31' }],
  required_documents: [{ name: 'Pattadar passbook' }],
  notes: [],
};
const tx = { clauses: [
  { id: 'rule:r1', translated: 'రైతు అయి ఉండాలి — వృత్తి = farmer' },
  { id: 'benefit:0', translated: 'ఎకరాకు రూ. 5000' },
  { id: 'deadline:0', translated: 'చివరి తేదీ — 2026-12-31' },
  { id: 'document:0', translated: 'పట్టాదారు పాస్‌బుక్' },
] };

describe('clause reader', () => {
  it('shows translated clauses and falls back to the original', () => {
    const r = clauseReader(tx, doc);
    assert.equal(r.on, true);
    assert.equal(r.rule(doc.rules[0]), 'రైతు అయి ఉండాలి — వృత్తి = farmer');
    assert.equal(r.benefit(doc.benefits[0], 0), 'ఎకరాకు రూ. 5000');
    assert.equal(r.right(doc.rights[0], 0), 'Disposed within 30 days');
    assert.equal(r.deadline(doc.deadlines[0], 0), 'చివరి తేదీ');
    assert.equal(r.documentByName('Pattadar passbook'), 'పట్టాదారు పాస్‌బుక్');
    assert.equal(r.ruleById('r1', 'x'), 'రైతు అయి ఉండాలి — వృత్తి = farmer');
  });
  it('is off in English', () => {
    const r = clauseReader(null, doc);
    assert.equal(r.on, false);
    assert.equal(r.rule(doc.rules[0]), 'Must be a farmer');
  });
});
