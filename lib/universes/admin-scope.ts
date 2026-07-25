/**
 * UNIVERS CIBLÉ PAR L'ADMIN (étape 5). Module PUR (utilisable dans le middleware
 * Edge comme côté serveur).
 *
 * Le site public résout son univers par HOSTNAME. L'admin, lui, doit pouvoir
 * administrer N'IMPORTE QUEL univers depuis un seul domaine : un cookie porte le
 * slug choisi, et le middleware l'applique en écrasant `x-universe` — mais
 * UNIQUEMENT sur les chemins `/admin`.
 *
 * Conséquence voulue : les ~30 points de code qui appellent `getCurrentUniverse()`
 * (roster, catégories, draft, classements, attributs, config…) suivent
 * automatiquement l'univers sélectionné, sans qu'aucun n'ait à recevoir de
 * paramètre. Et le site public reste strictement piloté par le domaine — un
 * admin qui bascule sur un autre univers ne change pas ce que voient les joueurs.
 *
 * Sécurité : le cookie n'accorde AUCUN droit. Un visiteur qui le forgerait
 * n'obtient rien de plus — les pages et actions `/admin` vérifient le rôle en
 * base (`getAdminUser`). Il ne fait que choisir la cible d'une session admin.
 */

/** Nom du cookie portant le slug d'univers ciblé par l'admin. */
export const ADMIN_UNIVERSE_COOKIE = "admin_universe";

/** Vrai si le chemin appartient à l'espace d'administration. */
export function isAdminPath(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}
