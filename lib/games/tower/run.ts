import type { Character } from "@/data/roster/characters";
import type { CombatSetup } from "./combat";

import { canRecruit, type TowerRoster } from "./floors";
import type { EventOutcome, TowerEvent } from "./events";
import { modifiersOf, resolveItems, type TowerItem } from "./items";
import { HEAL_REWARD_PCT, type Reward } from "./rewards";
import { deriveStats, toEnemySpec, toFighterSpec } from "./stats";
import type { TowerConfig } from "./config";
import {
  SQUAD_SIZE,
  TOWER_FLOORS,
  grantsReward,
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
export type RunStatus =
  | "starter"
  /** La carte : deux nœuds proposés, le joueur choisit sa branche. */
  | "map"
  | "combat"
  | "reward"
  | "recruit"
  | "merchant"
  | "rest"
  | "event"
  | "won"
  | "lost";

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
  /** Objets ramassés, dans l'ordre. Ids de `Item`. */
  items: string[];
  /** L'objet de résurrection a-t-il déjà servi ? Une fois par run. */
  revived: boolean;
  /**
   * CHEMIN emprunté : l'index du nœud choisi à chaque étage franchi.
   *
   * C'est la seule chose à mémoriser d'une carte à embranchements — les deux
   * options de chaque étage se regénèrent depuis la graine, seul le choix du
   * joueur ne se devine pas.
   */
  path: number[];
}

/** Une action refusée, avec sa raison — jamais une exception (cf. `run.test.ts`). */
export type RunError =
  | "wrong-status"
  | "unknown-character"
  | "not-a-starter"
  | "already-in-squad"
  | "recruit-capped"
  | "squad-full"
  | "bad-slot"
  | "unknown-item"
  | "already-owned"
  | "too-expensive"
  | "bad-node"
  | "bad-choice";

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
    items: [],
    revived: false,
    path: [],
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
    status: "map",
    squad: [{ characterId: character.id, hp: stats.maxHp, maxHp: stats.maxHp }],
    seen: [character.id],
  });
}

/**
 * Remet d'aplomb un état de run relu en base.
 *
 * ⚠️ Indispensable, et pas une précaution de principe : `TowerRun.state` est un
 * blob JSON écrit par la version du code qui tournait au moment de la partie.
 * Ajouter un champ à `TowerRunState` — ce qu'ont fait les phases 2 (`items`) et
 * 3 (`path`) — casse donc TOUTES les runs en cours au moment du déploiement, et
 * le joueur ne peut même pas relancer : la reprise plante avant de lui rendre
 * la main.
 *
 * Tout champ absent reprend ici sa valeur par défaut. C'est le seul endroit à
 * mettre à jour quand l'état gagne un champ.
 */
