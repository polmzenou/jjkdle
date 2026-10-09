"use client";

import { useState } from "react";
import { CharacterImage } from "@/components/CharacterImage";
import { CharacterTip } from "./InfoTip";
import { TowerIcon, nodeIcon, nodeTone } from "./TowerIcon";
import type {
  NodeOptionView,
  TowerCardView,
  TowerView,
} from "@/lib/games/tower/view";

/**
 * La carte : deux branches, un choix.
 *
 * TOUTES les branches mènent à un combat — on ne monte d'un étage qu'en
 * gagnant. Ce qui se choisit, c'est ce qui vient AVANT, et son prix :
 *   - voie directe : le combat, puis sa récompense ;
 *   - voie bonus : un renfort / marchand / repos / rencontre, puis le même
 *     combat, mais sans récompense après.
 *
 * Les adversaires sont MONTRÉS dans les deux cas, avec leur fiche complète au
 * survol. Choisir à l'aveugle ne serait pas un choix mais un tirage — et c'est
 * précisément la différence entre une carte à embranchements et un couloir
 * déguisé.
 */

export function NodePicker({
  view,
  busy,
  onChoose,
}: {
  view: TowerView;
  busy: boolean;
  onChoose: (index: number) => void;
}) {
  const solo = view.options.length === 1;

  return (
    <div className="flex flex-col gap-5">
      <header>
        <p className="font-display text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
          Étage {view.floor} · {view.strateNames[view.strate] ?? ""}
        </p>
        <h2 className="mt-1 font-display text-xl font-bold text-white">
          {solo ? "Le palier est gardé" : "Choisis ton chemin"}
        </h2>
        <p className="mt-1 text-sm text-white/50">
          {solo
            ? "Aucun détour : le gardien de la strate barre l'escalier."
            : "Les deux chemins finissent par un combat. Un seul gain par étage : un bonus avant le combat, ou une récompense après."}
        </p>
      </header>

      <div className={solo ? "" : "grid gap-3 sm:grid-cols-2"}>
        {view.options.map((option) => (
          <NodeCard
            key={option.index}
            option={option}
            busy={busy}
            onClick={() => onChoose(option.index)}
          />
        ))}
      </div>
    </div>
  );
}

function NodeCard({
  option,
  busy,
  onClick,
}: {
  option: NodeOptionView;
  busy: boolean;
  onClick: () => void;
}) {
  /**
   * Adversaire survolé.
   *
   * Un état plutôt qu'un `group-hover` en CSS pur, pour une raison de
   * structure : les portraits vivent DANS le bouton de la branche, et une bulle
   * ne peut pas y être imbriquée — un `<div>` dans un `<button>` est du HTML
   * invalide, et le rognage du bouton la masquerait de toute façon. Elle est
   * donc rendue en dehors, ce qui impose de savoir laquelle afficher.
   */
  const [hovered, setHovered] = useState<number | null>(null);
  const focused = hovered !== null ? option.enemies[hovered] : null;

  const head = option.prelude ?? option.kind;
  const tone = nodeTone(head);
  const fightTone = nodeTone(option.kind);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        className={[
          "group/node flex w-full flex-col gap-3 rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 active:translate-y-0",
          tone.border,
          tone.soft,
          busy ? "opacity-40" : "",
        ].join(" ")}
      >
        <div className="flex items-start gap-3">
          <span
            className={[
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
              tone.ring,
            ].join(" ")}
          >
            <TowerIcon name={nodeIcon(head)} className="h-6 w-6" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-base font-bold uppercase tracking-wide text-white">
              {option.label}
            </p>
            <p className="text-xs leading-snug text-white/55">{option.hint}</p>
          </div>
        </div>

        {/* Le déroulé de la branche, en pictogrammes : bonus → combat → gain. */}
        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          {option.prelude && (
            <>
              <Step icon={nodeIcon(option.prelude)} className={tone.ring}>
                {PRELUDE_NAMES[option.prelude] ?? "Bonus"}
              </Step>
              <TowerIcon name="arrow" className="h-3.5 w-3.5 text-white/30" />
            </>
          )}
          <Step icon={nodeIcon(option.kind)} className={fightTone.ring}>
            {FIGHT_NAMES[option.kind] ?? "Combat"}
          </Step>
          <TowerIcon name="arrow" className="h-3.5 w-3.5 text-white/30" />
          {option.rewarded ? (
            <Step icon="gift" className="bg-amber-400/15 text-amber-200">
              Récompense
            </Step>
          ) : (
            <Step icon="gift" className="bg-white/5 text-white/35 line-through">
              Récompense
            </Step>
          )}
        </div>

        {option.enemies.length > 0 && (
          <div className="flex flex-wrap gap-2 border-t border-white/5 pt-3">
            {option.enemies.map((enemy, i) => (
              <div
                key={`${enemy.id}-${i}`}
                className="w-16"
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered((h) => (h === i ? null : h))}
              >
                <div
                  className={[
                    "relative aspect-square overflow-hidden rounded-lg border",
                    option.kind === "combat" ? "border-white/10" : "border-cursed/50",
                  ].join(" ")}
                >
                  <CharacterImage character={enemy} />
                  {option.kind !== "combat" && (
                    <span className="absolute left-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-cursed text-white">
                      <TowerIcon name={nodeIcon(option.kind)} className="h-2.5 w-2.5" />
                    </span>
                  )}
                </div>
                <p className="mt-1 truncate text-center text-[10px] text-white/55">
                  {enemy.name}
                </p>
                <p className="flex items-center justify-center gap-0.5 text-[9px] tabular-nums text-white/35">
                  <TowerIcon name="heart" className="h-2.5 w-2.5" />
                  {enemy.stats.maxHp}
                </p>
              </div>
            ))}
          </div>
        )}
      </button>

      {focused && <HoveredEnemyTip card={focused} />}
    </div>
  );
}

const PRELUDE_NAMES: Record<string, string> = {
  recruit: "Renfort",
  merchant: "Marchand",
  rest: "Repos",
  event: "Rencontre",
};

const FIGHT_NAMES: Record<string, string> = {
  combat: "Combat",
  elite: "Élite",
  boss: "Boss",
};

function Step({
  icon,
  className,
  children,
}: {
  icon: Parameters<typeof TowerIcon>[0]["name"];
  className: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold",
        className,
      ].join(" ")}
    >
      <TowerIcon name={icon} className="h-3 w-3" />
      {children}
    </span>
  );
}

/**
 * Bulle d'un adversaire, rendue HORS du bouton de la branche.
 *
 * `CharacterTip` s'affiche normalement via le survol de son parent ; ici ce
 * parent n'existe pas (la bulle vit hors du bouton), donc la visibilité est
 * pilotée par l'état et déclarée avec `open`.
 */
function HoveredEnemyTip({ card }: { card: TowerCardView }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0">
      <CharacterTip card={card} open />
    </div>
  );
}
