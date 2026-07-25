import type { AttributeKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUniverse } from "@/lib/universes/current";

/**
 * CRUD des ATTRIBUTS d'un univers (étape 5) — c'est ce module qui rend un nouvel
 * anime ajoutable SANS CODE : définir ses attributs et leurs valeurs possibles
 * suffit à faire fonctionner JJKdle pour lui.
 *
 * Module server-only. Aucune invalidation de cache à faire ici : le schéma est
 * mémoïsé PAR REQUÊTE (cf. `loadAttributeSchema`), donc la modification est
 * visible dès le rendu suivant, sur toutes les instances.
 *
 * L'univers ciblé est l'univers COURANT, que le middleware fait correspondre à
 * l'univers sélectionné dans l'admin (cf. lib/universes/admin-scope.ts).
 */

/** Forme éditable d'un attribut (vue admin). */
export interface AttributeInput {
  /** Absent = création. */
  id?: string;
  key: string;
  label: string;
  kind: AttributeKind;
  position: number;
  comparable: boolean;
  /** NUMERIC uniquement ; ignoré sinon. */
  tolerance: number | null;
}

/** Forme éditable d'une valeur possible. */
export interface AttributeOptionInput {
  /** Absent = création. */
  id?: string;
  attributeId: string;
  value: string;
  label: string;
  /** `null` = valeur NON ordonnée (jamais de flèche ↑/↓). */
  order: number | null;
}

/** Attribut tel que listé dans l'admin (avec ses options et son usage). */
export interface AdminAttribute {
  id: string;
  key: string;
  label: string;
  kind: AttributeKind;
  position: number;
  comparable: boolean;
  tolerance: number | null;
  options: {
    id: string;
    value: string;
    label: string;
    order: number | null;
    /** Nombre de personnages portant cette valeur (garde-fou à la suppression). */
    usageCount: number;
  }[];
  /** Nombre de personnages ayant une valeur pour cet attribut. */
  usageCount: number;
}

/** Clé d'attribut : identifiant technique, utilisé comme clé d'objet côté code. */
const KEY_PATTERN = /^[a-z][a-zA-Z0-9]*$/;

/** Valide une clé d'attribut (renvoie un message d'erreur, ou null si OK). */
export function validateAttributeKey(key: string): string | null {
  if (!KEY_PATTERN.test(key)) {
    return "La clé doit commencer par une minuscule et ne contenir que des lettres/chiffres (ex. « appearanceArc »).";
  }
  return null;
}

/** Attributs de l'univers courant, ordonnés comme la grille du jeu. */
export async function listAttributes(): Promise<AdminAttribute[]> {
  const { id: universeId } = await getCurrentUniverse();
  const rows = await prisma.attribute.findMany({
    where: { universeId },
    orderBy: { position: "asc" },
    select: {
      id: true,
      key: true,
      label: true,
      kind: true,
      position: true,
      comparable: true,
      tolerance: true,
      _count: { select: { values: true } },
      options: {
        orderBy: [{ order: "asc" }, { label: "asc" }],
        select: {
          id: true,
          value: true,
          label: true,
          order: true,
          _count: { select: { values: true } },
        },
      },
    },
  });

  return rows.map((r) => ({
    id: r.id,
    key: r.key,
    label: r.label,
    kind: r.kind,
    position: r.position,
    comparable: r.comparable,
    tolerance: r.tolerance,
    usageCount: r._count.values,
    options: r.options.map((o) => ({
      id: o.id,
      value: o.value,
      label: o.label,
      order: o.order,
      usageCount: o._count.values,
    })),
  }));
}

/**
 * Crée ou met à jour un attribut de l'univers courant.
 * La `key` est immuable après création : elle sert de clé dans les valeurs
 * `Character.attributes` et peut être référencée par du code (ex. l'attribut
 * comparé par Higher/Lower). La renommer orphelinerait ces références.
 */
export async function upsertAttribute(input: AttributeInput): Promise<void> {
  const { id: universeId } = await getCurrentUniverse();
  // La tolérance n'a de sens que pour un NUMERIC.
  const tolerance = input.kind === "NUMERIC" ? input.tolerance : null;

  if (input.id) {
    await prisma.attribute.update({
      where: { id: input.id },
      data: {
        label: input.label,
        kind: input.kind,
        position: input.position,
        comparable: input.comparable,
        tolerance,
      },
    });
  } else {
    await prisma.attribute.create({
      data: {
        universeId,
        key: input.key,
        label: input.label,
        kind: input.kind,
        position: input.position,
        comparable: input.comparable,
        tolerance,
      },
    });
  }
}

/**
 * Supprime un attribut. DESTRUCTIF : les options et toutes les valeurs saisies
 * pour les personnages partent en cascade (`onDelete: Cascade`), ce qui peut
 * rendre des persos incomplets et donc inéligibles au tirage quotidien.
 */
export async function deleteAttribute(id: string): Promise<void> {
  const { id: universeId } = await getCurrentUniverse();
  // `deleteMany` borné à l'univers : un id d'un autre univers ne peut rien casser.
  await prisma.attribute.deleteMany({ where: { id, universeId } });
}

/** Crée ou met à jour une valeur possible d'un attribut. */
export async function upsertAttributeOption(
  input: AttributeOptionInput,
): Promise<void> {
  const { id: universeId } = await getCurrentUniverse();
  // L'attribut doit appartenir à l'univers administré.
  const attribute = await prisma.attribute.findFirst({
    where: { id: input.attributeId, universeId },
    select: { id: true },
  });
  if (!attribute) throw new Error("Attribut introuvable dans cet univers.");

  if (input.id) {
    await prisma.attributeOption.update({
      where: { id: input.id },
      data: { label: input.label, order: input.order },
    });
  } else {
    await prisma.attributeOption.create({
      data: {
        attributeId: input.attributeId,
        value: input.value,
        label: input.label,
        order: input.order,
      },
    });
  }
}

/**
 * Supprime une valeur possible. DESTRUCTIF : les personnages qui la portaient
 * perdent cet attribut (cascade), et deviennent donc incomplets.
 */
export async function deleteAttributeOption(id: string): Promise<void> {
  const { id: universeId } = await getCurrentUniverse();
  const option = await prisma.attributeOption.findFirst({
    where: { id, attribute: { universeId } },
    select: { id: true },
  });
  if (!option) throw new Error("Valeur introuvable dans cet univers.");
  await prisma.attributeOption.delete({ where: { id } });
}
