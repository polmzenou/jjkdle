import type { Character } from "@/data/roster/characters";
import { archetypeOf, passiveOf, techniqueOf } from "./abilities";
import type { TowerConfig } from "./config";
import { booleanAttribute, deriveStats, toEnemySpec } from "./stats";
import { recruitChoices, runScore, type TowerRunState } from "./run";
import type {
  Archetype,
  CombatResult,
  FighterSpec,
  FighterStats,
  FloorPlan,
  NodeKind,
  Side,
} from "./types";
import type { ExpResult } from "@/lib/leaderboard/types";

/**
 * Vue client de la Tour — module PUR.
 *
 * Règle de sécurité qui gouverne tout ce fichier : **le client ne reçoit que
 * l'étage courant**, jamais la suite de la tour. Il a besoin des fiches
 * complètes des combattants de CET étage pour rejouer la simulation et animer,
 * et ces fiches ne sont dérivées que de données publiques (roster, notes,
 * attributs) — il n'y a donc rien à cacher dedans. Ce qui doit rester secret,
 * c'est la composition des étages suivants, et elle ne sort jamais d'ici.
 */

/** Une fiche affichable : ce qu'il faut pour dessiner une carte de personnage. */
export interface TowerCardView {
  id: string;
  name: string;
  image?: string;
  archetype: Archetype;
  hasDomain: boolean;
  stats: FighterStats;
  passive: { name: string; description: string };
  technique: { name: string; description: string; cost: number } | null;
}

/** Un membre de l'escouade : sa fiche + son usure. */
export interface SquadSlotView extends TowerCardView {
  hp: number;
  maxHp: number;
}

export interface TowerView {
  status: TowerRunState["status"];
  /** Tour du jour (classée) ou tour aléatoire (VIP/ADMIN, hors classement). */
  mode: "daily" | "random";
  attempt: number;
  floor: number;
  strate: number;
  kind: NodeKind;
  squad: SquadSlotView[];
  /** Ennemis de l'étage COURANT uniquement. */
  enemies: TowerCardView[];
  /** Starters du jour (`status: "starter"`) ou recrues proposées. */
  choices: TowerCardView[];
  fragments: number;
  enemiesKilled: number;
  bossesKilled: number;
  score: number;
  /** Un visiteur déconnecté joue, mais rien n'est enregistré. */
  isAuthed: boolean;
}

/**
 * Réponse d'une Server Action de la Tour.
 *
 * Défini ICI et non dans le fichier `actions.ts` : un module `"use server"` ne
 * peut exporter que des fonctions async (même raison d'être que
 * `lib/leaderboard/types.ts`).
 */
export type TowerActionResult =
  | { ok: true; view: TowerView; combat?: CombatResult; exp?: ExpResult }
  | { ok: false; error: string };

/** Fiche affichable d'un personnage, côté escouade ou choix. */
export function toCardView(
  character: Character,
  config: TowerConfig,
  stats?: FighterStats,
): TowerCardView {
  const resolved = stats ?? deriveStats(character, config);
  const archetype = archetypeOfCharacter(character, config);
  const passive = passiveOf(archetype);
  const technique = techniqueOf(archetype);

  return {
    id: character.id,
    name: character.name,
    image: character.image ?? undefined,
    archetype,
    hasDomain: hasDomainOf(character, config),
    stats: resolved,
    passive: { name: passive.name, description: passive.description },
    technique: technique
      ? {
          name: technique.name,
          description: technique.description,
          // Coût affiché, remise du passif comprise : c'est le nombre que le
          // joueur compare à sa jauge, il doit être celui qui sera débité.
          cost: Math.max(5, technique.cost - passive.techniqueDiscount),
        }
      : null,
  };
}

/**
 * Reconstruit une fiche de combat depuis une vue.
 *
 * Utilisé CÔTÉ CLIENT pour rejouer la simulation : les stats de la vue sont
 * déjà celles que le serveur utilisera (multiplicateur de boss compris), donc
 * les deux simulations partent bien du même point.
 */
export function toSpecFromView(card: TowerCardView, side: Side): FighterSpec {
  return {
    id: card.id,
    name: card.name,
    side,
    stats: card.stats,
    archetype: card.archetype,
    hasDomain: card.hasDomain,
  };
}

/** Vue complète d'une run à un instant donné. */
export function buildView(params: {
  state: TowerRunState;
  plan: FloorPlan;
  roster: Record<string, Character>;
  config: TowerConfig;
  mode: "daily" | "random";
  attempt: number;
  isAuthed: boolean;
  /** Starters du jour, uniquement quand la run attend ce choix. */
  starters?: Character[];
}): TowerView {
  const { state, plan, roster, config } = params;

  const squad: SquadSlotView[] = state.squad
    .map((member) => {
      const character = roster[member.characterId];
      if (!character) return null;
      return {
        ...toCardView(character, config),
        hp: member.hp,
        maxHp: member.maxHp,
      };
    })
    .filter((s): s is SquadSlotView => s !== null);

  const enemies =
    state.status === "combat"
      ? plan.enemyIds
          .map((id) => roster[id])
          .filter((c): c is Character => Boolean(c))
          .map((c) =>
            toCardView(
              c,
              config,
              toEnemySpec(c, plan.kind, config, state.squad.length).stats,
            ),
          )
      : [];

  return {
    status: state.status,
    mode: params.mode,
    attempt: params.attempt,
    floor: state.floor,
    strate: plan.strate,
    kind: plan.kind,
    squad,
    enemies,
    choices: buildChoices(params),
    fragments: state.fragments,
    enemiesKilled: state.enemiesKilled,
    bossesKilled: state.bossesKilled,
    score: runScore(state),
    isAuthed: params.isAuthed,
  };
}

function buildChoices(params: {
  state: TowerRunState;
  plan: FloorPlan;
  roster: Record<string, Character>;
  config: TowerConfig;
  starters?: Character[];
}): TowerCardView[] {
  const { state, plan, roster, config } = params;

  if (state.status === "starter") {
    return (params.starters ?? []).map((c) => toCardView(c, config));
  }

  if (state.status === "recruit") {
    return recruitChoices(state, plan)
      .map((id) => roster[id])
      .filter((c): c is Character => Boolean(c))
      .map((c) => toCardView(c, config));
  }

  return [];
}

function archetypeOfCharacter(
  character: Character,
  config: TowerConfig,
): Archetype {
  return archetypeOf(character, config.categoryArchetypes);
}

function hasDomainOf(character: Character, config: TowerConfig): boolean {
  return booleanAttribute(character, config.ultimateAttributeKey);
}
