import "server-only";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";

/**
 * Anti-flood des alertes d'erreur : au plus UN mail par erreur distincte
 * (route + message) toutes les 30 minutes, les occurrences intermédiaires étant
 * comptées et annoncées dans le mail suivant.
 *
 * L'état vit dans `AppConfig` (clés `sys.errorMail.<hash>`) et non en mémoire :
 * sur Vercel chaque instance serverless a sa propre mémoire, une erreur en
 * boucle enverrait sinon un mail par instance. Si la base est elle-même en
 * panne, on se replie sur un état en mémoire (mieux vaut quelques doublons
 * qu'aucune alerte).
 */

export const ERROR_KEY_PREFIX = "sys.errorMail.";
const THROTTLE_MS = 30 * 60 * 1000;

export interface ErrorRecord {
  message: string;
  path: string;
  /** ISO du dernier mail envoyé pour cette erreur. */
  lastSent: string;
  /** ISO de la dernière occurrence. */
  lastSeen: string;
  /** Occurrences survenues depuis le dernier mail. */
  pending: number;
  /** Occurrences depuis le dernier résumé quotidien (remis à 0 par le cron). */
  sinceDigest: number;
}

export type ThrottleDecision =
  | { send: true; occurrences: number }
  | { send: false };

/** Décision pure (testable) à partir de l'état précédent. */
export function decide(
  prev: ErrorRecord | null,
  now: Date,
  message: string,
  path: string,
): { decision: ThrottleDecision; next: ErrorRecord } {
  const iso = now.toISOString();
  if (!prev || now.getTime() - new Date(prev.lastSent).getTime() >= THROTTLE_MS) {
    return {
      decision: { send: true, occurrences: (prev?.pending ?? 0) + 1 },
      next: {
        message,
        path,
        lastSent: iso,
        lastSeen: iso,
        pending: 0,
        sinceDigest: (prev?.sinceDigest ?? 0) + 1,
      },
    };
  }
  return {
    decision: { send: false },
    next: {
      ...prev,
      lastSeen: iso,
      pending: prev.pending + 1,
      sinceDigest: prev.sinceDigest + 1,
    },
  };
}

export function errorKey(path: string, message: string): string {
  const hash = createHash("sha1")
    .update(`${path}\n${message}`)
    .digest("hex")
    .slice(0, 16);
  return `${ERROR_KEY_PREFIX}${hash}`;
}

const memory = new Map<string, ErrorRecord>();

/** Enregistre une occurrence et dit s'il faut envoyer un mail. Ne lève jamais. */
export async function recordError(
  path: string,
  message: string,
): Promise<ThrottleDecision> {
  const key = errorKey(path, message);
  const now = new Date();
  try {
    const row = await prisma.appConfig.findUnique({ where: { key } });
    const { decision, next } = decide(
      (row?.value as ErrorRecord | undefined) ?? null,
      now,
      message.slice(0, 500),
      path,
    );
    await prisma.appConfig.upsert({
      where: { key },
      create: { key, value: next as never },
      update: { value: next as never },
    });
    return decision;
  } catch {
    const { decision, next } = decide(memory.get(key) ?? null, now, message, path);
    memory.set(key, next);
    return decision;
  }
}

/**
 * Pour le résumé quotidien : erreurs vues depuis le dernier résumé, puis remise
 * à zéro de leurs compteurs et purge des erreurs non revues depuis 7 jours.
 */
export async function collectErrorsForDigest(): Promise<
  { message: string; path: string; count: number }[]
> {
  const rows = await prisma.appConfig.findMany({
    where: { key: { startsWith: ERROR_KEY_PREFIX } },
  });
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const out: { message: string; path: string; count: number }[] = [];
  for (const row of rows) {
    const rec = row.value as unknown as ErrorRecord;
    if (rec.sinceDigest > 0) {
      out.push({ message: rec.message, path: rec.path, count: rec.sinceDigest });
    }
    if (new Date(rec.lastSeen).getTime() < weekAgo) {
      await prisma.appConfig.delete({ where: { key: row.key } });
    } else if (rec.sinceDigest > 0) {
      await prisma.appConfig.update({
        where: { key: row.key },
        data: { value: { ...rec, sinceDigest: 0 } as never },
      });
    }
  }
  return out.sort((a, b) => b.count - a.count);
}
