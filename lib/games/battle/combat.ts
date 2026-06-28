import type { RosterMap } from "@/lib/multiplayer/state";
import { battleValueOf } from "./battleValues";
import type { BattleMode } from "./types";

/**
 * Logique de combat PURE (client + serveur). Le serveur s'en sert pour calculer
 * le résultat autoritatif ; le client pour générer l'animation. Mêmes entrées →
 * mêmes sorties, donc l'animation raconte exactement l'issue calculée.
 */

/** Étape de duel animée, du point de vue de « moi » (mineId vs theirsId). */
export interface DuelStep {
  mineId: string | null;
  theirsId: string | null;
  /** Issue du point de vue de « moi ». */
  outcome: "win" | "lose" | "draw";
  /** HP max (= battleValue d'origine) → 100 % de la barre de vie. */
  mineMaxHp: number;
  theirsMaxHp: number;
  /** HP en entrant dans ce duel (le champion qui reste garde ses HP réduits). */
  mineHpStart: number;
  theirsHpStart: number;
  /** HP après résolution (vainqueur réduit du HP adverse, perdant à 0). */
  mineHpEnd: number;
  theirsHpEnd: number;
}

/** Étape interne du gauntlet (perspective a/b neutre). */
interface GauntletStep {
  a: string;
  b: string;
  winner: "a" | "b" | "draw";
  aMax: number;
  bMax: number;
  aStart: number;
  bStart: number;
  aEnd: number;
  bEnd: number;
}

interface GauntletRun {
  steps: GauntletStep[];
  aRemaining: number;
  bRemaining: number;
  /** HP restants du champion en lice côté A/B (0 si l'équipe est éliminée). */
  aFinalHp: number;
  bFinalHp: number;
}

/**
 * Gauntlet « le vainqueur reste », version HP : chaque perso entre avec
 * `currentHp = battleValue`. À chaque duel on compare les `currentHp` actuels ;
 * le plus haut gagne et perd `currentHp` égal à celui du perdant
 * (`vainqueur -= perdant`). Le vainqueur reste en lice avec ses HP réduits
 * (persistants, jamais soignés) ; le perdant est éliminé. Égalité de HP → double
 * K.O. S'arrête quand une équipe est épuisée. Un champion usé par plusieurs
 * combats peut donc tomber face à un perso frais.
 */
function runGauntlet(
  deckA: string[],
  deckB: string[],
  valueOf: (id: string) => number,
): GauntletRun {
  const steps: GauntletStep[] = [];
  let ai = 0;
  let bi = 0;
  // HP courant du combattant en lice de chaque côté (frais = battleValue).
  let hpA = deckA.length > 0 ? valueOf(deckA[0]) : 0;
  let hpB = deckB.length > 0 ? valueOf(deckB[0]) : 0;

  while (ai < deckA.length && bi < deckB.length) {
    const base: Omit<GauntletStep, "winner" | "aEnd" | "bEnd"> = {
      a: deckA[ai],
      b: deckB[bi],
      aMax: valueOf(deckA[ai]),
      bMax: valueOf(deckB[bi]),
      aStart: hpA,
      bStart: hpB,
    };

    if (hpA > hpB) {
      const aEnd = hpA - hpB; // le vainqueur encaisse les HP du perdant
      steps.push({ ...base, winner: "a", aEnd, bEnd: 0 });
      hpA = aEnd; // le champion A reste, affaibli
      bi++; // B envoie le suivant (frais)
      if (bi < deckB.length) hpB = valueOf(deckB[bi]);
    } else if (hpB > hpA) {
      const bEnd = hpB - hpA;
      steps.push({ ...base, winner: "b", aEnd: 0, bEnd });
      hpB = bEnd;
      ai++;
      if (ai < deckA.length) hpA = valueOf(deckA[ai]);
    } else {
      // Égalité de HP courant → double K.O. : les deux tombent.
      steps.push({ ...base, winner: "draw", aEnd: 0, bEnd: 0 });
      ai++;
      bi++;
      if (ai < deckA.length) hpA = valueOf(deckA[ai]);
      if (bi < deckB.length) hpB = valueOf(deckB[bi]);
    }
  }

  return {
    steps,
    aRemaining: deckA.length - ai,
    bRemaining: deckB.length - bi,
    aFinalHp: ai < deckA.length ? hpA : 0,
    bFinalHp: bi < deckB.length ? hpB : 0,
  };
}

