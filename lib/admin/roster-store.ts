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

/** Ajoute (ou met à jour si l'id existe) un personnage. */
export async function upsertCharacter(char: Character): Promise<void> {
  const data = {
    name: char.name,
    title: char.title,
    tier: char.tier,
    image: char.image ?? null,
    ratings: char.ratings,
    battleValue: char.battleValue ?? null,
    // Attributs JJKdle (null = non renseigné).
    race: char.race ?? null,
    gender: char.gender ?? null,
    grade: char.grade ?? null,
    affiliation: char.affiliation ?? null,
    clan: char.clan ?? null,
    appearanceArc: char.appearanceArc ?? null,
    hasDomain: char.hasDomain ?? null,
    cursedEnergy: char.cursedEnergy ?? null,
  };

  const existing = await prisma.character.findUnique({
    where: { id: char.id },
    select: { id: true },
  });

  if (existing) {
    await prisma.character.update({ where: { id: char.id }, data });
  } else {
    // Nouveau personnage : positionné en fin de liste.
    const max = await prisma.character.aggregate({ _max: { position: true } });
    await prisma.character.create({
      data: { id: char.id, ...data, position: (max._max.position ?? -1) + 1 },
    });
  }
}

/** Supprime un personnage par id (ignore s'il n'existe pas). */
export async function deleteCharacter(id: string): Promise<void> {
  await prisma.character.deleteMany({ where: { id } });
}
