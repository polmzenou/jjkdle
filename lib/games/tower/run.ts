import type { Character } from "@/data/roster/characters";
import type { CombatSetup } from "./combat";
import { NO_MODIFIERS } from "./effects";
import { canRecruit, isRecruitFloor, type TowerRoster } from "./floors";
import { deriveStats, toEnemySpec, toFighterSpec } from "./stats";
import type { TowerConfig } from "./config";
import {
  SQUAD_SIZE,
  TOWER_FLOORS,
  type CombatResult,
  type FloorPlan,
} from "./types";

/**
 * Machine d'état d'une run — module PUR.
 *
 * Toutes les transitions sont des fonctions `(état, action) => état` sans effet
 * de bord : c'est ce qui permet au serveur d'être l'autorité (il rejoue la même
 * transition que le client) et aux tests de couvrir la run sans base de données.
 *
 * L'état est volontairement PLAT et sérialisable en JSON : il est écrit tel quel
 * dans `TowerRun.state` à chaque étage. On n'y met donc que des identifiants et
 * des entiers — jamais un personnage résolu, jamais une image. Cible : moins de
 * 3 ko par run.
 */

/** Un membre de l'escouade. Les PV NE SONT PAS restaurés entre les étages. */
export interface SquadMember {
  characterId: string;
  hp: number;
  maxHp: number;
}

/**
 * Où en est la run. `starter` et `recruit` sont des états d'ATTENTE : la run ne
 * peut pas avancer tant que le joueur n'a pas choisi.
 */
export type RunStatus = "starter" | "combat" | "recruit" | "won" | "lost";

export interface TowerRunState {
  seed: number;
  /** Étage courant, 1…TOWER_FLOORS. */
  floor: number;
  status: RunStatus;
  squad: SquadMember[];
  fragments: number;
  enemiesKilled: number;
  bossesKilled: number;
  /**
   * Personnages déjà passés par l'escouade, sacrifiés compris. Un personnage
   * cédé ne revient pas au vivier : le sacrifice doit coûter.
   */
  seen: string[];
}

/** Une action refusée, avec sa raison — jamais une exception (cf. `run.test.ts`). */
export type RunError =
  | "wrong-status"
  | "unknown-character"
  | "not-a-starter"
  | "already-in-squad"
  | "recruit-capped"
  | "squad-full"
  | "bad-slot";

export type RunOutcome =
  | { ok: true; state: TowerRunState }
  | { ok: false; error: RunError };

// ──────────────────────────────────────────────────────────────────────────
// Démarrage
// ──────────────────────────────────────────────────────────────────────────

export function startRun(seed: number): TowerRunState {
  return {
    seed,
    floor: 1,
    status: "starter",
    squad: [],
    fragments: 0,
    enemiesKilled: 0,
    bossesKilled: 0,
    seen: [],
  };
}

/**
 * Le joueur prend UN des trois starters du jour. L'escouade démarre donc à 1
 * sur 3 : les deux autres slots sont la récompense des premiers étages.
 *
 * L'appelant a la responsabilité de vérifier que `character` est bien un
 * starter du jour (`isDailyStarter`) — cette fonction ne connaît pas la date.
 */
export function chooseStarter(
  state: TowerRunState,
  character: Character,
  config: TowerConfig,
): RunOutcome {
  if (state.status !== "starter") return fail("wrong-status");

  const stats = deriveStats(character, config);
  return ok({
    ...state,
    status: "combat",
    squad: [{ characterId: character.id, hp: stats.maxHp, maxHp: stats.maxHp }],
    seen: [character.id],
  });
}

// ──────────────────────────────────────────────────────────────────────────
// Combat
// ──────────────────────────────────────────────────────────────────────────

/**
 * Traduit l'état de run en entrée de combat.
 *
 * Point de passage UNIQUE entre la run et le moteur : le moteur ne voit jamais
 * un `Character`, seulement des `FighterSpec`. Les PV courants sont transmis
 * tels quels — un personnage entame l'étage suivant dans l'état où il a fini le
 * précédent, et c'est ce qui fait de l'usure une ressource.
 */
