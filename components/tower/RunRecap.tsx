"use client";

import Link from "next/link";
import { useUniverseHref } from "@/components/universe/UniverseProvider";
import { TOWER_FLOORS } from "@/lib/games/tower/types";
import type { TowerView } from "@/lib/games/tower/view";
import type { ExpResult } from "@/lib/leaderboard/types";
import { TowerCard } from "./TowerCard";

/**
 * Écran de fin de run.
 *
 * C'est aussi le SEUL endroit du jeu où l'on demande quoi que ce soit à un
 * visiteur : après une ascension, c'est le meilleur moment de conversion du
 * site, et il n'y en a pas d'autre.
 */
export function RunRecap({
  view,
  exp,
  onRestart,
  busy,
}: {
  view: TowerView;
  exp?: ExpResult;
  onRestart: () => void;
  busy: boolean;
}) {
  const href = useUniverseHref();
  const won = view.status === "won";
  const reached = won ? TOWER_FLOORS : view.floor;

  return (
    <div className="flex flex-col items-center gap-6 py-6 text-center">
      <div>
        <p className="font-display text-xs font-bold uppercase tracking-[0.2em] text-white/40">
          {won ? "Sommet atteint" : "Ascension interrompue"}
        </p>
        <p className="mt-2 font-display text-5xl font-bold text-white">
          Étage {reached}
        </p>
        <p className="mt-1 text-sm text-white/50">
          {view.enemiesKilled} ennemi{view.enemiesKilled > 1 ? "s" : ""} vaincu
          {view.enemiesKilled > 1 ? "s" : ""} · {view.bossesKilled} boss ·{" "}
          {view.score} points
          {view.mode === "daily" ? ` · essai n°${view.attempt}` : " · tour libre"}
        </p>
      </div>

      {view.squad.length > 0 && (
        <div className="grid w-full max-w-md grid-cols-3 gap-3">
          {view.squad.map((member) => (
            <TowerCard
              key={member.id}
              card={member}
              hp={{ current: member.hp, max: member.maxHp }}
            />
          ))}
        </div>
      )}

      {exp?.ok && (
        <p className="text-sm text-domain-light">
          +{exp.gainedExp} XP
          {exp.gainedCoins ? ` · +${exp.gainedCoins} coins` : ""}
          {exp.droppedBooster ? " · un booster est tombé" : ""}
        </p>
      )}

      {/* Jouable déconnecté : la run va jusqu'au bout, mais rien n'est gardé. */}
      {exp?.needsAuth && (
        <div className="w-full max-w-md rounded-xl border border-domain/40 bg-domain/10 p-4">
          <p className="text-sm text-white/80">
            Tu as atteint l&apos;étage {reached}. Crée un compte pour enregistrer
            tes ascensions, entrer au classement et gagner de l&apos;XP.
          </p>
          <div className="mt-3 flex justify-center gap-3">
            <Link
              href={href("/register")}
              className="rounded-lg bg-domain px-4 py-2 font-display text-sm font-bold text-white"
            >
              Créer un compte
            </Link>
            <Link
              href={href("/login")}
              className="rounded-lg border border-white/15 px-4 py-2 text-sm text-white/70"
            >
              Se connecter
            </Link>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onRestart}
          disabled={busy}
          className="rounded-lg bg-domain px-5 py-2.5 font-display font-bold text-white disabled:opacity-40"
        >
          {won ? "Nouvelle ascension" : "Réessayer"}
        </button>
        <Link
          href={href("/games")}
          className="rounded-lg border border-white/15 px-5 py-2.5 font-display text-white/70"
        >
          Retour aux jeux
        </Link>
      </div>

      {view.mode === "daily" && !won && (
        <p className="max-w-sm text-xs text-white/35">
          La tour du jour est la même pour tout le monde et se rejoue autant de
          fois qu'il le faut. Le classement compte le nombre d&apos;essais.
        </p>
      )}
    </div>
  );
}
