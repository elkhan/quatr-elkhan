import type { RequestHandler } from "express";
import { RequestLimitError } from "../errors/request";

const MAX_URL_BYTES = 4096;

export const requestLimits: RequestHandler = (request, response, next) => {
  if (Buffer.byteLength(request.originalUrl, "utf8") > MAX_URL_BYTES) {
    next(
      new RequestLimitError("URI_TOO_LONG", `Request URL must not exceed ${MAX_URL_BYTES} bytes.`),
    );
    return;
  }

  const hasContent = Number(request.headers["content-length"]) > 0;
  const hasTransferEncoding = request.headers["transfer-encoding"] !== undefined;
  if (hasContent || hasTransferEncoding) {
    // No current route accepts bodies. Reject framing without buffering the stream.
    response.setHeader("Connection", "close");
    next(new RequestLimitError("REQUEST_BODY_NOT_ALLOWED", "Request bodies are not supported."));
    return;
  }

  next();
};
