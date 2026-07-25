import { prisma } from "@/lib/prisma";
import { universeConfigPrefix } from "@/lib/config/app-config";
import {
  DEFAULT_UNIVERSE_SLUG,
  getUniverseBySlug,
  listUniverses,
} from "@/lib/universes/registry";
import { isUniverseFreePath } from "@/lib/universes/routing";

/**
 * GESTION DES UNIVERS (table `Universe`) — vue d'administration globale.
 *
 * Un univers a DEUX moitiés, et c'est structurant :
 *   - une LIGNE en base, créée/renommée/supprimée ici : c'est elle que tout le
 *     contenu référence (`universeId`) ;
 *   - une CONFIG en code (`lib/universes/<slug>.ts`, inscrite au registre) :
 *     thème, logo, libellés, SEO. Le middleware tourne sur l'Edge et n'a pas
 *     accès à la base — c'est donc le registre, et lui seul, qui rend un slug
 *     ROUTABLE (`/csm/games`) et thémable.
 *
 * Conséquence assumée : créer la ligne ici ne suffit pas à ouvrir un univers ;
 * il faut aussi sa config. `configured` porte cette information pour que la vue
 * le dise explicitement au lieu de laisser un univers muet.
 */

/** Volume de contenu rattaché à un univers (bloque sa suppression). */
export interface UniverseContentCounts {
  characters: number;
  categories: number;
  draftCharacters: number;
  rankingConditions: number;
  attributes: number;
  profiles: number;
}

/** Un univers tel que présenté à l'administration. */
export interface AdminUniverse {
  id: string;
  slug: string;
  name: string;
  /** ISO — la vue formate côté client. */
  createdAt: string;
  /** Une config code existe pour ce slug (sinon : ni routable, ni thémable). */
  configured: boolean;
  /** Nom de l'œuvre, depuis la config code (`null` si non configuré). */
  sourceWork: string | null;
  /** Univers de repli de la plateforme (`DEFAULT_UNIVERSE`) : non supprimable. */
  isDefault: boolean;
  counts: UniverseContentCounts;
  /** Total des lignes rattachées : > 0 ⇒ suppression refusée. */
  attachedRows: number;
}

/** Slug d'une config code SANS ligne en base (univers prêt à être créé). */
export interface UnclaimedConfig {
  slug: string;
  name: string;
  sourceWork: string;
}

const NAME_MIN = 2;
const NAME_MAX = 40;
const SLUG_MAX = 24;

/**
 * Slugs interdits : ils entreraient en collision avec un chemin qui n'appartient
 * à aucun univers (`/admin`, `/login`…) ou avec l'infrastructure Next. Le premier
 * segment de l'URL désignant l'univers, un slug `login` rendrait le routage
 * ambigu — mieux vaut le refuser à la création qu'en debug plus tard.
 */
const RESERVED_SLUGS = new Set([
  "api",
  "assets",
  "_next",
  "static",
  "public",
  "u",
  "hub",
  "www",
]);

/** Vrai si ce slug ne peut pas servir de préfixe d'univers. */
function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug) || isUniverseFreePath(`/${slug}`);
}

/** Valide un slug d'univers. Renvoie le slug normalisé, ou une erreur. */
export function validateUniverseSlug(
  raw: string,
): { ok: true; slug: string } | { ok: false; error: string } {
  const slug = raw.trim().toLowerCase();
  if (!slug) return { ok: false, error: "Le slug est obligatoire." };
  if (slug.length > SLUG_MAX) {
    return { ok: false, error: `Slug trop long (${SLUG_MAX} caractères max).` };
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return {
      ok: false,
      error:
        "Slug invalide : minuscules, chiffres et tirets internes uniquement (ex. « csm »).",
    };
  }
  if (isReservedSlug(slug)) {
    return { ok: false, error: `Slug réservé par la plateforme : « ${slug} ».` };
  }
  return { ok: true, slug };
}

/** Valide un nom d'univers. Renvoie le nom normalisé, ou une erreur. */
export function validateUniverseName(
  raw: string,
): { ok: true; name: string } | { ok: false; error: string } {
  const name = raw.trim().replace(/\s+/g, " ");
  if (name.length < NAME_MIN || name.length > NAME_MAX) {
    return {
      ok: false,
      error: `Le nom doit faire entre ${NAME_MIN} et ${NAME_MAX} caractères.`,
    };
  }
  return { ok: true, name };
}

