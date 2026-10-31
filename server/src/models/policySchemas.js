// Shapes of a scheme notification and a citizen in Haq AI.
// Every clause Gemini reads is checked against these before Haq AI uses it,
// and every request from the browser is checked here too.

import { z } from 'zod';

export const CITIZEN_FIELDS = [
  'age', 'state', 'annual_family_income_inr', 'category', 'gender', 'education_level',
  'course', 'institution_type', 'occupation', 'disability', 'last_exam_percent',
];
export const CONDITION_OPERATORS = ['lte', 'gte', 'eq', 'in', 'not_in', 'between'];
export const CATEGORIES = ['general', 'obc', 'sc', 'st', 'ews'];
export const EDUCATION_LEVELS = ['school', 'diploma', 'ug', 'pg', 'phd', 'none'];
export const OCCUPATIONS = ['student', 'farmer', 'worker', 'self_employed', 'unemployed', 'other'];
export const LANGUAGES = ['en', 'te', 'hi'];

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'must be YYYY-MM-DD');
const page = z.number().int().min(1).nullable();
const quote = z.string().max(300).nullable();
const scalar = z.union([z.number(), z.string().min(1), z.boolean()]);

export const EligibilityClause = z.object({
  rule_id: z.string().min(1).max(80),
  field: z.enum(CITIZEN_FIELDS),
  operator: z.enum(CONDITION_OPERATORS),
  value: z.union([scalar, z.array(z.union([z.number(), z.string().min(1)])).min(1)]),
  unit: z.string().max(40).nullable(),
  description: z.string().min(1).max(400),
  page,
  quote,
}).superRefine((rule, ctx) => {
  if (rule.operator === 'between' && !(Array.isArray(rule.value) && rule.value.length === 2)) {
    ctx.addIssue({ code: 'custom', message: '"between" needs [min, max]', path: ['value'] });
  }
  if (['lte', 'gte'].includes(rule.operator) && typeof rule.value !== 'number') {
    ctx.addIssue({ code: 'custom', message: `"${rule.operator}" needs a number`, path: ['value'] });
  }
});

export const BenefitClause = z.object({
  description: z.string().min(1).max(300),
  amount_inr: z.number().nonnegative().nullable(),
  frequency: z.enum(['one_time', 'monthly', 'annual', 'other']),
  page,
  quote,
});

export const DeadlineClause = z.object({ description: z.string().min(1).max(300), date: isoDate.nullable(), page, quote });
export const RequiredDocumentClause = z.object({ name: z.string().min(1).max(200), page, quote });
export const ApplicationStepClause = z.object({ order: z.number().int().min(1), text: z.string().min(1).max(500), page, quote });

export const SchemeHeader = z.object({
  name: z.string().min(1).max(200),
  department: z.string().max(200).nullable(),
  level: z.enum(['central', 'state']).nullable(),
  state: z.string().max(60).nullable(),
  version_label: z.string().max(120).nullable(),
  publication_date: isoDate.nullable(),
  effective_date: isoDate.nullable(),
  apply_url: z.string().url().nullable(),
});

// Outer shape of what Gemini returns after reading a notification; each clause is checked separately.
export const GeminiReading = z.object({
  scheme: z.record(z.string(), z.unknown()),
  rules: z.array(z.unknown()),
  benefits: z.array(z.unknown()),
  deadlines: z.array(z.unknown()),
  required_documents: z.array(z.unknown()),
  application_steps: z.array(z.unknown()),
  notes: z.array(z.string()),
});

// A checked notification. The browser keeps it and sends it back for every calculation.
export const SchemeNotification = z.object({
  doc_id: z.string().min(1).max(64),
  source_name: z.string().max(200),
  scheme: SchemeHeader,
  rules: z.array(EligibilityClause),
  benefits: z.array(BenefitClause),
  deadlines: z.array(DeadlineClause),
  required_documents: z.array(RequiredDocumentClause),
  application_steps: z.array(ApplicationStepClause),
  notes: z.array(z.string()),
});

export const CitizenDetails = z.object({
  age: z.number().int().min(0, 'Age must be between 0 and 120.').max(120, 'Age must be between 0 and 120.').nullish(),
  state: z.string().max(60).nullish(),
  annual_family_income_inr: z.number().int().min(0, "Income can't be negative.").nullish(),
  category: z.enum(CATEGORIES).nullish(),
  gender: z.enum(['female', 'male', 'other']).nullish(),
  education_level: z.enum(EDUCATION_LEVELS).nullish(),
  course: z.string().max(100).nullish(),
  institution_type: z.enum(['government', 'private', 'other']).nullish(),
  occupation: z.enum(OCCUPATIONS).nullish(),
  disability: z.boolean().nullish(),
  last_exam_percent: z.number().min(0, 'Percentage must be between 0 and 100.').max(100, 'Percentage must be between 0 and 100.').nullish(),
}).strict();

const Language = z.enum(LANGUAGES, { message: 'Please choose English, Telugu or Hindi.' });
const TwoVersions = { older: SchemeNotification, newer: SchemeNotification };

export const ChangeRequest = z.object(TwoVersions);
export const EligibilityRequest = z.object({ notification: SchemeNotification, citizen: CitizenDetails.default({}) });
export const ImpactRequest = z.object({ ...TwoVersions, citizen: CitizenDetails.nullish() });
export const ActionPlanRequest = z.object({ notification: SchemeNotification, citizen: CitizenDetails.default({}) });
export const AskRequest = z.object({
  question: z.string().trim().min(1, 'Please type or say your question.').max(1000, 'Please keep your question under 1,000 characters.'),
  history: z.array(z.object({ role: z.enum(['citizen', 'haq']), text: z.string().max(4000) })).max(20).default([]),
  notifications: z.array(SchemeNotification).max(10).default([]),
  citizen: CitizenDetails.default({}),
  language: Language.default('en'),
});
export const TranslateRequest = z.object({ notification: SchemeNotification, language: z.enum(['te', 'hi'], { message: 'Translation is available in Telugu and Hindi.' }) });
export const SpeakRequest = z.object({ text: z.string().trim().min(1).max(1500), language: Language.default('en') });

/** First problem in a request, as one readable line, e.g. "profile.age: Age must be between 0 and 120." */
export function firstProblem(error) {
  const issue = error.issues?.[0];
  if (!issue) return 'Invalid input.';
  const where = issue.path?.length ? issue.path.join('.') : '';
  const custom = /^(Income|Age|Percentage|Please)/.test(issue.message);
  return custom ? issue.message : `${where ? `${where}: ` : ''}${issue.message}`;
}