export function normalizeRunState(raw: unknown): TowerRunState {
  const s = (raw ?? {}) as Partial<TowerRunState>;
  const base = startRun(typeof s.seed === "number" ? s.seed : 0);

  return {
    ...base,
    ...s,
    squad: Array.isArray(s.squad) ? s.squad : base.squad,
    seen: Array.isArray(s.seen) ? s.seen : base.seen,
    items: Array.isArray(s.items) ? s.items : base.items,
    path: Array.isArray(s.path) ? s.path : base.path,
    revived: Boolean(s.revived),
    floor: typeof s.floor === "number" ? s.floor : base.floor,
    fragments: typeof s.fragments === "number" ? s.fragments : base.fragments,
    enemiesKilled:
      typeof s.enemiesKilled === "number" ? s.enemiesKilled : base.enemiesKilled,
    bossesKilled:
      typeof s.bossesKilled === "number" ? s.bossesKilled : base.bossesKilled,
    status: s.status ?? base.status,
  };
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
  catalog: Record<string, TowerItem> = {},
): CombatSetup {
  const modifiers = modifiersOf(resolveItems(state.items, catalog));
  const squad = state.squad
    .map((m) => roster[m.characterId])
    .filter((c): c is Character => Boolean(c))
    .map((c) => toFighterSpec(c, "squad", config));

  // Les ennemis sont gonflés selon le type d'étage : c'est là qu'un boss
  // devient un boss (cf. `ENEMY_HP_MULT`).
  const ids = [...plan.enemyIds];

  // Objet « Doigt de Sukuna » : la puissance attire ce qui rôde. On duplique le
  // dernier ennemi plutôt que d'en tirer un nouveau — la composition d'un étage
  // ne dépend QUE de la graine, elle doit rester régénérable sans l'inventaire.
  const extra = Math.max(0, Math.min(2, modifiers.ENNEMI_SUPP));
  for (let i = 0; i < extra && ids.length > 0; i += 1) {
    ids.push(ids[ids.length - 1]);
  }

  const enemies = ids
    .map((id) => roster[id])
    .filter((c): c is Character => Boolean(c))
    .map((c) => toEnemySpec(c, plan.kind, config, state.squad.length));

  return {
    squad,
    enemies,
    squadHp: state.squad.map((m) => m.hp),
    modifiers,
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
  catalog: Record<string, TowerItem> = {},
): TowerRunState {
  const floor = state.floor;
  const modifiers = modifiersOf(resolveItems(state.items, catalog));

  const survivors: SquadMember[] = [];
  const fallen: string[] = [];
  let revived = state.revived;

  state.squad.forEach((member, index) => {
    const outcome = result.squad[index];
    if (!outcome) {
      survivors.push(member);
      return;
    }
    if (outcome.alive) {
      survivors.push({ ...member, hp: outcome.hp });
      return;
    }

    // Objet « Cœur de Rika » : le PREMIER des tiens à tomber se relève, une
    // seule fois de toute la run. Uniquement après un combat GAGNÉ —
    // ressusciter face à des ennemis encore debout ne relancerait rien.
    if (result.victory && !revived && modifiers.REVIVE_UNE_FOIS > 0) {
      revived = true;
      survivors.push({
        ...member,
        hp: Math.max(
          1,
          Math.round((member.maxHp * modifiers.REVIVE_UNE_FOIS) / 100),
        ),
      });
      return;
    }

    fallen.push(member.characterId);
  });

  const next: TowerRunState = {
    ...state,
    squad: survivors,
    revived,
    enemiesKilled: state.enemiesKilled + result.enemiesKilled,
    bossesKilled:
      state.bossesKilled + (plan.kind === "boss" && result.victory ? 1 : 0),
    fragments:
      state.fragments + fragmentsFor(plan, result, modifiers.FRAGMENTS_PCT),
    seen: mergeSeen(state.seen, fallen),
  };

  // L'escouade décimée arrête la run, même si le combat a été « gagné » par un
  // shikigami : ce sont les trois slots qui font la run, pas les invocations.
  if (survivors.length === 0) return { ...next, status: "lost" };
  if (!result.victory) return { ...next, status: "lost" };
  if (floor >= TOWER_FLOORS) return { ...next, status: "won" };

  // La récompense ne suit que la voie DIRECTE : une branche à prélude a déjà
  // versé son gain avant le combat. Un gain par étage, pas deux.
  if (!grantsReward(plan)) return advance(next);
  return { ...next, status: "reward" };
}

/**
 * Fragments gagnés sur un étage. Monnaie INTERNE : elle meurt avec la run, ce
 * qui interdit d'en faire une ferme à monnaie pour la boutique du site.
 */
function fragmentsFor(
  plan: FloorPlan,
  result: CombatResult,
  bonusPct: number,
): number {
  if (!result.victory) return 0;
  const base =
    result.enemiesKilled * 5 +
    (plan.kind === "boss" ? 40 : plan.kind === "elite" ? 15 : 0);
  return Math.round(base * (1 + bonusPct / 100));
}

// ---------------------------------------------------------------------------
// Recompense
// ---------------------------------------------------------------------------

/**
 * Applique la récompense choisie après un étage gagné.
 *
 * Trois natures (objet / fragments / soin) plutôt que trois objets : le choix
 * intéressant est « de quoi ai-je le plus besoin », pas « lequel de ces trois ».
 * Le soin est un vrai concurrent, puisque les PV ne se régénèrent jamais seuls.
 */
export function takeReward(
  state: TowerRunState,
  plan: FloorPlan,
  reward: Reward,
): RunOutcome {
  if (state.status !== "reward") return fail("wrong-status");

  let next: TowerRunState;

  if (reward.kind === "item") {
    if (state.items.includes(reward.item.id)) return fail("already-owned");
    next = { ...state, items: [...state.items, reward.item.id] };
  } else if (reward.kind === "fragments") {
    next = { ...state, fragments: state.fragments + reward.amount };
  } else {
    next = { ...state, squad: healSquad(state.squad, reward.pct) };
  }

  return ok(advance(next));
}

/**
 * Ajuste les PV de toute l'escouade d'un pourcentage de leur maximum.
 *
 * Un pourcentage NÉGATIF blesse : c'est ce qui permet aux évènements de faire
 * payer un choix sans passer par un combat. Le résultat reste borné à
 * [0, maxHp] — un membre à 0 PV est traité comme tombé par l'appelant.
 */
function healSquad(squad: SquadMember[], pct: number): SquadMember[] {
  return squad.map((m) => ({
    ...m,
    hp: Math.max(0, Math.min(m.maxHp, m.hp + Math.round((m.maxHp * pct) / 100))),
  }));
}

// ---------------------------------------------------------------------------
// Marchand
// ---------------------------------------------------------------------------

/** Achète un objet à l'étal. */
export function buyItem(
  state: TowerRunState,
  itemId: string,
  price: number,
): RunOutcome {
  if (state.status !== "merchant") return fail("wrong-status");
  if (state.items.includes(itemId)) return fail("already-owned");
  if (state.fragments < price) return fail("too-expensive");

  return ok({
    ...state,
    fragments: state.fragments - price,
    items: [...state.items, itemId],
  });
}

/** Achète un soin d'escouade au marchand. */
export function buyHeal(
  state: TowerRunState,
  price: number,
  pct: number,
): RunOutcome {
  if (state.status !== "merchant") return fail("wrong-status");
  if (state.fragments < price) return fail("too-expensive");

  return ok({
    ...state,
    fragments: state.fragments - price,
    squad: healSquad(state.squad, pct),
  });
}

/** Quitte l'étal — pour aller au combat de l'étage, pas à l'étage suivant. */
export function leaveMerchant(state: TowerRunState): RunOutcome {
  if (state.status !== "merchant") return fail("wrong-status");
  return ok(toFight(state));
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
    toFight({
      ...state,
      squad,
      seen: mergeSeen(state.seen, [character.id, ...sacrificed]),
    }),
  );
}

