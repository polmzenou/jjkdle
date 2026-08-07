import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { getPusherServer, isPusherConfigured } from "@/lib/pusher/server";
import { findLobby } from "@/lib/multiplayer/store";

/**
 * Auth des canaux de présence Pusher. Vérifie la session ET l'appartenance
 * avant de signer l'abonnement.
 *
 * Deux familles de canaux, volontairement séparées :
 *  - `presence-lobby-<code>`  : jeux à lobby, appartenance via `findLobby` ;
 *  - `presence-casino-<code>` : tables de casino, appartenance via `CasinoSeat`.
 *
 * Le casino ne peut PAS passer par `findLobby` : cette fonction filtre par
 * univers (garde multi-univers centrale), or le casino est hors univers. Aucune
 * table ne serait jamais autorisée.
 */
export async function POST(req: Request) {
  if (!isPusherConfigured()) {
    return NextResponse.json({ error: "Pusher non configuré." }, { status: 503 });
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const form = await req.formData();
  const socketId = String(form.get("socket_id") ?? "");
  const channel = String(form.get("channel_name") ?? "");

  const lobbyMatch = /^presence-lobby-([A-Z0-9]+)$/.exec(channel);
  const casinoMatch = /^presence-casino-([A-Z0-9]+)$/.exec(channel);
  if (!socketId || (!lobbyMatch && !casinoMatch)) {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  if (casinoMatch) {
    // Il faut être ASSIS à la table : aucun spectateur au casino, les mains des
    // autres joueurs ne regardent que ceux qui misent.
    const seat = await prisma.casinoSeat.findFirst({
      where: { userId: user.id, table: { code: casinoMatch[1] } },
      select: { id: true },
    });
    if (!seat) {
      return NextResponse.json({ error: "Accès refusé à la table." }, { status: 403 });
    }
  } else {
    const lobby = await findLobby(lobbyMatch![1]);
    if (!lobby) {
      return NextResponse.json({ error: "Accès refusé au lobby." }, { status: 403 });
    }
    const isPlayer = lobby.players.some((p) => p.userId === user.id);
    // Spectateurs : autorisés uniquement sur une partie « Qui est-ce ? » en cours.
    const canSpectate = lobby.gameId === "guesswho" && lobby.status !== "WAITING";
    if (!isPlayer && !canSpectate) {
      return NextResponse.json({ error: "Accès refusé au lobby." }, { status: 403 });
    }
  }

  const auth = getPusherServer().authorizeChannel(socketId, channel, {
    user_id: user.id,
    user_info: { username: user.username },
  });
  return NextResponse.json(auth);
}
