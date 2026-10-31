// Problems Haq AI reports to the citizen. Each becomes {"message", "code"} in the response,
// so the page can show a clear sentence and react to the code.

export class HaqProblem extends Error {
  constructor(status, message, code = 'request_problem') {
    super(message);
    this.name = 'HaqProblem';
    this.status = status;
    this.code = code;
  }
}

/** Gemini or Sarvam key not set in server/.env. → 503 */
export class KeyNotSet extends Error {
  constructor(message) {
    super(message);
    this.name = 'KeyNotSet';
  }
}

/** Upload is not a scheme notification, or a question is not about schemes. → 422 */
export class NotAboutSchemes extends Error {
  constructor(message) {
    super(message);
    this.name = 'NotAboutSchemes';
  }
}

/** Turns a Gemini/Sarvam failure into a HaqProblem with the right status. */
export function asHaqProblem(error, lead = '') {
  if (error instanceof HaqProblem) return error;
  if (error instanceof NotAboutSchemes) return new HaqProblem(422, error.message, 'not_about_schemes');
  if (error instanceof KeyNotSet) return new HaqProblem(503, error.message, 'key_not_set');
  return new HaqProblem(502, `${lead}${error.message}`, 'service_failed');
}
