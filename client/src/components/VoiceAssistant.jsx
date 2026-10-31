// Feature 3 — Haq voice and text assistant. Ask by typing or speaking in English, Telugu or Hindi;
// answers come only from facts the server computed, and can be read aloud automatically.
import { useEffect, useRef, useState } from 'react';

import Icon from './Icon.jsx';
import { LanguagePills, Spinner } from './Shell.jsx';
import { SUGGESTIONS, t } from '../lib/i18n.js';

const MAX_RECORD_MS = 30_000;

export default function VoiceAssistant({ lang, onLang, open, onOpen, onClose, messages, onSend, sending, hasDocuments, voiceOn, onTranscribe, onSpeak, readAloud, onReadAloud }) {
  const [draft, setDraft] = useState('');
  const [recording, setRecording] = useState(false);
  const [voiceError, setVoiceError] = useState('');
  const [playing, setPlaying] = useState(null); // { index, loading }
  const player = useRef(null);
  const playToken = useRef(0);

  // Stop speaking at once: on the Stop button, when another answer is played, or when the panel closes.
  function stopVoice() {
    playToken.current += 1;
    if (player.current) { player.current.pause(); player.current.currentTime = 0; player.current = null; }
    setPlaying(null);
  }
  useEffect(() => { if (!open) stopVoice(); }, [open]);
  useEffect(() => () => stopVoice(), []);
  const recorder = useRef(null);
  const timer = useRef(null);
  const endRef = useRef(null);
  const inputRef = useRef(null);

  // Read each new answer aloud when the citizen chose that.
  const lastSpoken = useRef(0);
  useEffect(() => {
    const last = messages.at(-1);
    if (!readAloud || !voiceOn || !last || last.role !== 'haq' || last.error || messages.length === lastSpoken.current) return;
    lastSpoken.current = messages.length;
    play(messages.length - 1, last.text);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, readAloud, voiceOn]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, [messages, sending, open]);
  useEffect(() => {
    if (!open) return undefined;
    setTimeout(() => inputRef.current?.focus(), 250);
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  function submit(event) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;
    setDraft('');
    onSend(text);
  }

  async function toggleMic() {
    setVoiceError('');
    if (recording) {
      clearTimeout(timer.current);
      recorder.current?.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      const chunks = [];
      mr.ondataavailable = (e) => chunks.push(e.data);
      mr.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        setRecording(false);
        try {
          const text = await onTranscribe(new Blob(chunks, { type: mr.mimeType || 'audio/webm' }));
          if (text) onSend(text);
        } catch (error) {
          setVoiceError(error.message);
        }
      };
      recorder.current = mr;
      mr.start();
      setRecording(true);
      timer.current = setTimeout(() => mr.state === 'recording' && mr.stop(), MAX_RECORD_MS);
    } catch {
      setVoiceError('Microphone permission was denied.');
    }
  }

  async function play(index, text) {
    const wasThis = playing?.index === index;
    stopVoice();
    if (wasThis) return; // second tap on the same answer = stop
    setVoiceError('');
    const token = playToken.current;
    setPlaying({ index, loading: true });
    try {
      const audio = await onSpeak(text);
      if (token !== playToken.current) { audio.pause(); return; } // stopped while the voice was loading
      player.current = audio;
      setPlaying({ index, loading: false });
      await new Promise((done) => { audio.onended = done; audio.onerror = done; audio.onpause = done; });
    } catch (error) {
      if (token === playToken.current) setVoiceError(error.message);
    } finally {
      if (token === playToken.current) { player.current = null; setPlaying(null); }
    }
  }

  return (
    <>
      <button type="button" className={`fab${open ? ' is-hidden' : ''}`} onClick={onOpen} aria-label={t(lang, 'ask')}>
        <span className="fab-pulse" aria-hidden="true" />
        <Icon name="sparkle" size={20} />
        <span>{t(lang, 'ask')}</span>
      </button>

      <div className={`drawer-scrim${open ? ' is-open' : ''}`} onClick={onClose} aria-hidden="true" />
      <aside className={`drawer${open ? ' is-open' : ''}`} aria-label={t(lang, 'askTitle')} aria-hidden={!open}>
        <header className="drawer-head">
          <span className="drawer-avatar"><Icon name="sparkle" size={18} /></span>
          <div>
            <h2>{t(lang, 'askTitle')}</h2>
            <p>{hasDocuments ? t(lang, 'askSubOn') : t(lang, 'askSubOff')}</p>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label={t(lang, 'close')}><Icon name="close" size={18} /></button>
        </header>
        <div className="drawer-lang">
          <LanguagePills lang={lang} onChange={onLang} />
          <label className={`switch${voiceOn ? '' : ' is-off'}`} title={voiceOn ? undefined : t(lang, 'voiceNeedsKey')}>
            <input type="checkbox" checked={readAloud} disabled={!voiceOn} onChange={() => onReadAloud(!readAloud)} /> <Icon name="volume" size={14} /> {t(lang, 'readAloud')}
          </label>
        </div>

        <div className="chat-log" aria-live="polite">
          <div className="bubble haq">{t(lang, 'welcome')}</div>
          {messages.map((m, i) => (
            <div key={i} className={`bubble ${m.role}${m.error ? ' is-error' : ''}`}>
              {m.error ? <Icon name="alert" size={16} /> : null}
              <span className="bubble-text">
                {m.source === 'general' ? <span className="general-tag"><Icon name="alert" size={12} /> {t(lang, 'generalInfo')}</span> : null}
                {m.text}
              </span>
              {voiceOn && m.role === 'haq' && !m.error ? (
                <button type="button" className={`play${playing?.index === i ? ' is-playing' : ''}`} onClick={() => play(i, m.text)}
                  aria-label={playing?.index === i ? t(lang, 'stopBtn') : t(lang, 'play')} title={playing?.index === i ? t(lang, 'stopBtn') : t(lang, 'play')}>
                  {playing?.index === i ? (playing.loading ? <Spinner small /> : <Icon name="stop" size={14} />) : <Icon name="volume" size={15} />}
                </button>
              ) : null}
            </div>
          ))}
          {sending ? <div className="bubble haq typing"><span /><span /><span /></div> : null}
          <div ref={endRef} />
        </div>

        {messages.length === 0 ? (
          <div className="suggestions">
            {SUGGESTIONS[lang].map((s) => <button key={s} type="button" onClick={() => onSend(s)} disabled={sending}>{s}</button>)}
          </div>
        ) : null}
        {voiceError ? <p className="voice-error"><Icon name="alert" size={14} /> {voiceError}</p> : null}

        <form className="chat-form" onSubmit={submit}>
          <button
            type="button"
            className={`mic${recording ? ' is-recording' : ''}`}
            onClick={toggleMic}
            disabled={!voiceOn || sending}
            title={voiceOn ? (recording ? t(lang, 'listening') : t(lang, 'askByVoice')) : t(lang, 'voiceNeedsKey')}
            aria-label={voiceOn ? (recording ? t(lang, 'listening') : t(lang, 'askByVoice')) : t(lang, 'voiceNeedsKey')}
          >
            <Icon name={recording ? 'stop' : 'mic'} size={18} />
          </button>
          <input ref={inputRef} type="text" value={draft} maxLength={1000} placeholder={recording ? t(lang, 'listening') : t(lang, 'askPlaceholder')} onChange={(e) => setDraft(e.target.value)} aria-label={t(lang, 'askPlaceholder')} />
          <button type="submit" className="send" disabled={!draft.trim() || sending} aria-label={t(lang, 'send')}>
            {sending ? <Spinner small /> : <Icon name="send" size={18} />}
          </button>
        </form>
      </aside>
    </>
  );
}
