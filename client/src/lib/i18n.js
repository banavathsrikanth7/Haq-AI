// Haq AI page text in English, Telugu and Hindi. Clauses from a notification stay in its own language
// unless the citizen turns on clause translation (numbers are verified on the server).

export const LANGS = [
  { code: 'en', label: 'English', short: 'EN' },
  { code: 'te', label: 'తెలుగు', short: 'తె' },
  { code: 'hi', label: 'हिंदी', short: 'हि' },
];

const en = {
  navHome: 'Home', navOverview: 'Your scheme', navChanges: 'What changed', navEligibility: 'Do I qualify?', navChecklist: 'Action plan', ask: 'Ask Haq',
  heroBadge: 'For every citizen · English · తెలుగు · हिंदी',
  heroTitle: 'Know your rights.', heroTitleAccent: 'In your language.',
  heroSub: 'Upload an official government scheme or scholarship document. Haq AI shows what changed, whether you qualify and exactly what to do next — with the page it came from.',
  readingOn: 'Ready to read notifications', readingOff: 'Gemini key needed', serverDown: 'Haq server not running', voiceOn: 'Voice on',
  lightMode: 'Light mode', darkMode: 'Dark mode', clear: 'Start over',
  step1: 'Upload document', step1Sub: 'Official PDF, photo or text', step2: 'Check eligibility', step2Sub: 'Answer a few questions', step3: 'Act on it', step3Sub: 'Checklist & apply link',
  dropTitle: 'Drop the scheme notification here', dropOr: 'or', browse: 'Choose a file', dropHint: 'PDF, photo (PNG/JPG) or TXT · up to 15 MB',
  pasteToggle: 'Paste text instead', pasteHide: 'Upload a file instead', pastePlaceholder: 'Paste the eligibility, benefits and “how to apply” sections of the notification…',
  read: 'Read notification', reading: 'Reading the notification…', privacy: 'Gemini reads it once for you. Haq AI keeps nothing on its server.',
  readStages: ['Checking it is an official document', 'Finding eligibility rules', 'Collecting benefits and deadlines', 'Validating every amount and date', 'Linking each item to its page'],
  onlyPolicy: 'Only government scheme, scholarship or policy documents are accepted.',
  how1: 'Upload', how1Sub: 'Guidelines or notification from any .gov.in site', how2: 'Understand', how2Sub: 'Rules, benefits and changes in plain words', how3: 'Act', how3Sub: 'Your eligibility, documents and the apply link',
  trust1: 'Every answer shows its page', trust2: 'Eligibility checked by code, not guessed', trust3: 'No sign-up, nothing stored',
  overviewTitle: 'Your scheme at a glance', schemesLoaded: 'Documents', addAnother: 'Add another version',
  mRules: 'Eligibility rules', mBenefit: 'Biggest benefit', mDeadline: 'Next deadline', mDocs: 'Documents needed', daysLeft: (n) => `${n} day${n === 1 ? '' : 's'} left`, none: '—', notStated: 'Not stated',
  rulesTitle: 'Who can apply', benefitsTitle: 'What you get', deadlinesTitle: 'Important dates', notesTitle: 'Things the notification did not make clear',
  changesTitle: 'What changed', changesSub: 'Old and new versions compared line by line.', oldV: 'Old version', newV: 'New version',
  needTwo: 'Upload an older and a newer version of the same scheme to see exactly what changed.', needTwoCta: 'Upload another version',
  differentSchemes: 'These two documents look like different schemes.', all: 'All', added: 'Added', removed: 'Removed', modified: 'Changed', noDiff: 'No differences found between these versions.',
  before: 'Before', after: 'Now', whoAffected: 'Who is affected', illustrative: 'Example person', you: 'You',
  eligTitle: 'Do I qualify?', eligSub: 'We only ask what this scheme’s rules need. Skip anything you don’t want to share.',
  pickDoc: 'Scheme', questionOf: (a, b) => `Question ${a} of ${b}`, next: 'Next', back: 'Back', skip: 'Skip', seeResult: 'See my result', editAnswers: 'Change answers', startCheck: 'Start',
  checking: 'Checking…', noRulesDoc: 'This document has no rules we can check automatically. See “Things the document did not make clear”.',
  eligible: 'You are eligible', not_eligible: 'Not eligible', need_more_info: 'A few details missing', rule_not_verified: 'No rules found',
  eligibleSub: 'You meet every condition in this document.', notEligibleSub: 'At least one condition is not met.', moreInfoSub: 'Answer the missing questions to finish.',
  conditionsMet: (a, b) => `${a} of ${b} conditions met`, ruleLbl: 'Rule', youLbl: 'You', explainIn: 'Explain this to me',
  checklistTitle: 'Your action plan', checklistSub: 'What to do, in order, by when — taken from the notification.', docsToCollect: 'Documents to collect', steps: 'Steps to apply',
  applyPortal: 'Apply on the official portal', applyBy: 'Apply by', noDeadline: 'Deadline not stated in the document', noApplyUrl: 'The document does not print an application link. Check the department website.', ready: (a, b) => `${a}/${b} ready`,
  askTitle: 'Ask Haq', askSubOn: 'Answers from your notifications only, with the page for each fact.', askSubOff: 'Upload a scheme document for answers about your case.',
  welcome: "Hi! I'm Haq AI. Ask me what changed, whether you qualify, or what to do next. I only answer from the official documents you give me.",
  askPlaceholder: 'Type your question…', send: 'Send', thinking: 'Thinking…', listen: 'Speak', listening: 'Listening… tap to stop', play: 'Play answer', voiceOff: 'Voice needs SARVAM_API_KEY on the server',
  source: 'Source', page: 'p.', close: 'Close',
  footer: 'Haq AI · Know your rights in your language', footerNote: 'Informational only · Not an official government website · The department and its portal have the final word.',
  added_toast: (name) => `Read “${name}”`, duplicate: 'This document is already loaded.',
  // Feature 4 — impact in rupees
  impactTitle: 'Who gains and who loses', impactSub: 'Worked out from the amounts printed in both notifications.', perYear: 'a year', oneTime: 'one-time',
  wasGetting: 'Before', nowGets: 'Now', unknownAmount: 'Need details', impactSummary: (gain, lose, same) => `${gain} gain · ${lose} lose · ${same} unchanged`,
  // Feature 5 — action plan
  addCalendar: 'Add dates to my calendar', due: 'Due', urgency_now: 'Do now', urgency_soon: 'This month', urgency_later: 'Later', urgency_anytime: 'Any time',
  planEmpty: 'Check your eligibility to get a plan made for you.',
  // Feature 3 — voice
  cond_passed: 'met', cond_failed: 'not met', cond_unknown: 'not known yet',
  generalInfo: 'General information · upload the notification to verify',
  howEyebrow: 'How it works', howTitle: 'From notification to action in three steps', howSub: 'Haq AI reads the official notification, checks each rule against your details in code, and turns the result into a plan you can follow.',
  listenBtn: 'Listen', stopBtn: 'Stop', readAloud: 'Read answers aloud', askByVoice: 'Ask by voice', voiceNeedsKey: 'Voice needs SARVAM_API_KEY on the server',
  // Clause translation that keeps legal conditions
  translateTo: (name) => `Read clauses in ${name}`, translating: 'Translating…', showOriginal: 'Show original wording',
  keptOriginal: 'Original wording kept: a number did not match after translation.', translatedNote: (n) => `${n} clause${n === 1 ? '' : 's'} kept in original wording to protect the numbers.`,
  translatedOk: 'Every number and page checked against the notification.',

};

