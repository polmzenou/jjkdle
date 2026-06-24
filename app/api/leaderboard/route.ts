import { NextResponse } from "next/server";

/**
 * Endpoint leaderboard — STUB MVP.
 *
 * Au lancement, le best score est purement LOCAL (cookie httpOnly, voir
 * lib/bestScore.ts). Ce endpoint existe pour figer le contrat d'API et faciliter
 * l'ajout futur d'un leaderboard global anonyme.
 *
 * ─── Pour activer le leaderboard global (Neon Postgres + Prisma) ───
 * 1. Décommenter le modèle `LeaderboardEntry` dans prisma/schema.prisma.
 * 2. Renseigner DATABASE_URL (voir .env.example), puis :
 *      npx prisma generate && npx prisma migrate deploy
 * 3. Remplacer les handlers ci-dessous par :
 *
 *    import { prisma } from "@/lib/prisma";
 *
 *    export async function GET() {
 *      const top = await prisma.leaderboardEntry.findMany({
 *        orderBy: { score: "desc" },
 *        take: 20,
 *      });
 *      return NextResponse.json({ entries: top });
 *    }
 *
 *    export async function POST(req: Request) {
 *      const { pseudo, score } = await req.json();
 *      // valider pseudo (longueur, charset) + score (0..1000) ici
 *      const entry = await prisma.leaderboardEntry.create({
 *        data: { pseudo: String(pseudo).slice(0, 24), score: Number(score) },
 *      });
 *      return NextResponse.json({ entry }, { status: 201 });
 *    }
 */

const LOCAL_ONLY = {
  mode: "local-only",
  message:
    "Le leaderboard global n'est pas activé. Le meilleur score est conservé localement (cookie). Voir le README pour brancher Neon + Prisma.",
};

export async function GET() {
  return NextResponse.json(LOCAL_ONLY, { status: 200 });
}

export async function POST() {
  return NextResponse.json(LOCAL_ONLY, { status: 501 });
}
