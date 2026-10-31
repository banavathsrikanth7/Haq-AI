// "Apply here": the official portal for a scheme the citizen qualifies for, and where Haq AI got the link.
import Icon from './Icon.jsx';
import { t } from '../lib/i18n.js';

export default function ApplyPortal({ lang, portal, onOpen }) {
  if (!portal) return null;
  const search = portal.source === 'search';
  let host = portal.url;
  try { host = new URL(portal.url).hostname; } catch { /* show as is */ }
  return (
    <div className="apply-portal">
      <a className="apply-cta" href={portal.url} target="_blank" rel="noopener noreferrer" onClick={() => onOpen?.()}>
        <span>
          <b>{search ? t(lang, 'portalFind', portal.search_for) : t(lang, 'portalApply')}</b>
          <small>{search || portal.name === host ? portal.name : `${portal.name} · ${host}`}</small>
        </span>
        <Icon name="external" size={20} />
      </a>
      <p className="portal-source"><Icon name="shield" size={12} /> {t(lang, `portalFrom_${portal.source}`)}</p>
    </div>
  );
}
