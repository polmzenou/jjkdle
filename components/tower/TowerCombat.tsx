"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CharacterImage } from "@/components/CharacterImage";
import {
  GUARD_SLOT,
  MAX_ENERGY,
  TICKS_PER_SECOND,
  TICK_MS,
  simulateCombat,
  type CombatSetup,
} from "@/lib/games/tower/combat";
import { snapshotAt, type FighterSnapshot } from "@/lib/games/tower/playback";
import {
  toSpecFromView,
  type TowerCardView,
  type TowerView,
} from "@/lib/games/tower/view";
import { CINEMATIC_MS, DomainCinematic } from "./DomainCinematic";
import { CharacterTip } from "./InfoTip";
import type { Intervention } from "@/lib/games/tower/types";

/**
 * L'écran de combat — le cœur jouable.
 *
 * Comment il fonctionne, et pourquoi :
 *
 * Le moteur résout un combat d'un seul bloc, alors que le joueur doit pouvoir
 * intervenir pendant. La solution est de RE-SIMULER intégralement à chaque
 * intervention, puis de rejouer le journal jusqu'au tick courant. C'est
 * possible parce que la simulation est déterministe et coûte moins d'une
 * milliseconde : le passé déjà affiché ne peut pas changer, et ce qui est à
 * l'écran est exactement ce que le serveur validera.
 *
 * L'interface tient en cinq bandes empilées et trois boutons — c'est le budget
 * d'un téléphone tenu à une main, et c'est ce plafond qui a dicté le reste.
 */
