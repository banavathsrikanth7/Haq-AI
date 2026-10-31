# Haq AI — your rights under every scheme notification, in your language

**Team GenZ GenAI · Forge Gen AI Buildathon · Theme 1, Problem 1**

Government schemes change through notifications: an income limit is raised, an amount is revised, a new document is asked for. Most citizens never learn what changed, whether it now covers them, or what to do before the last date. Haq ("right") reads the official notification, works out what changed and what it means for one citizen in rupees, and gives a dated plan — in English, Telugu or Hindi, by text or voice, with the page of the notification behind every fact.

---

## The five features and where they live

| # | Feature | What the citizen gets | Computed by | Shown in |
|---|---|---|---|---|
| 1 | **Policy Change Intelligence Engine** | Every rule, benefit, date, document and step that was added, withdrawn or revised between two notifications of a scheme — before → now, % change, page in each version | `server/src/engine/changeIntelligence.js` | `ChangeIntelligence.jsx` |
| 2 | **Personalized Eligibility** | Asks only the questions this notification's rules need; verdict with every condition marked met / not met / not known, plus follow-up questions | `server/src/engine/eligibility.js` | `EligibilityCheck.jsx` |
| 3 | **Voice agent** | Ask by speaking (Telugu, Hindi, English), answers read aloud automatically, **Listen** on the verdict and on the action plan | `server/src/ai/haqGateway.js` (Sarvam) + `/api/ask` | `VoiceAssistant.jsx`, `ListenButton.jsx` |
| 4 | **Policy Impact Analyzer** | Who gains and who loses from the change — you and three example citizens — with ₹ per year before, now and the difference, and a plain sentence on what it means | `server/src/engine/impactAnalyzer.js` | `ChangeIntelligence.jsx` |
| 5 | **Citizen Action Agent** | Ordered plan: confirm missing details, or why you do not qualify, or collect documents → follow steps → submit by the last date → official portal; each with due date, urgency and page; document checklist; calendar file (.ics) | `server/src/engine/actionAgent.js` | `ActionAgent.jsx` |

Also covered from the differentiation table:

- **Evidence with every answer** — each clause carries the PDF page and the exact quote; the page chip opens the uploaded PDF at that page.
- **Legal conditions preserved across translation** — `POST /api/translate` translates clauses into Telugu or Hindi, then `server/src/engine/clauseTranslation.js` checks that every number (₹ amount, age, %, date, also in Telugu/Devanagari digits) is still there. If one is missing or changed, the original wording is shown with a warning. Pages and quotes are always kept.
- **Conversational explanation** — the assistant answers only from `citizenContext`, which code builds from the notifications: rules, verdict, revisions, impact and the action plan.

## Where Gemini stops and code takes over

```
notification (PDF / photo / text)
   │  Gemini reads it into clauses (POLICY_READER)              ← ai/haqGateway.js
   ▼
clause cleaner  ("₹2.5 lakh" → 250000, "14/09/2026" → 2026-09-14)  ← intake/clauseCleaner.js
   ▼
clause checks   (each rule, benefit, date, document, step on its own;
                 a clause that fails is skipped and listed)     ← intake/documentIntake.js, models/policySchemas.js
   ▼
engine (plain code, no AI): changes · eligibility · impact ₹ · action plan · translation number check
   ▼
Gemini explains the computed facts in EN / TE / HI (CITIZEN_HELPER), Sarvam speaks them
```

Gemini never decides eligibility, never does arithmetic and never invents a date. If something is not printed in the notification, Haq says so.

## Folders

```
HaqAI/
├── Prompts/                      # Review copies of the three Gemini instructions (a test keeps them identical)
│   ├── policy-reader.txt
│   ├── citizen-helper.txt
│   └── clause-translator.txt
├── server/
│   ├── scripts/model-speed-test.js     # Which Gemini model answers fastest with your key
│   ├── src/
│   │   ├── index.js                    # Starts Haq AI
│   │   ├── haqServer.js                # Web server: CORS, logging without personal data, {message, code} problems
│   │   ├── settings.js                 # Reads server/.env
│   │   ├── problems.js                 # HaqProblem, KeyNotSet, NotAboutSchemes
│   │   ├── routes/haqRoutes.js         # One endpoint per feature
│   │   ├── ai/haqGateway.js            # Only file that calls Gemini and Sarvam
│   │   ├── ai/instructions.js          # POLICY_READER, CITIZEN_HELPER, CLAUSE_TRANSLATOR
│   │   ├── intake/documentIntake.js    # Upload checks → checked SchemeNotification
│   │   ├── intake/clauseCleaner.js     # Indian amounts, dates and wording → engine fields
│   │   ├── models/policySchemas.js     # Shapes of clauses, notifications, citizen details, requests
│   │   └── engine/
│   │       ├── changeIntelligence.js   # Feature 1
│   │       ├── eligibility.js          # Feature 2
│   │       ├── impactAnalyzer.js       # Feature 4
│   │       ├── actionAgent.js          # Feature 5
│   │       ├── clauseTranslation.js    # Number-checked translation
│   │       ├── citizenContext.js       # Facts the assistant may use
│   │       ├── ruleText.js, rupees.js  # Readable rules, ₹ with lakh grouping
│   └── tests/                          # engine, intake, gateway, routes (synthetic fixture only)
└── client/
    ├── src/App.jsx
    ├── src/components/   NotificationIntake · NotificationShelf · SchemeSnapshot · ClauseTranslation
    │                     ChangeIntelligence · EligibilityCheck · ActionAgent · VoiceAssistant · ListenButton · Shell · Icon
    ├── src/lib/          haqApi.js (server calls) · schemeMath.js (₹, dates, .ics) · i18n.js (EN/TE/HI) · hooks.js
    └── tests/schemeMath.test.js
```