/** Passer son tour : toujours permis, y compris avec un slot libre. */
export function skipRecruit(state: TowerRunState): RunOutcome {
  if (state.status !== "recruit") return fail("wrong-status");
  return ok(toFight(state));
}

/**
 * Monte d'un étage et repasse par la CARTE.
 *
 * L'état ne décide plus du type de l'étage suivant : il rend la main au joueur,
 * qui choisit sa branche. C'est tout ce qui change entre une tour linéaire et
 * une tour à embranchements — le reste de la machine est inchangé.
 */
function advance(state: TowerRunState): TowerRunState {
  if (state.floor >= TOWER_FLOORS) return { ...state, status: "won" };
  return { ...state, floor: state.floor + 1, status: "map" };
}

// ──────────────────────────────────────────────────────────────────────────
// Carte
// ──────────────────────────────────────────────────────────────────────────

/**
 * Écran d'entrée d'une branche.
 *
 * Une branche sans prélude va DIRECTEMENT au combat. Une branche avec prélude
 * ouvre l'écran du bonus — mais le combat vient juste après, quoi qu'il arrive :
 * aucun prélude ne fait monter d'étage à lui seul.
 */
function statusForNode(plan: FloorPlan): RunStatus {
  if (!plan.prelude) return "combat";
  if (plan.prelude === "recruit") return "recruit";
  if (plan.prelude === "merchant") return "merchant";
  if (plan.prelude === "rest") return "rest";
  return "event";
}

