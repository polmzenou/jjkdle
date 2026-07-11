"use client";

import type { SerializedLobby } from "@/lib/multiplayer/events";
import { CODENAMES_WIN_SCORE, type Team } from "@/lib/games/codenames/types";
import { UserAvatar } from "@/components/UserAvatar";
import { TEAM_STYLES } from "./colors";

interface CodenamesTeamPanelProps {
  team: Team;
  lobby: SerializedLobby;
  /** userId → équipe (figé au démarrage). */
  teams: Record<string, Team>;
  spymasterId: string;
  score: number;
  /** Vrai si c'est le tour de cette équipe. */
  active: boolean;
}

/** Récap d'une équipe : joueurs, maître-espion, score x/8. */
export function CodenamesTeamPanel({
  team,
  lobby,
  teams,
  spymasterId,
  score,
  active,
}: CodenamesTeamPanelProps) {
  const s = TEAM_STYLES[team];
  const members = lobby.players.filter((p) => teams[p.userId] === team);

  return (
    <div
      className={`rounded-2xl border ${s.border} ${s.bgSoft} p-3 transition-shadow ${
        active ? `ring-2 ${s.ring}` : ""
      }`}
    >
      <div className="flex items-center justify-between">
        <p className={`font-display text-sm font-bold uppercase tracking-wide ${s.text}`}>
          Équipe {s.label}
        </p>
        <p className="font-display text-lg font-black text-white">
          {score}
          <span className="text-sm text-white/40">/{CODENAMES_WIN_SCORE}</span>
        </p>
      </div>
      <ul className="mt-2 space-y-1">
        {members.map((p) => (
          <li key={p.userId} className="flex items-center gap-2 text-sm text-white/85">
            <UserAvatar username={p.username} image={p.avatarImage} size={22} />
            <span className="truncate">{p.username}</span>
            {p.userId === spymasterId && (
              <span className={`ml-auto rounded-full ${s.bgSoft} px-1.5 py-0.5 text-[0.6rem] font-bold uppercase ${s.text}`}>
                Maître-espion
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
