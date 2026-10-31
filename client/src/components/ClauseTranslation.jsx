// Clauses in Telugu or Hindi without losing legal conditions. The server keeps the original wording
// for any clause whose numbers changed in translation; each clause keeps its page.
import { useEffect, useState } from 'react';

import Icon from './Icon.jsx';
import { ErrorBanner, SourceChip, Spinner } from './Shell.jsx';
import { LANGS, t } from '../lib/i18n.js';

const SECTION_ICON = { rules: 'userCheck', benefits: 'wallet', deadlines: 'calendar', documents: 'file', steps: 'list', notes: 'alert' };

export default function ClauseTranslation({ lang, doc, href, onTranslate }) {
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');
  const [showOriginal, setShowOriginal] = useState(false);
  useEffect(() => { setResult(null); setProblem(''); }, [doc.doc_id, lang]);
  if (lang === 'en') return null;
  const name = LANGS.find((l) => l.code === lang)?.label;

  async function translate() {
    setBusy(true);
    setProblem('');
    try { setResult(await onTranslate(doc, lang)); } catch (error) { setProblem(error.message); } finally { setBusy(false); }
  }

  return (
    <article className="card panel clause-translation">
      <div className="panel-title-row">
        <h3 className="panel-title"><Icon name="globe" size={18} /> {t(lang, 'translateTo', name)}</h3>
        {result ? (
          <label className="switch"><input type="checkbox" checked={showOriginal} onChange={() => setShowOriginal(!showOriginal)} /> {t(lang, 'showOriginal')}</label>
        ) : (
          <button type="button" className="btn btn-soft" onClick={translate} disabled={busy}>{busy ? <Spinner small /> : <Icon name="globe" size={16} />} {busy ? t(lang, 'translating') : name}</button>
        )}
      </div>
      <ErrorBanner message={problem} />
      {result ? (
        <>
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
        </>
      ) : null}
    </article>
  );
}
