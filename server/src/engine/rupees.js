// Rupee formatting and arithmetic for scheme amounts. Every number the citizen sees
// is computed here in code; Gemini never does arithmetic for Haq AI.

/** 250000 → "2,50,000" (lakh/crore grouping used on Indian government documents). */
export function lakhGrouping(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value);
  const [whole, paise] = (Number.isInteger(n) ? String(Math.abs(n)) : Math.abs(n).toFixed(2)).split('.');
  let grouped = whole;
  if (whole.length > 3) grouped = `${whole.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${whole.slice(-3)}`;
  return `${n < 0 ? '-' : ''}${grouped}${paise ? `.${paise}` : ''}`;
}

export const rupees = (value) => (value === null || value === undefined ? '—' : `₹${lakhGrouping(value)}`);

/** Percentage change between two scheme values, 1 decimal; null when it cannot be computed. */
export function percentChange(before, after) {
  if (typeof before !== 'number' || typeof after !== 'number' || before === 0) return null;
  return Math.round(((after - before) / before) * 1000) / 10;
}
