import type { SecClient } from "../sec/types/company";

export interface AppOptions {
  secClient: SecClient;
  allowedOrigins: readonly string[];
  clientDirectory?: string;
}