export function TowerCombat({
  view,
  onResolved,
  busy,
}: {
  view: TowerView;
  onResolved: (interventions: Intervention[]) => void;
  busy: boolean;
}) {
  const setup = useMemo<CombatSetup>(
    () => ({
      squad: view.squad.map((c) => toSpecFromView(c, "squad")),
      enemies: view.enemies.map((c) => toSpecFromView(c, "enemy")),
      squadHp: view.squad.map((c) => c.hp),
    }),
    [view],
  );

  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [tick, setTick] = useState(0);
  const sent = useRef(false);

  /** Personnage dont l'ultime est en train d'être joué à l'écran. */
  const [casting, setCasting] = useState<string | null>(null);
  /** Dernier tick d'ultime déjà mis en scène — la re-simulation rejoue le
   *  journal, et sans ce garde-fou la même cinématique repartirait en boucle. */
  const shown = useRef(-1);

  const result = useMemo(
    () => simulateCombat({ ...setup, interventions }),
    [setup, interventions],
  );

  const snap = useMemo(
    () => snapshotAt(result, setup, tick),
    [result, setup, tick],
  );

  // Un ultime vient de partir : on coupe pour le mettre en scène.
  useEffect(() => {
    const ultimate = snap.events.find((e) => e.kind === "ultimate");
    if (!ultimate || shown.current === snap.tick) return;

    shown.current = snap.tick;
    const who = snap.squad.find((f) => f.uid === ultimate.from);
    setCasting(who?.name ?? "");

    const id = window.setTimeout(() => setCasting(null), CINEMATIC_MS);
    return () => window.clearTimeout(id);
  }, [snap.events, snap.tick, snap.squad]);

  // Horloge du combat. `TICK_MS` est le tick du moteur : l'animation tourne
  // donc à la même cadence que la simulation, pas à une cadence approchée.
  //
  // Elle s'arrête pendant la cinématique. Le combat étant DÉJÀ résolu, cette
  // pause ne change strictement rien à son issue — elle ne fait que retenir la
  // lecture, comme un arrêt sur image.
  useEffect(() => {
    if (snap.finished || casting !== null) return;
    const id = window.setInterval(() => setTick((t) => t + 1), TICK_MS);
    return () => window.clearInterval(id);
  }, [snap.finished, casting]);

  // Fin du combat : on remonte le SEUL apport du client — le log
  // d'interventions. Ni dégâts, ni résultat : c'est le serveur qui tranche.
  useEffect(() => {
    // On ne quitte pas l'écran sur une cinématique en cours : l'ultime qui
    // achève le dernier ennemi est précisément celui qu'il faut voir.
    if (!snap.finished || sent.current || casting !== null) return;
    sent.current = true;
    const id = window.setTimeout(() => onResolved(interventions), 900);
    return () => window.clearTimeout(id);
  }, [snap.finished, interventions, onResolved, casting]);

  const intervene = useCallback(
    (slot: number, kind: "technique" | "guard" = "technique") => {
      setInterventions((prev) => {
        // Les ticks doivent croître STRICTEMENT (garde anti-rejeu du moteur) :
        // deux appuis dans le même dixième de seconde, et le second serait
        // rejeté côté serveur alors qu'il aurait été joué à l'écran.
        const last = prev[prev.length - 1];
        if (last && last.tick >= tick) return prev;
        return [...prev, { tick, slot, kind }];
      });
    },
    [tick],
  );

  const canGuard =
    !snap.finished && !busy && snap.guardCooldown === 0 && !snap.guardActive;

  return (
    <div className="relative flex flex-col gap-4">
      <DomainCinematic
        caster={casting}
        ultimateName={view.ultimateName}
        onDone={() => undefined}
      />

      <FloorHeader view={view} tick={snap.tick} />

      <section aria-label="Ennemis" className="flex flex-wrap justify-center gap-2">
        {snap.enemies.map((enemy, i) => (
          <FighterTile
            key={enemy.uid}
            fighter={enemy}
            card={view.enemies[i]}
            hostile
          />
        ))}
      </section>

      <EnergyGauge value={snap.energy} windowOpen={snap.windowOpen} />

      <section aria-label="Escouade" className="flex flex-wrap justify-center gap-2">
        {snap.squad.map((member, i) => (
          <FighterTile
            key={member.uid}
            fighter={member}
            card={view.squad[i]}
          />
        ))}
        {snap.summons.map((summon) => (
          <FighterTile key={summon.uid} fighter={summon} summon />
        ))}
      </section>

      <section aria-label="Actions" className="grid grid-cols-3 gap-2">
        {view.squad.map((card, slot) => {
          const member = snap.squad[slot];
          const ultimate = member?.domainReady ?? false;
          const cost = ultimate ? 0 : (card.technique?.cost ?? 0);
          const usable =
            !snap.finished &&
            !busy &&
            Boolean(member?.alive) &&
            (ultimate || (card.technique !== null && snap.energy >= cost));

          return (
            <button
              key={card.id}
              type="button"
              onClick={() => intervene(slot)}
              disabled={!usable}
              className={[
                "flex flex-col items-center gap-0.5 rounded-lg border px-2 py-3 transition",
                ultimate
                  ? "border-cursed bg-cursed/20 text-cursed-light shadow-glow-cursed"
                  : usable
                    ? "border-domain/70 bg-domain/15 text-domain-light"
                    : "border-white/10 bg-void-800/50 text-white/30",
                // La fenêtre est le seul moment qui compte : elle doit se voir
                // sans qu'on ait à lire quoi que ce soit.
                snap.windowOpen && usable ? "animate-pulse ring-2 ring-cursed" : "",
              ].join(" ")}
            >
              <span className="font-display text-[11px] font-bold uppercase leading-tight tracking-wide">
                {/* « ULTIME » et non le nom de l'univers : « Extension de
                    Territoire » ne tient pas dans un tiers de largeur d'écran.
                    Le nom complet est annoncé par la cinématique, en grand. */}
                {ultimate ? "Ultime" : (card.technique?.name ?? "—")}
              </span>
              <span className="text-[11px] tabular-nums opacity-70">
                {ultimate ? "PRÊT" : cost}
              </span>
            </button>
          );
        })}
      </section>

      <button
        type="button"
        onClick={() => intervene(GUARD_SLOT, "guard")}
        disabled={!canGuard}
        className={[
          "flex items-center justify-center gap-2 rounded-lg border px-3 py-3 font-display text-sm font-bold uppercase tracking-wide transition",
          snap.guardActive
            ? "border-sky-400 bg-sky-400/25 text-sky-200"
            : canGuard
              ? "border-white/25 bg-white/[0.06] text-white/85 hover:border-sky-400/60"
              : "border-white/10 bg-void-800/50 text-white/25",
        ].join(" ")}
      >
        <span aria-hidden>🛡</span>
        {snap.guardActive
          ? "Garde levée"
          : snap.guardCooldown > 0
            ? `Garde · ${(snap.guardCooldown / TICKS_PER_SECOND).toFixed(1)}s`
            : "Garde"}
      </button>

      <p className="text-center text-xs text-white/40">
        {snap.finished
          ? busy
            ? "Résolution…"
            : result.victory
              ? "Étage franchi."
              : "Escouade à terre."
          : snap.windowOpen
            ? "Fenêtre ouverte — frappe maintenant pour contrer, ou garde pour amortir."
            : "Le combat se joue seul. Garde pour encaisser, et attends qu'un ennemi charge."}
      </p>
    </div>
  );
}

