"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { DraftBoard } from "@/components/draft/DraftBoard";
import { CombatScene } from "@/components/draft/CombatScene";
import { DraftResultModal } from "@/components/draft/DraftResultModal";
import { pickDraw } from "@/lib/games/draft/draw";
import { evaluateDraft } from "@/lib/games/draft/scoring";
import { COMBAT_AVATAR_CATEGORY } from "@/lib/games/draft/categories";
import type {
  CombatResult,
  DraftCategoryId,
  DraftCharacter,
  DraftPick,
  DraftSelection,
} from "@/lib/games/draft/types";

interface JujutsuDraftGameProps {
  isAuthed: boolean;
  initialBest: number | null;
  /** Roster du draft (depuis la base, éditable en /admin). */
  roster: DraftCharacter[];
}

type Phase = "draft" | "combat" | "result";

/**
 * Racine du jeu « Jujutsu Draft » — machine à états draft → combat → result.
 * État de partie isolé ici (réutilisable pour un futur mode multi). Le tirage
 * est généré côté client après montage (anti-mismatch d'hydratation).
 */
export function JujutsuDraftGame({
  isAuthed,
  initialBest,
  roster,
}: JujutsuDraftGameProps) {
  const rosterById = useMemo(
    () => Object.fromEntries(roster.map((c) => [c.id, c])),
    [roster],
  );

  const [draw, setDraw] = useState<DraftPick | null>(null);
  const [selection, setSelection] = useState<DraftSelection>({});
  const [phase, setPhase] = useState<Phase>("draft");
  const [combat, setCombat] = useState<CombatResult | null>(null);

  const startNewGame = useCallback(() => {
    setDraw(pickDraw(Math.random, roster));
    setSelection({});
    setCombat(null);
    setPhase("draft");
  }, [roster]);

  useEffect(() => {
    startNewGame();
  }, [startNewGame]);

  const handleSelect = useCallback(
    (categoryId: DraftCategoryId, character: DraftCharacter) => {
      setSelection((prev) => ({ ...prev, [categoryId]: character.id }));
    },
    [],
  );

  const launchCombat = useCallback(() => {
    setCombat(evaluateDraft(selection, rosterById));
    setPhase("combat");
  }, [selection, rosterById]);

  const avatarId = selection[COMBAT_AVATAR_CATEGORY];
  const avatar: DraftCharacter | undefined = avatarId
    ? rosterById[avatarId]
    : undefined;

  return (
    <div>
      {/* En-tête */}
      <header className="mb-4 flex items-center justify-between py-4">
        <Link
          href="/"
          className="flex items-center gap-1 text-sm text-white/60 transition-colors hover:text-domain-light"
        >
          ← Back
        </Link>
        <Logo className="h-12 w-auto sm:h-14" />
        <span className="rounded-full bg-void-700/60 px-3 py-1 text-xs text-white/60">
          Record&nbsp;:{" "}
          <span className="font-bold text-domain-light">
            {initialBest ?? 0}
          </span>
        </span>
      </header>

      {phase === "draft" && (
        <>
          {/* Consigne */}
          <div className="mb-4 rounded-2xl border border-white/10 bg-void-800/50 px-5 py-3 backdrop-blur">
            <p className="text-sm text-white/70">
              Draft 1 sorcier par catégorie sans dépasser le budget, puis lance
              le combat. Place chaque perso dans{" "}
              <span className="text-white">sa</span> catégorie pour maximiser sa
              puissance — ton avatar de combat sera ton choix en{" "}
              <span className="text-domain-light">Sort inné</span>.
            </p>
          </div>

          {!draw ? (
            <p className="py-24 text-center text-white/40">Tirage en cours…</p>
          ) : (
            <DraftBoard
              draw={draw}
              selection={selection}
              rosterById={rosterById}
              onSelect={handleSelect}
              onLaunch={launchCombat}
            />
          )}
        </>
      )}

      {phase === "combat" && combat && avatar && (
        <div className="mt-6">
          <CombatScene
            result={combat}
            avatar={avatar}
            onFinish={() => setPhase("result")}
          />
        </div>
      )}

      {phase === "result" && combat && (
        <DraftResultModal
          result={combat}
          selection={selection}
          rosterById={rosterById}
          isAuthed={isAuthed}
          onReplay={startNewGame}
        />
      )}
    </div>
  );
}
