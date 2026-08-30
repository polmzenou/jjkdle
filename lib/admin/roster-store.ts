import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { Character } from "@/data/roster/characters";
import { getRoster } from "@/lib/content/queries";

/**
 * Lecture/écriture du roster en base (Neon Postgres).
 *
 * Contrairement à l'ancienne version sur fichier JSON, l'écriture fonctionne
 * partout (y compris en production) : plus de limite « filesystem en lecture
 * seule » de Vercel.
 */

/** Roster complet (ordre d'affichage). */
export async function readRoster(): Promise<Character[]> {
  return getRoster();
}

/**
 * Écrit les valeurs d'attributs DATA-DRIVEN d'un personnage : upsert de ce qui
 * est renseigné, SUPPRESSION de ce qui a été vidé (une ligne absente = « non
 * renseigné », ce qui conditionne l'éligibilité au pool quotidien).
 *
 * Les clés inconnues de l'univers sont ignorées : la validation a déjà eu lieu
 * dans `saveCharacterAction`, on ne fait ici que persister.
 */
async function characterAttributeWrites(
  characterId: string,
  universeId: string,
  attributes: Record<string, string | number>,
): Promise<Prisma.PrismaPromise<unknown>[]> {
  const attrs = await prisma.attribute.findMany({
    where: { universeId },
    select: {
      id: true,
      key: true,
      kind: true,
      options: { select: { id: true, value: true } },
    },
  });

  const clear = (attributeId: string) =>
    prisma.characterAttribute.deleteMany({ where: { characterId, attributeId } });

  return attrs.map((attr) => {
    const raw = attributes[attr.key];

    // Valeur absente/vide → l'attribut n'est plus renseigné.
    if (raw == null || raw === "") return clear(attr.id);

    const data =
      attr.kind === "NUMERIC"
        ? { numericValue: Number(raw), optionId: null }
        : {
            optionId:
              attr.options.find((o) => o.value === String(raw))?.id ?? null,
            numericValue: null,
          };

    // Valeur non reconnue pour une liste fermée → traitée comme non renseignée.
    if (attr.kind !== "NUMERIC" && data.optionId == null) return clear(attr.id);

    return prisma.characterAttribute.upsert({
      where: {
        characterId_attributeId: { characterId, attributeId: attr.id },
      },
      create: { characterId, attributeId: attr.id, ...data },
      update: data,
    });
  });
}

/**
 * Ajoute (ou met à jour si l'id existe) un personnage, DANS UNE TRANSACTION.
 *
 * L'atomicité n'est pas un luxe : la version précédente créait la ligne PUIS
 * écrivait les attributs. Une erreur sur la seconde étape affichait un échec à
 * l'admin tout en laissant le personnage créé — impossible de savoir, depuis
 * l'interface, si l'enregistrement avait pris ou pas.
 *
 * `universeId` est EXPLICITE (résolu par l'appelant) : le rattachement d'un
 * nouveau personnage est trop lourd de conséquences pour dépendre d'un contexte
 * de requête lu au fond de la pile.
 */
export async function upsertCharacter(
  char: Character,
  universeId: string,
): Promise<void> {
  const data = {
    name: char.name,
    title: char.title,
    tier: char.tier,
    image: char.image ?? null,
    ratings: char.ratings,
    battleValue: char.battleValue ?? null,
  };

  const existing = await prisma.character.findUnique({
    where: { id: char.id },
    select: { id: true, universeId: true },
  });

  // Un personnage existant garde SON univers : on ne déplace jamais un perso
  // d'un anime à l'autre par une simple édition.
  const targetUniverseId = existing?.universeId ?? universeId;

  let save: Prisma.PrismaPromise<unknown>;
  if (existing) {
    save = prisma.character.update({ where: { id: char.id }, data });
  } else {
    // Nouveau personnage : positionné en fin de liste DE SON UNIVERS.
    const max = await prisma.character.aggregate({
      where: { universeId: targetUniverseId },
      _max: { position: true },
    });
    save = prisma.character.create({
      data: {
        id: char.id,
        ...data,
        position: (max._max.position ?? -1) + 1,
        universeId: targetUniverseId,
        slug: char.id, // `slug` = id (clé lisible, unique par univers)
      },
    });
  }

  const attributeWrites = await characterAttributeWrites(
    char.id,
    targetUniverseId,
    char.attributes ?? {},
  );

  // Ordre significatif : la ligne doit exister avant que ses attributs ne la
  // référencent (FK). `$transaction` exécute le tableau en séquence.
  await prisma.$transaction([save, ...attributeWrites]);
}

/**
 * Retire UNE note de catégorie d'un personnage (croix au survol du tag, admin).
 *
 * `ratings` est une colonne JSON : on relit puis on réécrit l'objet sans la clé.
 * Absence de note = absence de clé, ce qui rend le personnage inéligible au
 * tirage de cette catégorie — même sémantique que le formulaire complet.
 *
 * Idempotent : retirer une note déjà absente ne fait rien. Lève si le
 * personnage n'existe pas (l'appelant en fait un message d'erreur).
 */
export async function removeCharacterRating(
  characterId: string,
  categoryId: string,
): Promise<void> {
  const existing = await prisma.character.findUnique({
    where: { id: characterId },
    select: { ratings: true },
  });
  if (!existing) throw new Error(`Personnage introuvable : ${characterId}`);

  const ratings = { ...((existing.ratings ?? {}) as Record<string, number>) };
  if (!(categoryId in ratings)) return;
  delete ratings[categoryId];

  await prisma.character.update({
    where: { id: characterId },
    data: { ratings },
  });
}

/** Supprime un personnage par id (ignore s'il n'existe pas). */
export async function deleteCharacter(id: string): Promise<void> {
  // Les CharacterAttribute partent en cascade (onDelete: Cascade).
  await prisma.character.deleteMany({ where: { id } });
}
