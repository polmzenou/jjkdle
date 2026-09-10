import { prisma } from "@/lib/prisma";
import { getRoster } from "@/lib/content/queries";
import { getCurrentUniverse } from "@/lib/universes/current";
import { getUniverseBySlug } from "@/lib/universes/registry";
import { deriveRanking } from "@/lib/ranking/derive";
import { resolveDraftConfig } from "@/lib/games/draft/config";
import { DEFAULT_DRAFT_BOSSES } from "@/lib/games/draft/bosses";
import {
  DRAFT_POOL_SIZE,
  generatePool,
} from "@/lib/games/draft/generate";
import type { CategoryId } from "@/data/roster/categories";

/**
 * Bouton « Tout importer » de l'onglet Draft — génère le roster draft ET les
 * boss de l'univers administré depuis le roster du builder.
 *
 * Même contrat que `importCategoryConditions` (le bouton « Importer les
 * catégories » du Pyramid), dont ce module est le pendant :
 *  • univers pris sur `getCurrentUniverse()` (cookie `admin_universe`) ;
 *  • IDEMPOTENT — chaque ligne générée porte le slug stable
 *    `auto-<perso>-<catégorie>`, donc ré-appuyer met à jour au lieu de
 *    dupliquer, et ne touche à AUCUN personnage draft écrit à la main ;
 *  • rapport rendu tel quel à l'admin.
 *
 * ── Pourquoi un personnage peut apparaître dans plusieurs catégories ───────
 * Un pool complet fait 15 personnages (2 S, 3 A, 5 B, 5 C) et il y a 8
 * catégories, soit ~120 lignes — plus que le roster de n'importe quel univers
 * (59 à 101 personnages). Chaque ligne est donc un couple PERSONNAGE ×
 * CATÉGORIE : le même visage peut être S en Vitesse et B en Battle IQ, avec un
 * coût différent à chaque fois. Le tirage (`pickDraw`) évite de le montrer deux
 * fois, `canSelect` verrouille la seconde carte s'il y parvient quand même, et
 * `validateSelection` refuse la sélection côté serveur.
 *
 * ── Les catégories ────────────────────────────────────────────────────────
 * Ce sont les catégories du BUILDER de l'univers, celles-là mêmes qui portent
 * les notes : l'import range donc un personnage dans la catégorie où il est
 * noté, sans traduction. Un plateau Demon Slayer parle de « Souffle » et de
 * « Piliers », et le pool de chaque ligne est classé sur la note qui porte ce
 * nom-là.
 */

/**
 * Slug d'une ligne générée : `<personnage>-<catégorie>`.
 *
 * C'est la clé de l'idempotence, et c'est aussi EXACTEMENT la convention des
 * lignes déjà en base (le roster JJK a été monté à la main sur ce modèle). Un
 * préfixe `auto-` aurait été plus prudent en théorie, mais il aurait créé un
 * second jeu de lignes à côté du premier au lieu de le reprendre : deux fois le
 * même personnage dans la même catégorie, et un plateau plein de doublons.
 */
function draftSlug(characterId: string, categoryId: string): string {
  return `${characterId}-${categoryId}`;
}

export interface DraftImportReport {
  /** Personnages draft créés. */
  created: number;
  /** Personnages draft mis à jour (réimport). */
  updated: number;
  /**
   * Lignes ANCIENNES rattachées à leur personnage (`sourceCharacterId`) sans
   * être régénérées. C'est ce rattachement qui permet au tirage de ne jamais
   * montrer deux fois le même visage.
   */
  linked: number;
  /**
   * Lignes SUPPRIMÉES parce que rangées dans une catégorie qui ne fait pas
   * partie du plateau de cet univers — donc jamais tirables.
   */
  removed: number;
  /** Boss créés (les boss existants ne sont JAMAIS écrasés). */
  bossesCreated: number;
  /** Catégories sans source exploitable, avec la raison affichée telle quelle. */
  skipped: { label: string; reason: string }[];
  /** Catégories dont le pool est plus court que 15, avec sa taille réelle. */
  thin: { label: string; count: number }[];
}

