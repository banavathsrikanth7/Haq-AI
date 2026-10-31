// Notification intake: the hero, the upload card and the reading progress — the citizen's first step.
import { useRef, useState } from 'react';

import Icon from './Icon.jsx';
import { ErrorBanner, LanguagePills, scrollToSection, Spinner } from './Shell.jsx';
import { fileSizeKb } from '../lib/schemeMath.js';
import { useStages } from '../lib/hooks.js';
import { t } from '../lib/i18n.js';

export const NOTIFICATION_SIZE_LIMIT = 15 * 1024 * 1024;
const ACCEPT = '.pdf,.png,.jpg,.jpeg,.webp,.txt,application/pdf,image/*,text/plain';

export function Stepper({ lang, progress }) {
  const steps = [
    { n: 1, key: 'step1', sub: 'step1Sub', done: progress.uploaded, target: 'home', icon: 'upload' },
    { n: 2, key: 'step2', sub: 'step2Sub', done: progress.checked, target: 'eligibility', icon: 'userCheck' },
    { n: 3, key: 'step3', sub: 'step3Sub', done: progress.acted, target: 'action-plan', icon: 'list' },
  ];
  const current = steps.find((s) => !s.done)?.n ?? 4;
  return (
    <ol className="stepper" aria-label="Progress">
      {steps.map((s) => (
        <li key={s.n} className={`${s.done ? 'is-done' : ''}${current === s.n ? ' is-current' : ''}`}>
          <button type="button" onClick={() => scrollToSection(s.target)}>
            <span className="step-dot">{s.done ? <Icon name="check" size={16} strokeWidth={2.6} /> : s.n}</span>
            <span className="step-copy"><b>{t(lang, s.key)}</b><small>{t(lang, s.sub)}</small></span>
          </button>
        </li>
      ))}
    </ol>
  );
}