## Getting Haq running on your laptop

Needs Node 20 or newer.

**Keys** — in `server/`, copy `.env.example` to `.env` and fill in:

| Variable | Needed for | Default |
|---|---|---|
| `AI_API_KEY` | Reading notifications, answers, translation (Gemini, from aistudio.google.com/apikey) | — |
| `AI_MODEL` | Gemini model | `gemini-3.5-flash-lite` (`gemini-3.8-flash` reads long, table-heavy notifications better) |
| `SARVAM_API_KEY` | Voice in and out (dashboard.sarvam.ai) | voice off |
| `SARVAM_STT_MODEL` / `SARVAM_TTS_MODEL` / `SARVAM_SPEAKER` | Voice models | `saaras:v4` / `bulbul:v3` / `priya` (retired names are upgraded automatically) |
| `CLIENT_ORIGIN` | Page allowed to call the server | `http://localhost:5173` (any localhost port works) |
| `PORT` | Server port | `8000` |

`client/.env` (optional): `SERVER_URL=http://localhost:8000`, `CLIENT_PORT=5173`.
Keys stay in `server/.env`, which git ignores; the page never sees them.

**Start** (two terminals):

```bash
cd server && npm install && npm start      # "Haq AI is running on http://localhost:8000"
cd client && npm install && npm run dev    # open http://localhost:5173
```

The chip in the top bar says **Ready to read notifications** when the Gemini key works, **Gemini key needed** when it is missing, and **Haq server not running** when the page cannot reach the server.

**Model speed** — `cd server && node scripts/model-speed-test.js`.

## A demo run with real notifications

Haq ships with **no scheme data**; everything comes from what you upload (the buildathon does not allow dummy data).

1. Download two notifications of the same scheme from scholarships.gov.in, myscheme.gov.in, egazette.gov.in, pib.gov.in or a state portal — ideally an older and a newer one where a limit or amount changed.
2. Drop the first one on the upload card, press **Read**, then add the second.
3. **What changed** lists the revisions; **Who gains and who loses** shows the rupee effect.
4. Answer **Do I qualify?** → verdict → **Listen**.
5. **Your action plan** → **Add dates to my calendar**.
6. Switch to తెలుగు or हिंदी → **Read clauses in …** → ask by voice.

## Endpoints

All errors come back as `{ "message": "...", "code": "..." }`.

| Method | Path | Body → reply |
|---|---|---|
| GET | `/api/health` | → `{status, reading_ready, voice_ready}` |
| POST | `/api/notifications/read` | multipart `file` and/or `text` → `{notification, skipped_clauses, clause_count}` |
| POST | `/api/changes` | `{older, newer}` → `{revisions, tally, same_scheme, swapped, older_label, newer_label}` |
| POST | `/api/eligibility` | `{notification, citizen}` → `{verdict, conditions, missing_fields, follow_up_questions}` |
| POST | `/api/impact` | `{older, newer, citizen?}` → `{profiles[{label, transition, benefit_before, benefit_after, yearly_gain, what_it_means, reasons}], summary}` |
| POST | `/api/action-plan` | `{notification, citizen}` → `{verdict, headline, actions[{kind, title, detail, due, urgency, page}], checklist, days_left}` |
| POST | `/api/ask` | `{question, history, notifications, citizen, language}` → `{reply}` |
| POST | `/api/translate` | `{notification, language: te/hi}` → `{clauses[{original, translated, kept_original, page, quote}], kept_original}` |
| POST | `/api/voice/listen` | multipart `audio`, `language` → `{text}` |
| POST | `/api/voice/speak` | `{text, language}` → `{audio_base64, mime_type}` |

Codes you may see: `invalid_request`, `same_notification`, `not_about_schemes` (422), `key_not_set` (503), `service_failed` (502), `too_large` (413), `slow_down` (429).

## Tests

```bash
cd server && npm test    # 42 tests: five features, clause cleaner, translation check, gateway (fetch stubbed), endpoints
cd client && npm test    # ₹ formatting, version pairing, calendar file
```

The tests use a synthetic `TEST-SCHOLARSHIP` fixture that exists only in `server/tests/fixtures.js`; the running app never loads it.

## Privacy and limits

- Nothing is stored: files are read in memory for one request; notifications and answers stay in the browser tab.
- The server log has route, status and time only.
- Haq AI is informational. It is not a government website; the department and its portal have the final word.
- Rules that cannot be expressed as a check (for example "domicile for 10 years") are listed under **Things the notification did not make clear** rather than checked.
- Example citizens in the impact view are illustrations, labelled as such.

## When something is off

| You see | Do this |
|---|---|
| **Gemini key needed** | Put `AI_API_KEY` in `server/.env`, restart the server. |
| **Haq server not running** | Start the server; check `SERVER_URL` in `client/.env` matches `PORT`. |
| Microphone button greyed out | Add `SARVAM_API_KEY` and restart. |
| "Gemini could not find the model" | Fix `AI_MODEL`; run the model speed test. |
| "too long to read at once" | Upload only the eligibility, benefit and how-to-apply pages. |
| A translated clause shows the English text | Expected: a number did not survive translation, so the original is kept. |