/** Fiche d'un perso dans le gauntlet : qui il a battu, et s'il est tombé. */
export interface GauntletCardLog {
  cardId: string;
  /** Ids des persos adverses éliminés par CE perso (dans l'ordre). */
  defeatedIds: string[];
  /** Vrai si ce perso a fini par tomber (défaite ou double K.O.). */
  eliminated: boolean;
  /** HP max (= battleValue d'origine). */
  maxHp: number;
  /** HP restants si ce perso a survécu jusqu'à la fin (sinon undefined). */
  remainingHp?: number;
}

/**
 * Détaille le gauntlet du point de vue de `myDeck` : pour chacun de mes persos
 * (dans l'ordre du deck), la liste des persos adverses qu'il a battus avant de
 * tomber — ou avant la fin du combat s'il a survécu, avec ses HP restants. Les
 * persos jamais engagés (combat terminé avant) figurent quand même, sans
 * victime. Dérivé de `runGauntlet` pour ne jamais diverger de la logique HP.
 */
export function gauntletBreakdown(
  myDeck: string[],
  oppDeck: string[],
  roster: RosterMap,
): GauntletCardLog[] {
  const valueOf = (id: string) => battleValueOf(roster[id]);
  const log: GauntletCardLog[] = myDeck.map((cardId) => ({
    cardId,
    defeatedIds: [],
    eliminated: false,
    maxHp: valueOf(cardId),
  }));

  const { steps, aFinalHp } = runGauntlet(myDeck, oppDeck, valueOf);
  // `a` = mon deck. On suit l'index du champion courant via les éliminations.
  let myIndex = 0;
  for (const step of steps) {
    if (step.winner === "a") {
      log[myIndex].defeatedIds.push(step.b); // mon champion reste, l'adverse tombe
    } else if (step.winner === "b") {
      log[myIndex].eliminated = true;
      myIndex++;
    } else {
      log[myIndex].eliminated = true; // double K.O.
      myIndex++;
    }
  }
  // Le champion encore debout (s'il en reste un) garde ses HP restants.
  if (myIndex < myDeck.length && aFinalHp > 0) {
    log[myIndex].remainingHp = aFinalHp;
  }
  return log;
}

/** Survivants + HP restants de chaque deck en mode hardcore (decks ordonnés). */
export function gauntletSurvivors(
  deckA: string[],
  deckB: string[],
  roster: RosterMap,
): { aRemaining: number; bRemaining: number; aFinalHp: number; bFinalHp: number } {
  const { aRemaining, bRemaining, aFinalHp, bFinalHp } = runGauntlet(
    deckA,
    deckB,
    (id) => battleValueOf(roster[id]),
  );
  return { aRemaining, bRemaining, aFinalHp, bFinalHp };
}

/** Séquence de duels animée selon le mode, du point de vue de « moi ». */
export function buildDuelScript(
  myDeck: string[],
  oppDeck: string[],
  roster: RosterMap,
  mode: BattleMode,
): DuelStep[] {
  const valueOf = (id: string) => battleValueOf(roster[id]);

  if (mode === "hardcore") {
    // a = moi, b = adversaire → on reporte directement les HP de chaque étape.
    return runGauntlet(myDeck, oppDeck, valueOf).steps.map((s) => ({
      mineId: s.a,
      theirsId: s.b,
      outcome: s.winner === "a" ? "win" : s.winner === "b" ? "lose" : "draw",
      mineMaxHp: s.aMax,
      theirsMaxHp: s.bMax,
      mineHpStart: s.aStart,
      theirsHpStart: s.bStart,
      mineHpEnd: s.aEnd,
      theirsHpEnd: s.bEnd,
    }));
  }

  // Mode normal : 5 duels indépendants (perso i vs perso i). L'issue reste le
  // cumul de battleValue (inchangée) ; les HP ne servent qu'à l'affichage des
  // barres (vainqueur reste plein, perdant tombe à 0).
  const length = Math.max(myDeck.length, oppDeck.length);
  return Array.from({ length }).map((_, i) => {
    const mineId = myDeck[i] ?? null;
    const theirsId = oppDeck[i] ?? null;
    const mineMaxHp = mineId ? valueOf(mineId) : 0;
    const theirsMaxHp = theirsId ? valueOf(theirsId) : 0;
    const outcome: DuelStep["outcome"] =
      mineMaxHp > theirsMaxHp ? "win" : mineMaxHp < theirsMaxHp ? "lose" : "draw";
    return {
      mineId,
      theirsId,
      outcome,
      mineMaxHp,
      theirsMaxHp,
      mineHpStart: mineMaxHp,
      theirsHpStart: theirsMaxHp,
      mineHpEnd: outcome === "win" ? mineMaxHp : 0,
      theirsHpEnd: outcome === "lose" ? theirsMaxHp : 0,
    };
  });
}
