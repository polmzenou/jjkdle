import { prisma } from "@/lib/prisma";
import { getRoster } from "@/lib/content/queries";
import { getCurrentUniverse } from "@/lib/universes/current";
import type { Character } from "@/data/roster/characters";
import {
  getBooster,
  isBoosterKind,
  type BoosterKind,
} from "./boosters";
import {
  DECK_SIZE,
  deckMultipliers,
  sanitizeDeck,
  NO_DECK_BONUS,
  type DeckMultipliers,
} from "./deck";
import { rarityOfTier, sellValueOf } from "./rarity";
import { rollBooster, sortByRarityAsc, type CardPool } from "./roll";
import type {
  CardView,
  CollectionCard,
  OpenedBooster,
  PendingBooster,
  RevealedCard,
} from "./types";

/**
 * Couche d'accès aux CARTES et aux BOOSTERS. Module server-only (importe
 * Prisma) : à n'utiliser que depuis des Server Components, Server Actions ou
 * Route Handlers.
 *
 * Conventions reprises de `lib/cosmetics/grants.ts` : tout est idempotent
 * (upsert / deleteMany), et le contrôle d'accès (`getCurrentUser`,
 * `getAdminUser`) est fait en amont par les server actions.
 */

export type {
  CardView,
  CollectionCard,
  RevealedCard,
  OpenedBooster,
  PendingBooster,
};

/** Projection d'un personnage du roster en carte affichable. */
function toCardView(character: Character): CardView {
  const rarity = rarityOfTier(character.tier);
  return {
    characterId: character.id,
    name: character.name,
    title: character.title,
    ...(character.image ? { image: character.image } : {}),
    rarity,
    sellValue: sellValueOf(rarity),
  };
}

async function resolveUniverseId(universeId?: string): Promise<string> {
  return universeId ?? (await getCurrentUniverse()).id;
}

// ──────────────────────────────────────────────────────────────────────────
// Lecture
// ──────────────────────────────────────────────────────────────────────────

/**
 * Ids des personnages dont l'utilisateur possède la carte, restreints à un
 * univers. La possession est globale, mais on ne l'expose que par univers :
 * une carte JJK n'a rien à faire dans une grille CSM.
 */
export async function getOwnedCharacterIds(
  userId: string,
  universeId?: string,
): Promise<Set<string>> {
  const uid = await resolveUniverseId(universeId);
  const rows = await prisma.userCard.findMany({
    where: { userId, character: { universeId: uid } },
    select: { characterId: true },
  });
  return new Set(rows.map((r) => r.characterId));
}

/**
 * TOUT le roster de l'univers, chaque personnage marqué possédé ou non.
 *
 * On part du roster (`getRoster`, mémoïsé par requête et qui résout déjà le
 * cache d'images « OUAIS ») plutôt que des lignes `UserCard` : la grille sert
 * aussi de checklist de complétion, les cartes manquantes doivent y figurer
 * grisées.
 */
export async function getCollection(
  userId: string | null,
  universeId?: string,
): Promise<CollectionCard[]> {
  const uid = await resolveUniverseId(universeId);
  const [roster, owned] = await Promise.all([
    getRoster(uid),
    userId ? getOwnedCharacterIds(userId, uid) : Promise.resolve(new Set<string>()),
  ]);
  return roster.map((character) => ({
    ...toCardView(character),
    owned: owned.has(character.id),
  }));
}

/** Le deck équipé d'un univers, nettoyé des ids fantômes (cartes vendues…). */
export async function getDeck(
  userId: string,
  universeId?: string,
): Promise<{ cards: CardView[]; multipliers: DeckMultipliers }> {
  const uid = await resolveUniverseId(universeId);
  const [profile, roster, owned] = await Promise.all([
    prisma.userUniverseProfile.findUnique({
      where: { userId_universeId: { userId, universeId: uid } },
      select: { deckCharacterIds: true },
    }),
    getRoster(uid),
    getOwnedCharacterIds(userId, uid),
  ]);

  const byId = new Map(roster.map((c) => [c.id, c]));
  const ids = sanitizeDeck(profile?.deckCharacterIds ?? [], owned);
  const cards = ids.flatMap((id) => {
    const character = byId.get(id);
    return character ? [toCardView(character)] : [];
  });

  return { cards, multipliers: deckMultipliers(cards.map((c) => c.rarity)) };
}