/** Tous les univers en base, avec leur volume de contenu et leur config. */
export async function listAdminUniverses(): Promise<AdminUniverse[]> {
  const rows = await prisma.universe.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      slug: true,
      name: true,
      createdAt: true,
      _count: {
        select: {
          characters: true,
          categories: true,
          draftCharacters: true,
          rankingConditions: true,
          attributes: true,
          userProfiles: true,
        },
      },
    },
  });

  return rows.map((row) => {
    const config = getUniverseBySlug(row.slug);
    const counts: UniverseContentCounts = {
      characters: row._count.characters,
      categories: row._count.categories,
      draftCharacters: row._count.draftCharacters,
      rankingConditions: row._count.rankingConditions,
      attributes: row._count.attributes,
      profiles: row._count.userProfiles,
    };
    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      createdAt: row.createdAt.toISOString(),
      configured: Boolean(config),
      sourceWork: config?.sourceWork ?? null,
      isDefault: row.slug === DEFAULT_UNIVERSE_SLUG,
      counts,
      attachedRows: Object.values(counts).reduce((a, b) => a + b, 0),
    };
  });
}

/**
 * Configs code sans ligne en base : univers « prêts à créer » en un clic. C'est
 * le cas normal après avoir ajouté `lib/universes/<slug>.ts` — la vue propose
 * alors la création plutôt que d'obliger à retaper slug et nom.
 */
export async function listUnclaimedConfigs(): Promise<UnclaimedConfig[]> {
  const taken = new Set(
    (await prisma.universe.findMany({ select: { slug: true } })).map(
      (u) => u.slug,
    ),
  );
  return listUniverses()
    .filter((c) => !taken.has(c.slug))
    .map((c) => ({ slug: c.slug, name: c.name, sourceWork: c.sourceWork }));
}

/** Crée la ligne `Universe`. Le slug doit être libre. */
export async function createUniverse(input: {
  slug: string;
  name: string;
}): Promise<AdminUniverse> {
  const existing = await prisma.universe.findUnique({
    where: { slug: input.slug },
    select: { id: true },
  });
  if (existing) {
    throw new Error(`L'univers « ${input.slug} » existe déjà.`);
  }
  await prisma.universe.create({
    data: { slug: input.slug, name: input.name },
    select: { id: true },
  });
  // Relit par la voie normale : même forme (compteurs, config) que la liste.
  const created = (await listAdminUniverses()).find(
    (u) => u.slug === input.slug,
  );
  if (!created) throw new Error("Univers créé mais introuvable en relecture.");
  return created;
}

/** Renomme un univers (le slug, lui, est immuable — il est dans les URLs). */
export async function renameUniverse(id: string, name: string): Promise<void> {
  await prisma.universe.update({ where: { id }, data: { name } });
}

/**
 * Supprime un univers — refusé s'il porte encore la moindre ligne.
 *
 * Aucune suppression en cascade : effacer un univers effacerait son roster, ses
 * classements et la progression des joueurs qui y ont joué. On exige donc un
 * univers VIDE, et l'appelant affiche ce qui reste à retirer.
 *
 * Purge en revanche sa config `AppConfig` (`u.<slug>.*`), invisible en base :
 * sans ça, un univers recréé avec le même slug hériterait de vieux flags.
 */
export async function deleteUniverse(id: string): Promise<void> {
  const universe = (await listAdminUniverses()).find((u) => u.id === id);
  if (!universe) throw new Error("Univers introuvable.");
  if (universe.isDefault) {
    throw new Error(
      `« ${universe.slug} » est l'univers par défaut de la plateforme : il ne peut pas être supprimé.`,
    );
  }
  if (universe.attachedRows > 0) {
    throw new Error(
      `Univers non vide : ${describeContent(universe.counts)}. Retire ce contenu avant de le supprimer.`,
    );
  }

  await prisma.$transaction([
    prisma.appConfig.deleteMany({
      where: { key: { startsWith: universeConfigPrefix(universe.slug) } },
    }),
    prisma.universe.delete({ where: { id } }),
  ]);
}

/** Résumé lisible du contenu restant (message d'erreur de suppression). */
function describeContent(counts: UniverseContentCounts): string {
  const labels: [keyof UniverseContentCounts, string][] = [
    ["characters", "personnage(s)"],
    ["draftCharacters", "personnage(s) draft"],
    ["categories", "catégorie(s)"],
    ["attributes", "attribut(s)"],
    ["rankingConditions", "condition(s) de classement"],
    ["profiles", "profil(s) joueur"],
  ];
  return labels
    .filter(([key]) => counts[key] > 0)
    .map(([key, label]) => `${counts[key]} ${label}`)
    .join(", ");
}
