// Scheme figures (no browser needed). Synthetic test-only notifications.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { benefitScale, citizenDetailsOnly, snapshotFigures, rupees, lakhGrouping, addNotifications, pickVersionPair } from '../src/lib/schemeMath.js';

const doc = (id, name, date, extra = {}) => ({
  doc_id: id, source_name: `${id}.pdf`,
  scheme: { name, department: null, level: null, state: null, version_label: id, publication_date: date, effective_date: null, apply_url: null },
  rules: [], benefits: [], deadlines: [], required_documents: [], application_steps: [], notes: [], ...extra,
});

describe('formatting', () => {
  it('uses Indian digit grouping', () => {
    assert.equal(lakhGrouping(250000), '2,50,000');
    assert.equal(lakhGrouping(12345678), '1,23,45,678');
    assert.equal(rupees(null), '—');
    assert.equal(rupees(12000), '₹12,000');
  });
});

describe('metrics', () => {
  it('starts empty', () => {
    const m = snapshotFigures([], '2026-10-31');
    assert.deepEqual([m.documentCount, m.schemeCount, m.ruleCount, m.largestBenefit, m.nextDeadline], [0, 0, 0, null, null]);
  });
  it('counts schemes, rules, the largest benefit and the next future deadline', () => {
    const a = doc('a', 'Scheme X', '2023-01-01', { rules: [{}, {}], benefits: [{ description: 'Fee', amount_inr: 10000, frequency: 'annual' }], deadlines: [{ description: 'old', date: '2020-01-01' }] });
    const b = doc('b', 'scheme x ', '2025-01-01', { rules: [{}], benefits: [{ description: 'Fee', amount_inr: 12000, frequency: 'annual' }, { description: 'Kit', amount_inr: null, frequency: 'one_time' }], deadlines: [{ description: 'Last date', date: '2026-12-31' }] });
    const m = snapshotFigures([a, b], '2026-10-31');
    assert.equal(m.documentCount, 2);
    assert.equal(m.schemeCount, 1);
    assert.equal(m.ruleCount, 3);
    assert.equal(m.largestBenefit.amount_inr, 12000);
    assert.equal(m.nextDeadline.days, 61);
  });
});

describe('merging and pairing', () => {
  it('skips exact duplicates', () => {
    const merged = addNotifications([doc('a', 'X', null)], [doc('a', 'X', null), doc('b', 'X', null)]);
    assert.deepEqual([merged.rows.length, merged.added, merged.skipped], [2, 1, 1]);
  });
  it('suggests the two newest versions of the same scheme, oldest first', () => {
    const docs = [doc('new', 'X', '2025-01-01'), doc('other', 'Y', '2024-01-01'), doc('old', 'X', '2023-01-01')];
    assert.deepEqual(pickVersionPair(docs), ['old', 'new']);
    assert.deepEqual(pickVersionPair([doc('a', 'X', null)]), [null, null]);
  });
  it('benefit bars are relative to the largest amount', () => {
    const bars = benefitScale([doc('a', 'X', null, { benefits: [{ description: 'A', amount_inr: 5000, frequency: 'annual' }, { description: 'B', amount_inr: 10000, frequency: 'annual' }] })]);
    assert.deepEqual(bars.map((b) => b.width), [50, 100]);
  });
  it('drops empty profile fields', () => {
    assert.deepEqual(citizenDetailsOnly({ age: 20, state: '', category: null, disability: false }), { age: 20, disability: false });
  });
});

describe('action plan calendar', async () => {
  const { actionPlanCalendar } = await import('../src/lib/schemeMath.js');
  it('adds one all-day event per dated action', () => {
    const ics = actionPlanCalendar('TEST-SCHOLARSHIP', [
      { id: 'a1', title: 'Collect 2 documents', detail: 'Income certificate, Bonafide certificate', due: '2026-12-24', page: 3 },
      { id: 'a2', title: 'Apply on the official portal', detail: 'https://example.gov.in', due: null, page: null },
    ], new Date('2026-10-31T10:00:00Z'));
    assert.equal((ics.match(/BEGIN:VEVENT/g) ?? []).length, 1);
    assert.match(ics, /DTSTART;VALUE=DATE:20261224/);
    assert.match(ics, /DTEND;VALUE=DATE:20261225/);
    assert.match(ics, /Income certificate\\, Bonafide certificate \(notification p\. 3\)/);
  });
});
