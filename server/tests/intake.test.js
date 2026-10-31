import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { cleanBenefit, cleanRule, readDate, readRupees } from '../src/intake/clauseCleaner.js';

describe('clause cleaner', () => {
  it('reads Indian dates day first and never guesses', () => {
    assert.equal(readDate('14/09/2026'), '2026-09-14');
    assert.equal(readDate('14 Sep 2026'), '2026-09-14');
    assert.equal(readDate('September 14, 2026'), '2026-09-14');
    assert.equal(readDate('31/02/2026'), null);
    assert.equal(readDate('soon'), null);
  });
  it('reads rupee amounts', () => {
    assert.equal(readRupees('₹2.5 lakh'), 250000);
    assert.equal(readRupees('Rs. 12,000/-'), 12000);
    assert.equal(readRupees('1 crore'), 10000000);
    assert.equal(readRupees('a lot'), null);
  });
  it('rewrites clause wording into engine fields', () => {
    const rule = cleanRule({ field: 'family income', operator: 'up to', value: '₹2.5 lakh', description: 'x' });
    assert.deepEqual([rule.field, rule.operator, rule.value, rule.unit], ['annual_family_income_inr', 'lte', 250000, 'INR_per_year']);
    assert.deepEqual(cleanRule({ field: 'caste', operator: 'one of', value: 'Scheduled Caste, OBC', description: 'x' }).value, ['sc', 'obc']);
    assert.equal(cleanBenefit({ description: 'Fee', amount_inr: 'Rs. 20,000/-', frequency: 'per annum' }).frequency, 'annual');
  });
});
