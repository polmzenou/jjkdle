"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import type { Character } from "@/data/roster/characters";
import type { SerializedLobby } from "@/lib/multiplayer/events";
import { buildRosterMap } from "@/lib/multiplayer/state";
import { createPusherClient } from "@/lib/pusher/client";
import { WaitingRoom } from "@/components/multiplayer/WaitingRoom";
import {
  getMySecretAction,
  guessAction,
  handleOpponentLeftAction,
  joinGuessWhoLobbyAction,
  leaveGuessWhoAction,
  passTurnAction,
  playAgainGuessWhoAction,
  sendChatAction,
  startGuessWhoAction,
} from "@/lib/games/guesswho/actions";
import { GUESSWHO_EVENTS, lobbyChannel } from "@/lib/games/guesswho/events";
import type {
  GuessWhoChatMessage,
  GuessWhoGuessResultPayload,
  GuessWhoPublicState,
  GuessWhoStartPayload,
  GuessWhoStatePayload,
  GuessWhoTurnPayload,
} from "@/lib/games/guesswho/types";
import { GuessWhoBoard, type BoardMode } from "./GuessWhoBoard";
import { GuessWhoSecretPanel } from "./GuessWhoSecretPanel";
import { GuessWhoChat } from "./GuessWhoChat";
import { GuessConfirmModal } from "./GuessConfirmModal";
import { GuessWhoResultModal } from "./GuessWhoResultModal";

interface GuessWhoLobbyProps {
  initialLobby: SerializedLobby;
  initialPublicState: GuessWhoPublicState | null;
  initialMySecretId: string | null;
  roster: Character[];
  currentUserId: string;
  pusherReady: boolean;
}

