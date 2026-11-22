import { hash, verify, Algorithm } from "@node-rs/argon2";
import crypto from "crypto";
import { env } from "../config/env";

/**
 * Computes an HMAC peppered secret string before hashing with Argon2id.
 * Using hex encoding ensures that the input is always a valid UTF-8 string,
 * avoiding Rust/native binding "invalid utf-8 sequence" errors on raw byte digests.
 */
function applyPepper(password: string): string {
  return crypto.createHmac("sha256", env.SERVER_PEPPER).update(password).digest("hex");
}

/**
 * Hashes a password using Argon2id with OWASP-recommended parameters:
 * memoryCost = 19456 KiB (~19 MiB), timeCost = 2, parallelism = 1
 */
export async function hashPassword(password: string): Promise<string> {
  const pepperedPassword = applyPepper(password);
  return await hash(pepperedPassword, {
    algorithm: Algorithm.Argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });
}

/**
 * Verifies a password against an Argon2id hash.
 */
export async function verifyPassword(
  hashString: string,
  passwordCandidate: string
): Promise<boolean> {
  const pepperedPassword = applyPepper(passwordCandidate);
  return await verify(hashString, pepperedPassword, {
    algorithm: Algorithm.Argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });
}
