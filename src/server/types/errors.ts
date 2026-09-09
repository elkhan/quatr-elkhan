import type { SecErrorCode } from "../sec/types/error";

export type RequestLimitCode = "URI_TOO_LONG" | "REQUEST_BODY_NOT_ALLOWED";

type ApiErrorCode =
  | SecErrorCode
  | RequestLimitCode
  | "ORIGIN_NOT_ALLOWED"
  | "INVALID_QUERY"
  | "INVALID_PATH"
  | "NOT_FOUND"
  | "INTERNAL_ERROR";

export interface ApiErrorBody {
  error: { code: ApiErrorCode; message: string };
}

export interface HttpFailure {
  status: number;
  body: ApiErrorBody;
}
