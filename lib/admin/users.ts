import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";
import { buildUnlockContext, getUnlockedTitleKeys, getUnlockedFrameKeys } from "@/lib/cosmetics/unlock";
import { getCurrentUniverse } from "@/lib/universes/current";

/**
 * Accès admin aux comptes utilisateurs (onglet « Utilisateurs » du dashboard).
 * La règle métier « un admin ne peut pas être rétrogradé » est appliquée dans
 * la server action (app/admin/actions.ts), pas ici.
 */

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  role: Role;
  /** Date d'inscription (ISO). */
  createdAt: string;
  /** Niveau du compte (dérivé de l'XP, cache). */
  level: number;
  /** XP totale (dérivée des scores + bonus admin). */
  totalXp: number;
  /** Ajustement manuel admin (additif, persistant). */
  xpBonus: number;
  /** Solde de coins (monnaie du jeu, globale au compte). */
  coins: number;
  /** Clés des badges débloqués (dérivés OU octroyés). */
  badgeKeys: string[];
  /** Clé du titre actuellement équipé (ou null). */
  equippedTitleKey: string | null;
  /** Clé du cadre actuellement équipé (ou null). */
  equippedFrameKey: string | null;
  /** Titres débloqués automatiquement (règle dérivée + bypass admin, hors grant). */
  autoTitleKeys: string[];
  /** Titres octroyés manuellement par un admin. */
  titleGrantKeys: string[];
  /** Cadres débloqués automatiquement (règle dérivée + bypass admin, hors grant). */
  autoFrameKeys: string[];
  /** Cadres octroyés manuellement par un admin. */
  frameGrantKeys: string[];
  /** `Character.id` des cartes possédées DANS L'UNIVERS ADMINISTRÉ. */
  cardCharacterIds: string[];
  /** `Character.id` des cartes équipées au deck de cet univers (≤ 3). */
  deckCharacterIds: string[];
}

/**
 * Liste tous les comptes (admins d'abord, puis par ancienneté), enrichis de
 * l'état cosmétique nécessaire au dashboard. NB : le statut « débloqué auto » de
 * chaque titre/cadre est recalculé par compte (buildUnlockContext) — coût
 * acceptable à l'échelle du site (peu de comptes), à surveiller s'il grossit.
 */
export async function listUsers(): Promise<AdminUser[]> {
  // Le loadout équipé (titre/cadre) est PAR univers → on lit celui de l'univers
  // courant de l'admin (sélecteur d'univers admin à venir étape 5).
  const { id: universeId } = await getCurrentUniverse();
  const rows = await prisma.user.findMany({
    orderBy: [{ role: "asc" }, { createdAt: "asc" }], // "ADMIN" < "PLAYER"
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      createdAt: true,
      level: true,
      totalXp: true,
      xpBonus: true,
      coins: true,
      badges: { select: { badgeKey: true } },
      titleGrants: { select: { titleKey: true } },
      frameGrants: { select: { frameKey: true } },
      // Cartes de l'univers administré uniquement (la possession est globale,
      // mais le dashboard n'affiche que le roster qu'il a sous les yeux).
      cards: {
        where: { character: { universeId } },
        select: { characterId: true },
      },
      universeProfiles: {
        where: { universeId },
        select: {
          equippedTitleKey: true,
          equippedFrameKey: true,
          deckCharacterIds: true,
        },
      },
    },
  });

  return Promise.all(
    rows.map(async (u) => {
      const ctx = await buildUnlockContext(u.id);
      const prof = u.universeProfiles[0];
      return {
        id: u.id,
        username: u.username,
        email: u.email,
        role: u.role,
        createdAt: u.createdAt.toISOString(),
        level: u.level,
        totalXp: u.totalXp,
        xpBonus: u.xpBonus,
        coins: u.coins,
        badgeKeys: u.badges.map((b) => b.badgeKey),
        equippedTitleKey: prof?.equippedTitleKey ?? null,
        equippedFrameKey: prof?.equippedFrameKey ?? null,
        // « auto » = sans tenir compte des grants (pour distinguer auto/octroyé).
        autoTitleKeys: [...getUnlockedTitleKeys(ctx)],
        titleGrantKeys: u.titleGrants.map((t) => t.titleKey),
        autoFrameKeys: [...getUnlockedFrameKeys(ctx)],
        frameGrantKeys: u.frameGrants.map((f) => f.frameKey),
        cardCharacterIds: u.cards.map((c) => c.characterId),
        deckCharacterIds: prof?.deckCharacterIds ?? [],
      };
    }),
  );
}

