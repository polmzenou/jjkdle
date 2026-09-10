"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Logo } from "@/components/Logo";
import { DraftBoard } from "@/components/draft/DraftBoard";
import { CombatScene } from "@/components/draft/CombatScene";
import { DraftResultModal } from "@/components/draft/DraftResultModal";
import type { DroppedBooster } from "@/lib/progress/recompute";
import { pickDraw } from "@/lib/games/draft/draw";
import { evaluateDraft } from "@/lib/games/draft/scoring";
import { awardDraftExpAction } from "./actions";
import type { DraftCategory } from "@/lib/games/draft/categories";
import { UniverseLink } from "@/components/universe/UniverseLink";
import type {
  Boss,
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
  /** Boss de l'univers, dans l'ordre (depuis la base, éditables en /admin). */
  bosses: Boss[];
  /** Les catégories de l'univers formant les lignes du plateau. */
  categories: DraftCategory[];
  /** Catégorie dont le perso draftÉ mène le combat contre les boss. */
  avatarCategory: string;
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
  bosses,
  categories,
  avatarCategory,
}: JujutsuDraftGameProps) {
  const rosterById = useMemo(
    () => Object.fromEntries(roster.map((c) => [c.id, c])),
    [roster],
  );

  const [draw, setDraw] = useState<DraftPick | null>(null);
  const [selection, setSelection] = useState<DraftSelection>({});
  const [phase, setPhase] = useState<Phase>("draft");
  const [combat, setCombat] = useState<CombatResult | null>(null);
  // XP empochée automatiquement en fin de combat (sans enregistrer au classement).
  const [gainedExp, setGainedExp] = useState<number | null>(null);
  const [gainedCoins, setGainedCoins] = useState<number | null>(null);
  const [expBadges, setExpBadges] = useState<string[]>([]);
  const [droppedBooster, setDroppedBooster] =
    useState<DroppedBooster | null>(null);

  const startNewGame = useCallback(() => {
    setDraw(pickDraw(categories, Math.random, roster));
    setSelection({});
    setCombat(null);
    setPhase("draft");
    setGainedExp(null);
    setGainedCoins(null);
    setExpBadges([]);
  }, [roster, categories]);

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
    setCombat(evaluateDraft(selection, categories, rosterById, bosses));
    setPhase("combat");
  }, [selection, categories, rosterById, bosses]);

  // Fin du combat → écran de résultat + octroi automatique de l'XP (connecté).
  // Le serveur recalcule le nombre de boss (anti-triche) à partir de la sélection.
  const finishCombat = useCallback(() => {
    setPhase("result");
    if (isAuthed) {
      void awardDraftExpAction(selection).then((res) => {
        if (res.ok) {
          setGainedExp(res.gainedExp ?? 0);
          setGainedCoins(res.gainedCoins ?? 0);
          setExpBadges(res.newBadges ?? []);
          setDroppedBooster(res.droppedBooster ?? null);
        }
      });
    }
  }, [isAuthed, selection]);

  // Le libellé vient de la catégorie de l'univers : « Sort inné » était écrit
  // en dur, et s'affichait donc tel quel sur Demon Slayer ou Bleach.
  const avatarLabel =
    categories.find((c) => c.id === avatarCategory)?.label ?? avatarCategory;

  const avatarId = selection[avatarCategory];
  const avatar: DraftCharacter | undefined = avatarId
    ? rosterById[avatarId]
    : undefined;

  return (
    <div>
      {/* En-tête */}
      <header className="mb-4 flex items-center justify-between py-4">
        <UniverseLink
          href="/"
          className="flex items-center gap-1 text-sm text-white/60 transition-colors hover:text-domain-light"
        >
          ← Back
        </UniverseLink>
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
              <span className="text-domain-light">{avatarLabel}</span>.
            </p>
          </div>

          {!draw ? (
            <p className="py-24 text-center text-white/40">Tirage en cours…</p>
          ) : (
            <DraftBoard
              categories={categories}
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
            onFinish={finishCombat}
          />
        </div>
      )}

      {phase === "result" && combat && (
        <DraftResultModal
          result={combat}
          categories={categories}
          selection={selection}
          rosterById={rosterById}
          isAuthed={isAuthed}
          gainedExp={gainedExp}
          gainedCoins={gainedCoins}
          expBadges={expBadges}
          droppedBooster={droppedBooster}
          onReplay={startNewGame}
        />
      )}
    </div>
  );
}
