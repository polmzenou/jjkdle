"use client";

import { CharacterImage } from "@/components/CharacterImage";
import type { NodeOptionView, TowerView } from "@/lib/games/tower/view";

/**
 * La carte : deux branches, un choix.
 *
 * TOUTES les branches mènent à un combat — on ne monte d'un étage qu'en
 * gagnant. Ce qui se choisit, c'est ce qui vient AVANT, et son prix :
 *   - voie directe : le combat, puis sa récompense ;
 *   - voie bonus : un renfort / marchand / repos / rencontre, puis le même
 *     combat, mais sans récompense après.
 *
 * Les adversaires sont MONTRÉS dans les deux cas. Choisir à l'aveugle ne serait
 * pas un choix mais un tirage — et c'est précisément la différence entre une
 * carte à embranchements et un couloir déguisé.
 */

const ICONS: Record<string, string> = {
  combat: "⚔",
  elite: "☠",
  boss: "👑",
  recruit: "✚",
  merchant: "◈",
  rest: "☾",
  event: "❖",
};

/** Accent par type de nœud : le danger doit se lire avant le texte. */
const ACCENTS: Record<string, string> = {
  combat: "border-white/15 bg-void-800/60 hover:border-domain/60",
  elite: "border-cursed/40 bg-cursed/5 hover:border-cursed",
  boss: "border-cursed bg-cursed/10 hover:border-cursed",
  recruit: "border-domain/40 bg-domain/10 hover:border-domain",
  merchant: "border-amber-400/40 bg-amber-400/5 hover:border-amber-400",
  rest: "border-emerald-400/40 bg-emerald-400/5 hover:border-emerald-400",
  event: "border-sky-400/40 bg-sky-400/5 hover:border-sky-400",
};

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
        <h2 className="font-display text-xl font-bold text-white">
          {solo ? "Le palier est gardé" : "Deux chemins"}
        </h2>
        <p className="mt-1 text-sm text-white/50">
          {solo
            ? "Aucun détour : le gardien de la strate barre l'escalier."
            : "Chaque chemin finit par un combat — c'est lui qui ouvre l'étage suivant. Un gain par étage : avant le combat, ou après."}
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
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={[
        "flex flex-col gap-3 rounded-xl border p-4 text-left transition",
        ACCENTS[option.prelude ?? option.kind] ?? ACCENTS.combat,
        busy ? "opacity-40" : "",
      ].join(" ")}
    >
      <div className="flex items-center gap-3">
        <span aria-hidden className="text-2xl">
          {ICONS[option.prelude ?? option.kind] ?? "⚔"}
        </span>
        <div className="min-w-0">
          <p className="font-display text-sm font-bold uppercase tracking-wide text-white">
            {option.label}
            {option.prelude && (
              <span aria-hidden className="ml-1 text-white/40">
                {" → "}
                {ICONS[option.kind]}
              </span>
            )}
          </p>
          <p className="text-[11px] leading-snug text-white/50">{option.hint}</p>
        </div>
      </div>

      {option.enemies.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {option.enemies.map((enemy, i) => (
            <div key={`${enemy.id}-${i}`} className="w-16">
              <div className="aspect-square overflow-hidden rounded border border-white/10">
                <CharacterImage character={enemy} />
              </div>
              <p className="mt-1 truncate text-center text-[10px] text-white/50">
                {enemy.name}
              </p>
            </div>
          ))}
        </div>
      )}
    </button>
  );
}
