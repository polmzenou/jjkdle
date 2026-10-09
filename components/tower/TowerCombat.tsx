"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CharacterImage } from "@/components/CharacterImage";
import {
  GUARD_COOLDOWN,
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
import {
  TowerIcon,
  nodeIcon,
  nodeTone,
  techniqueIcon,
  type TowerIconName,
} from "./TowerIcon";
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
  /** Nom de SON ultime — propre au lanceur (Bleach : Bankai, Resurrección…). */
  const [castName, setCastName] = useState(view.ultimateName);
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
    const slot = snap.squad.findIndex((f) => f.uid === ultimate.from);
    const who = snap.squad[slot];
    setCastName(view.squad[slot]?.ultimateName ?? view.ultimateName);
    setCasting(who?.name ?? "");

    const id = window.setTimeout(() => setCasting(null), CINEMATIC_MS);
    return () => window.clearTimeout(id);
  }, [snap.events, snap.tick, snap.squad, view.squad, view.ultimateName]);

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
    (slot: number, kind: "technique" | "guard" | "focus" = "technique") => {
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

  /**
   * Ennemi actuellement visé par l'escouade.
   *
   * Relu dans le JOURNAL et non gardé dans un état local : le moteur peut
   * refuser un focus (cible déjà tombée) ou retomber sur le premier vivant, et
   * un état local afficherait alors un repère « CIBLE » sur un ennemi que
   * l'escouade n'attaque pas.
   */
  /**
   * Y a-t-il seulement un choix à faire ?
   *
   * Face à un adversaire unique, désigner une cible ne veut rien dire : ni
   * repère « CIBLE », ni carte cliquable. Un bouton qui n'a qu'une réponse
   * possible est un bouton de trop.
   */
  const canFocus =
    snap.enemies.filter((e) => e.alive).length > 1 && !snap.finished && !busy;

  const focused = useMemo(() => {
    let uid: string | null = null;
    for (const event of result.events) {
      if (event.t > snap.tick) break;
      if (event.kind === "focus") uid = event.to;
    }
    const alive = snap.enemies.find((e) => e.uid === uid && e.alive);
    return alive?.uid ?? snap.enemies.find((e) => e.alive)?.uid ?? null;
  }, [result.events, snap.tick, snap.enemies]);

  const focus = useCallback(
    (index: number) => intervene(index, "focus"),
    [intervene],
  );

  // Seuils de coût affichés sur la jauge : on voit d'un coup d'œil quelle
  // technique sera payable, sans comparer deux nombres.
  const costMarks = Array.from(
    new Set(
      view.squad
        .map((c) => c.technique?.cost)
        .filter((c): c is number => typeof c === "number" && c < MAX_ENERGY),
    ),
  );

  return (
    <div className="relative flex flex-col gap-3">
      <DomainCinematic
        caster={casting}
        ultimateName={castName}
        onDone={() => undefined}
      />

      <FloorHeader view={view} tick={snap.tick} />

      {/* Arène : les deux camps face à face, séparés par la jauge commune. */}
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-void-900/60">
        <section
          aria-label="Ennemis"
          className="flex flex-wrap justify-center gap-2 bg-gradient-to-b from-cursed/[0.12] to-transparent px-2 pb-3 pt-3"
        >
          {snap.enemies.map((enemy, i) => (
            <FighterTile
              key={enemy.uid}
              fighter={enemy}
              tick={snap.tick}
              card={view.enemies[i]}
              ultimateName={view.ultimateName}
              hostile
              focused={canFocus && enemy.uid === focused}
              onFocus={canFocus ? () => focus(i) : undefined}
            />
          ))}
        </section>

        <div className="border-y border-white/5 bg-black/30 px-3 py-2.5">
          <EnergyGauge
            value={snap.energy}
            windowOpen={snap.windowOpen}
            marks={costMarks}
          />
        </div>

        <section
          aria-label="Escouade"
          className="flex flex-wrap justify-center gap-2 bg-gradient-to-t from-domain/[0.12] to-transparent px-2 pb-3 pt-3"
        >
          {snap.squad.map((member, i) => (
            <FighterTile
              key={member.uid}
              fighter={member}
              tick={snap.tick}
              card={view.squad[i]}
              ultimateName={view.ultimateName}
            />
          ))}
          {snap.summons.map((summon) => (
            <FighterTile
              key={summon.uid}
              fighter={summon}
              tick={snap.tick}
              summon
            />
          ))}
        </section>
      </div>

      <StatusLine
        finished={snap.finished}
        busy={busy}
        victory={result.victory}
        windowOpen={snap.windowOpen}
      />

      <section aria-label="Actions" className="grid grid-cols-3 gap-2">
        {view.squad.map((card, slot) => {
          const member = snap.squad[slot];
          const alive = Boolean(member?.alive);
          const ultimate = member?.domainReady ?? false;
          const cost = ultimate ? 0 : (card.technique?.cost ?? 0);
          const usable =
            !snap.finished &&
            !busy &&
            alive &&
            (ultimate || (card.technique !== null && snap.energy >= cost));
          // Part de l'énergie déjà réunie pour cette technique : la barre se
          // remplit sous le bouton, on sait quand il va s'allumer.
          const charge =
            ultimate || cost === 0 ? 1 : Math.min(1, snap.energy / cost);
          const defensive = card.archetype === "stalwart";
          const icon: TowerIconName = ultimate
            ? "ultimate"
            : card.technique
              ? techniqueIcon(card.archetype)
              : "ultimate";

          return (
            <button
              key={card.id}
              type="button"
              onClick={() => intervene(slot)}
              disabled={!usable}
              title={
                ultimate
                  ? (card.ultimateName ?? view.ultimateName)
                  : card.technique?.description
              }
              className={[
                "relative flex min-h-[92px] flex-col items-center justify-center gap-1 overflow-hidden rounded-xl border px-1.5 pb-2.5 pt-2 transition active:scale-[0.97]",
                ultimate
                  ? "border-cursed bg-cursed/25 text-white shadow-glow-cursed"
                  : usable
                    ? defensive
                      ? "border-sky-400/70 bg-sky-400/15 text-sky-100 hover:bg-sky-400/25"
                      : "border-domain/70 bg-domain/15 text-domain-light hover:bg-domain/25"
                    : "border-white/10 bg-void-800/50 text-white/30",
                // La fenêtre est le seul moment qui compte : elle doit se voir
                // sans qu'on ait à lire quoi que ce soit.
                snap.windowOpen && usable ? "ring-2 ring-cursed ring-offset-2 ring-offset-void-900" : "",
              ].join(" ")}
            >
              {snap.windowOpen && usable && (
                <span className="absolute left-1/2 top-1 -translate-x-1/2 animate-pulse rounded bg-cursed px-1.5 font-display text-[9px] font-bold uppercase leading-4 tracking-wider text-white">
                  {defensive ? "Parade" : "Contre"}
                </span>
              )}

              <span
                className={[
                  "mt-2 flex h-9 w-9 items-center justify-center rounded-full",
                  ultimate
                    ? "bg-cursed text-white"
                    : usable
                      ? defensive
                        ? "bg-sky-400/25"
                        : "bg-domain/30"
                      : "bg-white/5",
                ].join(" ")}
              >
                <TowerIcon
                  name={alive ? icon : "skull"}
                  className="h-5 w-5"
                />
              </span>

              <span className="max-w-full truncate font-display text-[11px] font-bold uppercase leading-tight tracking-wide">
                {/* « ULTIME » et non le nom de l'univers : « Extension de
                    Territoire » ne tient pas dans un tiers de largeur d'écran.
                    Le nom complet est annoncé par la cinématique, en grand. */}
                {!alive ? "K.O." : ultimate ? "Ultime" : (card.technique?.name ?? "Ultime")}
              </span>

              <span className="flex max-w-full items-center gap-1 text-[10px] leading-none opacity-80">
                {ultimate ? (
                  <span className="font-bold">PRÊT</span>
                ) : card.technique ? (
                  <>
                    <TowerIcon name="energy" className="h-3 w-3" />
                    <span className="tabular-nums">{cost}</span>
                  </>
                ) : (
                  <span>jauge</span>
                )}
                <span className="truncate text-white/40">· {card.name}</span>
              </span>

              {card.technique && !ultimate && alive && (
                <span className="absolute inset-x-0 bottom-0 h-1 bg-black/40">
                  <span
                    className={[
                      "block h-full transition-[width] duration-100",
                      charge >= 1
                        ? defensive
                          ? "bg-sky-400"
                          : "bg-domain-light"
                        : "bg-white/25",
                    ].join(" ")}
                    style={{ width: `${charge * 100}%` }}
                  />
                </span>
              )}
            </button>
          );
        })}
      </section>

      <button
        type="button"
        onClick={() => intervene(GUARD_SLOT, "guard")}
        disabled={!canGuard}
        className={[
          "relative flex items-center justify-center gap-2 overflow-hidden rounded-xl border px-3 py-3.5 font-display text-sm font-bold uppercase tracking-wide transition active:scale-[0.99]",
          snap.guardActive
            ? "border-sky-400 bg-sky-400/25 text-sky-100"
            : canGuard
              ? "border-white/25 bg-white/[0.06] text-white/90 hover:border-sky-400/60 hover:bg-sky-400/10"
              : "border-white/10 bg-void-800/50 text-white/30",
        ].join(" ")}
      >
        {/* Recharge de la garde : la barre se vide jusqu'à la disponibilité. */}
        {snap.guardCooldown > 0 && !snap.guardActive && (
          <span
            aria-hidden
            className="absolute inset-y-0 left-0 bg-white/[0.06]"
            style={{ width: `${(snap.guardCooldown / GUARD_COOLDOWN) * 100}%` }}
          />
        )}
        <TowerIcon name="barrier" className="relative h-5 w-5" />
        <span className="relative">
          {snap.guardActive
            ? "Garde levée"
            : snap.guardCooldown > 0
              ? `Garde · ${(snap.guardCooldown / TICKS_PER_SECOND).toFixed(1)}s`
              : "Garde"}
        </span>
        <span className="relative hidden text-[10px] font-normal normal-case tracking-normal text-white/45 sm:inline">
          — réduit les dégâts reçus par toute l&apos;escouade
        </span>
      </button>
    </div>
  );
}

