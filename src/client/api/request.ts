import type { z } from "zod";
import { ApiError } from "./errors/api";
import { apiErrorSchema } from "./schemas/error";

export async function requestJson<T>(
  url: string,
  schema: z.ZodType<T>,
  signal: AbortSignal,
): Promise<T> {
  const response = await fetch(url, {
    signal,
    headers: { Accept: "application/json" },
    credentials: "omit",
  });
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    if (!response.ok)
      throw new ApiError(`Could not load data (HTTP ${response.status}). Please try again.`);
    throw new ApiError("The server returned an invalid response. Please try again.");
  }
  if (!response.ok) {
    const error = apiErrorSchema.safeParse(payload);
    const message = error.success
      ? error.data.error.message
      : `Could not load data (HTTP ${response.status}). Please try again.`;
    throw new ApiError(message);
  }
  const result = schema.safeParse(payload);
  if (!result.success)
    throw new ApiError("The server returned an invalid response. Please try again.");
  return result.data;
}
