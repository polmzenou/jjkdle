import { prisma } from "@/lib/prisma";
import { slugify, uniqueSlug } from "@/lib/admin/slug";
import { getCurrentUniverse } from "@/lib/universes/current";
import { getRoster } from "@/lib/content/queries";
import { deriveRanking } from "@/lib/ranking/derive";
import { SLOT_COUNT } from "@/data/ranking/conditions";
import type { Character } from "@/data/roster/characters";

/**
 * CRUD des CONSIGNES du Pyramid d'un univers (table `RankingCondition`).
 *
 * Troisième et dernier contenu de jeu qui n'était définissable qu'en code :
 * `data/ranking/conditions.ts` est du JJK écrit à la main, seedé par
 * `scripts/seed-conditions.ts`. Un nouvel anime naissait donc sans consigne et
 * sans moyen d'en créer — le jeu affichait « Aucune condition disponible ».
 *
 * Différence de philosophie assumée avec le fichier JJK : là-bas, l'auteur donne
 * un critère et 8 personnages, et l'ordre est DÉRIVÉ des notes du roster (il
 * reste donc juste après un rééquilibrage). Ici l'ordre est SAISI à la main, rang
 * 1 → 8. C'est ce qui permet d'écrire des consignes avant d'avoir noté le roster,
 * et d'exprimer des classements que les données ne capturent pas (canon, lore).
 *
 * Module server-only. Univers ciblé = univers courant (cf. admin-scope).
 */

/** Forme éditable d'une consigne (vue admin). */
export interface RankingConditionInput {
  /** Absent = création. */
  id?: string;
  /** Axe « QUI on classe » — chip de gauche (ex. « Division 4 »). Optionnel. */
  pool: string;
  /** Axe « SELON QUOI » — chip de droite et titre du récap (ex. « Puissance »). */
  category: string;
  /** Consigne complète affichée au joueur. */
  prompt: string;
  /** Les 8 ids de personnages, du rang 1 (le plus fort) au rang 8. */
  order: string[];
}

/** Un rang du classement, tel qu'affiché dans l'admin. */
export interface AdminRankingSlot {
  characterId: string;
  /** Nom résolu, ou `? (id)` si le personnage n'est plus dans le roster. */
  name: string;
  /** Note sur la catégorie dérivée. `null` pour une consigne manuelle. */
  rating: number | null;
  /**
   * Ce rang est-il À ÉGALITÉ avec un autre du classement ? C'est exactement ce
   * que l'admin vient arbitrer : la note ne permet pas de le déduire.
   */
  tied: boolean;
}

/** Consigne telle que listée dans l'admin. */
export interface AdminRankingCondition {
  id: string;
  slug: string;
  pool: string;
  category: string;
  prompt: string;
  order: string[];
  position: number;
  /** Le classement, rang 1 → 8, noms et notes résolus. */
  slots: AdminRankingSlot[];
  /** Ids absents du roster de l'univers : la consigne est INJOUABLE en l'état. */
  missing: string[];
  /** `Category.id` d'origine si la consigne est dérivée, sinon `null`. */
  criterion: string | null;
  /** Libellé de cette catégorie (ou l'id brut si elle a été supprimée). */
  criterionLabel: string | null;
  /** Groupes de personnages à note égale dans le top — à arbitrer. */
  ties: string[][];
  /** Notés sur la catégorie. Sous `SLOT_COUNT`, la consigne n'est pas jouable. */
  ratedCount: number | null;
}

const MAX_TEXT = 200;

/** Préfixe de slug des consignes générées par « Importer les catégories ». */
const AUTO_PREFIX = "auto-";

/** Personnages de l'univers, `id → nom` (pour résoudre et valider un ordre). */
async function rosterNames(universeId: string): Promise<Map<string, string>> {
  const rows = await prisma.character.findMany({
    where: { universeId },
    select: { id: true, name: true },
  });
  return new Map(rows.map((r) => [r.id, r.name]));
}

/**
 * Consignes de l'univers courant, dans l'ordre d'affichage.
 *
 * Les consignes DÉRIVÉES sont présentées avec leur classement recalculé depuis
 * les notes du moment — le même que verra le joueur (cf. `getConditions`) — et
 * non l'`order` figé en base, qui ne serait qu'un cache périmé.
 */
export async function listRankingConditions(): Promise<
  AdminRankingCondition[]
