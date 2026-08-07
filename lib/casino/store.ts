import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { newShoe } from "./cards";
import { getCasinoConfig } from "./config";
import { MAX_SEATS, TABLE_TTL_MS } from "./rules";

/**
 * Couche d'accès aux TABLES de casino. Module server-only.
 *
 * L'essentiel de ce fichier est le MATCHMAKING : faire asseoir un joueur à une
 * table publique ouverte sans jamais, quel que soit le nombre de clics
 * simultanés, (a) créer un 6ᵉ siège, (b) mettre deux joueurs sur le même siège,
 * ni (c) ouvrir deux tables à moitié vides. Les trois garanties viennent de la
 * BASE (contraintes + écritures conditionnelles), pas d'un verrou applicatif :
 * sur Neon en connexion poolée (PgBouncer), il n'y a ni transaction interactive
 * fiable ni verrou consultatif à portée de main.
 */

/** Caractères du code (sans 0/O/1/I), même convention que les lobbies. */
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 6;

export function randomCode(): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

/**
 * Clé de matchmaking de la table publique ouverte. Une seule valeur : il n'y a
 * qu'un jeu et qu'un casino, donc au plus UNE table publique ouverte à la fois
 * (`CasinoTable.matchKey` est `@unique`).
 */
const MATCH_KEY = "blackjack";

export const tableInclude = {
  seats: {
    orderBy: { seat: "asc" },
    include: {
      user: { select: { username: true, level: true } },
    },
  },
} satisfies Prisma.CasinoTableInclude;

export type TableWithSeats = Prisma.CasinoTableGetPayload<{
  include: typeof tableInclude;
}>;

/** Table par code, sièges inclus. `null` si le code n'existe pas. */
export async function findTableByCode(
  code: string,
): Promise<TableWithSeats | null> {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return null;
  return prisma.casinoTable.findUnique({
    where: { code: normalized },
    include: tableInclude,
  });
}

/** Table où ce joueur est actuellement assis, s'il y en a une. */
export async function findTableForUser(
  userId: string,
): Promise<TableWithSeats | null> {
  const seat = await prisma.casinoSeat.findFirst({
    where: { userId },
    select: { table: { include: tableInclude } },
    orderBy: { joinedAt: "desc" },
  });
  return seat?.table ?? null;
}

/**
 * Supprime les tables sans signe de vie. Appelé PARESSEUSEMENT au matchmaking :
 * il n'y a pas de cron sur Vercel, et une table zombie immobiliserait le
 * `matchKey` — plus personne ne pourrait alors s'asseoir nulle part.
 */
export async function sweepStaleTables(): Promise<void> {
  await prisma.casinoTable.deleteMany({
    where: { lastActivityAt: { lt: new Date(Date.now() - TABLE_TTL_MS) } },
  });
}

/** Une erreur d'unicité Prisma (course perdue, pas un vrai échec). */
function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"
  );
}

/** Crée une table SOLO : un siège, aucune horloge, hors matchmaking. */
export async function createSoloTable(userId: string): Promise<TableWithSeats> {
  const { minBet } = await getCasinoConfig();
  // Une collision de code est quasi impossible (32^6) mais pas structurellement
  // exclue : on réessaie plutôt que de renvoyer une erreur au joueur.
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await prisma.casinoTable.create({
        data: {
          code: randomCode(),
          mode: "SOLO",
          matchKey: null, // hors matchmaking : personne ne rejoint une table solo
          maxSeats: 1,
          seatCount: 1,
          minBet,
          shoe: newShoe(),
          seats: { create: { userId, seat: 0 } },
        },
        include: tableInclude,
      });
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
    }
  }
  throw new Error("Impossible de créer une table solo.");
}

/**
 * Assied le joueur à la table publique ouverte, ou en ouvre une.
 *
 * Les trois garanties, chacune tenue par la base :
 *
 *  1. **Pas deux tables à moitié vides** — `matchKey` est `@unique` et vaut
 *     `MATCH_KEY` sur la seule table ouverte. Deux créations concurrentes : la
 *     seconde prend un P2002 et rejoint la table de la première. (Postgres
 *     autorise autant de `NULL` qu'on veut sur une colonne unique, donc toutes
 *     les tables fermées et solo coexistent sans se gêner.)
 *
 *  2. **Pas de 6ᵉ siège** — la place est RÉSERVÉE par un incrément atomique
 *     conditionné à `seatCount < maxSeats`. Les `UPDATE` concurrents sur une
 *     même ligne se sérialisent : exactement `maxSeats` peuvent réussir.
 *
 *  3. **Pas deux joueurs sur le même siège** — `@@unique([tableId, seat])`. On
 *     ne calcule pas « le prochain siège libre » (ce serait une lecture suivie
 *     d'une écriture, donc une course) : on TENTE les index dans l'ordre et on
 *     laisse la base refuser les doublons.
 */
