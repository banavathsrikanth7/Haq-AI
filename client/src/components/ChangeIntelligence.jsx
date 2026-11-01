// Feature 1 — Policy Change Intelligence: every revision between two notifications, before → now, with pages.
// Feature 4 — Policy Impact Analyzer: who gains or loses from those revisions, and by how many rupees.
import { useMemo, useState } from 'react';

import Icon from './Icon.jsx';
import { ErrorBanner, SourceChip, Spinner } from './Shell.jsx';
import { notificationLabel, rupees } from '../lib/schemeMath.js';
import { t } from '../lib/i18n.js';

const TYPE = { added: { tone: 'green', icon: 'sparkle' }, removed: { tone: 'red', icon: 'cross' }, modified: { tone: 'amber', icon: 'edit' } };
const VERDICT = { eligible: 'green', not_eligible: 'red', need_more_info: 'amber', rule_not_verified: 'grey' };
const SHORT = { eligible: 'Eligible', not_eligible: 'Not eligible', need_more_info: 'Need info', rule_not_verified: 'No rules' };

function ChangeCard({ lang, c, oldHref, newHref, delay }) {
  const meta = TYPE[c.change_type];
  const numeric = typeof c.old_value === 'number' && typeof c.new_value === 'number';
  const max = numeric ? Math.max(c.old_value, c.new_value) || 1 : 1;
  return (
    <article className={`change-card card lift is-${meta.tone}`} style={{ animationDelay: `${delay}ms` }}>
      <header>
        <span className={`badge ${meta.tone}`}><Icon name={meta.icon} size={12} /> {t(lang, c.change_type)}</span>
        <span className="change-cat">{c.category}</span>
        {c.change_pct !== null ? <span className={`delta ${c.change_pct >= 0 ? 'up' : 'down'}`}>{c.change_pct > 0 ? '▲ +' : '▼ '}{c.change_pct.toFixed(1)}%</span> : null}
      </header>
      <h4>{c.label}</h4>
      <div className="before-after">
        <div className={`ba old${c.change_type === 'added' ? ' is-empty' : ''}`}>
          <small>{t(lang, 'before')}</small>
          <p>{c.old_display}</p>
          {c.old_citation ? <SourceChip lang={lang} page={c.old_citation.page} quote={c.old_citation.quote} href={oldHref} /> : null}
        </div>
        <span className="ba-arrow"><Icon name="arrowRight" size={18} /></span>
        <div className={`ba new${c.change_type === 'removed' ? ' is-empty' : ''}`}>
          <small>{t(lang, 'after')}</small>
          <p>{c.new_display}</p>
          {c.new_citation ? <SourceChip lang={lang} page={c.new_citation.page} quote={c.new_citation.quote} href={newHref} /> : null}
        </div>
      </div>
      {numeric ? (
        <div className="compare-bars" aria-hidden="true">
          <span className="cb old" style={{ width: `${(c.old_value / max) * 100}%` }} />
          <span className="cb new" style={{ width: `${(c.new_value / max) * 100}%` }} />
        </div>
      ) : null}
    </article>
  );
}

function money(lang, value) {
  if (!value) return null;
  return [value.yearly ? `${rupees(value.yearly)} ${t(lang, 'perYear')}` : null, value.one_time ? `${rupees(value.one_time)} ${t(lang, 'oneTime')}` : null].filter(Boolean).join(' + ') || '₹0';
}

function ImpactCard({ lang, p }) {
  const gain = p.yearly_gain;
  return (
    <article className={`impact-card card${p.is_user ? ' is-user' : ''}`}>
      <div className="impact-top">
        <span className="impact-avatar">{p.is_user ? <Icon name="userCheck" size={18} /> : p.label.charAt(0)}</span>
        <div>
          <b>{p.is_user ? t(lang, 'you') : p.label}</b>
          {p.illustrative ? <small>{t(lang, 'illustrative')}</small> : null}
        </div>
        {gain !== null && gain !== 0 ? <span className={`gain ${gain > 0 ? 'up' : 'down'}`}>{gain > 0 ? '+' : '−'}{rupees(Math.abs(gain))}<small> {t(lang, 'perYear')}</small></span> : null}
      </div>
      <div className="verdict-flow">
        <span className={`badge ${VERDICT[p.old_verdict]}`}>{SHORT[p.old_verdict]}</span>
        <Icon name="arrowRight" size={16} />
        <span className={`badge ${VERDICT[p.new_verdict]}`}>{SHORT[p.new_verdict]}</span>
      </div>
      <dl className="impact-money">
        <div><dt>{t(lang, 'wasGetting')}</dt><dd>{money(lang, p.benefit_before) ?? t(lang, 'unknownAmount')}</dd></div>
        <div><dt>{t(lang, 'nowGets')}</dt><dd>{money(lang, p.benefit_after) ?? t(lang, 'unknownAmount')}</dd></div>
      </dl>
      <p className="impact-meaning">{p.what_it_means}</p>
      {p.reasons.length ? (
        <ul className="impact-reasons">
          {p.reasons.map((r, j) => <li key={j}><span className="muted">{r.old_text}</span> → <b>{r.new_text}</b></li>)}
        </ul>
      ) : null}
    </article>
  );
}