export async function importDraftRoster(): Promise<DraftImportReport> {
  const { id: universeId, slug: universeSlug } = await getCurrentUniverse();
  const config = resolveDraftConfig(getUniverseBySlug(universeSlug)?.draft);

  const [categories, roster, existingCharacters, existingBosses] =
    await Promise.all([
      prisma.category.findMany({
        where: { universeId },
        select: { id: true, slug: true, label: true },
      }),
      getRoster(universeId),
      prisma.draftCharacter.findMany({
        where: { universeId },
        select: {
          id: true,
          slug: true,
          excellenceCategory: true,
          sourceCharacterId: true,
        },
      }),
      prisma.draftBoss.findMany({
        where: { universeId },
        select: { slug: true },
      }),
    ]);

  const categoryBySlug = new Map(categories.map((c) => [c.slug, c]));
  const draftBySlug = new Map(existingCharacters.map((c) => [c.slug, c]));
  const characterById = new Map(roster.map((c) => [c.id, c]));

  const report: DraftImportReport = {
    created: 0,
    updated: 0,
    linked: 0,
    removed: 0,
    bossesCreated: 0,
    skipped: [],
    thin: [],
  };

  /** Lignes régénérées ce tour-ci : elles n'ont pas besoin du rattrapage final. */
  const regenerated = new Set<string>();

  let position = 0;

  for (const categorySlug of config.categories) {
    const source = categoryBySlug.get(categorySlug);
    if (!source) {
      report.skipped.push({
        label: categorySlug,
        reason: "catégorie absente de cet univers",
      });
      continue;
    }

    // `deriveRanking` applique déjà la règle « clé absente = non éligible » et
    // le tri note → battleValue → nom : rien à réécrire ici. Pas d'arbitrage
    // manuel (`tiebreak`) : le classement d'un pool n'est jamais montré au
    // joueur, seuls le tier et le coût en découlent.
    const { order } = deriveRanking(
      roster,
      source.id as CategoryId,
      [],
      DRAFT_POOL_SIZE,
    );

    if (order.length === 0) {
      report.skipped.push({
        label: source.label,
        reason: "aucun personnage noté sur cette catégorie",
      });
      continue;
    }
    if (order.length < DRAFT_POOL_SIZE) {
      report.thin.push({ label: source.label, count: order.length });
    }

    const slots = generatePool(order.length);

    for (const [rank, characterId] of order.entries()) {
      const character = characterById.get(characterId);
      const slot = slots[rank];
      if (!character || !slot) continue;

      // `Character.slug` vaut toujours `Character.id` (cf. `roster-store`), et
      // le type métier ne porte que l'id : on s'appuie donc sur ce dernier.
      const slug = draftSlug(character.id, source.slug);
      const data = {
        name: character.name,
        image: character.image ?? null,
        excellenceCategory: source.slug,
        tier: slot.tier,
        cost: slot.cost,
        statValue: slot.statValue,
        sourceCharacterId: character.id,
        position,
      };
      position += 1;

      const previous = draftBySlug.get(slug);
      if (previous) {
        regenerated.add(previous.id);
        await prisma.draftCharacter.update({
          where: { id: previous.id },
          data,
        });
        report.updated += 1;
      } else {
        await prisma.draftCharacter.create({
          data: { id: `${universeSlug}-${slug}`, slug, universeId, ...data },
        });
        report.created += 1;
      }
    }
  }

  report.linked = await linkLegacyRows(
    existingCharacters,
    regenerated,
    characterById,
  );

  report.removed = await removeOrphanRows(universeId, config.categories);

  report.bossesCreated = await importDefaultBosses(
    universeId,
    universeSlug,
    new Set(existingBosses.map((b) => b.slug)),
    characterById,
  );

  return report;
}

/**
 * Supprime les lignes rangées dans une catégorie hors plateau.
 *
 * Le draft a longtemps eu ses PROPRES catégories, calquées sur Jujutsu Kaisen
 * (« Black Flash », « Coéquipier »), plaquées telles quelles sur les cinq
 * autres animes. Maintenant que les catégories du plateau sont celles du
 * builder de l'univers, ces lignes-là désignent des axes qui n'existent plus :
 * le tirage ne les regarde jamais, elles ne font qu'encombrer l'admin. On les
 * retire donc, et le rapport le dit — c'est la seule suppression que l'import
 * s'autorise.
 */
async function removeOrphanRows(
  universeId: string,
  categories: readonly string[],
): Promise<number> {
  const { count } = await prisma.draftCharacter.deleteMany({
    where: { universeId, excellenceCategory: { notIn: [...categories] } },
  });
  return count;
}

/**
 * Rattache à leur personnage les lignes draft que l'import n'a pas régénérées.
 *
 * Le roster draft historique a été saisi à la main, sans lien vers le roster :
 * un même personnage y existe sous plusieurs lignes (`naoya`, `naoya-speed`)
 * que rien ne relie entre elles. Le tirage les prenait donc pour deux
 * personnes et pouvait les poser côte à côte sur la même ligne.
 *
 * On ne supprime rien — une ligne ancienne peut porter un équilibrage voulu :
 * on lui pose seulement l'étiquette qui manquait, en reconnaissant son
 * personnage soit par son slug entier, soit par son slug amputé du suffixe de
 * catégorie.
 */
async function linkLegacyRows(
  rows: {
    id: string;
    slug: string;
    excellenceCategory: string;
    sourceCharacterId: string | null;
  }[],
  regenerated: Set<string>,
  characterById: Map<string, { id: string }>,
): Promise<number> {
  let linked = 0;
  for (const row of rows) {
    if (row.sourceCharacterId || regenerated.has(row.id)) continue;
    const suffix = `-${row.excellenceCategory}`;
    const candidate = row.slug.endsWith(suffix)
      ? row.slug.slice(0, -suffix.length)
      : row.slug;
    const character = characterById.get(candidate);
    if (!character) continue;
    await prisma.draftCharacter.update({
      where: { id: row.id },
      data: { sourceCharacterId: character.id },
    });
    linked += 1;
  }
  return linked;
}

/**
 * Pose les 6 boss par défaut de l'univers, en CRÉATION SEULE.
 *
 * Un boss déjà en base n'est jamais réécrit : les PV réglés à la main survivent
 * au réimport, exactement comme l'arbitrage d'égalités du Pyramid. Pour revenir
 * aux valeurs par défaut, il faut donc supprimer le boss puis réimporter.
 */
async function importDefaultBosses(
  universeId: string,
  universeSlug: string,
  existing: Set<string>,
  characterById: Map<string, { id: string; name: string }>,
): Promise<number> {
  const seeds = DEFAULT_DRAFT_BOSSES[universeSlug];
  if (!seeds) return 0;

  let created = 0;
  for (const [index, seed] of seeds.entries()) {
    if (existing.has(seed.slug)) continue;
    // `characterSlug` est la clé lisible du roster, qui vaut son `id`.
    const character = characterById.get(seed.characterSlug);
    await prisma.draftBoss.create({
      data: {
        id: `${universeSlug}-boss-${seed.slug}`,
        slug: seed.slug,
        universeId,
        // Le nom du roster prime : c'est celui que le joueur voit partout
        // ailleurs sur le site.
        name: character?.name ?? seed.name,
        threshold: seed.threshold,
        characterId: character?.id ?? null,
        image: seed.image ?? null,
        position: index,
      },
    });
    created += 1;
  }
  return created;
}
