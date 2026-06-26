"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { CategoryConfig } from "@/data/roster/categories";
import type { Character } from "@/data/roster/characters";
import {
  joinLobbyAction,
  leaveLobbyAction,
  lockCategoryAction,
  playAgainAction,
  startGameAction,
} from "@/lib/multiplayer/actions";
import {
  EVENTS,
  lobbyChannel,
  type LobbyStatePayload,
  type PlayerLockedPayload,
  type SerializedLobby,
} from "@/lib/multiplayer/events";
import { buildRosterMap } from "@/lib/multiplayer/state";
import { createPusherClient } from "@/lib/pusher/client";
import { WaitingRoom } from "./WaitingRoom";
import { MultiplayerBoard } from "./MultiplayerBoard";
import { MultiplayerRecap } from "./MultiplayerRecap";

interface MultiplayerLobbyProps {
  initialLobby: SerializedLobby;
  categories: CategoryConfig[];
  roster: Character[];
  currentUserId: string;
  pusherReady: boolean;
}

export function MultiplayerLobby({
  initialLobby,
  categories,
  roster,
  currentUserId,
  pusherReady,
}: MultiplayerLobbyProps) {
  const router = useRouter();
  const [lobby, setLobby] = useState<SerializedLobby>(initialLobby);
  const [connError, setConnError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const rosterMap = useMemo(() => buildRosterMap(roster), [roster]);
  const code = lobby.code;
  const isMember = lobby.players.some((p) => p.userId === currentUserId);

  // ── Abonnement temps réel (uniquement si membre + Pusher configuré) ──
  useEffect(() => {
    if (!pusherReady || !isMember) return;

    const client = createPusherClient();
    const channel = client.subscribe(lobbyChannel(code));

    channel.bind(EVENTS.lobbyState, (payload: LobbyStatePayload) => {
      setLobby(payload.lobby);
    });

    // Cue d'animation : applique le lock adverse immédiatement (le snapshot confirme).
    channel.bind(EVENTS.playerLocked, (cue: PlayerLockedPayload) => {
      setLobby((prev) => {
        if (prev.roundIndex !== cue.roundIndex) return prev;
        return {
          ...prev,
          players: prev.players.map((p) =>
            p.userId === cue.userId && !p.selection[cue.categoryId]
              ? {
                  ...p,
                  selection: { ...p.selection, [cue.categoryId]: cue.characterId },
                  lockedThisRound: true,
                }
              : p,
          ),
        };
      });
    });

    channel.bind("pusher:subscription_error", () => {
      setConnError("Connexion temps réel impossible. Recharge la page.");
    });

    return () => {
      channel.unbind_all();
      client.unsubscribe(lobbyChannel(code));
      client.disconnect();
    };
  }, [pusherReady, isMember, code]);

  // ── Actions ──
  const handleLock = useCallback(
    (categoryId: string) => {
      // Lock optimiste local (le snapshot serveur fait foi ensuite).
      setLobby((prev) => ({
        ...prev,
        players: prev.players.map((p) => {
          if (p.userId !== currentUserId) return p;
          const characterId = p.currentDraw[categoryId];
          if (!characterId || p.selection[categoryId]) return p;
          return {
            ...p,
            selection: { ...p.selection, [categoryId]: characterId },
            lockedThisRound: true,
          };
        }),
      }));
      void lockCategoryAction(code, categoryId);
    },
    [code, currentUserId],
  );

  const handleStart = useCallback(() => {
    startTransition(async () => {
      const res = await startGameAction(code);
      if (!res.ok && res.error) setConnError(res.error);
    });
  }, [code]);

  const handlePlayAgain = useCallback(() => {
    startTransition(async () => {
      await playAgainAction(code);
    });
  }, [code]);

  const handleLeave = useCallback(() => {
    startTransition(async () => {
      await leaveLobbyAction(code);
      router.push("/games/multiplayer");
    });
  }, [code, router]);

  const handleJoin = useCallback(() => {
    startTransition(async () => {
      const res = await joinLobbyAction(code);
      if (res.ok) router.refresh();
      else setConnError(res.error ?? "Impossible de rejoindre ce lobby.");
    });
  }, [code, router]);

  // ── Rendu ──
  if (!pusherReady) {
    return (
      <Centered>
        <p className="text-amber-200">
          Le mode multijoueur n'est pas configuré sur ce serveur.
        </p>
      </Centered>
    );
  }

  if (!isMember) {
    return (
      <Centered>
        <p className="text-white/70">
          Lobby <span className="font-display font-bold text-white">{code}</span>
          {lobby.status !== "WAITING"
            ? " — la partie a déjà commencé."
            : ` · ${lobby.players.length} joueur(s)`}
        </p>
        {lobby.status === "WAITING" && (
          <button
            type="button"
            disabled={pending}
            onClick={handleJoin}
            className="mt-5 rounded-xl bg-domain px-6 py-3 font-display font-bold uppercase tracking-wide text-white shadow-glow transition-transform hover:scale-105 active:scale-95 disabled:opacity-60"
          >
            Rejoindre le lobby
          </button>
        )}
        {connError && <p className="mt-4 text-sm text-cursed-light">{connError}</p>}
      </Centered>
    );
  }

  // En jeu : pleine largeur d'écran (surtout pour le layout 3 joueurs).
  // Salon d'attente / récap : ils se recentrent eux-mêmes.
  const fullWidth = lobby.status === "PLAYING";

  return (
    <main
      className={`mx-auto min-h-screen px-3 py-8 sm:px-6 ${
        fullWidth ? "w-full" : "max-w-6xl"
      }`}
    >
      {connError && (
        <p className="mb-4 rounded-xl border border-cursed/30 bg-cursed/10 px-4 py-2 text-center text-sm text-cursed-light">
          {connError}
        </p>
      )}

      {lobby.status === "WAITING" && (
        <WaitingRoom
          lobby={lobby}
          currentUserId={currentUserId}
          pending={pending}
          onStart={handleStart}
          onLeave={handleLeave}
        />
      )}

      {lobby.status === "PLAYING" && (
        <MultiplayerBoard
          lobby={lobby}
          categories={categories}
          rosterMap={rosterMap}
          currentUserId={currentUserId}
          onLock={handleLock}
        />
      )}

      {lobby.status === "FINISHED" && (
        <MultiplayerRecap
          lobby={lobby}
          categories={categories}
          rosterMap={rosterMap}
          currentUserId={currentUserId}
          pending={pending}
          onPlayAgain={handlePlayAgain}
          onLeave={handleLeave}
        />
      )}
    </main>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
      {children}
    </main>
  );
}
