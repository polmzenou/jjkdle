"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { GameHeading } from "@/components/GameHeading";
import { UniverseLink } from "@/components/universe/UniverseLink";
import { useGameTitle } from "@/components/universe/UniverseProvider";
import { EventScreen, RestScreen } from "@/components/tower/EventScreen";
import { InventoryStrip } from "@/components/tower/ItemCard";
import { NodePicker } from "@/components/tower/NodePicker";
import { MerchantScreen } from "@/components/tower/MerchantScreen";
import { RecruitPicker } from "@/components/tower/RecruitPicker";
import { RewardPicker } from "@/components/tower/RewardPicker";
import { RunRecap } from "@/components/tower/RunRecap";
import { TowerCard } from "@/components/tower/TowerCard";
import { TowerCombat } from "@/components/tower/TowerCombat";
import { TowerMap } from "@/components/tower/TowerMap";
import {
  TowerRulesButton,
  TowerRulesSummary,
} from "@/components/tower/TowerRules";
import { TOWER_FLOORS, type Intervention } from "@/lib/games/tower/types";
import type { TowerActionResult, TowerView } from "@/lib/games/tower/view";
import type { ExpResult } from "@/lib/leaderboard/types";
import {
  abandonRunAction,
  buyHealAction,
  buyItemAction,
  chooseNodeAction,
  chooseStarterAction,
  leaveMerchantAction,
  recruitAction,
  resolveCombatAction,
  resolveEventAction,
  skipRecruitAction,
  startTowerAction,
  takeRestAction,
  takeRewardAction,
} from "./actions";

/**
 * Coque client de « The Culling Tower ».
 *
 * Elle n'applique AUCUNE règle : chaque action part au serveur, qui renvoie la
 * vue suivante. Le seul calcul fait ici est l'animation du combat, et elle
 * rejoue exactement la même simulation déterministe que le serveur — donc elle
 * ne peut pas raconter autre chose que ce qui a été validé.
 */
