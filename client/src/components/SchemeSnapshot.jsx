// "Your scheme at a glance": metric tiles, who can apply, what you get, important dates.
import Icon from './Icon.jsx';
import { ErrorBanner, SourceChip, Spinner } from './Shell.jsx';
import SpokenSummary from './SpokenSummary.jsx';
import { daysBetween, formatDate, rupees, todayIso } from '../lib/schemeMath.js';
import { useCountUp } from '../lib/hooks.js';
import { t } from '../lib/i18n.js';

const FIELD_META = {
  annual_family_income_inr: { letter: '₹', tone: 'violet' }, age: { letter: 'A', tone: 'blue' }, category: { letter: 'C', tone: 'amber' },
  education_level: { letter: 'E', tone: 'green' }, state: { letter: 'S', tone: 'rose' }, gender: { letter: 'G', tone: 'teal' },
  occupation: { letter: 'O', tone: 'amber' }, last_exam_percent: { letter: '%', tone: 'rose' }, course: { letter: 'C', tone: 'blue' },
  institution_type: { letter: 'I', tone: 'teal' }, disability: { letter: 'D', tone: 'violet' },
};

const OP_WORD = { lte: 'up to', gte: 'at least', eq: 'must be', in: 'one of', not_in: 'not', between: 'between' };
function ruleValue(rule) {
  const money = rule.field === 'annual_family_income_inr';
  const fmt = (v) => (typeof v === 'number' ? (money ? rupees(v) : v.toLocaleString('en-IN')) : String(v).toUpperCase().length <= 4 ? String(v).toUpperCase() : String(v));
  if (rule.operator === 'between' && Array.isArray(rule.value)) return `${OP_WORD.between} ${fmt(rule.value[0])} – ${fmt(rule.value[1])}`;
  if (Array.isArray(rule.value)) return `${OP_WORD[rule.operator]} ${rule.value.map(fmt).join(', ')}`;
  if (typeof rule.value === 'boolean') return rule.value ? 'required' : 'not required';
  return `${OP_WORD[rule.operator]} ${fmt(rule.value)}${rule.unit === 'years' ? ' years' : rule.unit === 'percent' ? '%' : ''}`;
}

function Tile({ icon, tone, label, value, display, sub }) {
  const counted = useCountUp(typeof value === 'number' ? value : null);
  return (
    <article className="tile card lift">
      <span className={`tile-icon tone-${tone}`}><Icon name={icon} size={20} /></span>
      <p className="tile-label">{label}</p>
      <p className="tile-value">{display ? display(counted) : value ?? '—'}</p>
      <p className="tile-sub" title={sub}>{sub}</p>
    </article>
  );
}

const fieldName = (lang, field) => { const name = t(lang, `field_${field}`); return name === `field_${field}` ? field.replaceAll('_', ' ') : name; };
const plain = (text) => ({ rule: (r) => r.description, benefit: (b) => b.description, right: (r) => r.text, deadline: (d) => d.description, document: (d) => d.name, note: (n) => n })[text];