function FloorHeader({ view, tick }: { view: TowerView; tick: number }) {
  const label =
    view.kind === "boss" ? "BOSS" : view.kind === "elite" ? "ÉLITE" : "COMBAT";

  return (
    <header className="flex items-baseline justify-between">
      <p className="font-display text-xs font-bold uppercase tracking-[0.18em] text-white/50">
        Étage {view.floor} · Strate {["I", "II", "III", "IV"][view.strate]}
      </p>
      <p
        className={
          view.kind === "combat"
            ? "font-display text-xs font-bold tracking-widest text-white/40"
            : "font-display text-xs font-bold tracking-widest text-cursed"
        }
      >
        {label} · {(tick / 10).toFixed(1)}s
      </p>
    </header>
  );
}

function EnergyGauge({
  value,
  windowOpen,
}: {
  value: number;
  windowOpen: boolean;
}) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="font-display text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">
          Énergie occulte
        </span>
        <span className="font-display text-sm font-bold tabular-nums text-domain-light">
          {Math.round(value)}
        </span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-black/50">
        <div
          className={
            windowOpen
              ? "h-full bg-cursed transition-[width] duration-100"
              : "h-full bg-domain transition-[width] duration-100"
          }
          style={{ width: `${(value / MAX_ENERGY) * 100}%` }}
        />
      </div>
    </div>
  );
}

function FighterTile({
  fighter,
  card,
  hostile = false,
  summon = false,
}: {
  fighter: FighterSnapshot;
  /** Fiche complète, pour la bulle de survol. Absente pour un shikigami. */
  card?: TowerCardView;
  hostile?: boolean;
  summon?: boolean;
}) {
  const ratio = Math.max(0, Math.min(1, fighter.hp / fighter.maxHp));

  return (
    <div
      className={[
        "group relative",
        "relative w-[104px] overflow-hidden rounded-lg border transition",
        fighter.alive ? "" : "opacity-30 grayscale",
        fighter.charging
          ? "border-cursed shadow-glow-cursed"
          : hostile
            ? "border-cursed/30"
            : "border-domain/30",
        summon ? "w-[76px] border-dashed" : "",
      ].join(" ")}
    >
      <div className="relative aspect-square w-full bg-void-900">
        {summon ? (
          <div className="flex h-full w-full items-center justify-center text-2xl">
            🐕
          </div>
        ) : (
          <CharacterImage character={{ name: fighter.name, image: card?.image }} />
        )}

        {fighter.damageTaken > 0 && (
          <span className="absolute inset-x-0 top-1 text-center font-display text-lg font-bold text-cursed drop-shadow">
            −{fighter.damageTaken}
          </span>
        )}
        {fighter.healed > 0 && (
          <span className="absolute inset-x-0 top-1 text-center font-display text-lg font-bold text-emerald-400 drop-shadow">
            +{fighter.healed}
          </span>
        )}
      </div>

      {/* Barre de charge : c'est elle qui annonce la fenêtre. */}
      {fighter.charging && (
        <div className="h-1 w-full bg-black/60">
          <div
            className="h-full bg-cursed"
            style={{ width: `${fighter.chargeProgress * 100}%` }}
          />
        </div>
      )}

      <div className="h-1.5 w-full bg-black/60">
        <div
          className={ratio > 0.35 ? "h-full bg-emerald-400" : "h-full bg-cursed"}
          style={{ width: `${ratio * 100}%` }}
        />
      </div>

      <p className="truncate px-1.5 py-1 text-center text-[10px] text-white/60">
        {fighter.name}
      </p>
    </div>
  );
}
