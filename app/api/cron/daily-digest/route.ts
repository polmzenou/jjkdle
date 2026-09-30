import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getGameFlags, getMaintenance } from "@/lib/config/app-config";
import { getCasinoConfig } from "@/lib/casino/config";
import { gameTitleForUniverse } from "@/lib/games/registry";
import { listAvailableUniverses } from "@/lib/universes/current";
import { collectErrorsForDigest } from "@/lib/mail/error-throttle";
import { sendMail } from "@/lib/mail/send";
import { digestMail } from "@/lib/mail/templates";

/**
 * Résumé quotidien envoyé à l'administration (Vercel Cron, cf. vercel.json).
 *
 * Protégé par `CRON_SECRET` : Vercel envoie `Authorization: Bearer <secret>` à
 * chaque déclenchement. Sans secret configuré, la route refuse tout — elle ne
 * doit pas pouvoir être déclenchée par n'importe qui.
 */
export const dynamic = "force-dynamic";

const DAY_MS = 24 * 60 * 60 * 1000;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const since = new Date(Date.now() - DAY_MS);
  const recent = { createdAt: { gte: since } };

  // Parties comptables : seuls ces jeux enregistrent une ligne PAR PARTIE. Les
  // autres (builder, pyramide, draft) ne gardent que le meilleur score.
  const [
    newUsers,
    totalUsers,
    jjkdle,
    higherLower,
    guessWho,
    codenames,
    tower,
    contactsByType,
    unmailedContacts,
    universes,
    casino,
    errors,
  ] = await Promise.all([
    prisma.user.findMany({
      where: recent,
      orderBy: { createdAt: "asc" },
      select: { username: true, email: true },
    }),
    prisma.user.count(),
    prisma.jjkdleResult.count({ where: recent }),
    prisma.higherLowerScore.count({ where: recent }),
    prisma.guessWhoScore.count({ where: recent }),
    prisma.codenamesScore.count({ where: recent }),
    prisma.towerRun.count({ where: recent }),
    prisma.contactMessage.groupBy({
      by: ["type"],
      where: recent,
      _count: { _all: true },
    }),
    prisma.contactMessage.count({ where: { ...recent, mailed: false } }),
    listAvailableUniverses(),
    getCasinoConfig(),
    collectErrorsForDigest(),
  ]);

  const disabledGames: { universe: string; game: string }[] = [];
  const maintenance: string[] = [];
  for (const u of universes) {
    const [flags, m] = await Promise.all([
      getGameFlags(u.slug),
      getMaintenance(u.slug),
    ]);
    for (const [gameId, enabled] of Object.entries(flags)) {
      if (!enabled) {
        disabledGames.push({
          universe: u.name,
          game: gameTitleForUniverse(gameId, u.config.gameCopy),
        });
      }
    }
    if (m.enabled) maintenance.push(u.name);
  }

  const contacts = { GENERAL: 0, BUG: 0, IDEA: 0 };
  for (const row of contactsByType) contacts[row.type] = row._count._all;

  const result = await sendMail(
    digestMail({
      newUsers,
      totalUsers,
      gamesPlayed: [
        { game: "JJKdle (tous univers)", count: jjkdle },
        { game: "Higher / Lower", count: higherLower },
        { game: "Guess Who", count: guessWho },
        { game: "Codenames", count: codenames },
        { game: "Culling Tower (runs lancées)", count: tower },
      ],
      contacts,
      unmailedContacts,
      errors,
      disabledGames,
      maintenance,
      casinoOpen: casino.enabled,
    }),
  );

  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