> {
  const { id: universeId } = await getCurrentUniverse();
  const [rows, roster, categories] = await Promise.all([
    prisma.rankingCondition.findMany({
      where: { universeId },
      orderBy: { position: "asc" },
    }),
    getRoster(universeId),
    prisma.category.findMany({
      where: { universeId },
      select: { id: true, label: true },
    }),
  ]);

  const names = new Map(roster.map((c) => [c.id, c.name]));
  const labels = new Map(categories.map((c) => [c.id, c.label]));
  const ratingOf = (characterId: string, categoryId: string) => {
    const value = roster.find((c) => c.id === characterId)?.ratings[categoryId];
    return typeof value === "number" ? value : null;
  };

  return rows.map((c) => {
    const derived = c.criterion
      ? deriveRanking(roster, c.criterion, c.tiebreak, SLOT_COUNT)
      : null;
    const order = derived ? derived.order : c.order;
    const tied = new Set(derived ? derived.ties.flat() : []);

    return {
      id: c.id,
      slug: c.slug,
      pool: c.pool,
      category: c.category,
      prompt: c.prompt,
      order,
      position: c.position,
      slots: order.map((id) => ({
        characterId: id,
        name: names.get(id) ?? `? (${id})`,
        rating: c.criterion ? ratingOf(id, c.criterion) : null,
        tied: tied.has(id),
      })),
      missing: order.filter((id) => !names.has(id)),
      criterion: c.criterion,
      criterionLabel: c.criterion
        ? (labels.get(c.criterion) ?? c.criterion)
        : null,
      ties: derived ? derived.ties : [],
      ratedCount: derived ? derived.ratedCount : null,
    };
  });
}

/**
 * Crée ou met à jour une consigne de l'univers courant.
 *
 * Valide l'ordre ICI et pas seulement dans l'action : une consigne dont les 8
 * personnages ne sont pas tous dans le roster de l'univers est enregistrable en
 * base mais INJOUABLE — `startRankingRun` la tire au hasard puis abandonne sur
 * « Condition invalide (roster incomplet) », en laissant le joueur sur une erreur
 * dont l'admin n'a aucune trace.
 */
export async function upsertRankingCondition(
  input: RankingConditionInput,
): Promise<void> {
  const { id: universeId, slug: universeSlug } = await getCurrentUniverse();

  const pool = input.pool.trim().slice(0, MAX_TEXT);
  const category = input.category.trim().slice(0, MAX_TEXT);
  const prompt = input.prompt.trim().slice(0, MAX_TEXT);
  const order = input.order.map((id) => String(id ?? "").trim());

  if (order.length !== SLOT_COUNT) {
    throw new Error(`Il faut exactement ${SLOT_COUNT} personnages classés.`);
  }
  if (new Set(order).size !== order.length) {
    throw new Error("Un même personnage est classé à deux rangs différents.");
  }
  const names = await rosterNames(universeId);
  const missing = order.filter((cid) => !names.has(cid));
  if (missing.length > 0) {
    throw new Error(
      `Personnage(s) hors du roster de cet univers : ${missing.join(", ")}.`,
    );
  }

  const data = { pool, category, prompt, order };

  if (input.id) {
    const current = await prisma.rankingCondition.findFirst({
      where: { id: input.id, universeId },
      select: { criterion: true },
    });
    if (!current) throw new Error("Consigne introuvable dans cet univers.");
    await prisma.rankingCondition.update({
      where: { id: input.id },
      // Une consigne dérivée garde SON classement : il vient des notes. Seuls
      // ses libellés sont éditables — écrire `order` ici donnerait l'illusion
      // d'un réglage que le recalcul écraserait à la lecture suivante.
      data: current.criterion ? { pool, category, prompt } : data,
    });
    return;
  }

  // Le slug dérive de libellés LIBRES, que rien n'empêche de répéter : on le
  // rend unique plutôt que de refuser une deuxième consigne « Vitesse ».
  const existing = await prisma.rankingCondition.findMany({
    where: { universeId },
    select: { slug: true },
  });
  const base = slugify(`${pool} ${category}`) || "consigne";
  const slug = uniqueSlug(
    base,
    existing.map((e) => e.slug),
  );

  const max = await prisma.rankingCondition.aggregate({
    where: { universeId },
    _max: { position: true },
  });

  await prisma.rankingCondition.create({
    data: {
      // `RankingCondition.id` est une PK GLOBALE → préfixée par l'univers.
      id: `${universeSlug}-${slug}`,
      slug,
      universeId,
      ...data,
      position: (max._max.position ?? -1) + 1,
    },
  });
}

/**
 * Enregistre l'ARBITRAGE d'égalités d'une consigne dérivée : l'ordre choisi à la
 * main, qui ne départagera que des notes identiques.
 *
 * On refuse un ordre qui contredirait les notes (`assertRespectsRatings`) : un
 * tel arbitrage serait purement décoratif, écrasé par le recalcul au prochain
 * chargement. Mieux vaut le dire que laisser croire à un réglage qui ne prend pas.
 */
export async function setRankingTiebreak(
  id: string,
  order: string[],
): Promise<void> {
  const { id: universeId } = await getCurrentUniverse();
  const condition = await prisma.rankingCondition.findFirst({
    where: { id, universeId },
    select: { criterion: true },
  });
  if (!condition) throw new Error("Consigne introuvable dans cet univers.");
  if (!condition.criterion) {
    throw new Error(
      "Consigne manuelle : son classement s'édite directement, pas par arbitrage.",
    );
  }

  const roster = await getRoster(universeId);
  assertRespectsRatings(roster, condition.criterion, order);

  await prisma.rankingCondition.update({
    where: { id },
    data: { tiebreak: order },
  });
}

