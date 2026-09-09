import type { RequestLimitCode } from "../types/errors";

export class RequestLimitError extends Error {
  constructor(
    readonly code: RequestLimitCode,
    message: string,
  ) {
    super(message);
    this.name = "RequestLimitError";
  }
}
