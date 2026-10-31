import Icon from './Icon.jsx';
import { useReveal } from '../lib/hooks.js';
import { LANGS, t } from '../lib/i18n.js';

export const NAV = [
  { id: 'home', key: 'navHome', icon: 'home' },
  { id: 'snapshot', key: 'navOverview', icon: 'overview' },
  { id: 'changes', key: 'navChanges', icon: 'compare' },
  { id: 'eligibility', key: 'navEligibility', icon: 'userCheck' },
  { id: 'action-plan', key: 'navChecklist', icon: 'list' },
];

export const scrollToSection = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

export function ThemeToggle({ lang, theme, onToggle }) {
  const dark = theme === 'dark';
  return (
    <button type="button" className="icon-btn theme-toggle" onClick={onToggle} aria-label={t(lang, dark ? 'lightMode' : 'darkMode')} title={t(lang, dark ? 'lightMode' : 'darkMode')}>
      <span className={`theme-icon${dark ? ' is-dark' : ''}`}>
        <Icon name="sun" size={18} className="sun" />
        <Icon name="moon" size={18} className="moon" />
      </span>
    </button>
  );
}

export function LanguagePills({ lang, onChange, compact = false }) {
  return (
    <div className={`lang-pills${compact ? ' is-compact' : ''}`} role="group" aria-label="Language">
      {LANGS.map((l) => (
        <button key={l.code} type="button" className={lang === l.code ? 'is-active' : ''} aria-pressed={lang === l.code} onClick={() => onChange(l.code)}>
          {compact ? l.short : l.label}
        </button>
      ))}
    </div>
  );
}

export function StatusChip({ lang, health }) {
  const on = health.known && health.readingReady;
  return (
    <span className={`status-chip${on ? ' is-on' : health.known ? '' : ' is-off'}`} role="status" title={health.voiceReady ? t(lang, 'voiceOn') : undefined}>
      <span className="status-dot" aria-hidden="true" />
      <span className="status-text">{!health.known ? t(lang, 'serverDown') : on ? t(lang, 'readingOn') : t(lang, 'readingOff')}</span>
    </span>
  );
}

export function TopNav({ lang, onLang, theme, onTheme, health, active, onClear, canClear }) {
  return (
    <header className="topnav">
      <div className="topnav-inner">
        <button type="button" className="brand" onClick={() => scrollToSection('home')} aria-label="Haq AI home">
          <span className="brand-mark"><Icon name="scale" size={19} strokeWidth={2.2} /></span>
          <span className="brand-name">Haq <span>AI</span></span>
        </button>
        <nav className="topnav-links" aria-label="Sections">
          {NAV.slice(1).map((item) => (
            <button key={item.id} type="button" className={active === item.id ? 'is-active' : ''} onClick={() => scrollToSection(item.id)}>
              {t(lang, item.key)}
            </button>
          ))}
        </nav>
        <div className="topnav-actions">
          <StatusChip lang={lang} health={health} />
          <LanguagePills lang={lang} onChange={onLang} compact />
          <ThemeToggle lang={lang} theme={theme} onToggle={onTheme} />
          {canClear ? (
            <button type="button" className="icon-btn" onClick={onClear} title={t(lang, 'clear')} aria-label={t(lang, 'clear')}><Icon name="refresh" size={18} /></button>
          ) : null}
        </div>
      </div>
    </header>
  );
}

export function MobileTabs({ lang, active, onAsk }) {
  const items = NAV.filter((n) => n.id !== 'action-plan');
  return (
    <nav className="mobile-tabs" aria-label="Sections">
      {items.slice(0, 2).map((item) => (
        <button key={item.id} type="button" className={active === item.id ? 'is-active' : ''} onClick={() => scrollToSection(item.id)}>
          <Icon name={item.icon} size={20} /><span>{t(lang, item.key)}</span>
        </button>
      ))}
      <button type="button" className="mobile-ask" onClick={onAsk} aria-label={t(lang, 'ask')}>
        <span><Icon name="sparkle" size={22} /></span>
      </button>
      {items.slice(2).map((item) => (
        <button key={item.id} type="button" className={active === item.id ? 'is-active' : ''} onClick={() => scrollToSection(item.id)}>
          <Icon name={item.icon} size={20} /><span>{t(lang, item.key)}</span>
        </button>
      ))}
    </nav>
  );
}

/** A page section with a numbered eyebrow and a fade-up reveal. */
export function Section({ id, step, eyebrow, title, sub, children, aside }) {
  const ref = useReveal();
  return (
    <section id={id} ref={ref} className="section reveal">
      <div className="section-head">
        <div>
          {eyebrow ? <p className="eyebrow">{step ? <b>{step}</b> : null}{eyebrow}</p> : null}
          <h2>{title}</h2>
          {sub ? <p className="section-sub">{sub}</p> : null}
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}

export function ErrorBanner({ message, onDismiss }) {
  if (!message) return null;
  return (
    <div className="banner is-error" role="alert">
      <Icon name="alert" size={20} />
      <p>{message}</p>
      {onDismiss ? <button type="button" className="icon-btn small" onClick={onDismiss} aria-label="Dismiss"><Icon name="close" size={16} /></button> : null}
    </div>
  );
}

export function Toasts({ toasts, onDismiss }) {
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast is-${toast.tone}`} role="status">
          <Icon name={toast.tone === 'error' ? 'alert' : 'check'} size={18} />
          <span>{toast.message}</span>
          <button type="button" className="icon-btn small" onClick={() => onDismiss(toast.id)} aria-label="Dismiss"><Icon name="close" size={14} /></button>
        </div>
      ))}
    </div>
  );
}

export function Footer({ lang }) {
  return (
    <footer className="footer">
      <div className="footer-brand"><span className="brand-mark small"><Icon name="scale" size={15} strokeWidth={2.2} /></span>{t(lang, 'footer')}</div>
      <p>{t(lang, 'footerNote')}</p>
    </footer>
  );
}

export function Spinner({ small = false }) {
  return <span className={`spinner${small ? ' small' : ''}`} aria-hidden="true" />;
}

/** "Source p.3" — opens the uploaded PDF at that page when we have the file. */
export function SourceChip({ lang, page, quote, href }) {
  if (!page) return null;
  const label = `${t(lang, 'page')}${page}`;
  const body = (<><Icon name="book" size={12} />{label}</>);
  return href ? (
    <a className="source-chip" href={`${href}#page=${page}`} target="_blank" rel="noopener noreferrer" title={quote ? `“${quote}”` : `${t(lang, 'source')} ${label}`}>{body}</a>
  ) : (
    <span className="source-chip is-static" title={quote ? `“${quote}”` : undefined}>{body}</span>
  );
}
