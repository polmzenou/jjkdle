import type { UniverseConfig } from "./types";
import { jjk } from "./jjk";
import { csm } from "./csm";
import { aot } from "./aot";
import { kny } from "./kny";
import { tg } from "./tg";

/**
 * Registre des univers disponibles. Module PUR (client + serveur).
 *
 * Source de vérité de la CONFIG (thème/branding/domaines) ; la source de vérité
 * des DONNÉES reste la table `Universe` en base (jointe par `slug`). Pour
 * ajouter un anime : créer `lib/universes/<slug>.ts`, l'importer et l'ajouter à
 * `UNIVERSES` ci-dessous — plus une ligne `Universe(slug)` en base.
 */
export const UNIVERSES: Record<string, UniverseConfig> = {
  [jjk.slug]: jjk,
  [csm.slug]: csm,
  [aot.slug]: aot,
  [kny.slug]: kny,
  [tg.slug]: tg,
};

/**
 * Univers par défaut : sert de fallback quand le hostname ne matche aucun
 * domaine (dev local, previews Vercel, domaine inconnu). Surchargable via
 * l'env `DEFAULT_UNIVERSE`.
 */
export const DEFAULT_UNIVERSE_SLUG =
  process.env.DEFAULT_UNIVERSE ?? jjk.slug;

/** Liste tous les univers connus (pour le hub, l'admin, etc.). */
export function listUniverses(): UniverseConfig[] {
  return Object.values(UNIVERSES);
}

/** Résout un univers par son slug. `undefined` si inconnu. */
export function getUniverseBySlug(slug: string): UniverseConfig | undefined {
  return UNIVERSES[slug];
}

/**
 * Résout l'univers servant un hostname donné (port ignoré, casse ignorée).
 * Matche le domaine exact OU un de ses sous-domaines (`www.`, `hub.`…).
 * `undefined` si aucun univers ne revendique ce host → l'appelant retombe sur
 * `DEFAULT_UNIVERSE_SLUG`.
 */
export function getUniverseByHost(
  host: string | null | undefined,
): UniverseConfig | undefined {
  if (!host) return undefined;
  const hostname = host.split(":")[0].toLowerCase();
  return listUniverses().find((u) =>
    u.domains.some(
      (d) => hostname === d || hostname.endsWith(`.${d}`),
    ),
  );
}

/**
 * Résout l'univers d'un hostname avec fallback garanti sur le défaut : ne
 * renvoie jamais `undefined`. Pratique pour le middleware/résolution runtime.
 */
export function resolveUniverse(host: string | null | undefined): UniverseConfig {
  return (
    getUniverseByHost(host) ??
    getUniverseBySlug(DEFAULT_UNIVERSE_SLUG) ??
    jjk
  );
}
