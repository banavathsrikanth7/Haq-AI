// Clauses in Telugu or Hindi without losing legal conditions. The server keeps the original wording
// for any clause whose numbers changed in translation; each clause keeps its page.
import { useState } from 'react';

import Icon from './Icon.jsx';
import { SourceChip } from './Shell.jsx';
import { LANGS, t } from '../lib/i18n.js';

const SECTION_ICON = { rules: 'userCheck', rights: 'shield', benefits: 'wallet', deadlines: 'calendar', documents: 'file', steps: 'list', notes: 'alert' };

export default function ClauseTranslation({ lang, href, tx }) {
  const [showOriginal, setShowOriginal] = useState(false);
  const result = tx?.result;
  if (lang === 'en' || !result) return null;
  const name = LANGS.find((l) => l.code === lang)?.label;

  // The whole notification, clause by clause, with the switch back to the original wording.
  return (
    <details className="card panel clause-translation">
      <summary className="panel-title-row">
        <h3 className="panel-title"><Icon name="globe" size={18} /> {t(lang, 'translateTo', name)}</h3>
      </summary>
      <label className="switch"><input type="checkbox" checked={showOriginal} onChange={() => setShowOriginal(!showOriginal)} /> {t(lang, 'showOriginal')}</label>
      <p className="muted small-text"><Icon name="shield" size={13} /> {result.kept_original ? t(lang, 'translatedNote', result.kept_original) : t(lang, 'translatedOk')}</p>
      <ul className="clause-list">
        {result.clauses.map((c) => (
          <li key={c.id} className={c.kept_original ? 'is-kept' : ''}>
            <span className="clause-icon"><Icon name={SECTION_ICON[c.section] ?? 'list'} size={14} /></span>
            <div>
              <p>{showOriginal ? c.original : c.translated}</p>
              {c.kept_original ? <small className="kept">{t(lang, 'keptOriginal')}</small> : null}
            </div>
            {c.page ? <SourceChip lang={lang} page={c.page} quote={c.quote} href={href} /> : null}
          </li>
        ))}
      </ul>
    </details>
  );
}