const te = {
  ...en,
  navHome: 'హోమ్', navOverview: 'మీ పథకం', navChanges: 'ఏమి మారింది', navEligibility: 'నేను అర్హుడినా?', navChecklist: 'కార్యాచరణ ప్రణాళిక', ask: 'హక్‌ని అడగండి',
  heroTitle: 'మీ హక్కులు తెలుసుకోండి.', heroTitleAccent: 'మీ భాషలో.',
  heroSub: 'అధికారిక ప్రభుత్వ పథకం లేదా స్కాలర్‌షిప్ పత్రాన్ని అప్‌లోడ్ చేయండి. ఏమి మారింది, మీరు అర్హులా, తర్వాత ఏమి చేయాలో — పేజీ నంబర్‌తో సహా హక్ AI చూపిస్తుంది.',
  readingOn: 'నోటిఫికేషన్లు చదవడానికి సిద్ధం', readingOff: 'Gemini కీ కావాలి', serverDown: 'హక్ సర్వర్ నడవడం లేదు', voiceOn: 'వాయిస్ ఆన్', lightMode: 'లైట్ మోడ్', darkMode: 'డార్క్ మోడ్', clear: 'మళ్ళీ మొదలు',
  step1: 'పత్రం అప్‌లోడ్', step1Sub: 'అధికారిక PDF, ఫోటో లేదా టెక్స్ట్', step2: 'అర్హత చూడండి', step2Sub: 'కొన్ని ప్రశ్నలకు సమాధానం', step3: 'చర్య తీసుకోండి', step3Sub: 'చెక్‌లిస్ట్ & దరఖాస్తు లింక్',
  dropTitle: 'అధికారిక పత్రాన్ని ఇక్కడ వదలండి', dropOr: 'లేదా', browse: 'ఫైల్ ఎంచుకోండి', pasteToggle: 'టెక్స్ట్ పేస్ట్ చేయండి', pasteHide: 'ఫైల్ అప్‌లోడ్ చేయండి',
  read: 'పత్రం చదవండి', reading: 'పత్రం చదువుతోంది…', privacy: 'ఈ అభ్యర్థనకు మాత్రమే AI చదువుతుంది. మా సర్వర్‌లో ఏదీ నిల్వ చేయబడదు.',
  readStages: ['అధికారిక పత్రమా అని చూస్తోంది', 'అర్హత నియమాలు వెతుకుతోంది', 'ప్రయోజనాలు, గడువులు సేకరిస్తోంది', 'ప్రతి మొత్తం, తేదీ ధృవీకరిస్తోంది', 'ప్రతి అంశాన్ని పేజీకి జతచేస్తోంది'],
  how1: 'అప్‌లోడ్', how1Sub: 'ఏదైనా .gov.in సైట్ నుండి మార్గదర్శకాలు', how2: 'అర్థం చేసుకోండి', how2Sub: 'నియమాలు, ప్రయోజనాలు, మార్పులు సులభ మాటల్లో', how3: 'చర్య', how3Sub: 'మీ అర్హత, పత్రాలు, దరఖాస్తు లింక్',
  trust1: 'ప్రతి సమాధానానికి పేజీ', trust2: 'అర్హత కోడ్‌తో తనిఖీ', trust3: 'సైన్-అప్ లేదు, నిల్వ లేదు',
  overviewTitle: 'మీ పథకం ఒక్క చూపులో', mRules: 'అర్హత నియమాలు', mBenefit: 'అతిపెద్ద ప్రయోజనం', mDeadline: 'తదుపరి గడువు', mDocs: 'కావాల్సిన పత్రాలు', daysLeft: (n) => `${n} రోజులు మిగిలాయి`,
  rulesTitle: 'ఎవరు దరఖాస్తు చేయవచ్చు', benefitsTitle: 'మీకు ఏమి లభిస్తుంది', deadlinesTitle: 'ముఖ్యమైన తేదీలు',
  changesTitle: 'ఏమి మారింది', oldV: 'పాత వెర్షన్', newV: 'కొత్త వెర్షన్', all: 'అన్నీ', added: 'జోడించబడింది', removed: 'తొలగించబడింది', modified: 'మారింది', before: 'ముందు', after: 'ఇప్పుడు', whoAffected: 'ఎవరిపై ప్రభావం', you: 'మీరు', illustrative: 'ఉదాహరణ వ్యక్తి',
  eligTitle: 'నేను అర్హుడినా?', eligSub: 'ఈ పథకం నియమాలకు కావాల్సినవి మాత్రమే అడుగుతాం.', next: 'తర్వాత', back: 'వెనక్కి', skip: 'దాటవేయి', seeResult: 'ఫలితం చూడండి', editAnswers: 'సమాధానాలు మార్చండి', startCheck: 'మొదలు',
  eligible: 'మీరు అర్హులు', not_eligible: 'అర్హులు కాదు', need_more_info: 'కొన్ని వివరాలు లేవు', rule_not_verified: 'నియమాలు దొరకలేదు', explainIn: 'తెలుగులో వివరించండి',
  checklistTitle: 'మీ చెక్‌లిస్ట్', docsToCollect: 'సేకరించాల్సిన పత్రాలు', steps: 'దరఖాస్తు దశలు', applyPortal: 'అధికారిక పోర్టల్‌లో దరఖాస్తు', applyBy: 'చివరి తేదీ', noDeadline: 'పత్రంలో గడువు లేదు',
  askTitle: 'హక్‌ని అడగండి', welcome: 'నమస్తే! నేను హక్ AI. ఏమి మారింది, మీరు అర్హులా, తర్వాత ఏమి చేయాలో అడగండి. మీరు ఇచ్చిన అధికారిక పత్రాల నుంచే సమాధానం ఇస్తాను.',
  askPlaceholder: 'మీ ప్రశ్న టైప్ చేయండి…', send: 'పంపండి', thinking: 'ఆలోచిస్తోంది…', listen: 'మాట్లాడండి', play: 'సమాధానం వినండి', close: 'మూసివేయి',
  footer: 'హక్ AI · మీ హక్కులు మీ భాషలో', footerNote: 'సమాచారం కోసం మాత్రమే · అధికారిక ప్రభుత్వ వెబ్‌సైట్ కాదు',
  impactTitle: 'ఎవరికి లాభం, ఎవరికి నష్టం', impactSub: 'రెండు నోటిఫికేషన్లలో ముద్రించిన మొత్తాల నుండి లెక్కించబడింది.', perYear: 'సంవత్సరానికి', oneTime: 'ఒకేసారి',
  wasGetting: 'ముందు', nowGets: 'ఇప్పుడు', unknownAmount: 'వివరాలు కావాలి', impactSummary: (g, l, s) => `${g} లాభం · ${l} నష్టం · ${s} మార్పు లేదు`,
  addCalendar: 'తేదీలను నా క్యాలెండర్‌లో చేర్చు', due: 'గడువు', urgency_now: 'ఇప్పుడే', urgency_soon: 'ఈ నెల', urgency_later: 'తర్వాత', urgency_anytime: 'ఎప్పుడైనా',
  planEmpty: 'మీ కోసం ప్రణాళిక కోసం అర్హత చూడండి.', cond_passed: 'సరిపోయింది', cond_failed: 'సరిపోలేదు', cond_unknown: 'ఇంకా తెలియదు', generalInfo: 'సాధారణ సమాచారం · ధృవీకరణకు నోటిఫికేషన్ అప్‌లోడ్ చేయండి', howEyebrow: 'ఇది ఎలా పనిచేస్తుంది', howTitle: 'నోటిఫికేషన్ నుండి చర్య వరకు మూడు దశల్లో', howSub: 'హక్ AI అధికారిక నోటిఫికేషన్ చదివి, ప్రతి నియమాన్ని మీ వివరాలతో కోడ్‌లో సరిచూసి, మీరు అనుసరించగల ప్రణాళికగా మారుస్తుంది.', listenBtn: 'వినండి', stopBtn: 'ఆపు', readAloud: 'సమాధానాలు గట్టిగా చదువు', askByVoice: 'మాటతో అడగండి',
  translateTo: (name) => `నిబంధనలు ${name}లో చదవండి`, translating: 'అనువదిస్తోంది…', showOriginal: 'అసలు పదాలు చూపు',
  keptOriginal: 'అసలు పదాలు ఉంచబడ్డాయి: అనువాదంలో ఒక సంఖ్య సరిపోలలేదు.', translatedNote: (n) => `సంఖ్యలను కాపాడటానికి ${n} నిబంధనలు అసలు పదాల్లో ఉంచబడ్డాయి.`,
  translatedOk: 'ప్రతి సంఖ్య, పేజీ నోటిఫికేషన్‌తో సరిచూడబడింది.',

};

