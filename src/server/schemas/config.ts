import { z } from "zod";

export const portSchema = z
  .string()
  .trim()
  .regex(/^\d+$/, "Must be a whole number")
  .transform(Number)
  .pipe(z.number().int().min(1).max(65535))
  .default(3000);

export const configSchema = z.object({
  PORT: portSchema,
  CLIENT_PORT: portSchema.default(5173),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  SEC_USER_AGENT: z
    .string()
    .trim()
    .min(1, "Set your name and contact email in SEC_USER_AGENT")
    .refine((value) => !/[\r\n]/.test(value), "Must be a single line"),
});