export function buildCombatSetup(
  state: TowerRunState,
  plan: FloorPlan,
  roster: Record<string, Character>,
  config: TowerConfig,
): CombatSetup {
  const squad = state.squad
    .map((m) => roster[m.characterId])
    .filter((c): c is Character => Boolean(c))
    .map((c) => toFighterSpec(c, "squad", config));

  // Les ennemis sont gonflés selon le type d'étage : c'est là qu'un boss
  // devient un boss (cf. `ENEMY_HP_MULT`).
  const enemies = plan.enemyIds
    .map((id) => roster[id])
    .filter((c): c is Character => Boolean(c))
    .map((c) => toEnemySpec(c, plan.kind, config));

  return {
    squad,
    enemies,
    squadHp: state.squad.map((m) => m.hp),
    // Phase 1 : aucun objet en jeu. La signature les accepte déjà pour que
    // brancher le roster Item en phase 2 ne change pas cette fonction.
    modifiers: NO_MODIFIERS,
  };
}

/**
 * Applique l'issue d'un combat à la run.
 *
 * Un personnage tombé est retiré de l'escouade et **ne revient pas** : c'est ce
 * qui donne du poids aux interventions. On garde sa trace dans `seen` pour ne
 * pas le reproposer au recrutement.
 *
 * L'étage courant est lu dans **l'état**, jamais dans le plan : le plan décrit
 * un contenu, l'état dit où on en est. Croiser les deux sources ferait sauter
 * ou bégayer la run le jour où elles divergeraient, et en silence.
 */
export function resolveFloor(
  state: TowerRunState,
  plan: FloorPlan,
  result: CombatResult,
): TowerRunState {
  const floor = state.floor;
  const survivors: SquadMember[] = [];
  const fallen: string[] = [];

  state.squad.forEach((member, index) => {
    const outcome = result.squad[index];
    if (!outcome) {
      survivors.push(member);
      return;
    }
    if (outcome.alive) survivors.push({ ...member, hp: outcome.hp });
    else fallen.push(member.characterId);
  });

  const next: TowerRunState = {
    ...state,
    squad: survivors,
    enemiesKilled: state.enemiesKilled + result.enemiesKilled,
    bossesKilled:
      state.bossesKilled + (plan.kind === "boss" && result.victory ? 1 : 0),
    fragments: state.fragments + fragmentsFor(plan, result),
    seen: mergeSeen(state.seen, fallen),
  };

  // L'escouade décimée arrête la run, même si le combat a été « gagné » par un
  // shikigami : ce sont les trois slots qui font la run, pas les invocations.
  if (survivors.length === 0) return { ...next, status: "lost" };
  if (!result.victory) return { ...next, status: "lost" };
  if (floor >= TOWER_FLOORS) return { ...next, status: "won" };

  if (isRecruitFloor(floor) && plan.recruitIds.length > 0) {
    return { ...next, status: "recruit" };
  }

  return { ...next, floor: floor + 1, status: "combat" };
}

/** Fragments gagnés sur un étage. Monnaie INTERNE : elle meurt avec la run. */
function fragmentsFor(plan: FloorPlan, result: CombatResult): number {
  if (!result.victory) return 0;
  const base = result.enemiesKilled * 5;
  if (plan.kind === "boss") return base + 40;
  if (plan.kind === "elite") return base + 15;
  return base;
}

// ──────────────────────────────────────────────────────────────────────────
// Recrutement
// ──────────────────────────────────────────────────────────────────────────

/**
 * Les trois candidats effectivement présentés.
 *
 * L'étage en propose cinq (`RECRUIT_CANDIDATES`) ; on écarte ici ceux déjà
 * passés par l'escouade et on garde les trois premiers. Filtrer plutôt que
 * re-tirer préserve le déterminisme : deux joueurs sur la même tour du jour
 * verront la même liste s'ils ont fait les mêmes choix.
 */
export function recruitChoices(
  state: TowerRunState,
  plan: FloorPlan,
): string[] {
  const inSquad = new Set(state.squad.map((m) => m.characterId));
  return plan.recruitIds
    .filter((id) => !inSquad.has(id) && !state.seen.includes(id))
    .slice(0, 3);
}

