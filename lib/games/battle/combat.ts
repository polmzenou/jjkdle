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
}

/**
 * Gauntlet « le vainqueur reste » entre deux decks ordonnés. Le plus fort
 * élimine l'autre et reste en lice ; égalité = double K.O. S'arrête quand une
 * équipe est épuisée.
 */
function runGauntlet(
  deckA: string[],
  deckB: string[],
  valueOf: (id: string) => number,
): { steps: Array<{ a: string; b: string; winner: "a" | "b" | "draw" }>; aRemaining: number; bRemaining: number } {
  const steps: Array<{ a: string; b: string; winner: "a" | "b" | "draw" }> = [];
  let ai = 0;
  let bi = 0;
  while (ai < deckA.length && bi < deckB.length) {
    const va = valueOf(deckA[ai]);
    const vb = valueOf(deckB[bi]);
    if (va > vb) {
      steps.push({ a: deckA[ai], b: deckB[bi], winner: "a" });
      bi++; // le champion A reste, B envoie le suivant
    } else if (vb > va) {
      steps.push({ a: deckA[ai], b: deckB[bi], winner: "b" });
      ai++;
    } else {
      steps.push({ a: deckA[ai], b: deckB[bi], winner: "draw" });
      ai++;
      bi++; // double K.O.
    }
  }
  return { steps, aRemaining: deckA.length - ai, bRemaining: deckB.length - bi };
}

/** Fiche d'un perso dans le gauntlet : qui il a battu, et s'il est tombé. */
export interface GauntletCardLog {
  cardId: string;
  /** Ids des persos adverses éliminés par CE perso (dans l'ordre). */
  defeatedIds: string[];
  /** Vrai si ce perso a fini par tomber (défaite ou double K.O.). */
  eliminated: boolean;
}

/**
 * Détaille le gauntlet du point de vue de `myDeck` : pour chacun de mes persos
 * (dans l'ordre du deck), la liste des persos adverses qu'il a battus avant de
 * tomber — ou avant la fin du combat s'il a survécu. Les persos jamais engagés
 * (combat terminé avant) figurent quand même, sans victime.
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
  }));
  let ai = 0;
  let bi = 0;
  while (ai < myDeck.length && bi < oppDeck.length) {
    const va = valueOf(myDeck[ai]);
    const vb = valueOf(oppDeck[bi]);
    if (va > vb) {
      log[ai].defeatedIds.push(oppDeck[bi]); // mon champion reste, l'adverse tombe
      bi++;
    } else if (vb > va) {
      log[ai].eliminated = true;
      ai++;
    } else {
      log[ai].eliminated = true; // double K.O.
      ai++;
      bi++;
    }
  }
  return log;
}

/** Survivants de chaque deck en mode hardcore (deckA/deckB ordonnés). */
export function gauntletSurvivors(
  deckA: string[],
  deckB: string[],
  roster: RosterMap,
): { aRemaining: number; bRemaining: number } {
  const { aRemaining, bRemaining } = runGauntlet(deckA, deckB, (id) =>
    battleValueOf(roster[id]),
  );
  return { aRemaining, bRemaining };
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
    return runGauntlet(myDeck, oppDeck, valueOf).steps.map((s) => ({
      mineId: s.a,
      theirsId: s.b,
      outcome: s.winner === "a" ? "win" : s.winner === "b" ? "lose" : "draw",
    }));
  }

  // Mode normal : 5 duels indépendants (perso i vs perso i).
  const length = Math.max(myDeck.length, oppDeck.length);
  return Array.from({ length }).map((_, i) => {
    const mineId = myDeck[i] ?? null;
    const theirsId = oppDeck[i] ?? null;
    const mv = mineId ? valueOf(mineId) : 0;
    const tv = theirsId ? valueOf(theirsId) : 0;
    return {
      mineId,
      theirsId,
      outcome: mv > tv ? "win" : mv < tv ? "lose" : "draw",
    };
  });
}