/**
 * Multiplicateurs du deck, en UNE requête légère — appelé par `awardExp` à
 * chaque fin de partie, donc on ne charge surtout pas tout le roster ici.
 *
 * Le filtre `universeId` sur les personnages est aussi la revalidation : un id
 * qui ne serait plus dans l'univers ne rapporte simplement aucun bonus.
 */
export async function getDeckMultipliers(
  userId: string,
  universeId: string,
): Promise<DeckMultipliers> {
  const profile = await prisma.userUniverseProfile.findUnique({
    where: { userId_universeId: { userId, universeId } },
    select: { deckCharacterIds: true },
  });

  const ids = (profile?.deckCharacterIds ?? []).slice(0, DECK_SIZE);
  if (ids.length === 0) return NO_DECK_BONUS;

  const rows = await prisma.character.findMany({
    where: { id: { in: ids }, universeId },
    select: { id: true, tier: true },
  });
  const tierById = new Map(rows.map((r) => [r.id, r.tier]));

  // On repasse par `ids` pour ne compter que les cartes réellement équipées.
  const rarities = ids.flatMap((id) => {
    const tier = tierById.get(id);
    return tier ? [rarityOfTier(tier)] : [];
  });
  return deckMultipliers(rarities);
}

/** Boosters non ouverts d'un univers, du plus ancien au plus récent. */
export async function getPendingBoosters(
  userId: string,
  universeId?: string,
): Promise<PendingBooster[]> {
  const uid = await resolveUniverseId(universeId);
  const rows = await prisma.userBooster.findMany({
    where: { userId, universeId: uid, openedAt: null },
    orderBy: { createdAt: "asc" },
    select: { id: true, kind: true, createdAt: true },
  });
  return rows.map((r) => ({
    id: r.id,
    kind: isBoosterKind(r.kind) ? r.kind : "simple",
    createdAt: r.createdAt,
  }));
}

/** Une carte résolue depuis le roster (révélation d'un octroi admin). */
export async function resolveCard(
  characterId: string,
  universeId?: string,
): Promise<CardView | null> {
  const uid = await resolveUniverseId(universeId);
  const roster = await getRoster(uid);
  const character = roster.find((c) => c.id === characterId);
  return character ? toCardView(character) : null;
}

// ──────────────────────────────────────────────────────────────────────────
// Écriture — collection
// ──────────────────────────────────────────────────────────────────────────

/**
 * Retire un personnage des decks de l'utilisateur (tous univers confondus).
 * Appelé quand la carte quitte la collection : une carte vendue ou retirée par
 * un admin ne doit pas continuer à donner son bonus.
 */
async function removeFromDecks(userId: string, characterId: string): Promise<void> {
  const profiles = await prisma.userUniverseProfile.findMany({
    where: { userId, deckCharacterIds: { has: characterId } },
    select: { id: true, deckCharacterIds: true },
  });

  await Promise.all(
    profiles.map((p) =>
      prisma.userUniverseProfile.update({
        where: { id: p.id },
        data: {
          deckCharacterIds: p.deckCharacterIds.filter((id) => id !== characterId),
        },
      }),
    ),
  );
}

/**
 * Octroie une carte (idempotent). Renvoie `created: false` si elle était déjà
 * possédée — un octroi ADMIN ne crédite JAMAIS de coins sur doublon, c'est un
 * don, pas un tirage.
 */
export async function grantCard(
  userId: string,
  characterId: string,
): Promise<{ created: boolean }> {
  const res = await prisma.userCard.createMany({
    data: [{ userId, characterId }],
    skipDuplicates: true,
  });
  return { created: res.count === 1 };
}

/** Retire une carte de la collection et des decks (no-op si non possédée). */
export async function revokeCard(
  userId: string,
  characterId: string,
): Promise<{ removed: boolean }> {
  const res = await prisma.userCard.deleteMany({ where: { userId, characterId } });
  if (res.count > 0) await removeFromDecks(userId, characterId);
  return { removed: res.count > 0 };
}

/**
 * Revend une carte : le joueur récupère les coins de sa rareté et PERD la carte
 * (y compris si elle n'était pas en doublon — c'est le prix affiché).
 *
 * Le `deleteMany` gardé sur `count === 1` rend l'opération idempotente : deux
 * clics rapides ne créditent qu'une fois.
 */
