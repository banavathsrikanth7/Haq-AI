// SYNTHETIC test-only fixture "TEST-SCHOLARSHIP" (specs §10). Never used by the running app.

const cite = (page = 1) => ({ page, quote: 'test fixture' });

export function v1() {
  return {
    doc_id: 'fixture-v1',
    source_name: 'fixture-v1.pdf',
    scheme: {
      name: 'TEST-SCHOLARSHIP', department: 'Test Department', level: 'central', state: null,
      version_label: 'Fixture v1', publication_date: '2023-01-01', effective_date: null, apply_url: 'https://scholarships.gov.in/',
    },
    rules: [
      { rule_id: 'income_max', field: 'annual_family_income_inr', operator: 'lte', value: 250000, unit: 'INR_per_year', description: 'Family income up to the limit', ...cite() },
      { rule_id: 'age_max', field: 'age', operator: 'lte', value: 30, unit: 'years', description: 'Age limit', ...cite() },
      { rule_id: 'education_level', field: 'education_level', operator: 'in', value: ['ug', 'pg'], unit: null, description: 'Enrolled in UG or PG', ...cite() },
    ],
    benefits: [{ description: 'Annual scholarship', amount_inr: 10000, frequency: 'annual', ...cite() }],
    deadlines: [],
    required_documents: [{ name: 'Income certificate', ...cite() }, { name: 'Bonafide certificate', ...cite() }],
    application_steps: [],
    notes: [],
  };
}

export function v2() {
  return {
    ...v1(),
    doc_id: 'fixture-v2',
    source_name: 'fixture-v2.pdf',
    scheme: { ...v1().scheme, version_label: 'Fixture v2', publication_date: '2025-01-01' },
    rules: [
      { rule_id: 'income_max', field: 'annual_family_income_inr', operator: 'lte', value: 350000, unit: 'INR_per_year', description: 'Family income up to the limit', ...cite(2) },
      { rule_id: 'age_max', field: 'age', operator: 'lte', value: 30, unit: 'years', description: 'Age limit', ...cite() },
      { rule_id: 'education_level', field: 'education_level', operator: 'in', value: ['ug', 'pg', 'phd'], unit: null, description: 'Enrolled in UG, PG or PhD', ...cite() },
    ],
    benefits: [{ description: 'Annual  Scholarship ', amount_inr: 12000, frequency: 'annual', ...cite() }],
    required_documents: [...v1().required_documents, { name: 'Bank passbook', ...cite() }],
  };
}

/** What Gemini might return for the fixture before the clause cleaner runs. */
export function geminiReadingOfFixture() {
  return {
    scheme: { name: 'TEST-SCHOLARSHIP', department: 'Test Department', level: 'Central', version_label: 'Fixture v3', publication_date: '05/06/2026', apply_url: 'https://scholarships.gov.in/' },
    rules: [
      { rule_id: 'income_max', field: 'family income', operator: 'up to', value: '₹2.5 lakh', description: 'Family income up to ₹2.5 lakh', page: '2', quote: 'annual family income not exceeding Rs. 2.5 lakh' },
      { rule_id: 'category', field: 'caste', operator: 'one of', value: 'Scheduled Caste, OBC', description: 'SC or OBC students', page: 2, quote: null },
      { rule_id: 'broken', field: 'favourite_colour', operator: 'lte', value: 5, description: 'not a real field', page: 1 },
    ],
    benefits: [{ description: 'Tuition fee', amount_inr: 'Rs. 20,000/-', frequency: 'per annum', page: 3 }],
    deadlines: [{ description: 'Last date to apply', date: '31-12-2026', page: 4 }, { description: 'Bad date', date: '31/02/2026', page: 4 }],
    required_documents: ['Income certificate', { name: 'Caste certificate', page: 4 }],
    application_steps: [{ text: 'Register on the portal' }, { text: 'Upload documents', page: 5 }],
    notes: ['Domicile condition could not be structured.'],
  };
}