const hi = {
  ...en,
  navHome: 'होम', navOverview: 'आपकी योजना', navChanges: 'क्या बदला', navEligibility: 'क्या मैं पात्र हूँ?', navChecklist: 'कार्य योजना', ask: 'हक़ से पूछें',
  heroTitle: 'अपने हक़ जानिए।', heroTitleAccent: 'अपनी भाषा में।',
  heroSub: 'सरकारी योजना या छात्रवृत्ति का आधिकारिक दस्तावेज़ अपलोड करें। हक़ AI बताएगा क्या बदला, क्या आप पात्र हैं और आगे क्या करना है — पेज नंबर के साथ।',
  readingOn: 'अधिसूचना पढ़ने को तैयार', readingOff: 'Gemini कुंजी चाहिए', serverDown: 'हक़ सर्वर नहीं चल रहा', voiceOn: 'आवाज़ चालू', lightMode: 'लाइट मोड', darkMode: 'डार्क मोड', clear: 'फिर से शुरू',
  step1: 'दस्तावेज़ अपलोड', step1Sub: 'आधिकारिक PDF, फ़ोटो या टेक्स्ट', step2: 'पात्रता जाँचें', step2Sub: 'कुछ सवालों के जवाब', step3: 'आगे बढ़ें', step3Sub: 'चेकलिस्ट और आवेदन लिंक',
  dropTitle: 'आधिकारिक दस्तावेज़ यहाँ छोड़ें', dropOr: 'या', browse: 'फ़ाइल चुनें', pasteToggle: 'टेक्स्ट पेस्ट करें', pasteHide: 'फ़ाइल अपलोड करें',
  read: 'दस्तावेज़ पढ़ें', reading: 'दस्तावेज़ पढ़ रहा है…', privacy: 'सिर्फ़ इस अनुरोध के लिए AI पढ़ता है। हमारे सर्वर पर कुछ सहेजा नहीं जाता।',
  readStages: ['जाँच रहा है कि यह आधिकारिक दस्तावेज़ है', 'पात्रता नियम ढूँढ रहा है', 'लाभ और तिथियाँ जुटा रहा है', 'हर राशि और तारीख़ जाँच रहा है', 'हर बात को उसके पेज से जोड़ रहा है'],
  how1: 'अपलोड', how1Sub: 'किसी भी .gov.in साइट से दिशानिर्देश', how2: 'समझें', how2Sub: 'नियम, लाभ और बदलाव आसान शब्दों में', how3: 'आगे बढ़ें', how3Sub: 'आपकी पात्रता, दस्तावेज़ और आवेदन लिंक',
  trust1: 'हर जवाब के साथ पेज', trust2: 'पात्रता कोड से जाँची', trust3: 'कोई साइन-अप नहीं, कुछ सहेजा नहीं',
  overviewTitle: 'आपकी योजना एक नज़र में', mRules: 'पात्रता नियम', mBenefit: 'सबसे बड़ा लाभ', mDeadline: 'अगली अंतिम तिथि', mDocs: 'ज़रूरी दस्तावेज़', daysLeft: (n) => `${n} दिन बाकी`,
  rulesTitle: 'कौन आवेदन कर सकता है', benefitsTitle: 'आपको क्या मिलेगा', deadlinesTitle: 'ज़रूरी तारीख़ें',
  changesTitle: 'क्या बदला', oldV: 'पुराना संस्करण', newV: 'नया संस्करण', all: 'सभी', added: 'जोड़ा गया', removed: 'हटाया गया', modified: 'बदला', before: 'पहले', after: 'अब', whoAffected: 'किस पर असर', you: 'आप', illustrative: 'उदाहरण व्यक्ति',
  eligTitle: 'क्या मैं पात्र हूँ?', eligSub: 'हम सिर्फ़ वही पूछते हैं जो इस योजना के नियमों के लिए ज़रूरी है।', next: 'आगे', back: 'पीछे', skip: 'छोड़ें', seeResult: 'नतीजा देखें', editAnswers: 'जवाब बदलें', startCheck: 'शुरू करें',
  eligible: 'आप पात्र हैं', not_eligible: 'पात्र नहीं', need_more_info: 'कुछ जानकारी बाकी', rule_not_verified: 'नियम नहीं मिले', explainIn: 'हिंदी में समझाएँ',
  checklistTitle: 'आपकी चेकलिस्ट', docsToCollect: 'ज़रूरी दस्तावेज़', steps: 'आवेदन के चरण', applyPortal: 'आधिकारिक पोर्टल पर आवेदन करें', applyBy: 'अंतिम तिथि', noDeadline: 'दस्तावेज़ में अंतिम तिथि नहीं दी गई',
  askTitle: 'हक़ से पूछें', welcome: 'नमस्ते! मैं हक़ AI हूँ। पूछें कि क्या बदला, क्या आप पात्र हैं, या आगे क्या करना है। मैं सिर्फ़ आपके दिए आधिकारिक दस्तावेज़ों से जवाब देता हूँ।',
  askPlaceholder: 'अपना सवाल लिखें…', send: 'भेजें', thinking: 'सोच रहा है…', listen: 'बोलें', play: 'जवाब सुनें', close: 'बंद करें',
  footer: 'हक़ AI · अपने हक़ अपनी भाषा में', footerNote: 'केवल जानकारी के लिए · आधिकारिक सरकारी वेबसाइट नहीं',
  impactTitle: 'किसे फ़ायदा, किसे नुकसान', impactSub: 'दोनों अधिसूचनाओं में छपी राशियों से निकाला गया।', perYear: 'प्रति वर्ष', oneTime: 'एक बार',
  wasGetting: 'पहले', nowGets: 'अब', unknownAmount: 'विवरण चाहिए', impactSummary: (g, l, s) => `${g} को फ़ायदा · ${l} को नुकसान · ${s} में बदलाव नहीं`,
  addCalendar: 'तारीखें मेरे कैलेंडर में जोड़ें', due: 'नियत तिथि', urgency_now: 'अभी', urgency_soon: 'इस महीने', urgency_later: 'बाद में', urgency_anytime: 'कभी भी',
  planEmpty: 'अपनी योजना पाने के लिए पात्रता जाँचें।', cond_passed: 'पूरी', cond_failed: 'पूरी नहीं', cond_unknown: 'अभी पता नहीं', generalInfo: 'सामान्य जानकारी · पुष्टि के लिए अधिसूचना अपलोड करें', howEyebrow: 'यह कैसे काम करता है', howTitle: 'अधिसूचना से कार्रवाई तक तीन चरणों में', howSub: 'हक़ AI आधिकारिक अधिसूचना पढ़ता है, हर नियम को आपके विवरण से कोड में मिलाता है और नतीजे को एक योजना में बदलता है जिसे आप अपना सकें।', listenBtn: 'सुनें', stopBtn: 'रोकें', readAloud: 'जवाब बोलकर सुनाएँ', askByVoice: 'बोलकर पूछें',
  translateTo: (name) => `शर्तें ${name} में पढ़ें`, translating: 'अनुवाद हो रहा है…', showOriginal: 'मूल शब्द दिखाएँ',
  keptOriginal: 'मूल शब्द रखे गए: अनुवाद में एक संख्या मेल नहीं खाई।', translatedNote: (n) => `संख्याएँ सुरक्षित रखने के लिए ${n} शर्तें मूल शब्दों में रखी गईं।`,
  translatedOk: 'हर संख्या और पेज अधिसूचना से मिलाया गया।',

};

