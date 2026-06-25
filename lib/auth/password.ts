import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

/**
 * Hachage de mot de passe avec scrypt (intégré à Node, aucune dépendance native).
 * Format stocké : `<salt_hex>:<hash_hex>`.
 */

const scryptAsync = promisify(scrypt);
const KEY_LENGTH = 64;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;
  return `${salt}:${derived.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const derived = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;
  const hashBuf = Buffer.from(hash, "hex");
  // timingSafeEqual exige des buffers de même longueur.
  return (
    hashBuf.length === derived.length && timingSafeEqual(hashBuf, derived)
  );
}
