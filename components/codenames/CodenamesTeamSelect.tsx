"use client";

import type { SerializedLobby } from "@/lib/multiplayer/events";
import {
  type Team,
  type TeamSelectState,
} from "@/lib/games/codenames/types";
import { balanceViolations } from "@/lib/games/codenames/logic";
import { UserAvatar } from "@/components/UserAvatar";
import { TEAM_STYLES } from "./colors";

interface CodenamesTeamSelectProps {
  lobby: SerializedLobby;
  teamSelect: TeamSelectState;
  currentUserId: string;
  isHost: boolean;
  pending: boolean;
  onChooseTeam: (team: Team) => void;
  onClaimSpymaster: (team: Team) => void;
  onUnclaimSpymaster: () => void;
  onAutoBalance: () => void;
  onStart: () => void;
  onBackToWaiting: () => void;
  onLeave: () => void;
}

/** Écran de sélection d'équipe (état `TEAM_SELECT`, avant le démarrage). */
export function CodenamesTeamSelect({
  lobby,
  teamSelect,
  currentUserId,
  isHost,
  pending,
  onChooseTeam,
  onClaimSpymaster,
  onUnclaimSpymaster,
  onAutoBalance,
  onStart,
  onBackToWaiting,
  onLeave,
}: CodenamesTeamSelectProps) {
  const { assignments } = teamSelect;
  const playerIds = lobby.players.map((p) => p.userId);
  const violations = balanceViolations(assignments, playerIds);
  const canStart = violations.length === 0;

  const mine = assignments[currentUserId];
  const unassigned = lobby.players.filter(
    (p) => !assignments[p.userId] || assignments[p.userId].team === null,
  );

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="text-center">
        <p className="text-sm uppercase tracking-[0.3em] text-white/40">
          Sélection d'équipe
        </p>
        <h1 className="mt-1 font-display text-3xl font-bold text-white">
          Choisis ton camp
        </h1>
        <p className="mt-2 text-sm text-white/50">
          Rejoins une équipe et, si tu veux, deviens son maître-espion (un seul par équipe).
        </p>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {(["RED", "PURPLE"] as Team[]).map((team) => {
          const s = TEAM_STYLES[team];
          const members = lobby.players.filter(
            (p) => assignments[p.userId]?.team === team,
          );
          const spymaster = members.find((p) => assignments[p.userId]?.spymaster);
          const iAmHere = mine?.team === team;
          const iAmSpymaster = iAmHere && mine?.spymaster;

          return (
            <div key={team} className={`rounded-2xl border ${s.border} ${s.bgSoft} p-4`}>
              <div className="flex items-center justify-between">
                <h2 className={`font-display text-lg font-bold uppercase ${s.text}`}>
                  Équipe {s.label}
                </h2>
                <span className="text-xs text-white/40">{members.length} joueur(s)</span>
              </div>

              {/* Maître-espion */}
              <div className="mt-3 rounded-xl border border-dashed border-white/15 p-2">
                <p className="text-[0.6rem] uppercase tracking-wide text-white/40">
                  Maître-espion
                </p>
                {spymaster ? (
                  <div className="mt-1 flex items-center gap-2 text-sm font-semibold text-white">
                    <UserAvatar username={spymaster.username} image={spymaster.avatarImage} size={22} />
                    {spymaster.username}
                    {spymaster.userId === currentUserId && (
                      <span className="text-xs text-white/40">(toi)</span>
                    )}
                  </div>
                ) : (
                  <p className="mt-1 text-sm text-white/30">Aucun</p>
                )}
              </div>

              {/* Agents */}
              <ul className="mt-2 space-y-1">
                {members
                  .filter((p) => !assignments[p.userId]?.spymaster)
                  .map((p) => (
                    <li key={p.userId} className="flex items-center gap-2 text-sm text-white/85">
                      <UserAvatar username={p.username} image={p.avatarImage} size={22} />
                      {p.username}
                      {p.userId === currentUserId && (
                        <span className="text-xs text-white/40">(toi)</span>
                      )}
                    </li>
                  ))}
                {members.length === 0 && (
                  <li className="text-sm text-white/30">Personne pour l'instant</li>
                )}
              </ul>

              {/* Actions de l'équipe */}
              <div className="mt-3 flex flex-wrap gap-2">
                {!iAmHere ? (
                  <button
                    type="button"
                    onClick={() => onChooseTeam(team)}
                    disabled={pending}
                    className={`rounded-xl ${s.bgSolid} px-3 py-1.5 text-sm font-bold text-white transition-transform hover:scale-105 active:scale-95 disabled:opacity-40`}
                  >
                    Rejoindre
                  </button>
                ) : iAmSpymaster ? (
                  <button
                    type="button"
                    onClick={onUnclaimSpymaster}
                    disabled={pending}
                    className="rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-sm font-bold text-white/80 transition-colors hover:bg-white/10 disabled:opacity-40"
                  >
                    Abandonner le rôle
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onClaimSpymaster(team)}
                    disabled={pending || Boolean(spymaster)}
                    className={`rounded-xl border ${s.border} px-3 py-1.5 text-sm font-bold ${s.text} transition-colors hover:bg-white/5 disabled:opacity-30`}
                  >
                    Devenir maître-espion
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Non assignés */}
      {unassigned.length > 0 && (
        <div className="mt-4 rounded-2xl border border-white/10 bg-void-800/40 p-3">
          <p className="text-[0.6rem] uppercase tracking-wide text-white/40">Sans équipe</p>
          <div className="mt-1 flex flex-wrap gap-2">
            {unassigned.map((p) => (
              <span key={p.userId} className="flex items-center gap-1.5 rounded-full bg-white/5 px-2 py-1 text-sm text-white/80">
                <UserAvatar username={p.username} image={p.avatarImage} size={18} />
                {p.username}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Contrôles hôte + démarrage */}
      <div className="mt-6 flex flex-col items-center gap-3">
        {isHost && (
          <div className="flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={onAutoBalance}
              disabled={pending}
              className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-bold uppercase tracking-wide text-white/80 transition-colors hover:bg-white/10 disabled:opacity-40"
            >
              Équilibrer aléatoirement
            </button>
            <button
              type="button"
              onClick={onBackToWaiting}
              disabled={pending}
              className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-bold uppercase tracking-wide text-white/60 transition-colors hover:bg-white/10 disabled:opacity-40"
            >
              Revenir au salon
            </button>
          </div>
        )}

        {isHost ? (
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={onStart}
              disabled={!canStart || pending}
              className="w-full max-w-xs rounded-xl bg-domain px-6 py-3 font-display font-bold uppercase tracking-wide text-white shadow-glow transition-transform hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Lancer la partie
            </button>
            {!canStart && (
              <p className="max-w-md text-center text-xs text-amber-200/80">
                {violations[0]}
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-white/50">
            En attente du lancement par l'hôte…
          </p>
        )}

        <button
          type="button"
          onClick={onLeave}
          disabled={pending}
          className="text-sm text-white/40 transition-colors hover:text-cursed-light"
        >
          Quitter le lobby
        </button>
      </div>
    </div>
  );
}