export async function sellCard(
  userId: string,
  characterId: string,
  universeId?: string,
): Promise<{ ok: boolean; coins: number; error?: string }> {
  const uid = await resolveUniverseId(universeId);
  const card = await resolveCard(characterId, uid);
  if (!card) return { ok: false, coins: 0, error: "Carte inconnue." };

  const deleted = await prisma.userCard.deleteMany({ where: { userId, characterId } });
  if (deleted.count !== 1) {
    return { ok: false, coins: 0, error: "Tu ne possèdes pas cette carte." };
  }

  await Promise.all([
    prisma.user.update({
      where: { id: userId },
      data: { coins: { increment: card.sellValue } },
    }),
    removeFromDecks(userId, characterId),
  ]);

  return { ok: true, coins: card.sellValue };
}

// ──────────────────────────────────────────────────────────────────────────
// Écriture — boosters
// ──────────────────────────────────────────────────────────────────────────

/** Crée un booster NON OUVERT. `source` = gameId d'origine, ou "admin". */
export async function createBooster(
  userId: string,
  universeId: string,
  kind: BoosterKind,
  source: string,
): Promise<{ id: string; kind: BoosterKind }> {
  const row = await prisma.userBooster.create({
    data: { userId, universeId, kind, source },
    select: { id: true },
  });
  return { id: row.id, kind };
}

/** Roster de l'univers groupé par rareté, prêt pour `rollBooster`. */
async function buildPool(universeId: string): Promise<{
  pool: CardPool;
  byId: Map<string, Character>;
}> {
  const roster = await getRoster(universeId);
  const pool: CardPool = {};
  for (const character of roster) {
    const rarity = rarityOfTier(character.tier);
    (pool[rarity] ??= []).push(character.id);
  }
  return { pool, byId: new Map(roster.map((c) => [c.id, c])) };
}

/**
 * Ouvre un booster et distribue son contenu. Renvoie `null` si le booster
 * n'existe pas, n'appartient pas à l'utilisateur, ou a DÉJÀ été ouvert.
 *
 * L'`updateMany` conditionné à `openedAt: null` est la garde d'idempotence —
 * même motif que `consumeSession` (Higher/Lower) et que le `updateMany` gardé
 * de `lib/games/battle/actions.ts`. Il est fait AVANT tout tirage : un double
 * clic ou un rejeu de l'action ne peut pas distribuer deux fois les cartes.
 */
export async function openBooster(
  userId: string,
  boosterId: string,
): Promise<OpenedBooster | null> {
  const claimed = await prisma.userBooster.updateMany({
    where: { id: boosterId, userId, openedAt: null },
    data: { openedAt: new Date() },
  });
  if (claimed.count !== 1) return null;

  const booster = await prisma.userBooster.findUnique({
    where: { id: boosterId },
    select: { kind: true, universeId: true },
  });
  if (!booster) return null;

  const kind = isBoosterKind(booster.kind) ? booster.kind : "simple";
  const { pool, byId } = await buildPool(booster.universeId);
  const drawnIds = rollBooster(getBooster(kind), pool);

  const revealed: RevealedCard[] = [];
  let coinsEarned = 0;

  for (const characterId of drawnIds) {
    const character = byId.get(characterId);
    if (!character) continue;

    // `createMany + skipDuplicates` par carte : l'unicité (userId, characterId)
    // arbitre en base, donc pas de fenêtre de course entre lecture et écriture.
    const inserted = await prisma.userCard.createMany({
      data: [{ userId, characterId }],
      skipDuplicates: true,
    });
    const duplicate = inserted.count === 0;

    const view = toCardView(character);
    const coins = duplicate ? view.sellValue : 0;
    coinsEarned += coins;
    revealed.push({ ...view, duplicate, coins });
  }

  if (coinsEarned > 0) {
    await prisma.user.update({
      where: { id: userId },
      data: { coins: { increment: coinsEarned } },
    });
  }

  return {
    boosterId,
    kind,
    // Révélation en rareté croissante : le booster finit sur sa meilleure carte.
    cards: sortByRarityAsc(revealed),
    coinsEarned,
  };
}
