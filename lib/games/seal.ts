import "server-only";
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from "node:crypto";

/**
 * Scellement de charges utiles pour les cookies de jeu (anti-triche).
 *
 * Objectif : un état de partie stocké côté client (cookie) doit être à la fois
 *  - CONFIDENTIEL : le joueur ne doit pas pouvoir lire la réponse (ex. `targetId`
 *    JJKdle, l'ordre correct au Ranking) — `httpOnly` NE suffit PAS (la valeur
 *    reste visible dans les DevTools / un proxy) ;
 *  - INFALSIFIABLE : le joueur ne doit pas pouvoir modifier l'état (ex. forcer
 *    `status: "won"` ou un compteur de tentatives).
 *
 * On chiffre donc en AES-256-GCM (chiffrement authentifié) avec une clé dérivée
 * d'un secret SERVEUR (jamais exposé). Toute altération du texte chiffré fait
 * échouer le déchiffrement → `unseal` renvoie null (l'appelant repart de zéro).
 */

const ALGO = "aes-256-gcm";

/**
 * Secret de dérivation de clé. On réutilise un secret serveur déjà présent :
 * `GAME_SEAL_SECRET` si défini, sinon `PUSHER_SECRET`, sinon `DATABASE_URL`
 * (toujours présent — requis par Prisma). Aucun de ces secrets n'est jamais
 * envoyé au client.
 */
function secretKey(): Buffer {
  const secret =
    process.env.GAME_SEAL_SECRET ||
    process.env.PUSHER_SECRET ||
    process.env.DATABASE_URL ||
    "jjk-arcade-dev-fallback-secret";
  // Sel statique : le secret est déjà à haute entropie, scrypt sert surtout à
  // obtenir une clé de 32 octets de façon déterministe.
  return scryptSync(secret, "jjk-arcade/seal/v1", 32);
}

// Dérivée une seule fois par process (le secret ne change pas au runtime).
const KEY = secretKey();

/** Chiffre + authentifie un objet JSON → chaîne base64url opaque. */
export function seal(payload: unknown): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, KEY, iv);
  const plaintext = Buffer.from(JSON.stringify(payload), "utf8");
  const enc = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  // iv(12) | tag(16) | ciphertext
  return Buffer.concat([iv, tag, enc]).toString("base64url");
}

/**
 * Déchiffre + vérifie l'intégrité. Renvoie null si la valeur est absente,
 * corrompue ou falsifiée (le type de retour est à valider par l'appelant).
 */
export function unseal<T>(sealed: string | undefined | null): T | null {
  if (!sealed) return null;
  try {
    const raw = Buffer.from(sealed, "base64url");
    if (raw.length < 28) return null; // iv(12) + tag(16) minimum
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const enc = raw.subarray(28);
    const decipher = createDecipheriv(ALGO, KEY, iv);
    decipher.setAuthTag(tag);
    const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
    return JSON.parse(dec.toString("utf8")) as T;
  } catch {
    // Clé invalide, tag qui ne colle pas (falsification), JSON cassé…
    return null;
  }
}
