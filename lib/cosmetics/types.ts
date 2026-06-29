import type { UserStatsContext } from "@/lib/progress/context";

/**
 * Contexte de déblocage DÉRIVÉ d'un joueur, partagé par les titres et les cadres.
 * Construit en une passe (cf. lib/cosmetics/unlock#buildUnlockContext) à partir
 * des stats existantes + niveau + badges. Une définition de titre/cadre exprime
 * sa règle via `isUnlocked(ctx)` — exactement comme un badge avec `check(ctx)`.
 *
 * Couche séparée de l'octroi MANUEL admin (grants) et du bypass admin : un
 * titre/cadre est débloqué si `isUnlocked` est vrai OU un grant existe OU admin.
 */
export interface UnlockContext {
  /** Agrégat de stats (scores, streaks, jeux joués…). */
  stats: UserStatsContext;
  /** Niveau du compte (cache `User.level`). */
  level: number;
  /** Nombre de badges débloqués (pour les titres « collectionneur »). */
  badgeCount: number;
  /** Clés des badges débloqués (pour un titre lié à un badge précis). */
  badgeKeys: ReadonlySet<string>;
}
