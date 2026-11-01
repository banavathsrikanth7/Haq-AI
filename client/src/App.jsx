import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

// Haq AI page: intake → scheme snapshot → change intelligence + impact → eligibility → action plan,
// with the voice assistant available everywhere. Notifications stay in this tab only.
import ActionAgent from './components/ActionAgent.jsx';
import ChangeIntelligence from './components/ChangeIntelligence.jsx';
import ClauseTranslation from './components/ClauseTranslation.jsx';
import VoiceAssistant from './components/VoiceAssistant.jsx';
import { SchemeSnapshot } from './components/SchemeSnapshot.jsx';
import NotificationShelf from './components/NotificationShelf.jsx';
import EligibilityCheck from './components/EligibilityCheck.jsx';
import NotificationIntake, { HowItWorks, NOTIFICATION_SIZE_LIMIT } from './components/NotificationIntake.jsx';
import { Footer, MobileTabs, NAV, scrollToSection, Section, Toasts, TopNav } from './components/Shell.jsx';
import { haqApi } from './lib/haqApi.js';
import { citizenDetailsOnly, addNotifications, pickVersionPair } from './lib/schemeMath.js';
import { useTheme, useToasts } from './lib/hooks.js';
import { t } from './lib/i18n.js';

export default function App() {
  const [lang, setLang] = useState('en');
  const [theme, toggleTheme] = useTheme();
  const { toasts, push, dismiss } = useToasts();
  const [health, setHealth] = useState({ known: false, readingReady: false, voiceReady: false });
  const [active, setActive] = useState('home');

  // Documents live only in this browser tab (PRIVACY: the server stores nothing).
  const [documents, setDocuments] = useState([]);
  const [fileUrls, setFileUrls] = useState({});
  const [focusId, setFocusId] = useState(null);

  // Upload
  const [text, setText] = useState('');
  const [file, setFile] = useState(null);
  const [extracting, setExtracting] = useState(false);
  const [importError, setImportError] = useState('');
  const [notes, setNotes] = useState([]);
  const [skippedClauses, setSkippedClauses] = useState([]);

  // What changed
  const [pair, setPair] = useState([null, null]);
  const [comparison, setComparison] = useState(null);
  const [impact, setImpact] = useState(null);
  const [comparing, setComparing] = useState(false);
  const [compareError, setCompareError] = useState('');

  // Eligibility + action plan
  const [profile, setProfile] = useState({});
  const [eligDocId, setEligDocId] = useState(null);
  const [eligibility, setEligibility] = useState(null);
  const [plan, setPlan] = useState(null);
  const [checking, setChecking] = useState(false);
  const [eligError, setEligError] = useState('');
  const [acted, setActed] = useState(false);

  // Assistant (typed or spoken)
  const [chatOpen, setChatOpen] = useState(false);
  const [readAloud, setReadAloud] = useState(false);
  const [chat, setChat] = useState([]);
  const [chatSending, setChatSending] = useState(false);

  const hrefFor = useCallback((docId) => fileUrls[docId] ?? null, [fileUrls]);
  const byId = useCallback((id) => documents.find((d) => d.doc_id === id), [documents]);
  const focusDoc = byId(focusId) ?? documents.at(-1);
  const progress = useMemo(() => ({ uploaded: documents.length > 0, checked: Boolean(eligibility), acted }), [documents.length, eligibility, acted]);

  // Server status: checked at start, again every 20 s while the server is unreachable, and when the network returns.
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  const checkHealth = useCallback(() => haqApi.health()
    .then((d) => setHealth({ known: true, readingReady: Boolean(d.reading_ready), voiceReady: Boolean(d.voice_ready) }))
    .catch(() => setHealth({ known: false, readingReady: false, voiceReady: false })), []);
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    checkHealth();
  }, [checkHealth]);
  useEffect(() => {
    if (health.known) return undefined;
    const timer = setInterval(checkHealth, 20_000);
    return () => clearInterval(timer);
  }, [health.known, checkHealth]);
  useEffect(() => {
    const up = () => { setOnline(true); checkHealth(); };
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down); };
  }, [checkHealth]);

  useEffect(() => { document.documentElement.lang = lang; }, [lang]);

  // Highlight the section in view.
  useEffect(() => {
    if (!('IntersectionObserver' in window)) return undefined;
    const io = new IntersectionObserver((entries) => {
      const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible) setActive(visible.target.id);
    }, { rootMargin: '-35% 0px -55% 0px', threshold: [0, 0.2, 0.5] });
    NAV.forEach((n) => { const el = document.getElementById(n.id); if (el) io.observe(el); });
    return () => io.disconnect();
  }, [documents.length, plan]);

  const runCompare = useCallback(async (oldId, newId, currentProfile) => {
    const a = documents.find((d) => d.doc_id === oldId);
    const b = documents.find((d) => d.doc_id === newId);
    if (!a || !b || oldId === newId) { setComparison(null); setImpact(null); return; }
    setComparing(true);
    setCompareError('');
    try {
      const [c, i] = await Promise.all([haqApi.changes(a, b), haqApi.impact(a, b, citizenDetailsOnly(currentProfile))]);
      setComparison(c);
      setImpact(i);
    } catch (err) {
      setCompareError(err.message);
    } finally {
      setComparing(false);
    }
  }, [documents]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { runCompare(pair[0], pair[1], profile); }, [pair, runCompare]);

  function clearData() {
    Object.values(fileUrls).forEach((url) => URL.revokeObjectURL(url));
    setDocuments([]); setFileUrls({}); setFocusId(null); setPair([null, null]); setComparison(null); setImpact(null);
    setEligDocId(null); setEligibility(null); setPlan(null); setActed(false); setChat([]); setProfile({});
    setNotes([]); setSkippedClauses([]); setImportError('');
    scrollToSection('home');
  }

  function removeDocument(docId) {
    if (fileUrls[docId]) URL.revokeObjectURL(fileUrls[docId]);
    const rest = documents.filter((d) => d.doc_id !== docId);
    setDocuments(rest);
    setFileUrls(({ [docId]: _gone, ...others }) => others);
    setPair(pickVersionPair(rest));
    if (eligDocId === docId) { setEligDocId(rest.at(-1)?.doc_id ?? null); setEligibility(null); setPlan(null); }
    if (focusId === docId) setFocusId(rest.at(-1)?.doc_id ?? null);
  }

  async function extract() {
    if (file && file.size > NOTIFICATION_SIZE_LIMIT) {
      setImportError('Please upload a file smaller than 15 MB.');
      return;
    }
    setImportError('');
    setExtracting(true);
    try {
      const result = await haqApi.readNotification({ text: text.trim(), file });
      setNotes(result.notification.notes ?? []);
      setSkippedClauses(result.skipped_clauses ?? []);
      const merged = addNotifications(documents, [result.notification]);
      if (merged.added === 0) {
        push(t(lang, 'duplicate'), 'info');
        return;
      }
      const doc = result.notification;
      if (file && (file.type === 'application/pdf' || /\.pdf$/i.test(file.name))) {
        setFileUrls((urls) => ({ ...urls, [doc.doc_id]: URL.createObjectURL(file) }));
      }
      setDocuments(merged.rows);
      setFocusId(doc.doc_id);
      setEligDocId(doc.doc_id);
      setEligibility(null);
      setPlan(null);
      setPair(pickVersionPair(merged.rows));
      setFile(null);
      setText('');
      push(`${t(lang, 'added_toast', doc.scheme.name)} · ${doc.rules.length} rules · ${doc.benefits.length} benefits`);
      setTimeout(() => scrollToSection('snapshot'), 350);
    } catch (err) {
      // 422 = not a scheme notification, 503 = key not set, 502 = Gemini failed. Loaded notifications stay.
      setImportError(err.message);
    } finally {
      setExtracting(false);
    }
  }

  async function checkEligibility() {
    const doc = byId(eligDocId);
    if (!doc) return;
    setChecking(true);
    setEligError('');
    try {
      const citizen = citizenDetailsOnly(profile);
      const [verdict, actionPlan] = await Promise.all([haqApi.eligibility(doc, citizen), haqApi.actionPlan(doc, citizen)]);
      setEligibility(verdict);
      setPlan(actionPlan);
      if (pair[0] && pair[1]) runCompare(pair[0], pair[1], profile);
      setTimeout(() => scrollToSection('eligibility'), 100);
    } catch (err) {
      setEligError(err.message);
    } finally {
      setChecking(false);
    }
  }

  async function sendChat(message) {
    const history = chat.filter((m) => !m.error).map(({ role, text: said }) => ({ role, text: said }));
    setChat((current) => [...current, { role: 'citizen', text: message }]);
    setChatSending(true);
    try {
      const { reply, source } = await haqApi.ask({ question: message, history, notifications: documents, citizen: citizenDetailsOnly(profile), language: lang });
      setChat((current) => [...current, { role: 'haq', text: reply, source }]);
    } catch (err) {
      setChat((current) => [...current, { role: 'haq', text: err.message, error: true }]);
    } finally {
      setChatSending(false);
    }
  }

  function explainEligibility() {
    const doc = byId(eligDocId);
    if (!doc) return;
    setChatOpen(true);
    sendChat(`Explain my eligibility result for "${doc.scheme.name}" in simple words, and tell me what to do next.`);
  }

  const transcribe = async (blob) => (await haqApi.listen(blob, lang)).text;
  // Returns the playing Audio so callers can stop it or wait for it to end.
  const speak = async (textToSay, language = lang) => {
    const { audio_base64: audio, mime_type: mime } = await haqApi.speak(textToSay.slice(0, 1500), language);
    const player = new Audio(`data:${mime};base64,${audio}`);
    await player.play();
    return player;
  };
  const translate = (doc, language) => haqApi.translate(doc, language);
  // The spoken summary also mentions what changed when an older notification of the same scheme is loaded.
  const summarize = (doc, language) => {
    const sameName = (d) => d.scheme.name.trim().toLowerCase() === doc.scheme.name.trim().toLowerCase();
    const older = documents
      .filter((d) => d.doc_id !== doc.doc_id && sameName(d) && (d.scheme.publication_date ?? '') < (doc.scheme.publication_date ?? '\uffff'))
      .sort((a, b) => (b.scheme.publication_date ?? '').localeCompare(a.scheme.publication_date ?? ''))[0] ?? null;
    return haqApi.explain({ notification: doc, older, citizen: citizenDetailsOnly(profile), language });
  };

  const goUpload = () => { scrollToSection('home'); };

  return (
    <div className="app">
      <TopNav lang={lang} onLang={setLang} theme={theme} onTheme={toggleTheme} health={health} active={active} onClear={clearData} canClear={documents.length > 0 || chat.length > 0} />

      <main>
        <NotificationIntake
          lang={lang}
          onLang={setLang}
          progress={progress}
          text={text}
          onTextChange={setText}
          file={file}
          onFileChange={setFile}
          onExtract={extract}
          extracting={extracting}
          error={importError}
          onDismissError={() => setImportError('')}
          notes={notes}
          skippedClauses={skippedClauses}
        />

        <div className="container">
          {documents.length === 0 ? (
            <Section id="snapshot" eyebrow={t(lang, 'howEyebrow')} title={t(lang, 'howTitle')} sub={t(lang, 'howSub')}>
              <HowItWorks lang={lang} />
            </Section>
          ) : (
            <>
              <Section id="snapshot" step="01" eyebrow={t(lang, 'navOverview')} title={t(lang, 'overviewTitle')}>
                <NotificationShelf lang={lang} documents={documents} focusId={focusDoc?.doc_id} onFocus={setFocusId} onRemove={removeDocument} hrefFor={hrefFor} onAdd={goUpload} />
                {focusDoc ? <SchemeSnapshot key={focusDoc.doc_id} lang={lang} doc={focusDoc} hrefFor={hrefFor} onSummary={summarize} onSpeak={speak} voiceOn={health.voiceReady} /> : null}
                {focusDoc ? <ClauseTranslation lang={lang} doc={focusDoc} href={hrefFor(focusDoc.doc_id)} onTranslate={translate} /> : null}
              </Section>

              <Section id="changes" step="02" eyebrow={t(lang, 'navChanges')} title={t(lang, 'changesTitle')} sub={t(lang, 'changesSub')}>
                <ChangeIntelligence
                  lang={lang}
                  documents={documents}
                  oldId={pair[0]}
                  newId={pair[1]}
                  onPick={(oldId, newId) => setPair([oldId, newId])}
                  result={comparison}
                  impact={impact}
                  loading={comparing}
                  error={compareError}
                  hrefFor={hrefFor}
                  onAdd={goUpload}
                />
              </Section>

              <Section id="eligibility" step="03" eyebrow={t(lang, 'navEligibility')} title={t(lang, 'eligTitle')} sub={t(lang, 'eligSub')}>
                <EligibilityCheck
                  lang={lang}
                  documents={documents}
                  docId={eligDocId}
                  onPickDoc={(id) => { setEligDocId(id); setEligibility(null); setPlan(null); }}
                  profile={profile}
                  onProfile={setProfile}
                  onCheck={checkEligibility}
                  checking={checking}
                  result={eligibility}
                  error={eligError}
                  hrefFor={hrefFor}
                  onExplain={explainEligibility}
                  onSpeak={speak}
                  voiceOn={health.voiceReady}
                />
              </Section>

              {plan ? (
                <Section id="action-plan" step="04" eyebrow={t(lang, 'navChecklist')} title={t(lang, 'checklistTitle')} sub={t(lang, 'checklistSub')}>
                  <ActionAgent lang={lang} plan={plan} href={hrefFor(plan.doc_id)} onTick={() => setActed(true)} onSpeak={speak} voiceOn={health.voiceReady} />
                </Section>
              ) : null}
            </>
          )}
        </div>

        <div className="container"><Footer lang={lang} /></div>
      </main>

      <VoiceAssistant
        lang={lang}
        onLang={setLang}
        open={chatOpen}
        onOpen={() => setChatOpen(true)}
        onClose={() => setChatOpen(false)}
        messages={chat}
        onSend={sendChat}
        sending={chatSending}
        hasDocuments={documents.length > 0}
        voiceOn={health.voiceReady}
        onTranscribe={transcribe}
        onSpeak={speak}
        readAloud={readAloud}
        onReadAloud={setReadAloud}
      />
      <MobileTabs lang={lang} active={active} onAsk={() => setChatOpen(true)} />
      <Toasts toasts={toasts} onDismiss={dismiss} />
      {!online ? <p className="net-banner" role="status">{t(lang, 'offlineNote')}</p> : null}
    </div>
  );
}
