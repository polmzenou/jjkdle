import { prisma } from "@/lib/prisma";
import type { Character } from "@/data/roster/characters";
import { getRoster } from "@/lib/content/queries";
import { getCurrentUniverse } from "@/lib/universes/current";

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
async function writeCharacterAttributes(
  characterId: string,
  universeId: string,
  attributes: Record<string, string | number>,
): Promise<void> {
  const attrs = await prisma.attribute.findMany({
    where: { universeId },
    select: {
      id: true,
      key: true,
      kind: true,
      options: { select: { id: true, value: true } },
    },
  });

  for (const attr of attrs) {
    const raw = attributes[attr.key];

    // Valeur absente/vide → l'attribut n'est plus renseigné.
    if (raw == null || raw === "") {
      await prisma.characterAttribute.deleteMany({
        where: { characterId, attributeId: attr.id },
      });
      continue;
    }

    const data =
      attr.kind === "NUMERIC"
        ? { numericValue: Number(raw), optionId: null }
        : {
            optionId:
              attr.options.find((o) => o.value === String(raw))?.id ?? null,
            numericValue: null,
          };

    // Valeur non reconnue pour une liste fermée → traitée comme non renseignée.
    if (attr.kind !== "NUMERIC" && data.optionId == null) {
      await prisma.characterAttribute.deleteMany({
        where: { characterId, attributeId: attr.id },
      });
      continue;
    }

    await prisma.characterAttribute.upsert({
      where: {
        characterId_attributeId: { characterId, attributeId: attr.id },
      },
      create: { characterId, attributeId: attr.id, ...data },
      update: data,
    });
  }
}

/** Ajoute (ou met à jour si l'id existe) un personnage. */
export async function upsertCharacter(char: Character): Promise<void> {
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

  let universeId: string;
  if (existing) {
    universeId = existing.universeId;
    await prisma.character.update({ where: { id: char.id }, data });
  } else {
    // Nouveau personnage : rattaché à l'univers courant, positionné en fin de
    // liste DE CET UNIVERS (max position par univers). `slug` = id (clé lisible).
    const current = await getCurrentUniverse();
    universeId = current.id;
    const max = await prisma.character.aggregate({
      where: { universeId: current.id },
      _max: { position: true },
    });
    await prisma.character.create({
      data: {
        id: char.id,
        ...data,
        position: (max._max.position ?? -1) + 1,
        universeId: current.id,
        slug: char.id,
      },
    });
  }

  // Attributs écrits dans l'univers DU PERSONNAGE (pas forcément le courant :
  // l'admin multi-univers de l'étape 5 pourra éditer un autre univers).
  await writeCharacterAttributes(char.id, universeId, char.attributes ?? {});
}

/** Supprime un personnage par id (ignore s'il n'existe pas). */
export async function deleteCharacter(id: string): Promise<void> {
  // Les CharacterAttribute partent en cascade (onDelete: Cascade).
  await prisma.character.deleteMany({ where: { id } });
}
