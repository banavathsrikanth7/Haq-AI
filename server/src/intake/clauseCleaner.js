// Clause cleaner for Haq AI's document intake.
// Government notifications write the same clause in many ways ("₹2.5 lakh", "Rs. 2,50,000/-",
// "Scheduled Caste", "14/09/2026"). This file rewrites what Gemini read into the one form the
// eligibility engine understands. Clauses that still do not fit are dropped by policySchemas.js.

import { CATEGORIES, EDUCATION_LEVELS, OCCUPATIONS, CONDITION_OPERATORS, CITIZEN_FIELDS } from '../models/policySchemas.js';

const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12 };
const pad = (n) => String(n).padStart(2, '0');
const monthOf = (word) => MONTHS[word.toLowerCase().slice(0, 4)] ?? MONTHS[word.toLowerCase().slice(0, 3)] ?? null;
const str = (v) => (typeof v === 'string' ? v.trim() : v);

function validDate(y, m, d) {
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d ? `${y}-${pad(m)}-${pad(d)}` : null;
}

/** "2026-09-14", "14/09/2026", "14-09-2026", "14.09.2026", "14 Sep 2026", "September 14, 2026" → ISO or null. */
export function readDate(value) {
  if (value === null || value === undefined || value === '') return null;
  const s = String(value).trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return validDate(+m[1], +m[2], +m[3]);
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (m) return validDate(+m[3], +m[2], +m[1]); // day-first (Indian documents)
  m = s.match(/^(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]{3,9})\.?,?\s+(\d{4})$/);
  if (m && monthOf(m[2])) return validDate(+m[3], monthOf(m[2]), +m[1]);
  m = s.match(/^([A-Za-z]{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})$/);
  if (m && monthOf(m[1])) return validDate(+m[3], monthOf(m[1]), +m[2]);
  return null;
}

/** "₹1,25,000", "Rs. 12,000/-", "2.5 lakh", "1 crore", 250000 → number, else null. */
export function readRupees(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;
  const s = value.toLowerCase().replace(/rs\.?|inr|₹|\/-|per\s+(annum|year|month)|p\.?a\.?/g, '').replace(/,/g, '').trim();
  const m = s.match(/^(-?\d+(?:\.\d+)?)\s*(lakhs?|lacs?|l|crores?|cr|k|thousand)?$/);
  if (!m) return null;
  const n = Number(m[1]);
  const unit = m[2] ?? '';
  if (/^(lakh|lac|l)/.test(unit)) return Math.round(n * 100_000);
  if (/^(crore|cr)/.test(unit)) return Math.round(n * 10_000_000);
  if (unit === 'k' || unit === 'thousand') return Math.round(n * 1000);
  return n;
}

const FIELD_SYNONYMS = {
  income: 'annual_family_income_inr', family_income: 'annual_family_income_inr', annual_income: 'annual_family_income_inr',
  annual_family_income: 'annual_family_income_inr', parental_income: 'annual_family_income_inr', household_income: 'annual_family_income_inr',
  caste: 'category', social_category: 'category', marks: 'last_exam_percent', percentage: 'last_exam_percent',
  min_marks: 'last_exam_percent', education: 'education_level', qualification: 'education_level', course_level: 'education_level',
  sex: 'gender', domicile: 'state', residence: 'state', pwd: 'disability', disabled: 'disability', profession: 'occupation',
};
const OPERATOR_SYNONYMS = {
  '<=': 'lte', '<': 'lte', max: 'lte', maximum: 'lte', 'up to': 'lte', upto: 'lte', 'at most': 'lte', 'less than': 'lte', lt: 'lte',
  '>=': 'gte', '>': 'gte', min: 'gte', minimum: 'gte', 'at least': 'gte', 'more than': 'gte', gt: 'gte',
  '=': 'eq', '==': 'eq', equals: 'eq', is: 'eq', 'one of': 'in', any: 'in', 'not in': 'not_in', excluding: 'not_in', range: 'between',
};
const CATEGORY_SYNONYMS = { 'scheduled caste': 'sc', 'scheduled tribe': 'st', 'other backward class': 'obc', 'other backward classes': 'obc', 'economically weaker section': 'ews', gen: 'general', unreserved: 'general', ur: 'general', 'obc-ncl': 'obc' };
const EDUCATION_SYNONYMS = {
  undergraduate: 'ug', graduation: 'ug', graduate: 'ug', degree: 'ug', bachelor: 'ug', 'b.tech': 'ug', btech: 'ug', 'b.a': 'ug', 'b.sc': 'ug', 'b.com': 'ug',
  postgraduate: 'pg', 'post graduation': 'pg', masters: 'pg', master: 'pg', 'm.tech': 'pg', mtech: 'pg', 'm.a': 'pg', 'm.sc': 'pg', mba: 'pg',
  doctorate: 'phd', 'ph.d': 'phd', 'ph.d.': 'phd', polytechnic: 'diploma', iti: 'diploma',
  'class 10': 'school', 'class 12': 'school', matric: 'school', 'post-matric': 'school', 'pre-matric': 'school', 'secondary': 'school', 'higher secondary': 'school', intermediate: 'school',
};
const OCCUPATION_SYNONYMS = { labourer: 'worker', labour: 'worker', 'daily wage': 'worker', employee: 'worker', 'self-employed': 'self_employed', business: 'self_employed', cultivator: 'farmer', agriculturist: 'farmer' };

