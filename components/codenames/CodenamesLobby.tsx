"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Character } from "@/data/roster/characters";
import type { SerializedLobby } from "@/lib/multiplayer/events";
import { buildRosterMap } from "@/lib/multiplayer/state";
import { createPusherClient } from "@/lib/pusher/client";
import { WaitingRoom } from "@/components/multiplayer/WaitingRoom";
import {
  autoBalanceTeamsAction,
  backToWaitingAction,
  chooseTeamAction,
  claimSpymasterAction,
  enterTeamSelectAction,
  getKeyCardAction,
  giveClueAction,
  handleOpponentLeftAction,
  joinCodenamesLobbyAction,
  leaveCodenamesLobbyAction,
  passAgentAction,
  playAgainCodenamesAction,
  revealCardAction,
  sendChatAction,
  startCodenamesAction,
  unclaimSpymasterAction,
} from "@/lib/games/codenames/actions";
import { CODENAMES_EVENTS, lobbyChannel } from "@/lib/games/codenames/events";
import { agentIdsOf } from "@/lib/games/codenames/logic";
import {
  CODENAMES_MAX_PLAYERS,
  CODENAMES_MIN_PLAYERS,
  type CodenamesChatMessage,
  type CodenamesCluePayload,
  type CodenamesEndPayload,
  type CodenamesPassPayload,
  type CodenamesPublicState,
  type CodenamesRevealPayload,
  type CodenamesRole,
  type CodenamesStartPayload,
  type CodenamesStatePayload,
  type CodenamesTeamSelectPayload,
  type ColorKey,
  type Team,
  type TeamSelectState,
} from "@/lib/games/codenames/types";
import { CodenamesTeamSelect } from "./CodenamesTeamSelect";
import { CodenamesBoard } from "./CodenamesBoard";
import { CodenamesKeyGrid } from "./CodenamesKeyGrid";
import { CodenamesTeamPanel } from "./CodenamesTeamPanel";
import { CodenamesChat } from "./CodenamesChat";
import { CodenamesClueBanner } from "./CodenamesClueBanner";
import { CodenamesClueInput } from "./CodenamesClueInput";
import { CodenamesPassButton } from "./CodenamesPassButton";
import { CodenamesResultModal } from "./CodenamesResultModal";

interface CodenamesLobbyProps {
  initialLobby: SerializedLobby;
  initialPublicState: CodenamesPublicState | null;
  initialTeamSelect: TeamSelectState | null;
  initialMyRole: CodenamesRole | null;
  roster: Character[];
  currentUserId: string;
  pusherReady: boolean;
}