export function GuessWhoLobby({
  initialLobby,
  initialPublicState,
  initialMySecretId,
  roster,
  currentUserId,
  pusherReady,
}: GuessWhoLobbyProps) {
  const router = useRouter();
  const [lobby, setLobby] = useState<SerializedLobby>(initialLobby);
  const [publicState, setPublicState] = useState<GuessWhoPublicState | null>(
    initialPublicState,
  );
  const [mySecretId, setMySecretId] = useState<string | null>(initialMySecretId);
  const [eliminated, setEliminated] = useState<Set<string>>(new Set());
  const [messages, setMessages] = useState<GuessWhoChatMessage[]>([]);
  const [mode, setMode] = useState<BoardMode>("idle");
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [connError, setConnError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const rosterMap = useMemo(() => buildRosterMap(roster), [roster]);
  const code = lobby.code;
  const isMember = lobby.players.some((p) => p.userId === currentUserId);
  const handledLeftRef = useRef<string | null>(null);

  // Récupère MON secret (jamais celui de l'adversaire) via Server Action.
  const fetchMySecret = useCallback(() => {
    void getMySecretAction(code).then((res) => {
      if (res.ok) setMySecretId(res.secretId);
    });
  }, [code]);

  // ── Abonnement temps réel ──
  useEffect(() => {
    if (!pusherReady || !isMember) return;

    const client = createPusherClient();
    const channel = client.subscribe(lobbyChannel(code));

    channel.bind(GUESSWHO_EVENTS.state, (payload: GuessWhoStatePayload) => {
      setLobby(payload.lobby);
      setPublicState(payload.publicState);
      // Retour au salon (play-again / forfait) : on réinitialise l'état local.
      if (!payload.publicState) {
        setMySecretId(null);
        setEliminated(new Set());
        setMode("idle");
        setConfirmId(null);
      }
    });

    channel.bind(GUESSWHO_EVENTS.start, (payload: GuessWhoStartPayload) => {
      setLobby(payload.lobby);
      setPublicState({
        grid: payload.grid,
        currentTurn: payload.currentTurn,
        status: "ACTIVE",
        winnerId: null,
      });
      setEliminated(new Set());
      setMode("idle");
      setConfirmId(null);
      fetchMySecret();
    });

    channel.bind(GUESSWHO_EVENTS.turnPassed, (payload: GuessWhoTurnPayload) => {
      setPublicState((prev) =>
        prev ? { ...prev, currentTurn: payload.currentTurn } : prev,
      );
    });

    channel.bind(GUESSWHO_EVENTS.chat, (msg: GuessWhoChatMessage) => {
      setMessages((prev) => [...prev, msg]);
    });

    channel.bind(
      GUESSWHO_EVENTS.guessResult,
      (payload: GuessWhoGuessResultPayload) => {
        setMode("idle");
        setConfirmId(null);
        setPublicState((prev) =>
          prev
            ? {
                ...prev,
                status: "FINISHED",
                winnerId: payload.winnerId,
                reveal: {
                  secret1Id: payload.secret1Id,
                  secret2Id: payload.secret2Id,
                },
              }
            : prev,
        );
      },
    );

    // Déconnexion d'un joueur (fermeture d'onglet) : le restant nettoie l'état.
    channel.bind("pusher:member_removed", (member: { id: string }) => {
      if (member.id === currentUserId) return;
      if (handledLeftRef.current === member.id) return;
      handledLeftRef.current = member.id;
      void handleOpponentLeftAction(code, member.id);
    });

    channel.bind("pusher:subscription_error", () => {
      setConnError("Connexion temps réel impossible. Recharge la page.");
    });

    return () => {
      channel.unbind_all();
      client.unsubscribe(lobbyChannel(code));
      client.disconnect();
    };
  }, [pusherReady, isMember, code, currentUserId, fetchMySecret]);

  // ── Actions ──
  const handleStart = useCallback(() => {
    startTransition(async () => {
      const res = await startGuessWhoAction(code);
      if (!res.ok && res.error) setConnError(res.error);
    });
  }, [code]);

  const handlePass = useCallback(() => {
    setMode("idle");
    startTransition(async () => {
      const res = await passTurnAction(code);
      if (!res.ok && res.error) setConnError(res.error);
    });
  }, [code]);

  const handleCardClick = useCallback(
    (id: string) => {
      if (mode === "eliminate") {
        setEliminated((prev) => {
          const next = new Set(prev);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
        });
      } else if (mode === "guess") {
        setConfirmId(id);
      }
    },
    [mode],
  );

  const handleConfirmGuess = useCallback(() => {
    if (!confirmId) return;
    const guessed = confirmId;
    startTransition(async () => {
      const res = await guessAction(code, guessed);
      if (!res.ok && res.error) {
        setConnError(res.error);
        setConfirmId(null);
      }
    });
  }, [code, confirmId]);

  const handleSendChat = useCallback(
    (text: string) => {
      void sendChatAction(code, text);
    },
    [code],
  );

  const handlePlayAgain = useCallback(() => {
    startTransition(async () => {
      await playAgainGuessWhoAction(code);
    });
  }, [code]);

  const handleLeave = useCallback(() => {
    startTransition(async () => {
      await leaveGuessWhoAction(code);
      router.push("/games/guesswho");
    });
  }, [code, router]);

  const handleJoin = useCallback(() => {
    startTransition(async () => {
      const res = await joinGuessWhoLobbyAction(code);
      if (res.ok) router.refresh();
      else setConnError(res.error ?? "Impossible de rejoindre ce lobby.");
    });
  }, [code, router]);

  // ── Dérivés d'affichage ──
  const gridChars = useMemo(
    () =>
      publicState
        ? publicState.grid
            .map((id) => rosterMap[id])
            .filter((c): c is Character => Boolean(c))
        : [],
    [publicState, rosterMap],
  );
  const mySecret = mySecretId ? (rosterMap[mySecretId] ?? null) : null;
  const isMyTurn =
    publicState?.status === "ACTIVE" && publicState.currentTurn === currentUserId;
  const finished = publicState?.status === "FINISHED";
  const isHost = lobby.hostId === currentUserId;

  // Révélation de fin : player1 = hôte (secret1). Robuste après rechargement.
  const reveal = publicState?.reveal;
  const amPlayer1 = currentUserId === lobby.hostId;
  const myRevealSecret = reveal
    ? rosterMap[amPlayer1 ? reveal.secret1Id : reveal.secret2Id] ?? null
    : mySecret;
  const opponentSecret = reveal
    ? rosterMap[amPlayer1 ? reveal.secret2Id : reveal.secret1Id] ?? null
    : null;

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

  return (
    <main className="mx-auto min-h-screen w-full max-w-[100rem] px-3 py-8 sm:px-6">
      {connError && (
        <p className="mb-4 rounded-xl border border-cursed/30 bg-cursed/10 px-4 py-2 text-center text-sm text-cursed-light">
          {connError}
        </p>
      )}

      {lobby.status === "WAITING" ? (
        <WaitingRoom
          lobby={lobby}
          currentUserId={currentUserId}
          pending={pending}
          onStart={handleStart}
          onLeave={handleLeave}
          title="Qui est-ce ?"
          maxPlayers={2}
        />
      ) : (
        <>
        <div className="mb-6 flex items-center justify-between gap-3">
          <p className="font-display text-lg font-bold text-white">
            Qui est-ce ?{" "}
            <span className="ml-1 text-sm font-normal tracking-[0.3em] text-white/40">
              {code}
            </span>
          </p>
          <button
            type="button"
            onClick={handleLeave}
            disabled={pending}
            className="rounded-xl border border-cursed/40 bg-cursed/10 px-4 py-2 text-sm font-bold uppercase tracking-wide text-cursed-light transition-colors hover:bg-cursed/20 disabled:opacity-40"
          >
            Quitter la partie
          </button>
        </div>
        <div className="grid gap-6 lg:grid-cols-[13rem_1fr_20rem] xl:grid-cols-[15rem_1fr_22rem]">
          <GuessWhoSecretPanel secret={mySecret} />
          {publicState && (
            <GuessWhoBoard
              characters={gridChars}
              eliminated={eliminated}
              mode={mode}
              isMyTurn={Boolean(isMyTurn)}
              mySecret={mySecret}
              pending={pending}
              onCardClick={handleCardClick}
              onSetMode={setMode}
              onPass={handlePass}
            />
          )}
          <GuessWhoChat
            messages={messages}
            currentUserId={currentUserId}
            onSend={handleSendChat}
          />
        </div>
        </>
      )}

      <GuessConfirmModal
        character={confirmId ? (rosterMap[confirmId] ?? null) : null}
        pending={pending}
        onConfirm={handleConfirmGuess}
        onCancel={() => setConfirmId(null)}
      />

      <GuessWhoResultModal
        open={Boolean(finished)}
        won={publicState?.winnerId === currentUserId}
        mySecret={myRevealSecret}
        opponentSecret={opponentSecret}
        isHost={isHost}
        pending={pending}
        onPlayAgain={handlePlayAgain}
        onLeave={handleLeave}
      />
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
