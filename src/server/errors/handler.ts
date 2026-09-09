import type { ErrorRequestHandler } from "express";
import { SecError } from "../sec/errors/sec";
import type { SecErrorCode } from "../sec/types/error";
import type { ApiErrorBody, HttpFailure } from "../types/errors";
import { OriginNotAllowedError } from "./cors";
import { InvalidQueryError } from "./query";
import { RequestLimitError } from "./request";

const secErrorStatuses: Record<SecErrorCode, number> = {
  INVALID_TICKER: 400,
  TICKER_NOT_FOUND: 404,
  INVALID_SEC_DATA: 502,
  SEC_FORBIDDEN: 502,
  SEC_RATE_LIMITED: 502,
  SEC_UNAVAILABLE: 502,
  SEC_TIMEOUT: 504,
};

function describeError(error: unknown): HttpFailure {
  if (error instanceof OriginNotAllowedError) {
    return { status: 403, body: { error: { code: "ORIGIN_NOT_ALLOWED", message: error.message } } };
  }
  if (error instanceof RequestLimitError) {
    const status = error.code === "URI_TOO_LONG" ? 414 : 413;
    return { status, body: { error: { code: error.code, message: error.message } } };
  }
  if (error instanceof InvalidQueryError) {
    return { status: 400, body: { error: { code: "INVALID_QUERY", message: error.message } } };
  }
  if (error instanceof SecError) {
    return {
      status: secErrorStatuses[error.code],
      body: { error: { code: error.code, message: error.message } },
    };
  }
  // Express attaches status 400 to path-decoding failures before a route handler runs.
  if (error instanceof URIError && "status" in error && error.status === 400) {
    return {
      status: 400,
      body: { error: { code: "INVALID_PATH", message: "Invalid URL path encoding." } },
    };
  }
  return {
    status: 500,
    body: { error: { code: "INTERNAL_ERROR", message: "Internal server error." } },
  };
}

export const errorHandler: ErrorRequestHandler<unknown, ApiErrorBody> = (
  error: unknown,
  _request,
  response,
  next,
) => {
  if (response.headersSent) {
    next(error);
    return;
  }
  const failure = describeError(error);
  response.status(failure.status).json(failure.body);
};
