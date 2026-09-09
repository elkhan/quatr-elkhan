import type { SecErrorCode } from "../types/error";

export class SecError extends Error {
  constructor(
    readonly code: SecErrorCode,
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "SecError";
  }
}

function httpErrorCode(status: number): SecErrorCode {
  switch (status) {
    case 403:
      return "SEC_FORBIDDEN";
    case 429:
      return "SEC_RATE_LIMITED";
    default:
      return "SEC_UNAVAILABLE";
  }
}

export function createHttpError(status: number, url: string): SecError {
  return new SecError(httpErrorCode(status), `SEC returned HTTP ${status} for ${url}`, status);
}

export function toRequestError(error: unknown, url: string, timedOut: boolean): SecError {
  if (error instanceof SecError) return error;
  if (timedOut) return new SecError("SEC_TIMEOUT", `SEC request timed out: ${url}`);
  if (error instanceof SyntaxError)
    return new SecError("INVALID_SEC_DATA", `Invalid SEC data: ${url}`);
  return new SecError("SEC_UNAVAILABLE", `SEC request failed: ${url}`);
}
