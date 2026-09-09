export class OriginNotAllowedError extends Error {
  constructor() {
    super("Request origin is not allowed.");
    this.name = "OriginNotAllowedError";
  }
}