export function SchemeSnapshot({ lang, doc, hrefFor, onSummary, onSpeak, voiceOn, reader, tx, onRetryTx }) {
  const say = reader ?? { on: false, rule: plain('rule'), benefit: plain('benefit'), right: plain('right'), deadline: plain('deadline'), document: plain('document'), note: plain('note') };
  const today = todayIso();
  const href = hrefFor(doc.doc_id);
  const biggest = [...doc.benefits].filter((b) => b.amount_inr !== null).sort((a, b) => b.amount_inr - a.amount_inr)[0] ?? null;
  const upcoming = doc.deadlines.filter((d) => d.date && d.date >= today).sort((a, b) => a.date.localeCompare(b.date))[0] ?? null;
  const maxBenefit = Math.max(0, ...doc.benefits.map((b) => b.amount_inr ?? 0));

  return (
    <>
      <div className="scheme-hero card">
        <div className="scheme-hero-main">
          <span className="scheme-avatar">{doc.scheme.name.charAt(0)}</span>
          <div>
            <h3>{doc.scheme.name}</h3>
            <p className="muted">{[doc.scheme.department, doc.scheme.level === 'state' ? doc.scheme.state : doc.scheme.level && 'Central scheme', doc.scheme.version_label, doc.scheme.publication_date && formatDate(doc.scheme.publication_date)].filter(Boolean).join(' · ')}</p>
          </div>
        </div>
        {href ? <a className="btn btn-ghost" href={href} target="_blank" rel="noopener noreferrer"><Icon name="file" size={16} /> {doc.source_name}</a> : <span className="pill">{doc.source_name}</span>}
      </div>

      {tx?.busy ? <p className="muted small-text tx-status"><Spinner small /> {t(lang, 'clausesTranslating')}</p> : null}
      {tx?.problem ? (
        <div className="tx-status"><ErrorBanner message={`${t(lang, 'clausesFailed')} (${tx.problem})`} /><button type="button" className="btn btn-soft small" onClick={onRetryTx}>{t(lang, 'tryAgainBtn')}</button></div>
      ) : null}

      {onSummary ? <SpokenSummary lang={lang} doc={doc} onSummary={onSummary} onSpeak={onSpeak} voiceOn={voiceOn} /> : null}

      <div className="tiles">
        <Tile icon="list" tone="violet" label={t(lang, 'mRules')} value={doc.rules.length} display={(v) => v} sub={doc.rules.map((r) => fieldName(lang, r.field)).slice(0, 3).join(' · ') || t(lang, 'none')} />
        <Tile icon="wallet" tone="green" label={t(lang, 'mBenefit')} value={biggest?.amount_inr ?? null} display={biggest ? (v) => rupees(v) : null} sub={biggest ? (say.on ? say.benefit(biggest, doc.benefits.indexOf(biggest)) : `${biggest.description} · ${t(lang, `freq_${biggest.frequency}`)}`) : t(lang, 'notStated')} />
        <Tile icon="calendar" tone="amber" label={t(lang, 'mDeadline')} value={upcoming ? formatDate(upcoming.date) : '—'} sub={upcoming ? t(lang, 'daysLeft', daysBetween(today, upcoming.date)) : t(lang, 'notStated')} />
        <Tile icon="file" tone="blue" label={t(lang, 'mDocs')} value={doc.required_documents.length} display={(v) => v} sub={doc.required_documents.slice(0, 2).map((d, i) => say.document(d, i)).join(' · ') || t(lang, 'notStated')} />
      </div>

      <div className="overview-grid">
        <article className="card panel">
          <h3 className="panel-title"><Icon name="userCheck" size={18} /> {t(lang, 'rulesTitle')}</h3>
          {doc.rules.length === 0 ? <p className="empty small">{t(lang, 'noRulesDoc')}</p> : (
            <ul className="rule-list">
              {doc.rules.map((rule) => {
                const meta = FIELD_META[rule.field] ?? { letter: '•', tone: 'blue' };
                return (
                  <li key={rule.rule_id} className="rule-row">
                    <span className={`letter tone-${meta.tone}`}>{meta.letter}</span>
                    <div className="rule-body">
                      <p className="rule-desc">{say.rule(rule)}</p>
                      <p className="rule-value">{fieldName(lang, rule.field)}{say.on ? null : <> · <b>{ruleValue(rule)}</b></>}</p>
                    </div>
                    <SourceChip lang={lang} page={rule.page} quote={rule.quote} href={href} />
                  </li>
                );
              })}
            </ul>
          )}
        </article>

        <div className="stack">
          <article className="card panel">
            <h3 className="panel-title"><Icon name="wallet" size={18} /> {t(lang, 'benefitsTitle')}</h3>
            {doc.benefits.length === 0 ? <p className="empty small">{t(lang, 'notStated')}</p> : (
              <ul className="benefit-list">
                {doc.benefits.map((b, i) => (
                  <li key={i}>
                    <div className="benefit-line"><span>{say.benefit(b, i)}</span><b>{b.amount_inr !== null ? rupees(b.amount_inr) : '—'}</b></div>
                    <div className="bar"><span style={{ width: `${maxBenefit && b.amount_inr ? Math.max(6, (b.amount_inr / maxBenefit) * 100) : 0}%` }} /></div>
                    <p className="benefit-meta">{t(lang, `freq_${b.frequency}`)} <SourceChip lang={lang} page={b.page} quote={b.quote} href={href} /></p>
                  </li>
                ))}
              </ul>
            )}
          </article>

          {doc.rights?.length ? (
            <article className="card panel">
              <h3 className="panel-title"><Icon name="shield" size={18} /> {t(lang, 'rightsTitle')}</h3>
              <ul className="rights-list">
                {doc.rights.map((r, i) => (
                  <li key={i}><Icon name="check" size={14} strokeWidth={2.6} /><p>{say.right(r, i)}</p><SourceChip lang={lang} page={r.page} quote={r.quote} href={href} /></li>
                ))}
              </ul>
            </article>
          ) : null}

          <article className="card panel">
            <h3 className="panel-title"><Icon name="calendar" size={18} /> {t(lang, 'deadlinesTitle')}</h3>
            {doc.deadlines.length === 0 ? <p className="empty small">{t(lang, 'noDeadline')}</p> : (
              <ol className="timeline">
                {doc.deadlines.map((d, i) => {
                  const past = d.date && d.date < today;
                  return (
                    <li key={i} className={past ? 'is-past' : ''}>
                      <span className="tl-dot" />
                      <div><b>{d.date ? formatDate(d.date) : t(lang, 'notStated')}</b><p>{say.deadline(d, i)}</p></div>
                      <SourceChip lang={lang} page={d.page} quote={d.quote} href={href} />
                    </li>
                  );
                })}
              </ol>
            )}
          </article>
        </div>
      </div>

      {doc.notes.length ? (
        <details className="notes standalone">
          <summary><Icon name="alert" size={15} /> {t(lang, 'notesTitle')} ({doc.notes.length})</summary>
          <ul>{doc.notes.map((n, i) => <li key={i}>{say.note(n, i)}</li>)}</ul>
        </details>
      ) : null}
    </>
  );
}
