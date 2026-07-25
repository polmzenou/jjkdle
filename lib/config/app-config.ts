import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { GAMES } from "@/lib/games/registry";
import { getCurrentUniverseSlug } from "@/lib/universes/current";

/**
 * Configuration globale de l'application (feature flags, maintenance, override du
 * mot du jour JJKdle), persistée dans la table `AppConfig` (clé/valeur JSON) et
 * lisible partout via `getConfig`.
 *
 * Lecture mémoïsée par requête via React `cache()` (même pattern que
 * `getCurrentUser`, cf. lib/auth/session.ts) → une seule requête `findMany` par
 * rendu, même si plusieurs jeux interrogent leur flag. L'écriture se fait depuis
 * /admin (Server Actions) et invalide le cache via `revalidatePath("/", "layout")`.
 *
 * MULTI-UNIVERS (étape 4) : toutes les clés sont PRÉFIXÉES PAR L'UNIVERS
 * (`u.<slug>.…`). Désactiver un jeu ou passer en maintenance sur JJK ne doit rien
 * changer sur les autres animes, et chaque univers a son propre mot du jour
 * forcé. Les lectures ciblent l'univers courant par défaut ; un slug explicite
 * permet à l'admin d'agir sur un autre univers (étape 5).
 */

// ── Clés typées (toutes préfixées par l'univers) ───────────────────────────

/** Préfixe de namespace d'un univers. */
function ns(slug: string): string {
  return `u.${slug}.`;
}

/** Flag d'activation d'un jeu dans un univers (défaut : activé). */
export function gameEnabledKey(slug: string, gameId: string): string {
  return `${ns(slug)}game.${gameId}.enabled`;
}

/** Clé du mode maintenance d'un univers. */
export function maintenanceKey(slug: string): string {
  return `${ns(slug)}site.maintenance`;
}

/** Clé de l'override du mot du jour JJKdle d'un univers. */
export function forcedTargetKey(slug: string): string {
  return `${ns(slug)}jjkdle.forcedTarget`;
}

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

/**
 * Vrai si un jeu est activé dans l'univers (défaut : true tant qu'aucun flag
 * n'est posé). `slug` par défaut = univers courant.
 */
export async function isGameEnabled(
  gameId: string,
  slug?: string,
): Promise<boolean> {
  const s = slug ?? (await getCurrentUniverseSlug());
  return getConfig<boolean>(gameEnabledKey(s, gameId), true);
}

/** Config du mode maintenance de l'univers (repli : désactivé). */
export async function getMaintenance(
  slug?: string,
): Promise<MaintenanceConfig> {
  const s = slug ?? (await getCurrentUniverseSlug());
  return getConfig<MaintenanceConfig>(maintenanceKey(s), MAINTENANCE_DEFAULT);
}

/** Id du perso forcé comme mot du jour de l'univers, ou null. */
export async function getForcedTarget(slug?: string): Promise<string | null> {
  const s = slug ?? (await getCurrentUniverseSlug());
  return getConfig<string | null>(forcedTargetKey(s), null);
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
 * État d'activation de chaque jeu du registre dans l'univers (défaut true).
 * Pratique pour le hub et l'onglet admin Config.
 */
export async function getGameFlags(
  slug?: string,
): Promise<Record<string, boolean>> {
  const s = slug ?? (await getCurrentUniverseSlug());
  const all = await loadAllConfig();
  return Object.fromEntries(
    GAMES.map((g) => {
      const v = all.get(gameEnabledKey(s, g.id));
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
