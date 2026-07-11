"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { Character } from "@/data/roster/characters";
import type { SerializedLobby } from "@/lib/multiplayer/events";
import {
  CODENAMES_WIN_SCORE,
  type ColorKey,
  type Team,
} from "@/lib/games/codenames/types";
import { CharacterImage } from "@/components/CharacterImage";
import { CARD_COLOR_BG, CARD_COLOR_BORDER, TEAM_STYLES } from "./colors";

interface CodenamesResultModalProps {
  open: boolean;
  /** Équipe gagnante. */
  winnerTeam: Team | null;
  /** Équipe du joueur courant (pour victoire/défaite). */
  myTeam: Team | null;
  redScore: number;
  purpleScore: number;
  /** Carte-clé complète (révélée en fin de partie). */
  colorKey: ColorKey | null;
  grid: string[];
  rosterMap: Record<string, Character>;
  lobby: SerializedLobby;
  teams: Record<string, Team>;
  redSpymasterId: string;
  purpleSpymasterId: string;
  isHost: boolean;
  pending: boolean;
  onPlayAgain: () => void;
  onLeave: () => void;
}

/** Écran de fin : résultat, scores, composition des équipes, grille complète révélée. */
export function CodenamesResultModal({
  open,
  winnerTeam,
  myTeam,
  redScore,
  purpleScore,
  colorKey,
  grid,
  rosterMap,
  lobby,
  teams,
  redSpymasterId,
  purpleSpymasterId,
  isHost,
  pending,
  onPlayAgain,
  onLeave,
}: CodenamesResultModalProps) {
  const won = myTeam !== null && myTeam === winnerTeam;

  return (
    <AnimatePresence>
      {open && winnerTeam && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-void-900/85 p-4 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="my-auto w-full max-w-3xl rounded-3xl border border-white/10 bg-void-800/95 p-6 text-center"
          >
            <p className="text-sm uppercase tracking-[0.3em] text-white/40">
              JJK Codenames
            </p>
            <h2
              className={`mt-2 font-display text-4xl font-black ${
                won ? "text-domain-light" : "text-cursed-light"
              }`}
            >
              {won ? "Victoire !" : "Défaite"}
            </h2>
            <p className={`mt-1 font-display text-lg font-bold ${TEAM_STYLES[winnerTeam].text}`}>
              L'équipe {TEAM_STYLES[winnerTeam].label} l'emporte
            </p>

            {/* Scores + composition */}
            <div className="mt-5 grid grid-cols-2 gap-4">
              {(["RED", "PURPLE"] as Team[]).map((team) => {
                const s = TEAM_STYLES[team];
                const spymasterId = team === "RED" ? redSpymasterId : purpleSpymasterId;
                const members = lobby.players.filter((p) => teams[p.userId] === team);
                const score = team === "RED" ? redScore : purpleScore;
                return (
                  <div key={team} className={`rounded-2xl border ${s.border} ${s.bgSoft} p-3 text-left`}>
                    <div className="flex items-center justify-between">
                      <span className={`font-display text-sm font-bold uppercase ${s.text}`}>
                        {s.label}
                      </span>
                      <span className="font-display font-black text-white">
                        {score}/{CODENAMES_WIN_SCORE}
                      </span>
                    </div>
                    <ul className="mt-1.5 space-y-0.5 text-sm text-white/80">
                      {members.map((p) => (
                        <li key={p.userId} className="truncate">
                          {p.username}
                          {p.userId === spymasterId && (
                            <span className={`ml-1 text-[0.6rem] uppercase ${s.text}`}>· maître-espion</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>

            {/* Grille complète révélée */}
            {colorKey && (
              <div className="mx-auto mt-5 grid max-w-xl grid-cols-6 gap-1">
                {grid.map((id) => {
                  const color = colorKey[id];
                  const c = rosterMap[id];
                  return (
                    <div
                      key={id}
                      className={`relative aspect-square overflow-hidden rounded-md border ${CARD_COLOR_BORDER[color]} ${CARD_COLOR_BG[color]}`}
                    >
                      {c && (
                        <div className="h-full w-full opacity-40 grayscale">
                          <CharacterImage character={c} />
                        </div>
                      )}
                      {color === "ASSASSIN" && (
                        <span className="absolute inset-0 flex items-center justify-center text-lg">💀</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-6 flex flex-col items-center gap-3">
              {isHost ? (
                <button
                  type="button"
                  onClick={onPlayAgain}
                  disabled={pending}
                  className="w-full max-w-xs rounded-xl bg-domain px-6 py-3 font-display font-bold uppercase tracking-wide text-white shadow-glow transition-transform hover:scale-105 active:scale-95 disabled:opacity-40"
                >
                  Rejouer
                </button>
              ) : (
                <p className="text-sm text-white/50">
                  En attente d'une nouvelle partie par l'hôte…
                </p>
              )}
              <button
                type="button"
                onClick={onLeave}
                disabled={pending}
                className="text-sm text-white/40 transition-colors hover:text-cursed-light"
              >
                Retour au lobby
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