function StatusLine({
  finished,
  busy,
  victory,
  windowOpen,
}: {
  finished: boolean;
  busy: boolean;
  victory: boolean;
  windowOpen: boolean;
}) {
  if (finished) {
    return (
      <p
        className={[
          "flex items-center justify-center gap-2 rounded-lg py-2 text-center font-display text-sm font-bold",
          victory ? "bg-emerald-400/10 text-emerald-300" : "bg-cursed/10 text-cursed-light",
        ].join(" ")}
      >
        <TowerIcon name={victory ? "star" : "skull"} className="h-4 w-4" />
        {busy ? "Résolution…" : victory ? "Étage franchi" : "Escouade à terre"}
      </p>
    );
  }

  return (
    <p
      className={[
        "flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-center text-xs transition-colors",
        windowOpen
          ? "bg-cursed/15 font-semibold text-cursed-light"
          : "bg-white/[0.03] text-white/45",
      ].join(" ")}
    >
      <TowerIcon
        name={windowOpen ? "warning" : "clock"}
        className="h-4 w-4"
      />
      {windowOpen
        ? "Un ennemi charge — frappe pour contrer, ou lève la garde."
        : "Le combat se joue seul. Attends qu'un ennemi charge pour agir."}
    </p>
  );
}

function FloorHeader({ view, tick }: { view: TowerView; tick: number }) {
  const label =
    view.kind === "boss" ? "Boss" : view.kind === "elite" ? "Élite" : "Combat";
  const tone = nodeTone(view.kind);

  return (
    <header className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <span
          className={[
            "flex h-8 w-8 items-center justify-center rounded-lg",
            tone.ring,
          ].join(" ")}
        >
          <TowerIcon name={nodeIcon(view.kind)} className="h-4 w-4" />
        </span>
        <div className="leading-tight">
          <p className={["font-display text-sm font-bold uppercase tracking-wide", tone.text].join(" ")}>
            {label}
          </p>
          <p className="text-[11px] text-white/45">
            Étage {view.floor} · {view.strateNames[view.strate] ?? `Strate ${view.strate + 1}`}
          </p>
        </div>
      </div>
      <p className="flex items-center gap-1.5 rounded-full bg-white/[0.05] px-2.5 py-1 font-display text-xs font-bold tabular-nums text-white/60">
        <TowerIcon name="clock" className="h-3.5 w-3.5" />
        {(tick / TICKS_PER_SECOND).toFixed(1)}s
      </p>
    </header>
  );
}