/**
 * Fin d'un prélude : on enchaîne sur le COMBAT de l'étage, jamais sur l'étage
 * suivant. C'est la règle « un combat par étage », appliquée en un seul point.
 */
function toFight(state: TowerRunState): TowerRunState {
  return { ...state, status: "combat" };
}

/**
 * Emprunte une des branches de l'étage courant.
 *
 * L'index choisi est mémorisé dans `path` : c'est la seule information d'une
 * carte à embranchements qui ne se régénère pas depuis la graine.
 */
export function chooseNode(
  state: TowerRunState,
  options: readonly FloorPlan[],
  index: number,
): RunOutcome {
  if (state.status !== "map") return fail("wrong-status");

  const node = options[Math.trunc(index)];
  if (!node) return fail("bad-node");

  // Le chemin doit rester DENSE : écrire directement à `path[floor - 1]` sur un
  // tableau plus court crée des trous, que `JSON` sérialise en `undefined` et
  // que Prisma refuse (« Can not use `undefined` value within array »). Une run
  // reprise à un étage avancé tombait donc en erreur au premier choix.
  const path = Array.from(
    { length: Math.max(state.path.length, state.floor) },
    (_, i) => state.path[i] ?? 0,
  );
  path[state.floor - 1] = Math.trunc(index);

  return ok({ ...state, path, status: statusForNode(node) });
}

// ──────────────────────────────────────────────────────────────────────────
// Repos
// ──────────────────────────────────────────────────────────────────────────

/**
 * Soin d'un nœud de repos.
 *
 * Généreux, et c'est voulu : renoncer à un combat, c'est renoncer à ses
 * fragments, à son objet et à l'XP de l'étage. Il faut que ça vaille la peine,
 * sinon la branche calme n'est jamais choisie et la carte n'a plus d'intérêt.
 */
export const REST_HEAL_PCT = 40;

export function takeRest(state: TowerRunState): RunOutcome {
  if (state.status !== "rest") return fail("wrong-status");
  return ok(toFight({ ...state, squad: healSquad(state.squad, REST_HEAL_PCT) }));
}

// ──────────────────────────────────────────────────────────────────────────
// Évènements
// ──────────────────────────────────────────────────────────────────────────

/**
 * Applique l'issue d'un évènement.
 *
 * `grantedItem` est résolu par l'appelant (il a le catalogue et la graine) :
 * cette fonction reste pure et ignore tout du tirage. Une issue qui promettait
 * un objet mais n'a rien trouvé à donner est convertie en fragments — un
 * évènement ne doit jamais ne rien faire du tout.
 */
export function resolveEvent(
  state: TowerRunState,
  outcome: EventOutcome,
  grantedItemId: string | null,
): RunOutcome {
  if (state.status !== "event") return fail("wrong-status");

  let next = { ...state };

  if (outcome.healPct) {
    next = { ...next, squad: healSquad(next.squad, outcome.healPct) };
  }

  let fragments = next.fragments + (outcome.fragments ?? 0);

  if (outcome.item) {
    if (grantedItemId && !next.items.includes(grantedItemId)) {
      next = { ...next, items: [...next.items, grantedItemId] };
    } else {
      // Rien à donner : on compense plutôt que de servir une issue vide.
      fragments += 40;
    }
  }

  // Les fragments ne descendent jamais sous zéro : une issue coûteuse prend ce
  // qu'il y a, elle ne met pas le joueur en dette.
  next = { ...next, fragments: Math.max(0, fragments) };

  // Une escouade entièrement fauchée par un évènement met fin à la run —
  // `healSquad` peut retirer des PV (soin négatif).
  if (next.squad.every((m) => m.hp <= 0)) {
    return ok({ ...next, squad: [], status: "lost" });
  }

  return ok(toFight(next));
}

/** L'évènement choisi est-il jouable ? (garde serveur) */
export function eventChoiceOf(
  event: TowerEvent,
  index: number,
): EventOutcome | null {
  return event.choices[Math.trunc(index)]?.outcome ?? null;
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

/** Soin de la récompense « repos », ré-exporté pour l'interface. */
export { HEAL_REWARD_PCT };

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