export async function claimPublicSeat(
  userId: string,
): Promise<TableWithSeats | null> {
  await sweepStaleTables();
  const { minBet } = await getCasinoConfig();

  // Déjà assis quelque part ? On l'y ramène plutôt que d'ouvrir un second siège.
  const existing = await findTableForUser(userId);
  if (existing) return existing;

  for (let attempt = 0; attempt < 6; attempt++) {
    const open = await prisma.casinoTable.findFirst({
      where: { matchKey: MATCH_KEY },
      include: tableInclude,
    });

    // ── Aucune table ouverte : en créer une, avec ce joueur en siège 0. ──
    if (!open) {
      try {
        return await prisma.casinoTable.create({
          data: {
            code: randomCode(),
            mode: "PUBLIC",
            matchKey: MATCH_KEY,
            maxSeats: MAX_SEATS,
            seatCount: 1,
            minBet,
            shoe: newShoe(),
            seats: { create: { userId, seat: 0 } },
          },
          include: tableInclude,
        });
      } catch (error) {
        if (!isUniqueViolation(error)) throw error;
        continue; // quelqu'un a créé la table entre-temps : on la rejoint
      }
    }

    // ── 2. Réserver une place (atomique). ──
    const reserved = await prisma.casinoTable.updateMany({
      where: { id: open.id, seatCount: { lt: open.maxSeats } },
      data: {
        seatCount: { increment: 1 },
        version: { increment: 1 },
        lastActivityAt: new Date(),
      },
    });
    if (reserved.count === 0) {
      // Table remplie entre la lecture et la réservation : la fermer au
      // matchmaking pour que le tour suivant en ouvre une nouvelle.
      await closeToMatchmaking(open.id);
      continue;
    }

    // ── 3. Prendre un index de siège, arbitré par la contrainte d'unicité. ──
    const taken = new Set(open.seats.map((s) => s.seat));
    let seated = false;
    for (let index = 0; index < open.maxSeats && !seated; index++) {
      if (taken.has(index)) continue;
      try {
        await prisma.casinoSeat.create({
          data: { tableId: open.id, userId, seat: index },
        });
        seated = true;
      } catch (error) {
        if (!isUniqueViolation(error)) throw error;
        // Soit l'index vient d'être pris (on essaie le suivant), soit CE joueur
        // est déjà assis à cette table (course avec son propre double clic) —
        // dans les deux cas, on rend la place réservée et on relit la table.
        const already = await prisma.casinoSeat.findUnique({
          where: { tableId_userId: { tableId: open.id, userId } },
        });
        if (already) {
          await releaseReservation(open.id);
          return findTableByCode(open.code);
        }
      }
    }

    if (!seated) {
      await releaseReservation(open.id);
      continue;
    }

    // Table pleine → la retirer du matchmaking (le prochain joueur en ouvrira
    // une autre). Conditionné, donc sans effet si elle ne l'est pas.
    await prisma.casinoTable.updateMany({
      where: { id: open.id, seatCount: { gte: open.maxSeats } },
      data: { matchKey: null },
    });

    return findTableByCode(open.code);
  }

  return null;
}

/** Rend une place réservée dont le siège n'a finalement pas pu être créé. */
async function releaseReservation(tableId: string): Promise<void> {
  await prisma.casinoTable.updateMany({
    where: { id: tableId, seatCount: { gt: 0 } },
    data: { seatCount: { decrement: 1 }, version: { increment: 1 } },
  });
}

/** Retire une table du matchmaking (sans la supprimer). */
async function closeToMatchmaking(tableId: string): Promise<void> {
  await prisma.casinoTable.updateMany({
    where: { id: tableId },
    data: { matchKey: null },
  });
}

/**
 * Rouvre une table publique au matchmaking si elle a de la place. Appelé après
 * un départ : sans ça, une table qui s'est vidée resterait fermée à vie.
 *
 * Le `P2002` possible (une autre table est déjà ouverte) est un no-op voulu :
 * il n'y a qu'un `matchKey` disponible, celle-ci attendra son tour.
 */
export async function reopenToMatchmaking(tableId: string): Promise<void> {
  try {
    await prisma.casinoTable.updateMany({
      where: {
        id: tableId,
        mode: "PUBLIC",
        matchKey: null,
        seatCount: { gt: 0, lt: MAX_SEATS },
      },
      data: { matchKey: MATCH_KEY },
    });
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
  }
}

/**
 * Retire le siège d'un joueur et met la table à jour. Supprime la table si elle
 * se retrouve vide — une table sans personne n'a rien à faire en base, et sa
 * disparition libère aussi le `matchKey`.
 */
export async function releaseSeat(
  tableId: string,
  userId: string,
): Promise<void> {
  const deleted = await prisma.casinoSeat.deleteMany({
    where: { tableId, userId },
  });
  if (deleted.count === 0) return;

  const table = await prisma.casinoTable.update({
    where: { id: tableId },
    data: {
      seatCount: { decrement: deleted.count },
      version: { increment: 1 },
      lastActivityAt: new Date(),
    },
    select: { seatCount: true, mode: true },
  });

  if (table.seatCount <= 0) {
    await prisma.casinoTable.deleteMany({ where: { id: tableId } });
    return;
  }
  if (table.mode === "PUBLIC") await reopenToMatchmaking(tableId);
}

/** Supprime une table de force (bouton admin). */
export async function closeTable(code: string): Promise<void> {
  await prisma.casinoTable.deleteMany({ where: { code: code.trim().toUpperCase() } });
}
