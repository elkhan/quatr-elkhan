import { createHttpError, toRequestError } from "./errors/sec";
import type { SecHttpClient, SecHttpOptions } from "./types/http";

const REQUEST_INTERVAL_MS = 200;
const REQUEST_TIMEOUT_MS = 10_000;

export function createSecHttpClient({
  userAgent,
  fetch: fetchSec = globalThis.fetch,
}: SecHttpOptions): SecHttpClient {
  let queue = Promise.resolve();
  let lastRequestAt = 0;

  async function waitForRequestSlot(): Promise<void> {
    const wait = Math.max(0, lastRequestAt + REQUEST_INTERVAL_MS - Date.now());
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
    lastRequestAt = Date.now();
  }

  async function sendRequest(url: string): Promise<unknown> {
    await waitForRequestSlot();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetchSec(url, {
        headers: { "User-Agent": userAgent, Accept: "application/json" },
        signal: controller.signal,
        redirect: "error",
      });
      if (!response.ok) {
        controller.abort();
        throw createHttpError(response.status, url);
      }
      return await response.json();
    } catch (error) {
      throw toRequestError(error, url, controller.signal.aborted);
    } finally {
      clearTimeout(timeout);
    }
  }

  function getJson(url: string): Promise<unknown> {
    const result = queue.then(() => sendRequest(url));
    // Rejections release the queue so a failed request cannot block later callers.
    queue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  return { getJson };
}