/** Lève si `order` inverse deux personnages de notes DIFFÉRENTES. */
function assertRespectsRatings(
  roster: Character[],
  categoryId: string,
  order: string[],
): void {
  const ratingById = new Map(
    roster.map((c) => [c.id, c.ratings[categoryId]] as const),
  );
  for (let i = 1; i < order.length; i += 1) {
    const previous = ratingById.get(order[i - 1]);
    const current = ratingById.get(order[i]);
    if (previous == null || current == null) continue;
    if (current > previous) {
      throw new Error(
        "L'arbitrage ne peut réordonner que des personnages à note ÉGALE.",
      );
    }
  }
}

/**
 * Génère une consigne par catégorie du builder : le top `SLOT_COUNT` de chaque
 * catégorie devient une pyramid, recalculée ensuite à chaque lecture.
 *
 * Idempotent par construction — chaque consigne porte le slug stable
 * `auto-<slugCatégorie>` : ré-appuyer met à jour au lieu de dupliquer, et ne
 * touche à aucune consigne manuelle. Le `tiebreak` déjà rendu est PRÉSERVÉ : un
 * réimport ne doit pas effacer un arbitrage que l'admin a pris le temps de poser.
 */
export interface ImportReport {
  created: number;
  updated: number;
  /** Catégories écartées, avec la raison (affichée telle quelle à l'admin). */
  skipped: { label: string; reason: string }[];
  /** Consignes importées comportant des égalités à arbitrer. */
  ties: { label: string; count: number }[];
}

export async function importCategoryConditions(): Promise<ImportReport> {
  const { id: universeId, slug: universeSlug } = await getCurrentUniverse();
  const [categories, roster, existing] = await Promise.all([
    prisma.category.findMany({
      where: { universeId },
      orderBy: { position: "asc" },
      select: { id: true, slug: true, label: true },
    }),
    getRoster(universeId),
    prisma.rankingCondition.findMany({
      where: { universeId },
      select: { id: true, slug: true, tiebreak: true },
    }),
  ]);

  const bySlug = new Map(existing.map((c) => [c.slug, c]));
  const report: ImportReport = {
    created: 0,
    updated: 0,
    skipped: [],
    ties: [],
  };

  for (const category of categories) {
    const slug = `${AUTO_PREFIX}${category.slug}`;
    const previous = bySlug.get(slug);
    const { order, ties, ratedCount } = deriveRanking(
      roster,
      category.id,
      previous?.tiebreak ?? [],
      SLOT_COUNT,
    );

    if (order.length < SLOT_COUNT) {
      report.skipped.push({
        label: category.label,
        reason: `${ratedCount} personnage(s) noté(s) sur ${SLOT_COUNT} requis`,
      });
      continue;
    }

    const data = {
      pool: "",
      category: category.label,
      prompt: `Classe ces personnages du meilleur au moins bon en ${category.label}.`,
      order,
      criterion: category.id,
    };

    if (previous) {
      await prisma.rankingCondition.update({
        where: { id: previous.id },
        data, // `tiebreak` volontairement absent : l'arbitrage survit au réimport.
      });
      report.updated += 1;
    } else {
      const max = await prisma.rankingCondition.aggregate({
        where: { universeId },
        _max: { position: true },
      });
      await prisma.rankingCondition.create({
        data: {
          id: `${universeSlug}-${slug}`,
          slug,
          universeId,
          ...data,
          tiebreak: [],
          position: (max._max.position ?? -1) + 1,
        },
      });
      report.created += 1;
    }

    if (ties.length > 0) {
      // Nombre de personnages concernés, plus parlant que le nombre de groupes.
      report.ties.push({
        label: category.label,
        count: ties.reduce((sum, group) => sum + group.length, 0),
      });
    }
  }

  return report;
}

/** Supprime une consigne (aucune donnée de joueur n'y est rattachée). */
export async function deleteRankingCondition(id: string): Promise<void> {
  const { id: universeId } = await getCurrentUniverse();
  const { count } = await prisma.rankingCondition.deleteMany({
    where: { id, universeId },
  });
  if (count === 0) throw new Error("Consigne introuvable dans cet univers.");
}

/**
 * Déplace une consigne d'un rang. L'ordre ne change pas le jeu (le tirage est
 * aléatoire) mais organise la liste d'administration, qui grossit vite.
 */
export async function moveRankingCondition(
  id: string,
  direction: "up" | "down",
): Promise<void> {
  const { id: universeId } = await getCurrentUniverse();
  const rows = await prisma.rankingCondition.findMany({
    where: { universeId },
    orderBy: { position: "asc" },
    select: { id: true },
  });

  const index = rows.findIndex((r) => r.id === id);
  if (index === -1) throw new Error("Consigne introuvable dans cet univers.");
  const target = direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= rows.length) return; // déjà en butée

  // Positions potentiellement trouées ou dupliquées (seed, éditions passées) :
  // on réécrit l'ordre complet plutôt que d'échanger deux valeurs.
  const reordered = [...rows];
  [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
  await prisma.$transaction(
    reordered.map((row, position) =>
      prisma.rankingCondition.update({
        where: { id: row.id },
        data: { position },
      }),
    ),
  );
}
