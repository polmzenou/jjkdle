"use client";

import type { TowerView } from "@/lib/games/tower/view";
import { TowerIcon } from "./TowerIcon";

/**
 * Une rencontre : une situation, deux issues.
 *
 * Les libellés disent l'INTENTION, jamais le résultat — « Plonger la main
 * dedans » et non « Gagner 60 fragments ». Afficher la conséquence
 * transformerait le choix en simple addition, et une rencontre sans risque n'a
 * aucune raison d'exister.
 */
export function EventScreen({
  view,
  busy,
  onChoose,
}: {
  view: TowerView;
  busy: boolean;
  onChoose: (index: number) => void;
}) {
  if (!view.event) return null;

  return (
    <div className="flex flex-col gap-5">
      <header>
        <p className="flex items-center gap-1.5 font-display text-[10px] font-bold uppercase tracking-[0.2em] text-sky-300">
          <TowerIcon name="event" className="h-3.5 w-3.5" />
          Rencontre
        </p>
        <h2 className="mt-1 font-display text-xl font-bold text-white">
          {view.event.title}
        </h2>
      </header>

      <p className="max-w-prose rounded-xl border border-sky-400/25 bg-sky-400/[0.06] p-4 text-sm italic leading-relaxed text-white/75">
        {view.event.text}
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        {view.event.choices.map((choice) => (
          <button
            key={choice.index}
            type="button"
            onClick={() => onChoose(choice.index)}
            disabled={busy}
            className="group/choice flex items-center justify-between gap-3 rounded-xl border border-white/15 bg-void-800/60 px-4 py-4 text-left font-display text-sm font-bold text-white transition hover:-translate-y-0.5 hover:border-sky-400/70 hover:bg-void-700/60 disabled:opacity-40"
          >
            {choice.label}
            <TowerIcon
              name="arrow"
              className="h-4 w-4 text-white/30 transition group-hover/choice:translate-x-0.5 group-hover/choice:text-sky-300"
            />
          </button>
        ))}
      </div>

      <p className="text-xs text-white/35">
        On ne sait pas laquelle paie. C&apos;est le principe.
      </p>
    </div>
  );
}

/**
 * Le nœud de repos : soigner, et rien d'autre.
 *
 * Volontairement sans choix. Le choix a déjà été fait sur la carte — prendre
 * cette branche, c'est renoncer au butin et à l'XP d'un combat. Y ajouter une
 * seconde décision diluerait la première.
 */
export function RestScreen({
  view,
  busy,
  onRest,
}: {
  view: TowerView;
  busy: boolean;
  onRest: () => void;
}) {
  const hurt = view.squad.some((m) => m.hp < m.maxHp);

  return (
    <div className="flex flex-col items-center gap-5 py-6 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-400/15 text-emerald-300">
        <TowerIcon name="rest" className="h-9 w-9" />
      </span>
      <div>
        <h2 className="font-display text-xl font-bold text-white">
          Un palier tranquille
        </h2>
        <p className="mx-auto mt-1 max-w-sm text-sm text-white/50">
          {hurt
            ? `Personne ne vous attend ici. L'escouade récupère ${view.restPct} % de ses points de vie.`
            : "Personne ne vous attend ici — et personne n'a besoin de soins. Le calme aura au moins servi à ça."}
        </p>
      </div>

      <button
        type="button"
        onClick={onRest}
        disabled={busy}
        className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-5 py-2.5 font-display font-bold text-black transition hover:bg-emerald-400 disabled:opacity-40"
      >
        <TowerIcon name="heal" className="h-4 w-4" />
        Souffler et repartir
      </button>
    </div>
  );
}