export default function NotificationIntake({
  lang, onLang, progress, text, onTextChange, file, onFileChange, onExtract, extracting, error, onDismissError, notes, skippedClauses,
}) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [pasteMode, setPasteMode] = useState(false);
  const stages = t(lang, 'readStages');
  const stage = useStages(extracting, stages.length);
  const canExtract = Boolean((pasteMode ? text.trim() : file)) && !extracting;

  const pickFile = (selected) => selected && onFileChange(selected);
  const clearFile = () => {
    onFileChange(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <section id="home" className="hero">
      <div className="hero-bg" aria-hidden="true"><span className="blob b1" /><span className="blob b2" /><span className="blob b3" /><span className="grid-fade" /></div>

      <div className="hero-inner">
        <div className="hero-copy">
          <p className="hero-badge"><Icon name="sparkle" size={14} /> {t(lang, 'heroBadge')}</p>
          <h1>{t(lang, 'heroTitle')}<br /><span className="gradient-text">{t(lang, 'heroTitleAccent')}</span></h1>
          <p className="hero-sub">{t(lang, 'heroSub')}</p>
          <LanguagePills lang={lang} onChange={onLang} />
          <ul className="trust-row">
            <li><Icon name="book" size={16} />{t(lang, 'trust1')}</li>
            <li><Icon name="shield" size={16} />{t(lang, 'trust2')}</li>
            <li><Icon name="lock" size={16} />{t(lang, 'trust3')}</li>
          </ul>
        </div>

        <div className={`upload-card glass${dragging ? ' is-dragging' : ''}${extracting ? ' is-busy' : ''}`}>
          {extracting ? (
            <div className="reading">
              <div className="reading-orb"><span /><Icon name="file" size={30} /></div>
              <p className="reading-title">{t(lang, 'reading')}</p>
              <ol className="reading-stages">
                {stages.map((label, i) => (
                  <li key={label} className={i < stage ? 'is-done' : i === stage ? 'is-now' : ''}>
                    <span>{i < stage ? <Icon name="check" size={13} strokeWidth={2.8} /> : i === stage ? <Spinner small /> : null}</span>{label}
                  </li>
                ))}
              </ol>
              <div className="shimmer-bar"><span style={{ width: `${((stage + 1) / stages.length) * 100}%` }} /></div>
            </div>
          ) : pasteMode ? (
            <div className="paste-mode">
              <label htmlFor="raw-text" className="field-label"><Icon name="text" size={16} /> {t(lang, 'pasteToggle')}</label>
              <textarea id="raw-text" rows={7} value={text} onChange={(e) => onTextChange(e.target.value)} placeholder={t(lang, 'pastePlaceholder')} />
            </div>
          ) : (
            <div
              className={`dropzone${file ? ' has-file' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); pickFile(e.dataTransfer.files?.[0]); }}
              onClick={() => !file && inputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && !file && inputRef.current?.click()}
              aria-label={t(lang, 'dropTitle')}
            >
              <input ref={inputRef} type="file" accept={ACCEPT} className="visually-hidden" onChange={(e) => pickFile(e.target.files?.[0])} />
              {file ? (
                <div className="file-chip" onClick={(e) => e.stopPropagation()}>
                  <span className="file-icon"><Icon name="file" size={22} /></span>
                  <span className="file-meta"><strong title={file.name}>{file.name}</strong><span>{fileSizeKb(file.size)}</span></span>
                  <button type="button" className="icon-btn small" onClick={clearFile} aria-label="Remove file"><Icon name="close" size={16} /></button>
                </div>
              ) : (
                <>
                  <span className="drop-icon"><Icon name="upload" size={26} /></span>
                  <p className="drop-title">{t(lang, 'dropTitle')}</p>
                  <p className="drop-or">{t(lang, 'dropOr')} <span className="link">{t(lang, 'browse')}</span></p>
                  <p className="drop-hint">{t(lang, 'dropHint')}</p>
                </>
              )}
            </div>
          )}

          {!extracting ? (
            <>
              <button type="button" className="btn btn-primary btn-lg btn-block" onClick={onExtract} disabled={!canExtract}>
                <Icon name="sparkle" size={18} /> {t(lang, 'read')}
              </button>
              <div className="upload-foot">
                <button type="button" className="link" onClick={() => setPasteMode((p) => !p)}>{t(lang, pasteMode ? 'pasteHide' : 'pasteToggle')}</button>
                <span><Icon name="lock" size={13} /> {t(lang, 'privacy')}</span>
              </div>
            </>
          ) : null}

          <ErrorBanner message={error} onDismiss={onDismissError} />
          {notes.length > 0 || skippedClauses.length > 0 ? (
            <details className="notes">
              <summary><Icon name="alert" size={15} /> {t(lang, 'notesTitle')} ({notes.length + skippedClauses.length})</summary>
              <ul>
                {notes.map((note, i) => <li key={`n${i}`}>{note}</li>)}
                {skippedClauses.map((item, i) => <li key={`v${i}`}>{item.section} #{item.row || ''}: {item.reason}</li>)}
              </ul>
            </details>
          ) : null}
        </div>
      </div>

      <div className="hero-steps">
        <Stepper lang={lang} progress={progress} />
      </div>
    </section>
  );
}

export function HowItWorks({ lang }) {
  const items = [
    { icon: 'upload', title: 'how1', sub: 'how1Sub' },
    { icon: 'book', title: 'how2', sub: 'how2Sub' },
    { icon: 'userCheck', title: 'how3', sub: 'how3Sub' },
  ];
  return (
    <div className="how">
      {items.map((it, i) => (
        <div key={it.title} className="how-card card lift">
          <span className="how-num">0{i + 1}</span>
          <span className="how-icon"><Icon name={it.icon} size={22} /></span>
          <h3>{t(lang, it.title)}</h3>
          <p>{t(lang, it.sub)}</p>
        </div>
      ))}
    </div>
  );
}