export function TowerGame() {
  // « The Culling Tower » sur JJK, « La Tour de Réincarnation » sur CSM…
  const towerTitle = useGameTitle("tower");
  const [view, setView] = useState<TowerView | null>(null);
  const [exp, setExp] = useState<ExpResult | undefined>();
  const [xpNote, setXpNote] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [booting, setBooting] = useState(true);

  const apply = useCallback((result: TowerActionResult) => {
    if (result.ok) {
      setView(result.view);
      if (result.exp) setExp(result.exp);
      if (result.xpNote) setXpNote(result.xpNote);
      // `notice` porte l'issue d'une rencontre : on l'efface dès qu'une autre
      // action passe, sinon elle survivrait plusieurs étages.
      setNotice(result.notice ?? null);
      setError(null);
    } else {
      setError(result.error);
    }
  }, []);

  // Reprise automatique : une run laissée en plan revient à son étage courant.
  useEffect(() => {
    let alive = true;
    startTowerAction()
      .then((result) => {
        if (alive) apply(result);
      })
      .finally(() => {
        if (alive) setBooting(false);
      });
    return () => {
      alive = false;
    };
  }, [apply]);

  const run = useCallback(
    (action: () => Promise<TowerActionResult>) => {
      startTransition(async () => apply(await action()));
    },
    [apply],
  );

  const restart = useCallback(() => {
    setExp(undefined);
    setXpNote(undefined);
    setNotice(null);
    startTransition(async () => {
      await abandonRunAction();
      apply(await startTowerAction(true));
    });
  }, [apply]);

  const onResolved = useCallback(
    (interventions: Intervention[]) => run(() => resolveCombatAction(interventions)),
    [run],
  );

  if (booting) {
    return (
      <div className="flex flex-col gap-6">
        <TopBar />
        <p className="py-16 text-center text-white/40">Ouverture de la tour…</p>
      </div>
    );
  }

  // Sans le lien de retour ici, une tour indisponible laissait le joueur sur un
  // cul-de-sac : plus rien à cliquer, et aucun moyen de revenir aux jeux.
  if (!view) {
    return (
      <div className="flex flex-col gap-6">
        <TopBar />
        <p className="py-16 text-center text-white/60">
          {error ?? "La tour est close pour le moment."}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <TopBar floor={view.status === "starter" ? undefined : view.floor} />

      <header className="flex items-baseline justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-white">
            {towerTitle}
          </h2>
          <p className="text-xs text-white/45">
            {view.mode === "daily"
              ? `Tour du jour · essai n°${view.attempt}`
              : "Tour libre · hors classement"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {view.status !== "won" && view.status !== "lost" && (
            <>
              <p className="font-display text-sm tabular-nums text-amber-300">
                ◈ {view.fragments}
              </p>
              <p className="font-display text-sm tabular-nums text-white/50">
                {view.score} pts
              </p>
            </>
          )}
          <TowerRulesButton />
        </div>
      </header>

      {view.status !== "starter" && <InventoryStrip items={view.inventory} />}

      {error && (
        <p className="rounded-lg border border-cursed/40 bg-cursed/10 px-3 py-2 text-sm text-cursed-light">
          {error}
        </p>
      )}

      {notice && (
        <p className="rounded-lg border border-sky-400/40 bg-sky-400/10 px-3 py-2 text-sm italic text-sky-100">
          {notice}
        </p>
      )}

      <div className="flex flex-col gap-6 sm:flex-row">
        {view.status !== "starter" && <TowerMap floor={view.floor} strateNames={view.strateNames} />}

        <div className="min-w-0 flex-1">
          {view.status === "starter" && (
            <StarterPicker
              view={view}
              busy={pending}
              onPick={(id) => run(() => chooseStarterAction(id))}
            />
          )}

          {view.status === "map" && (
            <NodePicker
              view={view}
              busy={pending}
              onChoose={(index) => run(() => chooseNodeAction(index))}
            />
          )}

          {view.status === "rest" && (
            <RestScreen
              view={view}
              busy={pending}
              onRest={() => run(() => takeRestAction())}
            />
          )}

          {view.status === "event" && (
            <EventScreen
              view={view}
              busy={pending}
              onChoose={(index) => run(() => resolveEventAction(index))}
            />
          )}

          {view.status === "combat" && (
            <TowerCombat
              // Remonte le composant à chaque étage : un nouveau combat doit
              // repartir d'une horloge et d'un log d'interventions vierges.
              key={`${view.floor}-${view.attempt}`}
              view={view}
              busy={pending}
              onResolved={onResolved}
            />
          )}

          {view.status === "reward" && (
            <RewardPicker
              view={view}
              busy={pending}
              onPick={(index) => run(() => takeRewardAction(index))}
            />
          )}

          {view.status === "merchant" && (
            <MerchantScreen
              view={view}
              busy={pending}
              onBuyItem={(id) => run(() => buyItemAction(id))}
              onBuyHeal={() => run(() => buyHealAction())}
              onLeave={() => run(() => leaveMerchantAction())}
            />
          )}

          {view.status === "recruit" && (
            <RecruitPicker
              view={view}
              busy={pending}
              onRecruit={(id, slot) => run(() => recruitAction(id, slot))}
              onSkip={() => run(() => skipRecruitAction())}
            />
          )}

          {(view.status === "won" || view.status === "lost") && (
            <RunRecap
              view={view}
              exp={exp}
              xpNote={xpNote}
              busy={pending}
              onRestart={restart}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Retour aux jeux, présent sur TOUS les écrans de la tour.
 *
 * Quitter ne perd rien : la run vit en base et son cookie la retrouve, si bien
 * qu'on revient exactement à l'étage où l'on s'était arrêté. Le lien le dit,
 * sans quoi on hésite à cliquer au milieu d'une ascension de quinze minutes.
 */
/**
 * Barre de tête unifiée des jeux (retour, logo de l'univers, donnée du jeu) —
 * la même que JJKdle, Higher or Lower… Le logo porte le H1 de la page.
 */
function TopBar({ floor }: { floor?: number }) {
  return (
    <div>
      <header className="flex items-center justify-between py-4">
        <UniverseLink
          href="/"
          className="flex items-center gap-1 text-sm text-white/60 transition-colors hover:text-domain-light"
        >
          ← Back
        </UniverseLink>
        <GameHeading id="tower" />
        <span className="rounded-full bg-void-700/60 px-3 py-1 text-xs text-white/60">
          Étage&nbsp;:{" "}
          <span className="font-bold text-domain-light">
            {floor ?? "—"}/{TOWER_FLOORS}
          </span>
        </span>
      </header>
      <p className="text-center text-[11px] text-white/35">
        Ton ascension est gardée : tu reprendras où tu t&apos;es arrêté.
      </p>
    </div>
  );
}

function StarterPicker({
  view,
  busy,
  onPick,
}: {
  view: TowerView;
  busy: boolean;
  onPick: (id: string) => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <header>
        <h2 className="font-display text-xl font-bold text-white">
          Choisis avec qui tu entres
        </h2>
        <p className="mt-1 text-sm text-white/50">
          Trois personnages, les mêmes pour tout le monde aujourd&apos;hui. Tu en
          prends UN — les deux autres places de ton escouade se gagneront en
          montant, et les plus grands noms ne se croisent que dans les hauteurs.
        </p>
      </header>

      <TowerRulesSummary />

      <div className="grid grid-cols-3 gap-3">
        {view.choices.map((card) => (
          <TowerCard
            key={card.id}
            card={card}
            disabled={busy}
            onClick={() => onPick(card.id)}
          />
        ))}
      </div>
    </div>
  );
}
