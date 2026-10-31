// Document intake: one uploaded notification → a checked SchemeNotification.
// Gemini reads the file (haqGateway.readPolicyDocument); then every clause is cleaned
// (clauseCleaner.js) and checked (policySchemas.js) on its own. A clause that fails is
// listed in `skipped_clauses` with the reason and is never used by the engine.

import { createHash } from 'node:crypto';

import { HaqProblem, asHaqProblem } from '../problems.js';
import {
  ApplicationStepClause, BenefitClause, DeadlineClause, EligibilityClause, GeminiReading, RequiredDocumentClause, SchemeHeader, firstProblem,
} from '../models/policySchemas.js';
import { cleanBenefit, cleanDeadline, cleanRequiredDocument, cleanRule, cleanSchemeHeader, cleanStep } from './clauseCleaner.js';

export const NOTIFICATION_SIZE_LIMIT = 15 * 1024 * 1024; // 15 MB
export const GEMINI_TEXT_LIMIT = 120_000;
export const FILE_TYPE_NOT_READ = 'Haq AI reads PDF, PNG, JPG, WEBP or TXT notifications. Please upload one of those.';

const IMAGE_TYPES = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp' };
const capText = (text) => (text.length > GEMINI_TEXT_LIMIT ? text.slice(0, GEMINI_TEXT_LIMIT) : text);

// A PDF is recognised by its first bytes, because browsers sometimes send it as "application/octet-stream".
function notificationFormat(file) {
  const extension = (file.originalname ?? '').split('.').pop().toLowerCase();
  const mime = (file.mimetype ?? '').toLowerCase();
  const head = file.buffer.subarray(0, 5).toString('latin1');
  if (head === '%PDF-') return { kind: 'binary', mime: 'application/pdf' };
  if (mime === 'application/pdf' || extension === 'pdf') return { kind: 'bad_pdf' };
  if (mime === 'text/plain' || extension === 'txt') return { kind: 'text' };
  if (Object.values(IMAGE_TYPES).includes(mime)) return { kind: 'binary', mime };
  if (IMAGE_TYPES[extension]) return { kind: 'binary', mime: IMAGE_TYPES[extension] };
  return { kind: 'unsupported' };
}

function keepValidClauses(section, rows, clean, shape, skipped) {
  const valid = [];
  rows.forEach((row, index) => {
    const checked = shape.safeParse(clean(row, index));
    if (checked.success) valid.push(checked.data);
    else skipped.push({ section, row: index + 1, reason: firstProblem(checked.error) });
  });
  return valid;
}

/**
 * @param {{ text?: string, file?: { buffer: Buffer, mimetype?: string, originalname?: string, size: number } }} upload
 * @param {import('../ai/haqGateway.js').HaqGateway} gateway
 */
export async function takeInNotification({ text, file }, gateway) {
  const trimmedText = typeof text === 'string' ? text.trim() : '';
  if (!trimmedText && !file) throw new HaqProblem(400, 'Choose a notification file or paste its text.');
  if (file) {
    if (file.size > NOTIFICATION_SIZE_LIMIT) throw new HaqProblem(413, 'Please upload a file smaller than 15 MB.');
    if (!file.buffer || file.size === 0) throw new HaqProblem(400, 'The selected file is empty.');
  }

  const kind = file ? notificationFormat(file) : null;
  if (kind?.kind === 'unsupported') throw new HaqProblem(415, FILE_TYPE_NOT_READ);
  if (kind?.kind === 'bad_pdf') throw new HaqProblem(400, 'This PDF could not be read. Please download it again from the official site.');

  let raw;
  try {
    if (kind?.kind === 'text') {
      const fileText = new TextDecoder('utf-8').decode(file.buffer).trim();
      const combined = [trimmedText, fileText].filter(Boolean).join('\n');
      if (!combined) throw new HaqProblem(400, 'The selected file is empty.');
      raw = await gateway.readPolicyDocument(capText(combined), null, null);
    } else {
      raw = await gateway.readPolicyDocument(trimmedText ? capText(trimmedText) : null, file ? file.buffer : null, kind?.mime ?? null);
    }
  } catch (error) {
    throw asHaqProblem(error, 'Haq AI could not read this notification: ');
  }

  // Check 1: the outer shape of Gemini's reading.
  const shape = GeminiReading.safeParse(raw);
  if (!shape.success) {
    throw new HaqProblem(502, `Haq AI could not read this notification: Gemini's reply was incomplete (${firstProblem(shape.error)}).`, 'service_failed');
  }
  const data = shape.data;
  const scheme = SchemeHeader.safeParse(cleanSchemeHeader(data.scheme));
  if (!scheme.success || !scheme.data.name) {
    throw new HaqProblem(422, 'The scheme name is not printed in this file. Please upload the main notification or guidelines of the scheme.');
  }

  // Check 2: every clause on its own.
  const skipped = [];
  const rules = keepValidClauses('rules', data.rules, cleanRule, EligibilityClause, skipped);
  const seen = new Set();
  const uniqueRules = rules.filter((rule) => {
    if (seen.has(rule.rule_id)) {
      skipped.push({ section: 'rules', row: 0, reason: `rule "${rule.rule_id}" appears twice; the second one was skipped` });
      return false;
    }
    seen.add(rule.rule_id);
    return true;
  });

  const notification = {
    doc_id: createHash('sha256').update(file ? file.buffer : trimmedText).digest('hex').slice(0, 16),
    source_name: file?.originalname?.slice(0, 200) || 'Pasted notification',
    scheme: scheme.data,
    rules: uniqueRules,
    benefits: keepValidClauses('benefits', data.benefits, cleanBenefit, BenefitClause, skipped),
    deadlines: keepValidClauses('deadlines', data.deadlines, cleanDeadline, DeadlineClause, skipped),
    required_documents: keepValidClauses('required_documents', data.required_documents, cleanRequiredDocument, RequiredDocumentClause, skipped),
    application_steps: keepValidClauses('application_steps', data.application_steps, cleanStep, ApplicationStepClause, skipped),
    notes: data.notes,
  };

  return {
    notification,
    skipped_clauses: skipped,
    clause_count: notification.rules.length + notification.benefits.length + notification.deadlines.length +
      notification.required_documents.length + notification.application_steps.length,
  };
}
