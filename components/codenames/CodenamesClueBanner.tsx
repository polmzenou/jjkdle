"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { Clue, Team } from "@/lib/games/codenames/types";
import { TEAM_STYLES } from "./colors";

interface CodenamesClueBannerProps {
  clue: Clue | null;
  team: Team;
}

/** Bannière de notif en haut : indice courant (mot + nombre) visible par tous. */
export function CodenamesClueBanner({ clue, team }: CodenamesClueBannerProps) {
  const s = TEAM_STYLES[team];
  return (
    <AnimatePresence mode="wait">
      {clue ? (
        <motion.div
          key={`${clue.word}-${clue.count}`}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className={`flex items-center justify-center gap-3 rounded-xl border ${s.border} ${s.bgSoft} px-4 py-2`}
        >
          <span className={`text-xs font-bold uppercase tracking-wide ${s.text}`}>
            Équipe {s.label}
          </span>
          <span className="font-display text-lg font-black text-white">
            « {clue.word} »
          </span>
          <span className={`rounded-full ${s.bgSolid} px-2.5 py-0.5 text-sm font-bold text-white`}>
            {clue.count}
          </span>
        </motion.div>
      ) : (
        <div className="flex items-center justify-center rounded-xl border border-white/10 bg-void-800/40 px-4 py-2 text-sm text-white/40">
          En attente de l'indice du maître-espion {TEAM_STYLES[team].label.toLowerCase()}…
        </div>
      )}
    </AnimatePresence>
  );
}
