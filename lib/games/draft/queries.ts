import { prisma } from "@/lib/prisma";
import { getCachedImage } from "@/lib/admin/image-cache";
import { getCurrentUniverse } from "@/lib/universes/current";
import type { DraftCharacter, DraftCategoryId, DraftTier } from "./types";
import { DRAFT_ROSTER } from "./roster";
import { DRAFT_CATEGORIES } from "./categories";
import { DRAW_PER_CATEGORY } from "./draw";

/**
 * Lecture du roster « Jujutsu Draft » en base (source de vérité éditable depuis
 * /admin). Module server-only (importe Prisma) : Server Components / Actions /
 * Route Handlers uniquement.
 *
 * Le tirage exige un roster suffisant (≥ 40 persos dont ≥ 8 Tier C). Si la base
 * ne le permet pas (non seedée ou trop réduite), `getDraftRoster` retombe sur la
 * liste maître en code pour que le jeu reste jouable.
 */

export const MIN_DRAFT_ROSTER = 40;
export const MIN_DRAFT_TIER_C = 8;

type DraftRow = {
  id: string;
  name: string;
  image: string | null;
  excellenceCategory: string;
  tier: string;
  cost: number;
  statValue: number;
};

function toDraftCharacter(row: DraftRow): DraftCharacter {
  // L'image en cache (bouton « OUAIS ») prime sur celle stockée en base.
  const image = getCachedImage(row.id) ?? row.image ?? undefined;
  return {
    id: row.id,
    name: row.name,
    ...(image ? { image } : {}),
    excellenceCategory: row.excellenceCategory as DraftCategoryId,
    tier: row.tier as DraftTier,
    cost: row.cost,
    statValue: row.statValue,
  };
}

/** Roster DB tel quel (pour l'admin). Vide si la base n'est pas seedée.
 * On NE sélectionne PAS `imageData` (les octets) : `image` ne porte que l'URL
 * d'affichage (servie par /api/draft-characters/[id]/image pour les uploads). */
export async function listDraftCharacters(
  universeId?: string,
): Promise<DraftCharacter[]> {
  const uid = universeId ?? (await getCurrentUniverse()).id;
  const rows = await prisma.draftCharacter.findMany({
    where: { universeId: uid },
    orderBy: { position: "asc" },
    select: {
      id: true,
      name: true,
      image: true,
      excellenceCategory: true,
      tier: true,
      cost: true,
      statValue: true,
    },
  });
  return rows.map(toDraftCharacter);
}

/** Roster utilisé par le jeu (univers courant) — repli sur la liste maître si
 * la base est insuffisante. Le repli est RÉSERVÉ à JJK : un autre univers ne
 * doit jamais afficher des persos JJK, il assume son propre roster en base. */
export async function getDraftRoster(): Promise<DraftCharacter[]> {
  const universe = await getCurrentUniverse();
  const roster = await listDraftCharacters(universe.id);
  const cCount = roster.filter((c) => c.tier === "C").length;
  // Cloisonnement : chaque catégorie doit avoir assez de membres pour remplir
  // une ligne (DRAW_PER_CATEGORY). Sinon, repli sur le roster maître équilibré.
  const perCategoryOk = DRAFT_CATEGORIES.every(
    (cat) =>
      roster.filter((c) => c.excellenceCategory === cat.id).length >=
      DRAW_PER_CATEGORY,
  );
  const insufficient =
    roster.length < MIN_DRAFT_ROSTER ||
    cCount < MIN_DRAFT_TIER_C ||
    !perCategoryOk;
  if (insufficient && universe.slug === "jjk") {
    return DRAFT_ROSTER;
  }
  return roster;
}

/** Roster du jeu indexé par id. */
export async function getDraftRosterMap(): Promise<
  Record<string, DraftCharacter>
> {
  const roster = await getDraftRoster();
  return Object.fromEntries(roster.map((c) => [c.id, c]));
}
