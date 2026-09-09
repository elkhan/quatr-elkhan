export type SecFetch = (url: string, init: RequestInit) => Promise<Response>;

export interface SecHttpOptions {
  userAgent: string;
  fetch?: SecFetch;
}

export interface SecHttpClient {
  getJson(url: string): Promise<unknown>;
}
