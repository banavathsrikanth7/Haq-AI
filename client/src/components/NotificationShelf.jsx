// Notifications you have loaded, shown as a shelf you can switch between.
import Icon from './Icon.jsx';
import { formatDate } from '../lib/schemeMath.js';
import { t } from '../lib/i18n.js';

export default function NotificationShelf({ lang, documents, focusId, onFocus, onRemove, hrefFor, onAdd }) {
  return (
    <div className="shelf">
      {documents.map((d) => (
        <div key={d.doc_id} className={`shelf-item${d.doc_id === focusId ? ' is-active' : ''}`}>
          <button type="button" className="shelf-main" onClick={() => onFocus(d.doc_id)}>
            <span className="shelf-icon"><Icon name="file" size={16} /></span>
            <span className="shelf-text"><b>{d.scheme.version_label || d.source_name}</b><small>{d.scheme.publication_date ? formatDate(d.scheme.publication_date) : d.source_name}</small></span>
          </button>
          {hrefFor(d.doc_id) ? <a className="icon-btn small" href={hrefFor(d.doc_id)} target="_blank" rel="noopener noreferrer" aria-label="Open PDF"><Icon name="external" size={14} /></a> : null}
          <button type="button" className="icon-btn small danger" onClick={() => onRemove(d.doc_id)} aria-label={`Remove ${d.source_name}`}><Icon name="trash" size={14} /></button>
        </div>
      ))}
      <button type="button" className="shelf-add" onClick={onAdd}><Icon name="upload" size={16} /> {t(lang, 'addAnother')}</button>
    </div>
  );
}
