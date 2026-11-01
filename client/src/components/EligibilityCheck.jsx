// Feature 2 — Personalized Eligibility. Asks only the questions this notification's rules need,
// one at a time, then shows the verdict computed on the server with every condition and its page.
import { useEffect, useMemo, useState } from 'react';

import Icon from './Icon.jsx';
import ListenButton from './ListenButton.jsx';
import { ErrorBanner, SourceChip, Spinner } from './Shell.jsx';
import { notificationLabel, formatDate, rupees, lakhGrouping } from '../lib/schemeMath.js';
import { QUESTIONS, t } from '../lib/i18n.js';

const OPTIONS = {
  category: [['general', 'General'], ['obc', 'OBC'], ['sc', 'SC'], ['st', 'ST'], ['ews', 'EWS']],
  education_level: [['school', 'School'], ['diploma', 'Diploma / ITI'], ['ug', 'UG (degree)'], ['pg', 'PG (masters)'], ['phd', 'PhD'], ['none', 'Not studying']],
  occupation: [['student', 'Student'], ['farmer', 'Farmer'], ['worker', 'Worker'], ['self_employed', 'Self-employed'], ['business_owner', 'Business owner'], ['unemployed', 'Unemployed'], ['other', 'Other']],
  gender: [['female', 'Female'], ['male', 'Male'], ['other', 'Other']],
  institution_type: [['government', 'Government'], ['private', 'Private'], ['other', 'Other']],
  disability: [[true, 'Yes'], [false, 'No']],
  enterprise_size: [['micro', 'Micro'], ['small', 'Small'], ['medium', 'Medium'], ['large', 'Large']],
  udyam_registered: [[true, 'Yes'], [false, 'No']],
};
const FIELD_ICON = { age: 'userCheck', annual_family_income_inr: 'wallet', category: 'list', education_level: 'book', state: 'home', gender: 'userCheck', occupation: 'userCheck', course: 'book', institution_type: 'home', disability: 'shield', last_exam_percent: 'list', enterprise_size: 'wallet', annual_turnover_inr: 'wallet', udyam_registered: 'file' };
const STATES = ['Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal'];
const INCOME_CHIPS = [100000, 250000, 500000, 800000];
const TURNOVER_CHIPS = [1000000, 5000000, 20000000, 100000000];
const inWords = (v) => (v >= 10000000 ? `${(v / 10000000).toLocaleString('en-IN', { maximumFractionDigits: 2 })} crore` : v >= 100000 ? `${(v / 100000).toLocaleString('en-IN', { maximumFractionDigits: 2 })} lakh` : '');
const ALL_FIELDS = ['age', 'annual_family_income_inr', 'category', 'education_level', 'state', 'occupation'];

function QuestionInput({ field, value, onChange, onAutoNext }) {
  if (OPTIONS[field]) {
    return (
      <div className="option-grid">
        {OPTIONS[field].map(([v, label]) => (
          <button key={String(v)} type="button" className={`option${value === v ? ' is-selected' : ''}`} onClick={() => { onChange(v); onAutoNext(); }}>
            <span className="option-check">{value === v ? <Icon name="check" size={14} strokeWidth={2.8} /> : null}</span>{label}
          </button>
        ))}
      </div>
    );
  }
  if (field === 'age') {
    const n = typeof value === 'number' ? value : '';
    return (
      <div className="stepper-input">
        <button type="button" onClick={() => onChange(Math.max(0, (n || 18) - 1))} aria-label="Minus one">−</button>
        <input type="number" inputMode="numeric" min={0} max={120} value={n} placeholder="18" onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))} autoFocus />
        <button type="button" onClick={() => onChange(Math.min(120, (n || 17) + 1))} aria-label="Plus one">+</button>
        <span className="unit">years</span>
      </div>
    );
  }
  if (field === 'annual_family_income_inr' || field === 'annual_turnover_inr') {
    const chips = field === 'annual_turnover_inr' ? TURNOVER_CHIPS : INCOME_CHIPS;
    return (
      <div>
        <div className="money-input">
          <span>₹</span>
          <input type="number" inputMode="numeric" min={0} value={value ?? ''} placeholder="2,50,000" onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))} autoFocus />
        </div>
        <p className="money-words">{typeof value === 'number' ? `₹${lakhGrouping(value)} per year${inWords(value) ? ` · ${inWords(value)}` : ''}` : ' '}</p>
        <div className="quick-chips">
          {chips.map((v) => <button key={v} type="button" className={value === v ? 'is-selected' : ''} onClick={() => onChange(v)}>{inWords(v) || rupees(v)}</button>)}
        </div>
      </div>
    );
  }
  if (field === 'last_exam_percent') {
    return <div className="money-input"><input type="number" min={0} max={100} value={value ?? ''} placeholder="75" onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))} autoFocus /><span>%</span></div>;
  }
  return (
    <>
      <input className="text-input" type="text" list={field === 'state' ? 'states' : undefined} value={value ?? ''} onChange={(e) => onChange(e.target.value)} autoFocus />
      {field === 'state' ? <datalist id="states">{STATES.map((s) => <option key={s} value={s} />)}</datalist> : null}
    </>
  );
}