export default function ChangeIntelligence({ lang, documents, oldId, newId, onPick, result, impact, loading, error, hrefFor, onAdd }) {
  const [filter, setFilter] = useState('all');
  const shown = useMemo(() => (result?.revisions ?? []).filter((c) => filter === 'all' || c.change_type === filter), [result, filter]);

  if (documents.length < 2) {
    return (
      <div className="empty-state card">
        <span className="empty-art"><Icon name="compare" size={30} /></span>
        <p>{t(lang, 'needTwo')}</p>
        <button type="button" className="btn btn-primary" onClick={onAdd}><Icon name="upload" size={16} /> {t(lang, 'needTwoCta')}</button>
      </div>
    );
  }

  return (
    <>
      <div className="version-picker card">
        <label>
          <small>{t(lang, 'oldV')}</small>
          <select value={oldId ?? ''} onChange={(e) => onPick(e.target.value, newId)}>
            {documents.map((d) => <option key={d.doc_id} value={d.doc_id} disabled={d.doc_id === newId}>{notificationLabel(d)}</option>)}
          </select>
        </label>
        <button type="button" className="swap-btn" onClick={() => onPick(newId, oldId)} aria-label="Swap versions"><Icon name="compare" size={18} /></button>
        <label>
          <small>{t(lang, 'newV')}</small>
          <select value={newId ?? ''} onChange={(e) => onPick(oldId, e.target.value)}>
            {documents.map((d) => <option key={d.doc_id} value={d.doc_id} disabled={d.doc_id === oldId}>{notificationLabel(d)}</option>)}
          </select>
        </label>
      </div>

      <ErrorBanner message={error} />
      {loading ? <div className="loading-row"><Spinner /> …</div> : null}

      {result && !loading ? (
        <>
          {!result.same_scheme ? <div className="banner is-warn"><Icon name="alert" size={18} /><p>{t(lang, 'differentSchemes')}</p></div> : null}
          <div className="filter-row">
            <div className="segmented" role="tablist">
              {['all', 'modified', 'added', 'removed'].map((f) => (
                <button key={f} type="button" role="tab" aria-selected={filter === f} className={filter === f ? 'is-active' : ''} onClick={() => setFilter(f)}>
                  {t(lang, f)} <span className="count">{f === 'all' ? result.revisions.length : result.tally[f]}</span>
                </button>
              ))}
            </div>
            <span className="muted small-text">{result.older_label} → {result.newer_label}</span>
          </div>
          {shown.length === 0 ? <p className="empty">{t(lang, 'noDiff')}</p> : (
            <div className="change-grid">
              {shown.map((c, i) => <ChangeCard key={`${c.category}-${c.key}`} lang={lang} c={c} oldHref={hrefFor(result.older_id)} newHref={hrefFor(result.newer_id)} delay={i * 60} />)}
            </div>
          )}
        </>
      ) : null}

      {impact && !loading ? (
        <div className="impact">
          <div className="impact-heading">
            <h3 className="sub-title"><Icon name="wallet" size={18} /> {t(lang, 'impactTitle')}</h3>
            <span className="pill">{t(lang, 'impactSummary2', impact.summary.groups_gain, impact.summary.groups_lose)}</span>
          </div>
          <p className="muted small-text">{t(lang, 'impactSub')}</p>
          <div className="impact-grid">
            {impact.profiles.map((p, i) => <ImpactCard key={`you-${i}`} lang={lang} p={p} />)}
            {impact.profiles.length === 0 ? <p className="impact-hint card">{t(lang, 'impactYouHint')}</p> : null}
          </div>
          <h4 className="groups-title">{t(lang, 'groupsTitle')}</h4>
          {impact.groups.length === 0 ? <p className="empty small">{t(lang, 'noGroups')}</p> : (
            <ul className="group-list">
              {impact.groups.map((g, i) => (
                <li key={i} className={`group-row is-${g.direction}`}>
                  <span className={`badge ${g.direction === 'gain' ? 'green' : g.direction === 'lose' ? 'red' : 'amber'}`}>
                    {t(lang, g.direction === 'gain' ? 'groupGain' : g.direction === 'lose' ? 'groupLose' : 'groupChanged')}
                  </span>
                  <div><b>{g.who}</b><small>{g.why}</small></div>
                  {g.page ? <SourceChip lang={lang} page={g.page} quote={null} href={result ? hrefFor(result.newer_id) : null} /> : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </>
  );
}