function mapEnum(value, allowed, synonyms) {
  const v = String(value).trim().toLowerCase();
  if (allowed.includes(v)) return v;
  if (synonyms[v]) return synonyms[v];
  const key = Object.keys(synonyms).find((k) => v.includes(k));
  return key ? synonyms[key] : v;
}

const ENUM_FIELDS = { category: [CATEGORIES, CATEGORY_SYNONYMS], education_level: [EDUCATION_LEVELS, EDUCATION_SYNONYMS], occupation: [OCCUPATIONS, OCCUPATION_SYNONYMS] };
const NUMERIC_FIELDS = new Set(['age', 'annual_family_income_inr', 'last_exam_percent']);

const toPage = (v) => {
  const n = typeof v === 'string' ? Number.parseInt(v, 10) : v;
  return Number.isInteger(n) && n >= 1 ? n : null;
};
const toQuote = (v) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, 300) : null);

export function cleanRule(raw) {
  if (!raw || typeof raw !== 'object') return raw;
  const fieldRaw = String(raw.field ?? '').trim().toLowerCase().replace(/\s+/g, '_');
  const field = CITIZEN_FIELDS.includes(fieldRaw) ? fieldRaw : FIELD_SYNONYMS[fieldRaw] ?? fieldRaw;
  const opRaw = String(raw.operator ?? '').trim().toLowerCase();
  const operator = CONDITION_OPERATORS.includes(opRaw) ? opRaw : OPERATOR_SYNONYMS[opRaw] ?? opRaw;

  let value = raw.value;
  const cleanOne = (v) => {
    if (NUMERIC_FIELDS.has(field)) return readRupees(typeof v === 'string' ? v.replace(/%|years?|yrs?/gi, '') : v) ?? v;
    if (ENUM_FIELDS[field]) return mapEnum(v, ...ENUM_FIELDS[field]);
    if (field === 'disability' || field === 'gender') return typeof v === 'string' ? v.trim().toLowerCase() : v;
    return str(v);
  };
  if (['in', 'not_in', 'between'].includes(operator)) {
    const list = Array.isArray(value) ? value : String(value ?? '').split(/,|\/|\bor\b|\band\b|–|-(?=\s*\d)/i).map((x) => x.trim()).filter(Boolean);
    value = [...new Set(list.map(cleanOne))];
  } else {
    value = Array.isArray(value) && value.length === 1 ? cleanOne(value[0]) : cleanOne(value);
  }
  if (field === 'disability' && typeof value === 'string') value = ['yes', 'true', '1'].includes(value);

  const ruleId = String(raw.rule_id ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') ||
    `${field}_${operator === 'lte' ? 'max' : operator === 'gte' ? 'min' : operator}`;

  return {
    rule_id: ruleId,
    field,
    operator,
    value,
    unit: typeof raw.unit === 'string' && raw.unit.trim() ? raw.unit.trim() : field === 'annual_family_income_inr' ? 'INR_per_year' : null,
    description: str(raw.description) || `${field} ${operator} ${Array.isArray(value) ? value.join(', ') : value}`,
    page: toPage(raw.page),
    quote: toQuote(raw.quote),
  };
}

const FREQUENCIES = { yearly: 'annual', 'per annum': 'annual', annually: 'annual', 'per year': 'annual', 'per month': 'monthly', month: 'monthly', once: 'one_time', 'one time': 'one_time', 'one-time': 'one_time', lumpsum: 'one_time', 'lump sum': 'one_time' };

export function cleanBenefit(raw) {
  if (!raw || typeof raw !== 'object') return raw;
  const f = String(raw.frequency ?? 'other').trim().toLowerCase();
  return {
    description: str(raw.description),
    amount_inr: raw.amount_inr === null || raw.amount_inr === undefined || raw.amount_inr === '' ? null : readRupees(raw.amount_inr),
    frequency: ['one_time', 'monthly', 'annual', 'other'].includes(f) ? f : FREQUENCIES[f] ?? 'other',
    page: toPage(raw.page),
    quote: toQuote(raw.quote),
  };
}

export const cleanDeadline = (raw) => (raw && typeof raw === 'object'
  ? { description: str(raw.description), date: readDate(raw.date), page: toPage(raw.page), quote: toQuote(raw.quote) }
  : raw);
export const cleanRequiredDocument = (raw) => (raw && typeof raw === 'object'
  ? { name: str(raw.name), page: toPage(raw.page), quote: toQuote(raw.quote) }
  : typeof raw === 'string' ? { name: raw.trim(), page: null, quote: null } : raw);
export const cleanStep = (raw, index) => (raw && typeof raw === 'object'
  ? { order: Number.isInteger(raw.order) && raw.order > 0 ? raw.order : index + 1, text: str(raw.text), page: toPage(raw.page), quote: toQuote(raw.quote) }
  : raw);

export function cleanSchemeHeader(raw = {}) {
  const level = String(raw.level ?? '').trim().toLowerCase();
  const url = typeof raw.apply_url === 'string' && /^https?:\/\//i.test(raw.apply_url.trim()) ? raw.apply_url.trim() : null;
  return {
    name: str(raw.name) || '',
    department: str(raw.department) || null,
    level: level === 'central' || level === 'state' ? level : null,
    state: str(raw.state) || null,
    version_label: str(raw.version_label) || null,
    publication_date: readDate(raw.publication_date),
    effective_date: readDate(raw.effective_date),
    apply_url: url,
  };
}
