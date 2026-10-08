import { cache } from "react";
import { revalidateTag, unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { GAMES } from "@/lib/games/registry";
import { getCurrentUniverseSlug } from "@/lib/universes/current";

/**
 * Configuration globale de l'application (feature flags, maintenance, override du
 * mot du jour JJKdle), persistée dans la table `AppConfig` (clé/valeur JSON) et
 * lisible partout via `getConfig`.
 *
 * Lecture partagée entre requêtes (`unstable_cache`, tag `app-config`) puis
 * mémoïsée par requête via React `cache()` → au plus une requête `findMany` par
 * rendu, et aucune tant que la config ne change pas. L'écriture se fait depuis
 * /admin (Server Actions) : `setConfig` invalide le tag, l'appelant invalide les
 * pages via `revalidatePath("/", "layout")`.
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

/**
 * Préfixe de TOUTES les clés d'un univers. Exposé pour pouvoir purger sa config
 * quand l'univers est supprimé (cf. lib/admin/universe-store.ts) : sans ça, des
 * clés orphelines survivraient et seraient réappliquées à un univers recréé avec
 * le même slug.
 */
export function universeConfigPrefix(slug: string): string {
  return ns(slug);
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

/** Tag du cache de données de la config (invalidé par `setConfig`). */
export const APP_CONFIG_TAG = "app-config";

/**
 * Lignes de config, partagées ENTRE requêtes (Data Cache de Next) : la config est
 * lue sur chaque page (maintenance, flags) mais n'est écrite que depuis /admin.
 * Toute écriture passe par `setConfig` ou `invalidateAppConfig`, qui invalident
 * le tag ; la lecture suivante repart de la base.
 *
 * Les clés `sys.` (anti-spam des mails d'erreur, cf. lib/mail/error-throttle.ts)
 * sont exclues : elles ne servent jamais à la lecture de config et changent à
 * chaque erreur.
 */
const loadConfigRows = unstable_cache(
  async (): Promise<{ key: string; value: unknown }[]> =>
    prisma.appConfig.findMany({
      where: { NOT: { key: { startsWith: "sys." } } },
      select: { key: true, value: true },
    }),
  ["app-config"],
  { tags: [APP_CONFIG_TAG], revalidate: 600 },
);

/** Charge toute la config en une lecture (mémoïsé par requête). */
const loadAllConfig = cache(
  async (): Promise<Map<string, unknown>> => {
    const rows = await loadConfigRows();
    return new Map(rows.map((r) => [r.key, r.value as unknown]));
  },
);

/** Invalide le cache de config (après une écriture directe dans `AppConfig`). */
export function invalidateAppConfig(): void {
  revalidateTag(APP_CONFIG_TAG);
}

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
  invalidateAppConfig();
}
