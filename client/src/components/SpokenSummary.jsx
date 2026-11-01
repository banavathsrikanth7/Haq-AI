// Feature 3 — one-tap spoken explainer of the notification in the chosen language.
// The server writes it from facts computed in code and rejects any script with a number
// that is not in those facts; then Sarvam reads it aloud. Tap again to stop.
import { useEffect, useRef, useState } from 'react';

import Icon from './Icon.jsx';
import { Spinner } from './Shell.jsx';
import { t } from '../lib/i18n.js';

export default function SpokenSummary({ lang, doc, onSummary, onSpeak, voiceOn }) {
  const [state, setState] = useState('idle'); // idle | preparing | playing
  const [note, setNote] = useState('');
  const audio = useRef(null);
  const token = useRef(0);
  const stop = () => { token.current += 1; audio.current?.pause(); audio.current = null; setState('idle'); };
  useEffect(() => () => stop(), []);
  useEffect(() => { stop(); setNote(''); }, [doc.doc_id, lang]);

  async function toggle() {
    if (state !== 'idle') { stop(); return; }
    const mine = ++token.current;
    setNote('');
    setState('preparing');
    try {
      const summary = await onSummary(doc, lang);
      if (mine !== token.current) return;
      if (summary.fallback) setNote(t(lang, 'summaryFallback'));
      const sound = await onSpeak(summary.script, summary.language);
      if (mine !== token.current) { sound.pause(); return; }
      audio.current = sound;
      sound.onended = () => mine === token.current && setState('idle');
      setState('playing');
    } catch (error) {
      if (mine === token.current) { setNote(error.message); setState('idle'); }
    }
  }

  return (
    <div className="summary-bar">
      <button type="button" className="btn btn-primary" onClick={toggle} disabled={!voiceOn} title={voiceOn ? undefined : t(lang, 'voiceNeedsKey')}>
        {state === 'preparing' ? <Spinner small /> : <Icon name={state === 'playing' ? 'stop' : 'volume'} size={16} />}
        {state === 'idle' ? t(lang, 'summaryListen') : state === 'preparing' ? t(lang, 'summaryPreparing') : t(lang, 'stopBtn')}
      </button>
      {note ? <small>{note}</small> : null}
    </div>
  );
}
