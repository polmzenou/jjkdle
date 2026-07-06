import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { GAMES } from "@/lib/games/registry";

/**
 * Configuration globale de l'application (feature flags, maintenance, override du
 * mot du jour JJKdle), persistée dans la table `AppConfig` (clé/valeur JSON) et
 * lisible partout via `getConfig`.
 *
 * Lecture mémoïsée par requête via React `cache()` (même pattern que
 * `getCurrentUser`, cf. lib/auth/session.ts) → une seule requête `findMany` par
 * rendu, même si plusieurs jeux interrogent leur flag. L'écriture se fait depuis
 * /admin (Server Actions) et invalide le cache via `revalidatePath("/", "layout")`.
 */

// ── Clés typées ────────────────────────────────────────────────────────────

/** Flag d'activation d'un jeu (défaut : activé). */
export function gameEnabledKey(gameId: string): string {
  return `game.${gameId}.enabled`;
}

/** Clé du mode maintenance du site. */
export const MAINTENANCE_KEY = "site.maintenance";
/** Clé de l'override du mot du jour JJKdle (id de perso ou absent). */
export const FORCED_TARGET_KEY = "jjkdle.forcedTarget";

/** Forme persistée du mode maintenance. */
export interface MaintenanceConfig {
  enabled: boolean;
  message?: string;
}

export const MAINTENANCE_DEFAULT: MaintenanceConfig = { enabled: false };

// ── Lecture ──────────────────────────────────────────────────────────────

/** Charge toute la table `AppConfig` en une requête (mémoïsé par requête). */
const loadAllConfig = cache(
  async (): Promise<Map<string, unknown>> => {
    const rows = await prisma.appConfig.findMany();
    return new Map(rows.map((r) => [r.key, r.value as unknown]));
  },
);

/**
 * Lit une clé de config, avec repli typé si absente. Passe par le cache de
 * requête → sûr à appeler plusieurs fois dans un même rendu.
 */
export async function getConfig<T>(key: string, fallback: T): Promise<T> {
  const all = await loadAllConfig();
  return all.has(key) ? (all.get(key) as T) : fallback;
}

/** Vrai si un jeu est activé (défaut : true tant qu'aucun flag n'est posé). */
export async function isGameEnabled(gameId: string): Promise<boolean> {
  return getConfig<boolean>(gameEnabledKey(gameId), true);
}

/** Config du mode maintenance (repli : désactivé). */
export async function getMaintenance(): Promise<MaintenanceConfig> {
  return getConfig<MaintenanceConfig>(MAINTENANCE_KEY, MAINTENANCE_DEFAULT);
}

/** Id du perso forcé comme mot du jour JJKdle, ou null. */
export async function getForcedTarget(): Promise<string | null> {
  return getConfig<string | null>(FORCED_TARGET_KEY, null);
}

/**
 * Snapshot brut clé→valeur de toute la config (pour la page admin). Renvoie un
 * objet simple sérialisable vers le client.
 */
export async function getAllConfig(): Promise<Record<string, unknown>> {
  const all = await loadAllConfig();
  return Object.fromEntries(all);
}

/**
 * État d'activation de chaque jeu du registre (défaut true). Pratique pour le
 * hub et l'onglet admin Config.
 */
export async function getGameFlags(): Promise<Record<string, boolean>> {
  const all = await loadAllConfig();
  return Object.fromEntries(
    GAMES.map((g) => {
      const v = all.get(gameEnabledKey(g.id));
      return [g.id, v === undefined ? true : Boolean(v)];
    }),
  );
}

// ── Écriture ─────────────────────────────────────────────────────────────

/** Upsert d'une clé de config. L'invalidation du cache est à la charge de l'appelant. */
export async function setConfig(key: string, value: unknown): Promise<void> {
  await prisma.appConfig.upsert({
    where: { key },
    create: { key, value: value as never },
    update: { value: value as never },
  });
}
