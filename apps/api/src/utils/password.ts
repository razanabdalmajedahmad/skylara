/**
 * Password hashing using Node's built-in crypto module.
 * Pure JS — no native dependencies (avoids bcrypt platform issues).
 * Uses scrypt (OWASP-recommended KDF) with a random salt.
 */
import { scryptSync, randomBytes, timingSafeEqual } from "crypto";

const SALT_LENGTH = 16;
const KEY_LENGTH = 64;
const SCRYPT_COST = 16384; // N
const BLOCK_SIZE = 8; // r
const PARALLELIZATION = 1; // p

/**
 * Hash a password. Returns format: $scrypt$N$r$p$salt$hash (all base64)
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const derived = scryptSync(password, salt, KEY_LENGTH, {
    N: SCRYPT_COST,
    r: BLOCK_SIZE,
    p: PARALLELIZATION,
  });
  return `$scrypt$${SCRYPT_COST}$${BLOCK_SIZE}$${PARALLELIZATION}$${salt.toString("base64")}$${derived.toString("base64")}`;
}

/**
 * Compare a plain password against a stored hash.
 * Supports both the new scrypt format and legacy bcrypt hashes (prefix $2b$).
 */
export async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  // Legacy bcrypt hash support (starts with $2b$ or $2a$)
  if (hash.startsWith("$2b$") || hash.startsWith("$2a$")) {
    console.warn("Legacy bcrypt hash detected — re-seed with scrypt hashes");
    return false;
  }

  // New scrypt format: $scrypt$N$r$p$salt$hash
  const parts = hash.split("$");
  if (parts.length !== 7 || parts[1] !== "scrypt") {
    return false;
  }

  const N = parseInt(parts[2], 10);
  const r = parseInt(parts[3], 10);
  const p = parseInt(parts[4], 10);
  const salt = Buffer.from(parts[5], "base64");
  const storedKey = Buffer.from(parts[6], "base64");

  const derived = scryptSync(password, salt, storedKey.length, { N, r, p });

  return timingSafeEqual(storedKey, derived);
}
