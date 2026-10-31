// Feature 3 — "Listen": reads a verdict, a plan or an answer aloud in the chosen language (Sarvam voice).
import { useEffect, useRef, useState } from 'react';

import Icon from './Icon.jsx';
import { Spinner } from './Shell.jsx';
import { t } from '../lib/i18n.js';

export default function ListenButton({ lang, text, onSpeak, voiceOn, className = 'btn btn-soft' }) {
  const [state, setState] = useState('idle'); // idle | loading | playing
  const [problem, setProblem] = useState('');
  const audio = useRef(null);
  const token = useRef(0);
  const stop = () => { token.current += 1; audio.current?.pause(); audio.current = null; setState('idle'); };
  useEffect(() => () => stop(), []);

  async function toggle() {
    setProblem('');
    if (state !== 'idle') { stop(); return; } // tap again to stop, even while loading
    const mine = ++token.current;
    setState('loading');
    try {
      const sound = await onSpeak(text);
      if (mine !== token.current) { sound.pause(); return; }
      audio.current = sound;
      sound.onended = () => mine === token.current && setState('idle');
      setState('playing');
    } catch (error) {
      if (mine === token.current) { setProblem(error.message); setState('idle'); }
    }
  }

  return (
    <span className="listen-wrap">
      <button type="button" className={className} onClick={toggle} disabled={!voiceOn} title={voiceOn ? t(lang, 'listenBtn') : t(lang, 'voiceNeedsKey')}>
        {state === 'loading' ? <Spinner small /> : <Icon name={state === 'playing' ? 'stop' : 'volume'} size={16} />}
        {state === 'idle' ? t(lang, 'listenBtn') : t(lang, 'stopBtn')}
      </button>
      {problem ? <small className="listen-problem">{problem}</small> : null}
    </span>
  );
}
