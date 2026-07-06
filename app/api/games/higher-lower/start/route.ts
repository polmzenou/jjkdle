import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/auth/session";
import { getHigherLowerPool, MIN_HL_POOL } from "@/lib/games/higher-lower/queries";
import {
  createSession,
  deleteSession,
  HL_COOKIE,
} from "@/lib/games/higher-lower/store";

/**
 * POST /api/games/higher-lower/start
 *
 * Démarre une partie. Le serveur pioche la 1re paire, stocke la vraie énergie
 * occulte du perso de droite en base (`HigherLowerSession`) et ne renvoie au
 * client que le nom + image des deux persos (valeur de droite MASQUÉE).
 * Jouable sans compte : `userId` est nullable.
 */

export const dynamic = "force-dynamic";

export async function POST() {
  const user = await getCurrentUser();
  const pool = await getHigherLowerPool();
  if (pool.length < MIN_HL_POOL) {
    return NextResponse.json(
      { ok: false, error: "Pas assez de personnages notés pour lancer ce jeu." },
      { status: 400 },
    );
  }

  const store = await cookies();
  // Nettoie une éventuelle partie précédente non terminée.
  const prev = store.get(HL_COOKIE)?.value;
  if (prev) await deleteSession(prev);

  const started = await createSession(user?.id ?? null, pool);
  if (!started) {
    return NextResponse.json(
      { ok: false, error: "Impossible de démarrer la partie." },
      { status: 400 },
    );
  }

  store.set(HL_COOKIE, started.runId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 6, // 6 h : une partie ne dure jamais aussi longtemps
  });

  return NextResponse.json({
    ok: true,
    view: started.view,
    isAuthed: Boolean(user),
  });
}