export const STRINGS = { en, te, hi };

// One friendly question per profile field (used by the eligibility wizard).
export const QUESTIONS = {
  en: {
    age: 'How old are you?', annual_family_income_inr: "What is your family's total income in a year?", category: 'Which category do you belong to?',
    education_level: 'What are you studying now?', state: 'Which state do you live in?', gender: 'What is your gender?', occupation: 'What do you do?',
    course: 'Which course are you in?', institution_type: 'Is your college or school government or private?', disability: 'Do you have a certified disability?', last_exam_percent: 'What percentage did you get in your last exam?',
  },
  te: {
    age: 'మీ వయస్సు ఎంత?', annual_family_income_inr: 'మీ కుటుంబ సంవత్సర ఆదాయం ఎంత?', category: 'మీరు ఏ వర్గానికి చెందినవారు?', education_level: 'ఇప్పుడు మీరు ఏమి చదువుతున్నారు?',
    state: 'మీరు ఏ రాష్ట్రంలో ఉంటారు?', gender: 'మీ లింగం?', occupation: 'మీరు ఏమి చేస్తారు?', course: 'మీ కోర్సు ఏది?', institution_type: 'మీ కళాశాల ప్రభుత్వమా, ప్రైవేటా?',
    disability: 'మీకు ధృవీకరించిన వైకల్యం ఉందా?', last_exam_percent: 'చివరి పరీక్షలో మీ శాతం ఎంత?',
  },
  hi: {
    age: 'आपकी उम्र क्या है?', annual_family_income_inr: 'आपके परिवार की सालाना आय कितनी है?', category: 'आप किस वर्ग से हैं?', education_level: 'आप अभी क्या पढ़ रहे हैं?',
    state: 'आप किस राज्य में रहते हैं?', gender: 'आपका लिंग?', occupation: 'आप क्या करते हैं?', course: 'आपका कोर्स कौन सा है?', institution_type: 'आपका कॉलेज सरकारी है या निजी?',
    disability: 'क्या आपके पास प्रमाणित दिव्यांगता है?', last_exam_percent: 'पिछली परीक्षा में आपके कितने प्रतिशत आए?',
  },
};

export const SUGGESTIONS = {
  en: ['Am I eligible for this scheme?', 'What changed in the new guidelines?', 'Which documents do I need to apply?', 'What is the last date to apply?'],
  te: ['నేను ఈ పథకానికి అర్హుడినా?', 'కొత్త మార్గదర్శకాలలో ఏమి మారింది?', 'దరఖాస్తుకు ఏ పత్రాలు కావాలి?', 'దరఖాస్తు చివరి తేదీ ఎప్పుడు?'],
  hi: ['क्या मैं इस योजना के लिए पात्र हूँ?', 'नए दिशानिर्देशों में क्या बदला?', 'आवेदन के लिए कौन से दस्तावेज़ चाहिए?', 'आवेदन की अंतिम तिथि क्या है?'],
};

export const t = (lang, key, ...args) => {
  const value = (STRINGS[lang] ?? en)[key] ?? en[key] ?? key;
  return typeof value === 'function' ? value(...args) : value;
};
