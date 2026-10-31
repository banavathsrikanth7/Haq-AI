// Feature 5 — Citizen Action Agent: the ordered, dated plan built on the server from the verdict
// and the notification, a document checklist, the official portal and a calendar file for the dates.
import { useEffect, useState } from 'react';

import Icon from './Icon.jsx';
import ApplyPortal from './ApplyPortal.jsx';
import ListenButton from './ListenButton.jsx';
import { SourceChip } from './Shell.jsx';
import { actionPlanCalendar, formatDate } from '../lib/schemeMath.js';
import { t } from '../lib/i18n.js';

const KIND_ICON = {
  check: 'userCheck', confirm: 'help', blocked: 'cross', alternative: 'refresh', deadline_passed: 'alert',
  collect: 'file', step: 'list', submit: 'calendar', portal: 'external',
};

function downloadCalendar(schemeName, actions) {
  const blob = new Blob([actionPlanCalendar(schemeName, actions)], { type: 'text/calendar' });
  const url = URL.createObjectURL(blob);
  const link = Object.assign(document.createElement('a'), { href: url, download: `${schemeName.replace(/[^\w]+/g, '-').toLowerCase()}-haq-plan.ics` });
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function ActionAgent({ lang, plan, href, onTick, onSpeak, voiceOn }) {
  const [ticks, setTicks] = useState({});
  useEffect(() => setTicks({}), [plan?.doc_id]);
  if (!plan) return <p className="empty">{t(lang, 'planEmpty')}</p>;

  const { checklist } = plan;
  const docs = checklist.required_documents;
  const done = docs.filter((d) => ticks[d.name]).length;
  const pct = docs.length ? Math.round((done / docs.length) * 100) : 0;
  const dated = plan.actions.filter((a) => a.due);
  const spoken = [plan.headline, ...plan.actions.map((a, i) => `${i + 1}. ${a.title}. ${a.kind === 'portal' ? '' : a.detail}${a.due ? ` ${t(lang, 'due')} ${formatDate(a.due)}.` : ''}`)].join(' ');

  return (
    <div className="plan">
      <div className={`plan-head card is-${plan.verdict}`}>
        <span className="plan-icon"><Icon name={plan.verdict === 'eligible' ? 'check' : plan.verdict === 'not_eligible' ? 'cross' : 'help'} size={22} strokeWidth={2.4} /></span>
        <div>
          <p className="plan-scheme">{plan.scheme_name}</p>
          <h3>{plan.headline}</h3>
        </div>
        <div className="plan-tools">
          <ListenButton lang={lang} text={spoken} onSpeak={onSpeak} voiceOn={voiceOn} />
          {dated.length ? (
            <button type="button" className="btn btn-ghost" onClick={() => { downloadCalendar(plan.scheme_name, plan.actions); onTick?.(); }}>
              <Icon name="calendar" size={16} /> {t(lang, 'addCalendar')}
            </button>
          ) : null}
        </div>
      </div>

      <div className="plan-grid">
        <ol className="plan-steps card panel">
          {plan.actions.map((a, i) => (
            <li key={a.id} className={`plan-step is-${a.urgency}`} style={{ animationDelay: `${i * 60}ms` }}>
              <span className="plan-num"><Icon name={KIND_ICON[a.kind] ?? 'list'} size={15} /></span>
              <div className="plan-body">
                <div className="plan-title-row">
                  <b>{a.title}</b>
                  <span className={`urgency u-${a.urgency}`}>{t(lang, `urgency_${a.urgency}`)}</span>
                </div>
                {a.kind === 'portal'
                  ? <ApplyPortal lang={lang} portal={a.portal ?? { url: a.detail, name: a.detail, source: 'notification' }} onOpen={onTick} />
                  : <p>{a.detail}</p>}
                <div className="plan-meta">
                  {a.due ? <span><Icon name="calendar" size={13} /> {t(lang, 'due')} {formatDate(a.due)}</span> : null}
                  {a.page ? <SourceChip lang={lang} page={a.page} quote={null} href={href} /> : null}
                </div>
              </div>
            </li>
          ))}
        </ol>

        <div className="stack">
          {checklist.deadline?.date ? (
            <article className={`deadline-card card${checklist.days_left <= 14 ? ' is-urgent' : ''}`}>
              <span className="deadline-icon"><Icon name="calendar" size={22} /></span>
              <p className="deadline-days"><b>{checklist.days_left}</b> {t(lang, 'daysLeft', checklist.days_left).replace(String(checklist.days_left), '').trim()}</p>
              <p>{t(lang, 'applyBy')} <b>{formatDate(checklist.deadline.date)}</b></p>
              <SourceChip lang={lang} page={checklist.deadline.page} quote={checklist.deadline.quote} href={href} />
            </article>
          ) : <p className="muted small-text">{t(lang, 'noDeadline')}</p>}

          <article className="card panel">
            <div className="panel-title-row">
              <h3 className="panel-title"><Icon name="file" size={18} /> {t(lang, 'docsToCollect')}</h3>
              <span className="pill">{t(lang, 'ready', done, docs.length)}</span>
            </div>
            <div className="progress"><span style={{ width: `${pct}%` }} /></div>
            {docs.length === 0 ? <p className="empty small">{t(lang, 'notStated')}</p> : (
              <ul className="ticks">
                {docs.map((d) => (
                  <li key={d.name} className={ticks[d.name] ? 'is-done' : ''}>
                    <label>
                      <input type="checkbox" checked={Boolean(ticks[d.name])} onChange={() => { setTicks({ ...ticks, [d.name]: !ticks[d.name] }); onTick?.(); }} />
                      <span className="tick-box"><Icon name="check" size={13} strokeWidth={3} /></span>
                      <span className="tick-text">{d.name}</span>
                    </label>
                    <SourceChip lang={lang} page={d.page} quote={d.quote} href={href} />
                  </li>
                ))}
              </ul>
            )}
          </article>
        </div>
      </div>
    </div>
  );
}