export function CodenamesLobby({
  initialLobby,
  initialPublicState,
  initialTeamSelect,
  roster,
  currentUserId,
  pusherReady,
}: CodenamesLobbyProps) {
  const router = useRouter();
  const [lobby, setLobby] = useState<SerializedLobby>(initialLobby);
  const [publicState, setPublicState] = useState<CodenamesPublicState | null>(
    initialPublicState,
  );
  const [teamSelect, setTeamSelect] = useState<TeamSelectState | null>(
    initialTeamSelect,
  );
  const [messages, setMessages] = useState<CodenamesChatMessage[]>([]);
  const [keyCard, setKeyCard] = useState<ColorKey | null>(null);
  const [connError, setConnError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  const rosterMap = useMemo(() => buildRosterMap(roster), [roster]);
  const code = lobby.code;
  const isMember = lobby.players.some((p) => p.userId === currentUserId);
  const handledLeftRef = useRef<string | null>(null);

  // Récupère la carte-clé UNIQUEMENT si je suis maître-espion (jamais via Pusher).
  const fetchKeyCard = useCallback(() => {
    void getKeyCardAction(code).then((res) => {
      if (res.ok) setKeyCard(res.colorKey);
    });
  }, [code]);

  // ── Abonnement temps réel ──
  useEffect(() => {
    if (!pusherReady || !isMember) return;

    const client = createPusherClient();
    const channel = client.subscribe(lobbyChannel(code));

    channel.bind(CODENAMES_EVENTS.state, (payload: CodenamesStatePayload) => {
      setLobby(payload.lobby);
      setPublicState(payload.publicState);
      setTeamSelect(payload.teamSelect);
      if (!payload.publicState) setKeyCard(null);
    });

    channel.bind(CODENAMES_EVENTS.teamSelect, (payload: CodenamesTeamSelectPayload) => {
      setLobby(payload.lobby);
      setTeamSelect(payload.teamSelect);
    });

    channel.bind(CODENAMES_EVENTS.start, (payload: CodenamesStartPayload) => {
      setLobby(payload.lobby);
      setPublicState(payload.publicState);
      setTeamSelect(null);
      setMessages([]);
      fetchKeyCard();
    });

    channel.bind(CODENAMES_EVENTS.clue, (payload: CodenamesCluePayload) => {
      setPublicState((prev) =>
        prev
          ? {
              ...prev,
              currentClue: {
                word: payload.word,
                count: payload.count,
                remaining: payload.count + 1,
              },
            }
          : prev,
      );
      setMessages((prev) => [
        ...prev,
        {
          userId: payload.byUserId,
          username: payload.byUsername,
          text: `« ${payload.word} » : ${payload.count}`,
          at: Date.now(),
          kind: "clue",
          team: payload.team,
        },
      ]);
    });

    channel.bind(CODENAMES_EVENTS.reveal, (payload: CodenamesRevealPayload) => {
      setPublicState((prev) =>
        prev
          ? {
              ...prev,
              revealed: { ...prev.revealed, [payload.charId]: payload.color },
              redScore: payload.redScore,
              purpleScore: payload.purpleScore,
              currentTeam: payload.currentTeam,
              currentClue: payload.currentClue,
              passedAgentIds: payload.passedAgentIds,
            }
          : prev,
      );
    });

    channel.bind(CODENAMES_EVENTS.pass, (payload: CodenamesPassPayload) => {
      setPublicState((prev) =>
        prev
          ? {
              ...prev,
              passedAgentIds: payload.passedAgentIds,
              currentTeam: payload.currentTeam,
              currentClue: payload.currentClue,
            }
          : prev,
      );
    });

    channel.bind(CODENAMES_EVENTS.end, (payload: CodenamesEndPayload) => {
      setPublicState((prev) =>
        prev
          ? {
              ...prev,
              status: "FINISHED",
              winnerTeam: payload.winnerTeam,
              redScore: payload.redScore,
              purpleScore: payload.purpleScore,
              reveal: { colorKey: payload.colorKey },
            }
          : prev,
      );
    });

    channel.bind(CODENAMES_EVENTS.chat, (msg: CodenamesChatMessage) => {
      setMessages((prev) => [...prev, msg]);
    });

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
  }, [pusherReady, isMember, code, currentUserId, fetchKeyCard]);

  // Récupère la carte-clé au montage si une partie est déjà en cours (maître-espion).
  useEffect(() => {
    if (publicState && publicState.status === "ACTIVE") fetchKeyCard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Actions (wrappers useTransition) ──
  const run = useCallback(
    (fn: () => Promise<{ ok: boolean; error?: string }>) => {
      startTransition(async () => {
        const res = await fn();
        if (!res.ok && res.error) setConnError(res.error);
      });
    },
    [],
  );

  const handleEnterTeamSelect = useCallback(() => run(() => enterTeamSelectAction(code)), [run, code]);
  const handleChooseTeam = useCallback((team: Team) => run(() => chooseTeamAction(code, team)), [run, code]);
  const handleClaimSpymaster = useCallback((team: Team) => run(() => claimSpymasterAction(code, team)), [run, code]);
  const handleUnclaimSpymaster = useCallback(() => run(() => unclaimSpymasterAction(code)), [run, code]);
  const handleAutoBalance = useCallback(() => run(() => autoBalanceTeamsAction(code)), [run, code]);
  const handleBackToWaiting = useCallback(() => run(() => backToWaitingAction(code)), [run, code]);
  const handleStart = useCallback(() => run(() => startCodenamesAction(code)), [run, code]);
  const handleGiveClue = useCallback((word: string, count: number) => run(() => giveClueAction(code, word, count)), [run, code]);
  const handleReveal = useCallback((charId: string) => run(() => revealCardAction(code, charId)), [run, code]);
  const handlePass = useCallback(() => run(() => passAgentAction(code)), [run, code]);

  const handleSendChat = useCallback((text: string) => void sendChatAction(code, text), [code]);
  const handlePlayAgain = useCallback(() => run(() => playAgainCodenamesAction(code)), [run, code]);
  const handleLeave = useCallback(() => {
    startTransition(async () => {
      await leaveCodenamesLobbyAction(code);
      router.push("/games/codenames");
    });
  }, [code, router]);
  const handleJoin = useCallback(() => {
    startTransition(async () => {
      const res = await joinCodenamesLobbyAction(code);
      if (res.ok) router.refresh();
      else setConnError(res.error ?? "Impossible de rejoindre ce lobby.");
    });
  }, [code, router]);
  const handleShare = useCallback(() => {
    void navigator.clipboard?.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, []);

  // ── Dérivés ──
  const gridChars = useMemo(
    () =>
      publicState
        ? publicState.grid
            .map((id) => rosterMap[id])
            .filter((c): c is Character => Boolean(c))
        : [],
    [publicState, rosterMap],
  );
  const finished = publicState?.status === "FINISHED";
  const isHost = lobby.hostId === currentUserId;
  const playing = publicState !== null;

  const teams = publicState?.teams ?? {};
  const myTeam: Team | null = teams[currentUserId] ?? null;
  const isSpymaster = publicState
    ? currentUserId === publicState.redSpymasterId ||
      currentUserId === publicState.purpleSpymasterId
    : false;
  const currentTeam = publicState?.currentTeam ?? "RED";
  const isMyTurn = Boolean(myTeam && currentTeam === myTeam && !finished);
  const amActiveSpymaster = isMyTurn && isSpymaster;
  const amActiveAgent = isMyTurn && !isSpymaster && myTeam !== null;
  const clue = publicState?.currentClue ?? null;

  const activeAgents = publicState
    ? agentIdsOf(teams, currentTeam, publicState.redSpymasterId, publicState.purpleSpymasterId)
    : [];
  const passedIds = publicState?.passedAgentIds ?? [];

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
    const joinable = lobby.status === "WAITING" && !teamSelect;
    return (
      <Centered>
        <p className="text-white/70">
          Lobby <span className="font-display font-bold text-white">{code}</span>
          {` · ${lobby.players.length} joueur(s)`}
        </p>
        {joinable ? (
          <button
            type="button"
            disabled={pending}
            onClick={handleJoin}
            className="mt-5 rounded-xl bg-domain px-6 py-3 font-display font-bold uppercase tracking-wide text-white shadow-glow transition-transform hover:scale-105 active:scale-95 disabled:opacity-60"
          >
            Rejoindre le lobby
          </button>
        ) : (
          <p className="mt-3 text-sm text-white/40">La partie a déjà commencé.</p>
        )}
        {connError && <p className="mt-4 text-sm text-cursed-light">{connError}</p>}
      </Centered>
    );
  }

  return (
    <main
      className={
        playing
          ? "mx-auto flex h-[100dvh] w-full max-w-[110rem] flex-col overflow-hidden px-3 py-3 sm:px-6"
          : "mx-auto min-h-screen w-full max-w-[80rem] px-3 py-8 sm:px-6"
      }
    >
      {connError && (
        <p className="mb-2 shrink-0 rounded-xl border border-cursed/30 bg-cursed/10 px-4 py-2 text-center text-sm text-cursed-light">
          {connError}
        </p>
      )}

      {!playing ? (
        teamSelect ? (
          <CodenamesTeamSelect
            lobby={lobby}
            teamSelect={teamSelect}
            currentUserId={currentUserId}
            isHost={isHost}
            pending={pending}
            onChooseTeam={handleChooseTeam}
            onClaimSpymaster={handleClaimSpymaster}
            onUnclaimSpymaster={handleUnclaimSpymaster}
            onAutoBalance={handleAutoBalance}
            onStart={handleStart}
            onBackToWaiting={handleBackToWaiting}
            onLeave={handleLeave}
          />
        ) : (
          <WaitingRoom
            lobby={lobby}
            currentUserId={currentUserId}
            pending={pending}
            onStart={handleEnterTeamSelect}
            onLeave={handleLeave}
            title="JJK Codenames"
            maxPlayers={CODENAMES_MAX_PLAYERS}
            minPlayers={CODENAMES_MIN_PLAYERS}
            startLabel="Jouer"
          />
        )
      ) : (
        publicState && (
          <>
            <div className="mb-2 flex shrink-0 items-center justify-between gap-3">
              <p className="font-display text-lg font-bold text-white">
                JJK Codenames{" "}
                <span className="ml-1 text-sm font-normal tracking-[0.3em] text-white/40">
                  {code}
                </span>
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleShare}
                  className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-bold uppercase tracking-wide text-white/80 transition-colors hover:bg-white/10"
                >
                  {copied ? "Lien copié ✓" : "🔗 Partager"}
                </button>
                <button
                  type="button"
                  onClick={handleLeave}
                  disabled={pending}
                  className="rounded-xl border border-cursed/40 bg-cursed/10 px-4 py-2 text-sm font-bold uppercase tracking-wide text-cursed-light transition-colors hover:bg-cursed/20 disabled:opacity-40"
                >
                  Quitter
                </button>
              </div>
            </div>

            <div className="mb-2 shrink-0">
              <CodenamesClueBanner clue={clue} team={currentTeam} />
            </div>

            <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[16rem_1fr_17rem] xl:grid-cols-[18rem_1fr_19rem]">
              {/* Gauche : équipe rouge + chat */}
              <div className="flex min-h-0 flex-col gap-3">
                <CodenamesTeamPanel
                  team="RED"
                  lobby={lobby}
                  teams={teams}
                  spymasterId={publicState.redSpymasterId}
                  score={publicState.redScore}
                  active={currentTeam === "RED"}
                />
                <div className="min-h-0 flex-1">
                  <CodenamesChat
                    messages={messages}
                    currentUserId={currentUserId}
                    onSend={handleSendChat}
                  />
                </div>
              </div>

              {/* Centre : grille + contrôles */}
              <div className="flex min-h-0 flex-col gap-2">
                <CodenamesBoard
                  characters={gridChars}
                  revealed={publicState.revealed}
                  canReveal={amActiveAgent && Boolean(clue)}
                  pending={pending}
                  onReveal={handleReveal}
                />
                <div className="flex shrink-0 items-center justify-center gap-3">
                  {amActiveSpymaster && !clue && (
                    <div className="w-full max-w-xl">
                      <CodenamesClueInput
                        team={currentTeam}
                        pending={pending}
                        onGiveClue={handleGiveClue}
                      />
                    </div>
                  )}
                  {amActiveAgent && clue && (
                    <CodenamesPassButton
                      passedCount={passedIds.length}
                      totalAgents={activeAgents.length}
                      alreadyPassed={passedIds.includes(currentUserId)}
                      pending={pending}
                      onPass={handlePass}
                    />
                  )}
                  {!isMyTurn && (
                    <p className="text-sm text-white/40">
                      Tour de l'équipe {currentTeam === "RED" ? "rouge" : "violette"}…
                    </p>
                  )}
                </div>
              </div>

              {/* Droite : équipe violette + carte-clé (maître-espion) */}
              <div className="flex min-h-0 flex-col gap-3">
                <CodenamesTeamPanel
                  team="PURPLE"
                  lobby={lobby}
                  teams={teams}
                  spymasterId={publicState.purpleSpymasterId}
                  score={publicState.purpleScore}
                  active={currentTeam === "PURPLE"}
                />
                {isSpymaster && keyCard && (
                  <CodenamesKeyGrid
                    grid={publicState.grid}
                    colorKey={keyCard}
                    revealed={publicState.revealed}
                  />
                )}
              </div>
            </div>
          </>
        )
      )}

      <CodenamesResultModal
        open={Boolean(finished)}
        winnerTeam={publicState?.winnerTeam ?? null}
        myTeam={myTeam}
        redScore={publicState?.redScore ?? 0}
        purpleScore={publicState?.purpleScore ?? 0}
        colorKey={publicState?.reveal?.colorKey ?? null}
        grid={publicState?.grid ?? []}
        rosterMap={rosterMap}
        lobby={lobby}
        teams={teams}
        redSpymasterId={publicState?.redSpymasterId ?? ""}
        purpleSpymasterId={publicState?.purpleSpymasterId ?? ""}
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
