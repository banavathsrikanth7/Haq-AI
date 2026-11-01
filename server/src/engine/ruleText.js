// Turns structured scheme rules and benefits into short readable text.

import { lakhGrouping, rupees } from './rupees.js';

export const CITIZEN_FIELD_NAMES = {
  age: 'Age', state: 'State', annual_family_income_inr: 'Family income', category: 'Category',
  gender: 'Gender', education_level: 'Education', course: 'Course', institution_type: 'Institution',
  occupation: 'Occupation', disability: 'Disability', last_exam_percent: 'Last exam %',
  enterprise_size: 'Enterprise size', annual_turnover_inr: 'Annual turnover', udyam_registered: 'Udyam registration',
};
const CONDITION_SIGN = { lte: '≤', gte: '≥', eq: '=', in: 'one of', not_in: 'not', between: 'between' };

const isRupeeRule = (rule) => rule.field === 'annual_family_income_inr' || rule.field === 'annual_turnover_inr' || /^INR/i.test(rule.unit ?? '');

function valueText(value, inRupees) {
  if (Array.isArray(value)) return value.map((v) => valueText(v, inRupees)).join(', ');
  if (typeof value === 'number') return inRupees ? rupees(value) : lakhGrouping(value);
  if (typeof value === 'boolean') return value ? 'yes' : 'no';
  return String(value);
}

/** "Family income ≤ ₹2,50,000 per year", "Age between 18 – 25 years". */
export function ruleSentence(rule) {
  const inRupees = isRupeeRule(rule);
  let unit = '';
  if (inRupees) unit = /year/i.test(rule.unit ?? '') ? ' per year' : '';
  else if (rule.unit === 'years') unit = ' years';
  else if (rule.unit === 'percent') unit = '%';
  else if (rule.unit) unit = ` ${rule.unit}`;
  const shown = rule.operator === 'between' && Array.isArray(rule.value)
    ? rule.value.map((v) => valueText(v, inRupees)).join(' – ')
    : valueText(rule.value, inRupees);
  return `${CITIZEN_FIELD_NAMES[rule.field] ?? rule.field} ${CONDITION_SIGN[rule.operator]} ${shown}${unit}`;
}

export const benefitSentence = (b) => `${b.amount_inr !== null ? `${rupees(b.amount_inr)} ` : ''}(${b.frequency.replace('_', ' ')})`;

/** Lower-case, single-spaced text used to match the same item across two notifications. */
export const matchKey = (text) => String(text ?? '').trim().toLowerCase().replace(/\s+/g, ' ');

export const evidenceOf = (item) => (item ? { page: item.page ?? null, quote: item.quote ?? null } : null);