/** Bonus d'XP manuel courant d'un utilisateur (0 par défaut). */
export async function getUserXpBonus(id: string): Promise<number> {
  const u = await prisma.user.findUnique({
    where: { id },
    select: { xpBonus: true },
  });
  return u?.xpBonus ?? 0;
}

/**
 * Enregistre le bonus admin ET répercute son delta sur `totalXp` (accumulateur).
 * Modèle accumulatif : `xpBonus` n'est plus additionné à la volée — il sert de
 * trace ; c'est `totalXp` qui porte l'ajustement. On applique donc `delta =
 * nouveau − ancien` au total.
 */
export async function applyUserXpBonus(id: string, xpBonus: number): Promise<void> {
  const previous = await getUserXpBonus(id);
  const delta = xpBonus - previous;
  await prisma.user.update({
    where: { id },
    data: {
      xpBonus,
      ...(delta !== 0 ? { totalXp: { increment: delta } } : {}),
    },
  });
}

/** Fixe directement l'XP totale accumulée (ex. « fixer le niveau »). */
export async function setUserTotalXp(id: string, totalXp: number): Promise<void> {
  await prisma.user.update({
    where: { id },
    data: { totalXp: Math.max(0, Math.round(totalXp)) },
  });
}

/**
 * Fixe le solde de coins (valeur ABSOLUE, pas un delta). Contrairement à
 * `xpBonus`, aucune valeur dérivée n'est à réconcilier : les coins s'accumulent
 * indépendamment une fois crédités.
 */
export async function setUserCoins(id: string, coins: number): Promise<void> {
  await prisma.user.update({
    where: { id },
    data: { coins: Math.max(0, Math.round(coins)) },
  });
}

/**
 * Accorde un badge (idempotent). `grantedBy` = id de l'admin (trace l'origine
 * manuelle ; null/omis = déblocage par règle). Sur un badge déjà présent, on ne
 * réécrit pas `grantedBy` pour préserver l'origine du premier déblocage.
 */
export async function grantBadge(
  userId: string,
  badgeKey: string,
  grantedBy?: string,
): Promise<void> {
  await prisma.userBadge.upsert({
    where: { userId_badgeKey: { userId, badgeKey } },
    create: { userId, badgeKey, grantedBy: grantedBy ?? null },
    update: {},
  });
}

/** Retire un badge. */
export async function revokeBadge(userId: string, badgeKey: string): Promise<void> {
  await prisma.userBadge.deleteMany({ where: { userId, badgeKey } });
}

/** Rôle courant d'un utilisateur (ou null s'il n'existe pas). */
export async function getUserRole(id: string): Promise<Role | null> {
  const u = await prisma.user.findUnique({
    where: { id },
    select: { role: true },
  });
  return u?.role ?? null;
}

/** Change le rôle d'un utilisateur. */
export async function setUserRole(id: string, role: Role): Promise<void> {
  await prisma.user.update({ where: { id }, data: { role } });
}

/** Change le pseudo d'un utilisateur ; renvoie l'ancien (P2002 propagé si pris). */
export async function setUsername(
  id: string,
  username: string,
): Promise<string | null> {
  const before = await prisma.user.findUnique({
    where: { id },
    select: { username: true },
  });
  await prisma.user.update({ where: { id }, data: { username } });
  return before?.username ?? null;
}

/** Supprime un compte (cascade : sessions + scores via le schéma). */
export async function deleteUser(id: string): Promise<void> {
  await prisma.user.delete({ where: { id } });
}
