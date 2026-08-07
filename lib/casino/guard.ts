import "server-only";
import { getCurrentUser } from "@/lib/auth/session";
import { getCasinoConfig } from "./config";

/**
 * LE portillon du casino : session valide + casino ouvert.
 *
 * Vit dans son propre module, et pas dans un fichier d'actions, parce qu'un
 * fichier `"use server"` ne peut exporter que des fonctions asynchrones traitées
 * comme des endpoints — un garde partagé n'y a pas sa place. Toutes les actions
 * du casino (blackjack, pile ou face, et les jeux à venir) passent ici : deux
 * implémentations de la règle « les ADMIN entrent même casino fermé » seraient
 * deux occasions de laisser une porte ouverte.
 */

export const NOT_AUTHED_ERROR = "Connecte-toi pour jouer au casino.";
export const CLOSED_ERROR = "Le casino est fermé pour le moment.";

export type CasinoAccess =
  | { ok: true; userId: string }
  | { ok: false; error: string; needsAuth?: boolean };

/**
 * Autorise, ou non, à jouer maintenant.
 *
 * Les ADMIN passent casino fermé : c'est ce qui leur permet de tester les tables
 * avant de rouvrir, exactement comme en mode maintenance (cf. UniverseChrome).
 */
export async function casinoAccess(): Promise<CasinoAccess> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: NOT_AUTHED_ERROR, needsAuth: true };

  const { enabled } = await getCasinoConfig();
  if (!enabled && user.role !== "ADMIN") {
    return { ok: false, error: CLOSED_ERROR };
  }
  return { ok: true, userId: user.id };
}
