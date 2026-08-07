import { getConfig, setConfig } from "@/lib/config/app-config";
import { DEFAULT_CARD_BACK, resolveCardBack } from "./skins";
import { DEFAULT_MIN_BET } from "./rules";

/**
 * Configuration du CASINO, persistée dans `AppConfig` comme le reste des
 * réglages du site, et pilotée depuis l'onglet Casino de /admin.
 *
 * ⚠️ Les clés ne sont PAS préfixées par un univers, contrairement à toutes les
 * autres (cf. `universeConfigPrefix` dans lib/config/app-config.ts). Ce n'est pas
 * une inattention : il n'y a qu'UN casino pour toute la plateforme, puisqu'il
 * mise des coins globaux. Couper le casino le coupe partout — c'est le
 * comportement voulu, là où couper un jeu ne le coupe que dans son anime.
 */

const KEY_ENABLED = "casino.enabled";
const KEY_MIN_BET = "casino.minBet";
const KEY_CARD_BACK = "casino.cardBack";

/** Bornes de la mise minimale réglable en admin (garde-fous de saisie). */
export const MIN_BET_FLOOR = 1;
export const MIN_BET_CEIL = 100_000;

export interface CasinoConfig {
  /** Le casino est-il ouvert aux joueurs ? (les ADMIN passent quand même) */
  enabled: boolean;
  /** Mise minimale à une table. Il n'y a volontairement PAS de maximum. */
  minBet: number;
  /** Id du dos de carte servi à toutes les tables (cf. ./skins). */
  cardBack: string;
}

/**
 * Config courante. Les trois lectures tapent le même cache de requête
 * (`loadAllConfig` est mémoïsé par `cache()`) → aucune requête supplémentaire.
 */
export async function getCasinoConfig(): Promise<CasinoConfig> {
  const [enabled, minBet, cardBack] = await Promise.all([
    getConfig<boolean>(KEY_ENABLED, true),
    getConfig<number>(KEY_MIN_BET, DEFAULT_MIN_BET),
    getConfig<string>(KEY_CARD_BACK, DEFAULT_CARD_BACK),
  ]);
  return {
    enabled: Boolean(enabled),
    minBet: sanitizeMinBet(minBet),
    // Un skin retiré du registre ne doit pas rendre les tables illisibles :
    // `resolveCardBack` retombe sur le dos par défaut.
    cardBack: resolveCardBack(cardBack).id,
  };
}

/** Ramène une mise minimale lue en base dans des bornes jouables. */
export function sanitizeMinBet(value: unknown): number {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return DEFAULT_MIN_BET;
  return Math.min(MIN_BET_CEIL, Math.max(MIN_BET_FLOOR, n));
}

export async function setCasinoEnabled(enabled: boolean): Promise<void> {
  await setConfig(KEY_ENABLED, Boolean(enabled));
}

export async function setCasinoMinBet(value: number): Promise<void> {
  await setConfig(KEY_MIN_BET, sanitizeMinBet(value));
}

export async function setCasinoCardBack(id: string): Promise<void> {
  await setConfig(KEY_CARD_BACK, resolveCardBack(id).id);
}
