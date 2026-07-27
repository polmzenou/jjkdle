import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getHigherLowerPool } from "@/lib/games/higher-lower/queries";
import {
  getSession,
  advanceSession,
  HL_COOKIE,
} from "@/lib/games/higher-lower/store";
import { computeCorrect, type HLChoice } from "@/lib/games/higher-lower/types";

/**
 * POST /api/games/higher-lower/guess   Body : { choice: "higher" | "lower" }
 *
 * Anti-triche : le comparatif est calculé ICI à partir de la valeur cachée
 * stockée en session — le client n'a jamais reçu la vraie valeur du perso de
 * droite. Bonne réponse → +1 + nouveau perso à droite. Mauvaise → game over
 * (la session est conservée pour que `end` persiste le score final).
 */

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const store = await cookies();
  const runId = store.get(HL_COOKIE)?.value;
  if (!runId) {
    return NextResponse.json(
      { ok: false, error: "Aucune partie en cours." },
      { status: 409 },
    );
  }

  const session = await getSession(runId);
  if (!session) {
    store.delete(HL_COOKIE);
    return NextResponse.json(
      { ok: false, error: "Partie expirée, relance une partie." },
      { status: 409 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Requête invalide." }, { status: 400 });
  }
  const choice = (body as { choice?: unknown } | null)?.choice as HLChoice;
  if (choice !== "higher" && choice !== "lower") {
    return NextResponse.json({ ok: false, error: "Choix invalide." }, { status: 400 });
  }

  const left = { value: session.leftValue, tiebreak: session.leftTiebreak };
  const right = { value: session.rightValue, tiebreak: session.rightTiebreak };
  const correct = computeCorrect(left, right, choice);

  // Le pool sert aussi au LIBELLÉ révélé (« Puissant ») : il est donc chargé même
  // en cas de game over, où la partie ne continue pas.
  const pool = await getHigherLowerPool();
  const revealed = {
    ...right,
    valueLabel:
      pool.characters.find((c) => c.id === session.rightId)?.valueLabel ??
      String(right.value),
  };

  if (!correct) {
    // Game over : on garde la session (score inchangé) pour `end`.
    return NextResponse.json({
      ok: true,
      correct: false,
      revealed,
      score: session.score,
      gameOver: true,
    });
  }

  const next = await advanceSession(session, pool.characters);
  if (!next) {
    // Pool épuisé : bonne réponse comptée (score +1), plus de perso à proposer.
    return NextResponse.json({
      ok: true,
      correct: true,
      revealed,
      score: session.score + 1,
      gameOver: true,
    });
  }

  return NextResponse.json({
    ok: true,
    correct: true,
    revealed,
    score: next.score,
    next,
    gameOver: false,
  });
}
