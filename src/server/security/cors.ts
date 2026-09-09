import cors from "cors";
import type { RequestHandler } from "express";
import { OriginNotAllowedError } from "../errors/cors";

export function createCorsPolicy(allowedOrigins: readonly string[]): RequestHandler {
  const origins = new Set(allowedOrigins);
  const policy = cors({
    origin(origin, callback) {
      // CLI clients and same-origin GET requests may have no Origin header.
      if (origin === undefined) {
        callback(null, false);
        return;
      }
      if (!origins.has(origin)) {
        callback(new OriginNotAllowedError());
        return;
      }
      callback(null, true);
    },
    methods: ["GET", "HEAD"],
    allowedHeaders: ["Accept"],
    credentials: false,
    // Request limits still run before the app completes an OPTIONS response.
    preflightContinue: true,
  });

  return (request, response, next) => {
    // Rejected/absent origins also change the response seen by shared caches.
    response.vary("Origin");
    policy(request, response, next);
  };
}
