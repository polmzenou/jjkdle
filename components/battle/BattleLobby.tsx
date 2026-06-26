"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Character } from "@/data/roster/characters";
import type { SerializedLobby } from "@/lib/multiplayer/events";
import { buildRosterMap } from "@/lib/multiplayer/state";
import { createPusherClient } from "@/lib/pusher/client";
import { WaitingRoom } from "@/components/multiplayer/WaitingRoom";
import {
  decideAction,
  finishCombatAction,
  handleOpponentLeftAction,
  joinBattleLobbyAction,
  leaveBattleAction,
  playAgainBattleAction,
  startBattleAction,
} from "@/lib/games/battle/actions";
import { BATTLE_EVENTS, lobbyChannel } from "@/lib/games/battle/events";
import {
  type BattleDecision,
  type BattleState,
  type BattleStatePayload,
} from "@/lib/games/battle/types";
import { DraftPhase } from "./DraftPhase";
import { BattleCombat } from "./BattleCombat";
import { BattleResult } from "./BattleResult";

interface BattleLobbyProps {
  initialLobby: SerializedLobby;
  initialGameState: BattleState | null;
  roster: Character[];
  currentUserId: string;
  pusherReady: boolean;
}

export function BattleLobby({
  initialLobby,
  initialGameState,
  roster,
  currentUserId,
  pusherReady,
}: BattleLobbyProps) {
  const router = useRouter();
  const [lobby, setLobby] = useState<SerializedLobby>(initialLobby);
  const [gameState, setGameState] = useState<BattleState | null>(initialGameState);
  const [connError, setConnError] = useState<string | null>(null);
  const [hardcore, setHardcore] = useState(false);
  const [pending, startTransition] = useTransition();

  const rosterMap = useMemo(() => buildRosterMap(roster), [roster]);
  const code = lobby.code;
  const isMember = lobby.players.some((p) => p.userId === currentUserId);

  // Garde : ne déclenche le forfait adverse qu'une fois par déconnexion.
  const handledLeftRef = useRef<string | null>(null);

  // ── Abonnement temps réel ──
  useEffect(() => {
    if (!pusherReady || !isMember) return;

    const client = createPusherClient();
    const channel = client.subscribe(lobbyChannel(code));

    channel.bind(BATTLE_EVENTS.state, (payload: BattleStatePayload) => {
      setLobby(payload.lobby);
      setGameState(payload.gameState);
    });

    // Déconnexion d'un joueur (fermeture d'onglet) : le joueur restant nettoie l'état.
    channel.bind(
      "pusher:member_removed",
      (member: { id: string }) => {
        if (member.id === currentUserId) return;
        if (handledLeftRef.current === member.id) return;
        handledLeftRef.current = member.id;
        void handleOpponentLeftAction(code, member.id);
      },
    );

    channel.bind("pusher:subscription_error", () => {
      setConnError("Connexion temps réel impossible. Recharge la page.");
    });

    return () => {
      channel.unbind_all();
      client.unsubscribe(lobbyChannel(code));
      client.disconnect();
    };
  }, [pusherReady, isMember, code, currentUserId]);

  // ── Actions ──
  const handleStart = useCallback(() => {
    startTransition(async () => {
      const res = await startBattleAction(code, hardcore);
      if (!res.ok && res.error) setConnError(res.error);
    });
  }, [code, hardcore]);

  const handleDecide = useCallback(
    (decision: BattleDecision) => {
      startTransition(async () => {
        const res = await decideAction(code, decision);
        if (!res.ok && res.error) setConnError(res.error);
      });
    },
    [code],
  );

  const handleFinishCombat = useCallback(() => {
    void finishCombatAction(code);
  }, [code]);

  const handlePlayAgain = useCallback(() => {
    startTransition(async () => {
      await playAgainBattleAction(code);
    });
  }, [code]);

  const handleLeave = useCallback(() => {
    startTransition(async () => {
      await leaveBattleAction(code);
      router.push("/games/battle");
    });
  }, [code, router]);

  const handleJoin = useCallback(() => {
    startTransition(async () => {
      const res = await joinBattleLobbyAction(code);
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

  const inResult = lobby.status === "FINISHED" || gameState?.phase === "RESULT";

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-3 py-8 sm:px-6">
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
          title="JJK Random Battle"
          maxPlayers={2}
          hostExtra={
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-cursed/40 bg-cursed/5 px-4 py-3 text-left">
              <input
                type="checkbox"
                checked={hardcore}
                onChange={(e) => setHardcore(e.target.checked)}
                className="h-4 w-4 accent-cursed"
              />
              <span>
                <span className="block font-display text-sm font-bold uppercase tracking-wide text-cursed-light">
                  Mode Hardcore
                </span>
                <span className="block text-xs text-white/50">
                  Gauntlet « le vainqueur reste » : le plus fort élimine et continue
                  jusqu'à tomber sur plus fort que lui.
                </span>
              </span>
            </label>
          }
        />
      )}

      {lobby.status === "PLAYING" && gameState?.phase === "DRAFT" && (
        <DraftPhase
          lobby={lobby}
          gameState={gameState}
          rosterMap={rosterMap}
          currentUserId={currentUserId}
          pending={pending}
          onDecide={handleDecide}
        />
      )}

      {lobby.status === "PLAYING" && gameState?.phase === "COMBAT" && (
        <BattleCombat
          lobby={lobby}
          gameState={gameState}
          rosterMap={rosterMap}
          currentUserId={currentUserId}
          onFinish={handleFinishCombat}
        />
      )}

      {inResult && gameState?.result && (
        <BattleResult
          lobby={lobby}
          gameState={gameState}
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
