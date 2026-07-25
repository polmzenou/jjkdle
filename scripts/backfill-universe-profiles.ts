/**
 * Backfill multi-univers — ÉTAPE 2c, phase A. Profils par univers.
 *
 *   npx tsx scripts/backfill-universe-profiles.ts
 *
 * À lancer APRÈS le `db:push` + `db:generate` de la phase A 2c (le modèle
 * `UserUniverseProfile` doit exister). Idempotent (upsert par [userId, universeId]).
 *
 * Pour CHAQUE utilisateur, crée/mets à jour sa ligne UserUniverseProfile univers
 * JJK en RECOPIANT le loadout et le streak actuellement portés par `User`
 * (titre/cadre/bannière/avatar/layout équipés + champs jjkdle*). Les colonnes
 * d'origine sur `User` restent en place (strangler) : elles seront supprimées
 * dans une phase ultérieure, une fois la lecture/écriture basculée et vérifiée.
 */

import { PrismaClient, Prisma } from "@prisma/client";
import { jjk } from "../lib/universes/jjk";

const prisma = new PrismaClient();

async function main() {
  const universe = await prisma.universe.findUnique({
    where: { slug: jjk.slug },
    select: { id: true },
  });
  if (!universe) {
    throw new Error(
      `Univers "${jjk.slug}" absent — lancer d'abord scripts/backfill-universe.ts.`,
    );
  }

  // Lecture des colonnes source en SQL BRUT à dessein : elles sont SUPPRIMÉES de
  // `User` en step 3 (leur copie vit dans UserUniverseProfile). En raw, le script
  // reste typecheck-safe après le drop ; il n'est plus re-jouable (colonnes
  // disparues) — c'est voulu, sa migration est terminée.
  type UserRow = {
    id: string;
    equippedTitleKey: string | null;
    equippedFrameKey: string | null;
    bannerKey: string;
    avatarCharacterId: string | null;
    profileLayout: unknown;
    jjkdleStreak: number;
    jjkdleBestStreak: number;
    jjkdleLastPlayedAt: string | null;
  };
  const users = await prisma.$queryRaw<UserRow[]>`
    SELECT "id", "equippedTitleKey", "equippedFrameKey", "bannerKey",
           "avatarCharacterId", "profileLayout", "jjkdleStreak",
           "jjkdleBestStreak", "jjkdleLastPlayedAt"
    FROM "User"`;

  let created = 0;
  for (const u of users) {
    const data = {
      equippedTitleKey: u.equippedTitleKey,
      equippedFrameKey: u.equippedFrameKey,
      bannerKey: u.bannerKey,
      avatarCharacterId: u.avatarCharacterId,
      profileLayout:
        u.profileLayout != null
          ? (u.profileLayout as Prisma.InputJsonValue)
          : undefined,
      jjkdleStreak: u.jjkdleStreak,
      jjkdleBestStreak: u.jjkdleBestStreak,
      jjkdleLastPlayedAt: u.jjkdleLastPlayedAt,
    };
    await prisma.userUniverseProfile.upsert({
      where: { userId_universeId: { userId: u.id, universeId: universe.id } },
      create: { userId: u.id, universeId: universe.id, ...data },
      update: data,
    });
    created += 1;
  }

  console.log(`✓ ${created} profil(s) UserUniverseProfile (univers=${jjk.slug}) synchronisés.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
