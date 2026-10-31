// Haq AI endpoints. One route per feature:
//   POST /api/notifications/read   upload a notification → checked clauses        (intake)
//   POST /api/changes              Feature 1  Policy Change Intelligence
//   POST /api/eligibility          Feature 2  Personalized Eligibility
//   POST /api/impact               Feature 4  Policy Impact Analyzer
//   POST /api/action-plan          Feature 5  Citizen Action Agent
//   POST /api/ask                  Feature 3  multilingual assistant (typed or spoken question)
//   POST /api/voice/listen         Feature 3  speech → text   (Sarvam)
//   POST /api/voice/speak          Feature 3  text → speech   (Sarvam)
//   POST /api/translate            clause translation that keeps every number and page
//   GET  /api/health               which services are ready
// Nothing is stored: files stay in memory for one request, and the browser sends the checked
// notifications back with every request.

import express from 'express';
import multer from 'multer';

import { planActions } from '../engine/actionAgent.js';
import { compareNotifications, isSameScheme, olderThenNewer, tallyRevisions } from '../engine/changeIntelligence.js';
import { buildCitizenContext } from '../engine/citizenContext.js';
import { translateWithEvidence } from '../engine/clauseTranslation.js';
import { checkEligibility, hasAnyDetail } from '../engine/eligibility.js';
import { analyzeImpact } from '../engine/impactAnalyzer.js';
import { officialPortal } from '../engine/officialPortal.js';
import { NOTIFICATION_SIZE_LIMIT, takeInNotification } from '../intake/documentIntake.js';
import {
  ActionPlanRequest, AskRequest, ChangeRequest, EligibilityRequest, ImpactRequest, LANGUAGES, SpeakRequest, TranslateRequest, firstProblem,
} from '../models/policySchemas.js';
import { HaqProblem, asHaqProblem } from '../problems.js';

export const VOICE_CLIP_LIMIT = 2 * 1024 * 1024; // about 30 seconds of speech

const notificationUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: NOTIFICATION_SIZE_LIMIT, files: 1, fieldSize: 2 * 1024 * 1024 } });
const voiceUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: VOICE_CLIP_LIMIT, files: 1 } });

function checked(shape, body, status = 400) {
  const result = shape.safeParse(body ?? {});
  if (!result.success) throw new HaqProblem(status, firstProblem(result.error), 'invalid_request');
  return result.data;
}

/** Gemini and Sarvam calls cost quota, so each browser gets 30 per minute. */
function fairUse() {
  const calls = new Map();
  return (req, res, next) => {
    const now = Date.now();
    const recent = (calls.get(req.ip) ?? []).filter((t) => now - t < 60_000);
    if (recent.length >= 30) return next(new HaqProblem(429, 'Too many requests. Please wait a minute.', 'slow_down'));
    recent.push(now);
    calls.set(req.ip, recent);
    return next();
  };
}

function versionsInOrder(older, newer) {
  if (older.doc_id === newer.doc_id) throw new HaqProblem(422, 'Choose two different notifications of the same scheme.', 'same_notification');
  return olderThenNewer(older, newer);
}

export function haqRoutes({ gateway, today = () => new Date() }) {
  const router = express.Router();
  const limited = fairUse();

  router.get('/health', (req, res) => {
    res.json({ status: 'ok', reading_ready: gateway.canRead(), voice_ready: gateway.canSpeak() });
  });

  router.post('/notifications/read', limited, notificationUpload.single('file'), async (req, res) => {
    const text = typeof req.body?.text === 'string' ? req.body.text : '';
    res.json(await takeInNotification({ text, file: req.file ?? null }, gateway));
  });

  // Feature 1 — what changed between two notifications of one scheme
  router.post('/changes', (req, res) => {
    const body = checked(ChangeRequest, req.body);
    const [older, newer, swapped] = versionsInOrder(body.older, body.newer);
    const revisions = compareNotifications(older, newer);
    res.json({
      older_id: older.doc_id, newer_id: newer.doc_id,
      older_label: older.scheme.version_label ?? older.source_name, newer_label: newer.scheme.version_label ?? newer.source_name,
      swapped, same_scheme: isSameScheme(older, newer), revisions, tally: tallyRevisions(revisions),
    });
  });

  // Feature 2 — does this citizen qualify, condition by condition
  router.post('/eligibility', (req, res) => {
    const { notification, citizen } = checked(EligibilityRequest, req.body, 422);
    const result = checkEligibility(notification, citizen);
    // When the citizen qualifies, say where to apply.
    res.json({ doc_id: notification.doc_id, scheme_name: notification.scheme.name, ...result, apply: result.verdict === 'eligible' ? officialPortal(notification) : null });
  });

  // Feature 4 — who gains or loses from the change, in rupees
  router.post('/impact', (req, res) => {
    const body = checked(ImpactRequest, req.body, 422);
    const [older, newer] = versionsInOrder(body.older, body.newer);
    res.json(analyzeImpact(older, newer, body.citizen ?? {}));
  });

  // Feature 5 — personal, dated plan
  router.post('/action-plan', (req, res) => {
    const { notification, citizen } = checked(ActionPlanRequest, req.body, 422);
    const verdict = hasAnyDetail(citizen) ? checkEligibility(notification, citizen) : null;
    res.json({ doc_id: notification.doc_id, scheme_name: notification.scheme.name, ...planActions(notification, verdict, today()) });
  });

  // Feature 3 — the citizen asks (typed or spoken); code builds the facts, Gemini explains them
  router.post('/ask', limited, async (req, res) => {
    const { question, history, notifications, citizen, language } = checked(AskRequest, req.body, 422);
    const citizenContext = buildCitizenContext(notifications, citizen, today());
    try {
      res.json(await gateway.answerCitizen({ question, history, citizenContext, language }));
    } catch (error) {
      throw asHaqProblem(error, 'Haq AI could not answer: ');
    }
  });

  router.post('/translate', limited, async (req, res) => {
    const { notification, language } = checked(TranslateRequest, req.body, 422);
    try {
      res.json(await translateWithEvidence(notification, language, (clauses, lang) => gateway.translateClauses(clauses, lang)));
    } catch (error) {
      throw asHaqProblem(error, 'Translation failed: ');
    }
  });

  router.post('/voice/listen', limited, voiceUpload.single('audio'), async (req, res) => {
    const language = String(req.body?.language ?? 'en');
    if (!LANGUAGES.includes(language)) throw new HaqProblem(422, 'Please choose English, Telugu or Hindi.', 'invalid_request');
    if (!req.file?.buffer?.length) throw new HaqProblem(400, 'No audio arrived. Please try again.', 'invalid_request');
    try {
      res.json(await gateway.listen(req.file.buffer, req.file.mimetype, language));
    } catch (error) {
      throw asHaqProblem(error);
    }
  });

  router.post('/voice/speak', limited, async (req, res) => {
    const { text, language } = checked(SpeakRequest, req.body, 422);
    try {
      res.json(await gateway.speak(text, language));
    } catch (error) {
      throw asHaqProblem(error);
    }
  });

  return router;
}