function Confetti() {
  return (
    <div className="confetti" aria-hidden="true">
      {Array.from({ length: 18 }, (_, i) => <span key={i} style={{ '--i': i }} />)}
    </div>
  );
}

function VerdictRing({ passed, total, verdict }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const share = total ? passed / total : 0;
  return (
    <svg className={`ring is-${verdict}`} viewBox="0 0 80 80" width="96" height="96" aria-hidden="true">
      <circle cx="40" cy="40" r={r} className="ring-track" />
      <circle cx="40" cy="40" r={r} className="ring-fill" strokeDasharray={c} strokeDashoffset={c * (1 - share)} />
      <text x="40" y="45" textAnchor="middle">{passed}/{total}</text>
    </svg>
  );
}

const STATUS = { passed: { icon: 'check', cls: 'is-pass' }, failed: { icon: 'cross', cls: 'is-fail' }, unknown: { icon: 'help', cls: 'is-unknown' } };

export default function EligibilityCheck({ lang, documents, docId, onPickDoc, profile, onProfile, onCheck, checking, result, error, hrefFor, onExplain, onSpeak, voiceOn, reader }) {
  const condText = (c) => reader?.ruleById(c.rule_id, c.description) ?? c.description;
  const doc = documents.find((d) => d.doc_id === docId);
  const fields = useMemo(() => {
    const fromRules = [...new Set((doc?.rules ?? []).map((r) => r.field))];
    return fromRules.length ? fromRules : ALL_FIELDS;
  }, [doc]);
  const [step, setStep] = useState(0);
  const [mode, setMode] = useState('wizard');

  useEffect(() => { setStep(0); setMode('wizard'); }, [docId]);
  useEffect(() => { if (result) setMode('result'); }, [result]);

  const field = fields[Math.min(step, fields.length - 1)];
  const last = step >= fields.length - 1;
  const setValue = (value) => onProfile({ ...profile, [field]: value === '' ? null : value });
  const next = () => (last ? onCheck() : setStep((s) => s + 1));
  const autoNext = () => setTimeout(() => (last ? null : setStep((s) => Math.min(fields.length - 1, s + 1))), 260);

  if (!doc) return null;
  const href = hrefFor(doc.doc_id);
  const passed = result ? result.conditions.filter((c) => c.status === 'passed').length : 0;
  const verdictSub = { eligible: 'eligibleSub', not_eligible: 'notEligibleSub', need_more_info: 'moreInfoSub', rule_not_verified: 'noRulesDoc' };

  return (
    <div className="elig">
      {documents.length > 1 ? (
        <label className="doc-select">
          <small>{t(lang, 'pickDoc')}</small>
          <select value={docId} onChange={(e) => onPickDoc(e.target.value)}>
            {documents.map((d) => <option key={d.doc_id} value={d.doc_id}>{notificationLabel(d)}</option>)}
          </select>
        </label>
      ) : null}

      {mode === 'wizard' || !result ? (
        <div className="wizard card">
          <div className="wizard-progress">
            <span>{t(lang, 'questionOf', step + 1, fields.length)}</span>
            <div className="dots">{fields.map((f, i) => <button key={f} type="button" className={`${i < step ? 'is-done' : ''}${i === step ? ' is-now' : ''}`} onClick={() => setStep(i)} aria-label={`Question ${i + 1}`} />)}</div>
          </div>
          <div className="question" key={field}>
            <span className="q-icon"><Icon name={FIELD_ICON[field] ?? 'help'} size={22} /></span>
            <h3>{QUESTIONS[lang]?.[field] ?? QUESTIONS.en[field]}</h3>
            <form onSubmit={(e) => { e.preventDefault(); next(); }}>
              <QuestionInput field={field} value={profile[field] ?? null} onChange={setValue} onAutoNext={autoNext} />
              <div className="wizard-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}><Icon name="arrowLeft" size={16} /> {t(lang, 'back')}</button>
                <span className="spacer" />
                {!last ? <button type="button" className="btn btn-ghost" onClick={() => setStep((s) => s + 1)}>{t(lang, 'skip')}</button> : null}
                <button type="submit" className="btn btn-primary" disabled={checking}>
                  {checking ? <Spinner /> : null}{last ? t(lang, 'seeResult') : t(lang, 'next')} {!checking ? <Icon name="arrowRight" size={16} /> : null}
                </button>
              </div>
            </form>
          </div>
          <p className="wizard-note"><Icon name="lock" size={13} /> {t(lang, 'eligSub')}</p>
          <ErrorBanner message={error} />
        </div>
      ) : (
        <div className={`verdict card is-${result.verdict}`}>
          {result.verdict === 'eligible' ? <Confetti /> : null}
          <div className="verdict-head">
            <VerdictRing passed={passed} total={result.conditions.length} verdict={result.verdict} />
            <div>
              <p className="verdict-scheme">{result.scheme_name}</p>
              <h3 className="verdict-title">{t(lang, result.verdict)}</h3>
              <p className="muted">{result.conditions.length ? t(lang, 'conditionsMet', passed, result.conditions.length) : t(lang, verdictSub[result.verdict])}</p>
            </div>
            <div className="verdict-actions">
              <button type="button" className="btn btn-ghost" onClick={() => { setMode('wizard'); setStep(0); }}><Icon name="edit" size={16} /> {t(lang, 'editAnswers')}</button>
              <ListenButton lang={lang} text={`${result.scheme_name}. ${t(lang, result.verdict)}. ${result.conditions.map((c) => `${condText(c)}: ${t(lang, `cond_${c.status}`)}`).join('. ')}`} onSpeak={onSpeak} voiceOn={voiceOn} className="btn btn-ghost" />
              <button type="button" className="btn btn-soft" onClick={onExplain}><Icon name="sparkle" size={16} /> {t(lang, 'explainIn')}</button>
            </div>
          </div>
          <ul className="conditions">
            {result.conditions.map((c, i) => (
              <li key={c.rule_id} className={STATUS[c.status].cls} style={{ animationDelay: `${i * 70}ms` }}>
                <span className="cond-icon"><Icon name={STATUS[c.status].icon} size={14} strokeWidth={2.8} /></span>
                <div className="cond-body">
                  <p>{condText(c)}</p>
                  <small>{reader?.on ? null : <>{t(lang, 'ruleLbl')}: {c.rule_text} · </>}{t(lang, 'youLbl')}: {c.user_value === null ? '—' : c.field === 'annual_family_income_inr' ? rupees(c.user_value) : String(c.user_value)}</small>
                </div>
                {c.status === 'unknown' ? (
                  <button type="button" className="btn btn-soft small" onClick={() => { setMode('wizard'); setStep(Math.max(0, fields.indexOf(c.field))); }}>{t(lang, 'next')}</button>
                ) : <SourceChip lang={lang} page={c.page} quote={c.quote} href={href} />}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
