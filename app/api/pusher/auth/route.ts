import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getPusherServer, isPusherConfigured } from "@/lib/pusher/server";
import { findLobby } from "@/lib/multiplayer/store";

/**
 * Auth des canaux de présence Pusher (`presence-lobby-<code>`).
 * Vérifie la session ET l'appartenance au lobby avant de signer l'abonnement.
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

  const match = /^presence-lobby-([A-Z0-9]+)$/.exec(channel);
  if (!socketId || !match) {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const code = match[1];
  const lobby = await findLobby(code);
  if (!lobby) {
    return NextResponse.json({ error: "Accès refusé au lobby." }, { status: 403 });
  }
  const isPlayer = lobby.players.some((p) => p.userId === user.id);
  // Spectateurs : autorisés uniquement sur une partie « Qui est-ce ? » en cours.
  const canSpectate = lobby.gameId === "guesswho" && lobby.status !== "WAITING";
  if (!isPlayer && !canSpectate) {
    return NextResponse.json({ error: "Accès refusé au lobby." }, { status: 403 });
  }

  const auth = getPusherServer().authorizeChannel(socketId, channel, {
    user_id: user.id,
    user_info: { username: user.username },
  });
  return NextResponse.json(auth);
}
