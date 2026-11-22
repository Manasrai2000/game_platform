import { z } from "zod";
import * as dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  APP_ORIGIN: z.string().default("http://localhost:3000"),
  SANDBOX_ORIGIN: z.string().default("http://localhost:3001"),

  // MySQL Connection
  DB_HOST: z.string().default("127.0.0.1"),
  DB_PORT: z.coerce.number().default(3306),
  DB_USER: z.string().default("root"),
  DB_PASSWORD: z.string().default(""),
  DB_NAME: z.string().default("game_platform_lms"),

  // Security Pepper & Cookies
  SERVER_PEPPER: z
    .string()
    .min(16, "SERVER_PEPPER must be at least 16 characters long"),
  SESSION_COOKIE_NAME: z.string().default("lms_sid"),
  DEVICE_COOKIE_NAME: z.string().default("lms_device_id"),
  COOKIE_SECRET: z.string().default("super_secret_cookie_signing_key_32_chars"),
  COOKIE_SECURE: z
    .string()
    .default("false")
    .transform((val) => val === "true"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:", parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;
