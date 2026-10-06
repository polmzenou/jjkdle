import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
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
  collectionSummary,
  deckMultipliers,
  showcaseCards,
  sanitizeDeck,
  NO_DECK_BONUS,
  type DeckMultipliers,
} from "./deck";
import { rarityOfTier, sellValueOf } from "./rarity";
import {
  completionPercent,
  isNameColorUnlocked,
} from "@/lib/profile/name-colors";
import { rollBooster, sortByRarityAsc, type CardPool } from "./roll";
import { rollFusion, validateFusion } from "./fusion";
import type {
  CardView,
  CollectionCard,
  DeckShowcaseData,
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
export function toCardView(character: Character): CardView {
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
 * Nombre d'exemplaires possédés par personnage, restreint à un univers. La
 * possession est globale, mais on ne l'expose que par univers : une carte JJK
 * n'a rien à faire dans une grille CSM.
 */
export async function getOwnedCounts(
  userId: string,
  universeId?: string,
): Promise<Map<string, number>> {
  const uid = await resolveUniverseId(universeId);
  const rows = await prisma.userCard.findMany({
    where: { userId, character: { universeId: uid } },
    select: { characterId: true, count: true },
  });
  return new Map(rows.map((r) => [r.characterId, r.count]));
}

/** Ids des personnages dont l'utilisateur possède la carte, dans un univers. */
export async function getOwnedCharacterIds(
  userId: string,
  universeId?: string,
): Promise<Set<string>> {
  return new Set((await getOwnedCounts(userId, universeId)).keys());
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
  const [roster, counts] = await Promise.all([
    getRoster(uid),
    userId
      ? getOwnedCounts(userId, uid)
      : Promise.resolve(new Map<string, number>()),
  ]);
  return roster.map((character) => {
    const count = counts.get(character.id) ?? 0;
    return { ...toCardView(character), owned: count > 0, count };
  });
}

/**
 * Pourcentage de complétion de la collection d'un univers (arrondi à
 * l'inférieur, cf. `completionPercent`). Débloque les couleurs de pseudo.
 */
export async function getCollectionCompletion(
  userId: string,
  universeId?: string,
): Promise<number> {
  const uid = await resolveUniverseId(universeId);
  const [roster, owned] = await Promise.all([
    getRoster(uid),
    getOwnedCharacterIds(userId, uid),
  ]);
  const ownedCount = roster.filter((c) => owned.has(c.id)).length;
  return completionPercent(ownedCount, roster.length);
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

/** Cartes affichées dans le carrousel de la boîte « Deck ». */
export const SHOWCASE_LIMIT = 12;

/**
 * Tout ce qu'affiche la boîte « Deck » (compte + profil public) : deck équipé,
 * compteurs par rareté et meilleures cartes. Ne renvoie au client que les
 * cartes possédées, jamais le roster entier.
 */
export async function getDeckShowcase(
  userId: string,
  universeId?: string,
): Promise<DeckShowcaseData> {
  const uid = await resolveUniverseId(universeId);
  const [deck, collection] = await Promise.all([
    getDeck(userId, uid),
    getCollection(userId, uid),
  ]);
  return {
    deck: deck.cards,
    multipliers: deck.multipliers,
    summary: collectionSummary(collection),
    showcase: showcaseCards(collection, SHOWCASE_LIMIT).map(
      ({ owned: _owned, ...card }) => card,
    ),
  };
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

/** Client Prisma OU transaction interactive : les helpers d'exemplaires servent aux deux. */
export type CardDb = Prisma.TransactionClient;

/**
 * Ajoute `n` exemplaires d'une carte et renvoie le NOUVEAU total.
 *
 * Un seul `INSERT … ON CONFLICT DO UPDATE` : l'unicité (userId, characterId)
 * arbitre en base, deux ouvertures concurrentes ne peuvent ni perdre un
 * exemplaire ni lever une violation d'unicité.
 */
export async function addCopies(
  db: CardDb,
  userId: string,
  characterId: string,
  n = 1,
): Promise<number> {
  const rows = await db.$queryRaw<{ count: number }[]>`
    INSERT INTO "UserCard" ("id", "userId", "characterId", "count", "obtainedAt")
    VALUES (${randomUUID()}, ${userId}, ${characterId}, ${n}, NOW())
    ON CONFLICT ("userId", "characterId")
    DO UPDATE SET "count" = "UserCard"."count" + ${n}
    RETURNING "count"`;
  return Number(rows[0]?.count ?? n);
}

/**
 * Retire `n` exemplaires d'une carte (fusion, échange, revente). Peut consommer
 * le DERNIER exemplaire : la ligne est alors supprimée.
 *
 * Gardes atomiques dans le `WHERE` : décrément si `count > n`, sinon
 * suppression si `count = n`, sinon échec (`false`, rien n'est modifié).
 * Si la carte quitte la collection, l'appelant doit ensuite appeler
 * `syncAfterCardsLost` (deck + couleur de pseudo) — hors transaction.
 */
export async function removeCopies(
  db: CardDb,
  userId: string,
  characterId: string,
  n = 1,
): Promise<boolean> {
  const dec = await db.userCard.updateMany({
    where: { userId, characterId, count: { gt: n } },
    data: { count: { decrement: n } },
  });
  if (dec.count === 1) return true;
  const del = await db.userCard.deleteMany({
    where: { userId, characterId, count: n },
  });
  return del.count === 1;
}

/**
 * Après une perte possible de cartes (fusion, échange) : celles qui ne sont
 * plus possédées du tout quittent les decks, et la couleur de pseudo des
 * univers concernés est revérifiée (la complétion a pu baisser).
 */
export async function syncAfterCardsLost(
  userId: string,
  characterIds: readonly string[],
): Promise<void> {
  const ids = [...new Set(characterIds)];
  if (ids.length === 0) return;
  const [stillOwned, characters] = await Promise.all([
    prisma.userCard.findMany({
      where: { userId, characterId: { in: ids } },
      select: { characterId: true },
    }),
    prisma.character.findMany({
      where: { id: { in: ids } },
      select: { id: true, universeId: true },
    }),
  ]);
  const owned = new Set(stillOwned.map((r) => r.characterId));
  const lost = characters.filter((c) => !owned.has(c.id));
  if (lost.length === 0) return;

  for (const c of lost) await removeFromDecks(userId, c.id);
  await Promise.all(
    [...new Set(lost.map((c) => c.universeId))].map((uid) =>
      dropLockedNameColor(userId, uid),
    ),
  );
}

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
 * Déséquipe la couleur de pseudo d'un univers si la complétion est repassée
 * sous son palier (carte vendue ou retirée). Sans ce garde-fou, le pseudo
 * resterait coloré dans les classements alors que le palier n'est plus tenu.
 */
async function dropLockedNameColor(userId: string, universeId: string): Promise<void> {
  const profile = await prisma.userUniverseProfile.findUnique({
    where: { userId_universeId: { userId, universeId } },
    select: { nameColorKey: true, user: { select: { role: true } } },
  });
  const key = profile?.nameColorKey;
  if (!key || profile.user.role === "ADMIN") return;

  const pct = await getCollectionCompletion(userId, universeId);
  if (isNameColorUnlocked(key, pct)) return;
  await prisma.userUniverseProfile.update({
    where: { userId_universeId: { userId, universeId } },
    data: { nameColorKey: null },
  });
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
  if (res.count > 0) {
    const character = await prisma.character.findUnique({
      where: { id: characterId },
      select: { universeId: true },
    });
    await Promise.all([
      removeFromDecks(userId, characterId),
      character ? dropLockedNameColor(userId, character.universeId) : null,
    ]);
  }
  return { removed: res.count > 0 };
}

/**
 * Revend UN exemplaire d'une carte contre les coins de sa rareté.
 *
 * - doublon (≥ 2 exemplaires) : on en retire un, la collection est intacte ;
 * - dernier exemplaire : la carte est PERDUE (c'est le prix affiché), retirée
 *   des decks, et la couleur de pseudo est re-vérifiée.
 *
 * Les deux écritures sont gardées en base (`count > 1` / `count: 1`) : deux
 * clics rapides ne créditent jamais plus que les exemplaires réellement retirés.
 */
export async function sellCard(
  userId: string,
  characterId: string,
  universeId?: string,
): Promise<{ ok: boolean; coins: number; lastCopy?: boolean; error?: string }> {
  const uid = await resolveUniverseId(universeId);
  const card = await resolveCard(characterId, uid);
  if (!card) return { ok: false, coins: 0, error: "Carte inconnue." };

  const credit = () =>
    prisma.user.update({
      where: { id: userId },
      data: { coins: { increment: card.sellValue } },
    });

  const spare = await prisma.userCard.updateMany({
    where: { userId, characterId, count: { gt: 1 } },
    data: { count: { decrement: 1 } },
  });
  if (spare.count === 1) {
    await credit();
    return { ok: true, coins: card.sellValue, lastCopy: false };
  }

  const deleted = await prisma.userCard.deleteMany({
    where: { userId, characterId, count: 1 },
  });
  if (deleted.count !== 1) {
    return { ok: false, coins: 0, error: "Tu ne possèdes pas cette carte." };
  }

  await Promise.all([
    credit(),
    removeFromDecks(userId, characterId),
    dropLockedNameColor(userId, uid),
  ]);

  return { ok: true, coins: card.sellValue, lastCopy: true };
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

  for (const characterId of drawnIds) {
    const character = byId.get(characterId);
    if (!character) continue;

    // Un doublon est un exemplaire de plus, STOCKÉ (fusion, échange, revente).
    const copies = await addCopies(prisma, userId, characterId, 1);
    revealed.push({ ...toCardView(character), duplicate: copies > 1, copies });
  }

  return {
    boosterId,
    kind,
    // Révélation en rareté croissante : le booster finit sur sa meilleure carte.
    cards: sortByRarityAsc(revealed),
  };
}

// ──────────────────────────────────────────────────────────────────────────
// Écriture — fusion
// ──────────────────────────────────────────────────────────────────────────

/** Levée dans une transaction pour la faire échouer (rollback) proprement. */
class StaleCopiesError extends Error {}

/**
 * Fusionne 3 cartes de même rareté en 1 carte aléatoire de la rareté
 * au-dessus (cf. `lib/cards/fusion.ts`). Le dernier exemplaire d'une carte
 * peut être consommé : elle quitte alors la collection (et le deck).
 *
 * La validation est REFAITE ici sur l'état en base, puis le retrait des
 * cartes et l'ajout du résultat se font dans UNE transaction : chaque retrait
 * est gardé (`removeCopies`), un échec annule tout — un double clic ne peut ni
 * consommer deux fois ni créer une carte sans payer.
 */
export async function fuseCards(
  userId: string,
  picks: readonly string[],
  universeId?: string,
): Promise<{ ok: true; card: RevealedCard } | { ok: false; error: string }> {
  const uid = await resolveUniverseId(universeId);
  const [{ pool, byId }, counts] = await Promise.all([
    buildPool(uid),
    getOwnedCounts(userId, uid),
  ]);
  const rarityById = new Map(
    [...byId.values()].map((c) => [c.id, rarityOfTier(c.tier)]),
  );

  const check = validateFusion(picks, counts, rarityById, pool);
  if (!check.ok) return check;

  const resultId = rollFusion(pool, check.target);
  const character = resultId ? byId.get(resultId) : undefined;
  if (!character) return { ok: false, error: "Tirage impossible." };

  try {
    const copies = await prisma.$transaction(async (tx) => {
      for (const [characterId, n] of check.needed) {
        if (!(await removeCopies(tx, userId, characterId, n))) {
          throw new StaleCopiesError();
        }
      }
      return addCopies(tx, userId, character.id, 1);
    });
    await syncAfterCardsLost(userId, [...check.needed.keys()]);
    return {
      ok: true,
      card: { ...toCardView(character), duplicate: copies > 1, copies },
    };
  } catch (err) {
    if (err instanceof StaleCopiesError) {
      return { ok: false, error: "Ces cartes ne sont plus disponibles." };
    }
    throw err;
  }
}