/**
 * Recrute un personnage.
 *
 * Tant qu'un slot est libre, c'est gratuit. Une fois les trois slots pleins,
 * `sacrificeSlot` devient OBLIGATOIRE : le personnage cédé est perdu
 * définitivement — exactement comme s'il était mort — et le nouveau venu arrive
 * à PV pleins. C'est le deuxième moment de décision du jeu, après le timing des
 * interventions : sacrifier un vétéran blessé pour un frais n'a rien d'évident.
 */
export function recruit(
  state: TowerRunState,
  plan: FloorPlan,
  character: Character,
  tower: TowerRoster,
  config: TowerConfig,
  sacrificeSlot?: number,
): RunOutcome {
  if (state.status !== "recruit") return fail("wrong-status");
  if (!recruitChoices(state, plan).includes(character.id)) {
    return fail("unknown-character");
  }
  if (state.squad.some((m) => m.characterId === character.id)) {
    return fail("already-in-squad");
  }
  if (!canRecruit(tower, character.id, plan.strate)) {
    return fail("recruit-capped");
  }

  const stats = deriveStats(character, config);
  const arrival: SquadMember = {
    characterId: character.id,
    hp: stats.maxHp,
    maxHp: stats.maxHp,
  };

  let squad: SquadMember[];
  let sacrificed: string[] = [];

  if (state.squad.length < SQUAD_SIZE) {
    squad = [...state.squad, arrival];
  } else {
    if (
      typeof sacrificeSlot !== "number" ||
      !Number.isInteger(sacrificeSlot) ||
      sacrificeSlot < 0 ||
      sacrificeSlot >= state.squad.length
    ) {
      return fail("bad-slot");
    }
    sacrificed = [state.squad[sacrificeSlot].characterId];
    squad = state.squad.map((m, i) => (i === sacrificeSlot ? arrival : m));
  }

  return ok(
    advance({
      ...state,
      squad,
      seen: mergeSeen(state.seen, [character.id, ...sacrificed]),
    }),
  );
}

/** Passer son tour : toujours permis, y compris avec un slot libre. */
export function skipRecruit(state: TowerRunState): RunOutcome {
  if (state.status !== "recruit") return fail("wrong-status");
  return ok(advance(state));
}

/** Monte d'un étage après un nœud de recrutement. */
function advance(state: TowerRunState): TowerRunState {
  if (state.floor >= TOWER_FLOORS) return { ...state, status: "won" };
  return { ...state, floor: state.floor + 1, status: "combat" };
}

// ──────────────────────────────────────────────────────────────────────────
// Score
// ──────────────────────────────────────────────────────────────────────────

/**
 * Score d'une run terminée.
 *
 * Les PV restants départagent les ex æquo : à étage égal, l'escouade la moins
 * abîmée l'emporte. Le classement de la Tour du Jour, lui, trie d'abord sur le
 * NOMBRE D'ESSAIS (cf. §11 du doc) — ce score n'en est que le départage.
 */
export function runScore(state: TowerRunState): number {
  const reached = state.status === "won" ? TOWER_FLOORS : state.floor;
  const hp = state.squad.reduce((sum, m) => sum + m.hp, 0);
  return (
    reached * 100 +
    state.enemiesKilled * 10 +
    state.bossesKilled * 250 +
    Math.round(hp)
  );
}

/** Étage réellement atteint (le sommet compte pour TOWER_FLOORS). */
export function reachedFloor(state: TowerRunState): number {
  return state.status === "won" ? TOWER_FLOORS : state.floor;
}

/** La run est-elle finie ? */
export function isFinished(state: TowerRunState): boolean {
  return state.status === "won" || state.status === "lost";
}

// ──────────────────────────────────────────────────────────────────────────
// Utilitaires
// ──────────────────────────────────────────────────────────────────────────

function ok(state: TowerRunState): RunOutcome {
  return { ok: true, state };
}

function fail(error: RunError): RunOutcome {
  return { ok: false, error };
}

function mergeSeen(seen: string[], added: string[]): string[] {
  const out = [...seen];
  for (const id of added) {
    if (!out.includes(id)) out.push(id);
  }
  return out;
}
