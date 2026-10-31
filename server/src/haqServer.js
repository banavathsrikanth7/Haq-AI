// Builds the Haq AI web server. src/index.js starts it; tests build one with a stand-in gateway.

import cors from 'cors';
import express from 'express';
import multer from 'multer';

import { HaqGateway } from './ai/haqGateway.js';
import { HaqProblem } from './problems.js';
import { VOICE_CLIP_LIMIT, haqRoutes } from './routes/haqRoutes.js';

const LOCAL_PAGE = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
const reply = (res, status, message, code) => res.status(status).json({ message, code });

export function buildHaqServer(settings, { gateway = new HaqGateway(settings), today, logRequests = false } = {}) {
  const server = express();
  server.disable('x-powered-by');
  server.set('trust proxy', 1);

  // Only the Haq AI page (CLIENT_ORIGIN, or any localhost port Vite picks) may call the API.
  const allowed = new Set(settings.browserOrigins);
  server.use(cors({ origin: (origin, done) => done(null, !origin || allowed.has(origin) || LOCAL_PAGE.test(origin)) }));
  server.use(express.json({ limit: '4mb' })); // checked notifications come back with each request

  if (logRequests) {
    // Logs route, status and time only — never notifications, citizen details, audio or keys.
    server.use((req, res, next) => {
      const started = Date.now();
      res.on('finish', () => console.log(`${req.method} ${req.path} ${res.statusCode} ${Date.now() - started} ms`));
      next();
    });
  }

  server.use('/api', haqRoutes({ gateway, today }));
  server.use('/api', (req, res) => reply(res, 404, 'This Haq AI endpoint does not exist.', 'unknown_endpoint'));
  server.get('/', (req, res) => res.json({ service: 'Haq AI', health: '/api/health' }));

  // eslint-disable-next-line no-unused-vars
  server.use((error, req, res, next) => {
    if (error instanceof HaqProblem) return reply(res, error.status, error.message, error.code);
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return req.path.includes('voice')
          ? reply(res, 413, `Please keep a spoken question under 30 seconds (${VOICE_CLIP_LIMIT / 1024 / 1024} MB).`, 'too_large')
          : reply(res, 413, 'Please upload a notification smaller than 15 MB.', 'too_large');
      }
      if (error.code === 'LIMIT_FIELD_VALUE') return reply(res, 413, 'The pasted text is too long. Paste only the eligibility and benefit sections.', 'too_large');
      return reply(res, 400, `Upload problem: ${error.message}`, 'upload_problem');
    }
    if (error?.type === 'entity.parse.failed') return reply(res, 400, 'The request was not valid JSON.', 'invalid_request');
    if (error?.type === 'entity.too.large') return reply(res, 413, 'The request is too large.', 'too_large');
    console.error('Haq AI server problem:', error?.message ?? error);
    return reply(res, 500, 'Something went wrong on the Haq AI server.', 'server_problem');
  });

  return server;
}
