// Where a citizen applies. Order of trust:
//   1. the portal printed in the notification itself;
//   2. Haq AI's short list of official portals, checked by the team (matched on scheme name and state);
//   3. otherwise the Government of India's myScheme search, with the scheme name to search for.
// Haq AI never builds or guesses a portal address from the scheme name.

export const VERIFIED_PORTALS = [
  { match: /pm[\s-]?kisan|kisan\s+samman\s+nidhi/i, url: 'https://pmkisan.gov.in/', name: 'PM-KISAN portal (Government of India)' },
  { match: /ntr\s+bharosa|pension\s+kanuka|social\s+security\s+pension/i, state: /andhra/i, url: 'https://sspensions.ap.gov.in/', name: 'AP Social Security Pensions portal' },
  { match: /vidya\s+deevena|vasathi\s+deevena|post[\s-]?matric|fee\s+reimbursement/i, state: /andhra/i, url: 'https://jnanabhumi.ap.gov.in/', name: 'Jnanabhumi scholarship portal (Government of Andhra Pradesh)' },
  { match: /national\s+scholarship|\bnsp\b|pm[\s-]?usp/i, url: 'https://scholarships.gov.in/', name: 'National Scholarship Portal (Government of India)' },
];

export const MYSCHEME_SEARCH = 'https://www.myscheme.gov.in/search';

/** { url, name, source: 'notification' | 'verified_list' | 'search', search_for? } */
export function officialPortal(doc) {
  const { name = '', state = '', department = '', apply_url: printed } = doc.scheme ?? {};
  if (printed) {
    let host = printed;
    try { host = new URL(printed).hostname; } catch { /* keep the printed text */ }
    return { url: printed, name: host, source: 'notification' };
  }
  const where = `${state ?? ''} ${department ?? ''} ${name}`;
  const known = VERIFIED_PORTALS.find((p) => p.match.test(name) && (!p.state || p.state.test(where)));
  if (known) return { url: known.url, name: known.name, source: 'verified_list' };
  return { url: MYSCHEME_SEARCH, name: 'myScheme (Government of India)', source: 'search', search_for: name };
}
