import crypto from "crypto";

/**
 * Generates an opaque cryptographically secure 256-bit token (32 bytes -> 64 hex chars).
 */
export function generateSecureToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Computes SHA-256 hash of a string (used to store tokens safely in MySQL).
 */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Generates a standard UUIDv7 for sessions (Node 22+ / 24+ crypto.randomUUID or timestamp-ordered UUID)
 */
export function generateUUID(): string {
  return crypto.randomUUID();
}