function EnergyGauge({
  value,
  windowOpen,
  marks,
}: {
  value: number;
  windowOpen: boolean;
  /** Coûts des techniques de l'escouade, repérés sur la jauge. */
  marks: number[];
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="flex items-center gap-1.5 font-display text-[10px] font-bold uppercase tracking-[0.18em] text-white/50">
          <TowerIcon name="energy" className="h-3.5 w-3.5 text-domain-light" />
          Énergie
        </span>
        <span className="font-display text-sm font-bold tabular-nums text-domain-light">
          {Math.round(value)}
          <span className="text-white/30"> / {MAX_ENERGY}</span>
        </span>
      </div>
      <div className="relative h-3 w-full overflow-hidden rounded-full bg-black/60">
        <div
          className={[
            "h-full rounded-full transition-[width] duration-100",
            windowOpen
              ? "bg-gradient-to-r from-cursed-dark to-cursed"
              : "bg-gradient-to-r from-domain-dark to-domain-light",
          ].join(" ")}
          style={{ width: `${(value / MAX_ENERGY) * 100}%` }}
        />
        {marks.map((mark) => (
          <span
            key={mark}
            aria-hidden
            className="absolute inset-y-0 w-px bg-white/40"
            style={{ left: `${(mark / MAX_ENERGY) * 100}%` }}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Une carte de combattant : portrait, barres, et tout le retour visuel.
 *
 * Trois animations s'y superposent, chacune répondant à une question que le
 * joueur se posait sans réponse :
 *
 *   « qui vient de frapper ? » — la carte se déplace au moment du coup. Vers le
 *     HAUT pour l'escouade, vers le BAS pour les ennemis : les deux camps
 *     bougent en sens opposés, donc un regard suffit à savoir de quel côté part
 *     le coup, sans lire un nom.
 *
 *   « mon appui a-t-il servi ? » — un trait lumineux barre la cible quand le
 *     coup vient d'une action DÉCLENCHÉE par le joueur. Avant, une technique et
 *     une frappe automatique produisaient le même nombre rouge.
 *
 *   « qui mon escouade attaque-t-elle ? » — l'ennemi ciblé porte un liseré et un
 *     repère. Cliquer sur un autre le désigne (cf. `onFocus`).
 */
function FighterTile({
  fighter,
  tick,
  card,
  hostile = false,
  summon = false,
  focused = false,
  onFocus,
  ultimateName,
}: {
  fighter: FighterSnapshot;
  /** Tick courant : deux frappes d'affilée doivent rejouer l'animation. */
  tick: number;
  /** Fiche complète, pour la bulle de survol. Absente pour un shikigami. */
  card?: TowerCardView;
  hostile?: boolean;
  summon?: boolean;
  /** Cet ennemi est la cible actuelle de l'escouade. */
  focused?: boolean;
  /** Le désigner comme cible. Absent = carte non cliquable. */
  onFocus?: () => void;
  ultimateName?: string;
}) {
  const ratio = Math.max(0, Math.min(1, fighter.hp / fighter.maxHp));
  const targetable = Boolean(onFocus) && fighter.alive;

  /**
   * Sens du mouvement : les ennemis PLONGENT, l'escouade se SOULÈVE. Les deux
   * camps bougent en sens opposés — c'est ce qui permet de savoir d'où part un
   * coup sans lire un nom.
   */
  const lunge = hostile ? 12 : -12;

  const cardRef = useRef<HTMLElement | null>(null);
  const lastLunge = useRef(-1);
  const lastSlash = useRef(-1);
  /** Compteur de traits : sert de `key`, pour qu'un span neuf rejoue à chaque coup. */
  const [slash, setSlash] = useState(0);

  /**
   * Le mouvement passe par l'API NATIVE du navigateur (`Element.animate`), et
   * non par framer-motion comme le reste du site.
   *
   * Ce n'est pas un caprice mais une mesure : sur ces cartes, framer recevait
   * bien son `animate` — il écrivait le style de l'élément — tout en laissant la
   * transformation à zéro, y compris avec un décalage constant codé en dur.
   * `transform: none` en permanence, sans le moindre avertissement.
   *
   * Seconde raison, de fond celle-là : `struck` ne vaut que le temps d'UN tick,
   * soit 100 ms, quand un mouvement lisible en demande le triple. Une animation
   * déduite de l'état serait annulée au tiers de sa course. Déclenchée une fois,
   * celle-ci va à son terme quoi qu'il arrive ensuite.
   */
  useEffect(() => {
    const el = cardRef.current;
    if (!el || !fighter.struck || lastLunge.current === tick) return;
    lastLunge.current = tick;

    el.animate(
      [
        { transform: "translateY(0) scale(1)" },
        { transform: `translateY(${lunge}px) scale(1.06)`, offset: 0.35 },
        { transform: "translateY(0) scale(1)" },
      ],
      { duration: 300, easing: "ease-out" },
    );
  }, [fighter.struck, tick, lunge]);

  useEffect(() => {
    if (!fighter.slashed || lastSlash.current === tick) return;
    lastSlash.current = tick;
    setSlash((n) => n + 1);
  }, [fighter.slashed, tick]);

  // Le trait s'efface de lui-même : il ne peut pas dépendre de `slashed`, qui
  // aura disparu bien avant la fin de son animation.
  useEffect(() => {
    if (slash === 0) return;
    const id = window.setTimeout(() => setSlash(0), 360);
    return () => window.clearTimeout(id);
  }, [slash]);

  const className = [
    "relative block w-[92px] overflow-hidden rounded-lg border bg-void-900/70 transition-colors sm:w-[104px]",
    fighter.alive ? "" : "opacity-30 grayscale",
    fighter.charging
      ? "border-cursed shadow-glow-cursed"
      : focused
        ? "border-amber-300 shadow-[0_0_12px_2px_rgba(252,211,77,0.45)]"
        : hostile
          ? "border-cursed/30"
          : "border-domain/30",
    targetable && !focused ? "cursor-pointer hover:border-amber-300/60" : "",
    summon ? "!w-[76px] border-dashed" : "",
  ].join(" ");

  const content = (
    <>
      <div className="relative aspect-square w-full bg-void-900">
        {summon ? (
          <div className="flex h-full w-full items-center justify-center text-domain-light">
            <TowerIcon name="summon" className="h-8 w-8" />
          </div>
        ) : (
          <CharacterImage character={{ name: fighter.name, image: card?.image }} />
        )}

        {fighter.damageTaken > 0 && (
          <span className="absolute inset-x-0 top-1 text-center font-display text-lg font-bold text-cursed drop-shadow">
            &#8722;{fighter.damageTaken}
          </span>
        )}
        {fighter.healed > 0 && (
          <span className="absolute inset-x-0 top-1 text-center font-display text-lg font-bold text-emerald-400 drop-shadow">
            +{fighter.healed}
          </span>
        )}

        {/* Le trait du joueur : il barre le portrait en diagonale, puis
            s'efface. C'est le seul retour propre à SON action.

            La `key` change à chaque coup : le span est donc NEUF, et son
            animation CSS repart d'elle-même — rien à orchestrer, rien à
            remettre à zéro. */}
        {slash > 0 && (
          <span
            key={slash}
            aria-hidden
            className="tower-slash pointer-events-none absolute left-[-20%] top-1/2 h-[3px] w-[140%] -rotate-45 bg-gradient-to-r from-transparent via-white to-transparent"
          />
        )}

        {focused && (
          <span
            aria-hidden
            title="Cible de ton escouade"
            className="absolute right-1 top-1 flex items-center gap-0.5 rounded bg-amber-300/90 px-1 text-[9px] font-bold leading-4 text-void-900"
          >
            <TowerIcon name="target" className="h-2.5 w-2.5" />
            CIBLE
          </span>
        )}

        {/* Un ennemi qui charge : le danger doit se voir sans lire. */}
        {fighter.charging && fighter.alive && (
          <span
            aria-hidden
            className="absolute left-1 top-1 flex h-5 w-5 animate-pulse items-center justify-center rounded-full bg-cursed text-white"
          >
            <TowerIcon name="warning" className="h-3 w-3" />
          </span>
        )}

        {/* Technique du personnage, en coin : on relie la carte à son bouton. */}
        {card && !hostile && (
          <span
            aria-hidden
            className="absolute bottom-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-void-900/85 text-domain-light ring-1 ring-domain/40"
          >
            <TowerIcon
              name={card.technique ? techniqueIcon(card.archetype) : "ultimate"}
              className="h-3 w-3"
            />
          </span>
        )}

        {!fighter.alive && (
          <span
            aria-hidden
            className="absolute inset-0 flex items-center justify-center text-white/80"
          >
            <TowerIcon name="skull" className="h-8 w-8" />
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

      <div className="px-1.5 py-1 text-center">
        <p className="truncate text-[10px] font-semibold text-white/75">
          {fighter.name}
        </p>
        <p className="text-[9px] tabular-nums text-white/40">
          {Math.max(0, Math.round(fighter.hp))} PV
        </p>
      </div>
    </>
  );

  return (
    <div className="group relative">
      {/* La bulle vit HORS de la carte : celle-ci est `overflow-hidden` (elle la
          rognerait) et devient un <button> quand l'ennemi est ciblable — un
          <div role="tooltip"> à l'intérieur serait du HTML invalide. */}
      {card && (
        <CharacterTip
          card={card}
          hp={{ current: fighter.hp, max: fighter.maxHp }}
          ultimateName={ultimateName}
          // Les ennemis sont en HAUT de l'écran : leur bulle s'ouvre vers le
          // bas. L'escouade est juste au-dessus des boutons d'action : la sienne
          // s'ouvre vers le haut, sinon elle les recouvre au moment précis où le
          // joueur vise.
          align={hostile ? "bottom" : "top"}
        />
      )}

      {targetable ? (
        <button
          type="button"
          ref={(el) => void (cardRef.current = el)}
          onClick={onFocus}
          aria-pressed={focused}
          aria-label={`Concentrer les attaques sur ${fighter.name}`}
          className={className}
        >
          {content}
        </button>
      ) : (
        <div ref={(el) => void (cardRef.current = el)} className={className}>
          {content}
        </div>
      )}
    </div>
  );
}
