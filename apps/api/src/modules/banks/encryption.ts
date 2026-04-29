import { createCipheriv, createDecipheriv, randomBytes, createHash } from "node:crypto";
import { env } from "../../config/env";

/**
 * AES-256-GCM at-rest encryption for sensitive scalars (bank account
 * numbers, etc). Format on disk:
 *
 *   v1:<iv-hex>:<authTag-hex>:<ciphertext-hex>
 *
 * The version prefix gives us a migration path if the algorithm or key
 * derivation changes — readers fall through to legacy "enc:<plain>" for
 * pre-migration rows so existing data doesn't 500.
 *
 * The KEK is derived from BANK_ENCRYPTION_KEY (env, 32+ random bytes).
 * If unset we fall back to a SESSION_SECRET-derived key — not ideal,
 * but better than crashing during initial deploy. Set the dedicated
 * env var before going live.
 */

const VERSION = "v1";
const ALGO = "aes-256-gcm";
const IV_BYTES = 12; // 96-bit IV per NIST SP 800-38D recommendation

function getKey(): Buffer {
  const raw = (env.BANK_ENCRYPTION_KEY ?? env.SESSION_SECRET ?? "").trim();
  if (!raw) {
    throw new Error("BANK_ENCRYPTION_KEY (or SESSION_SECRET fallback) must be set.");
  }
  // SHA-256 hash → exactly 32 bytes. Lets us accept arbitrary-length
  // env strings (passphrases, base64, hex) without forcing operators
  // to produce a 32-byte raw secret.
  return createHash("sha256").update(raw).digest();
}

export function encryptScalar(plain: string): string {
  const key = getKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${VERSION}:${iv.toString("hex")}:${tag.toString("hex")}:${enc.toString("hex")}`;
}

export function decryptScalar(stored: string): string {
  // Pre-migration legacy: previous code stored "enc:<plain>". Return as-is
  // so /api/v1/admin/payouts can still resolve the actual digits when
  // ops looks up the row, but log the next time the row is touched so
  // we know to re-encrypt on update.
  if (stored.startsWith("enc:")) return stored.slice(4);

  const [v, ivHex, tagHex, ctHex] = stored.split(":");
  if (v !== VERSION || !ivHex || !tagHex || !ctHex) {
    throw new Error("Encrypted blob malformed.");
  }
  const key = getKey();
  const decipher = createDecipheriv(ALGO, key, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  const dec = Buffer.concat([decipher.update(Buffer.from(ctHex, "hex")), decipher.final()]);
  return dec.toString("utf8");
}
