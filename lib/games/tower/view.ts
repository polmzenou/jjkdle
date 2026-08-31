import type { Character } from "@/data/roster/characters";
import { archetypeOf, passiveOf, techniqueOf } from "./abilities";
import type { TowerConfig } from "./config";
import { booleanAttribute, deriveStats, toEnemySpec } from "./stats";
import { recruitChoices, runScore, type TowerRunState } from "./run";
import { describeItem, itemRarityStyle, resolveItems, type TowerItem } from "./items";
import { eventFor, type TowerEvent } from "./events";
import { REST_HEAL_PCT } from "./run";
import {
  MERCHANT_HEAL_PCT,
  MERCHANT_HEAL_PRICE,
  rollRewards,
  rollShop,
  type Reward,
} from "./rewards";
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

/** Un objet tel qu'il s'affiche : sa fiche + son effet en une ligne lisible. */
export interface ItemView {
  id: string;
  name: string;
  description: string;
  image?: string;
  rarity: string;
  rarityLabel: string;
  color: string;
  /** Effets rendus en français, ex. « +15 % de dégâts · −8 % de PV max ». */
  effect: string;
}

/** Une option de fin d'étage. */
export type RewardView =
  | { kind: "item"; item: ItemView }
  | { kind: "fragments"; amount: number }
  | { kind: "heal"; pct: number };

/** Une ligne de l'étal du marchand. */
export interface ShopOfferView {
  item: ItemView;
  price: number;
  /** Le joueur a-t-il de quoi payer ? Calculé serveur pour éviter tout écart. */
  affordable: boolean;
}

/** Une branche proposée sur la carte. Toutes mènent à un combat. */
export interface NodeOptionView {
  index: number;
  /** Le combat de la branche. */
  kind: NodeKind;
  /** Bonus qui précède le combat, ou `null` pour la voie directe. */
  prelude: NodeKind | null;
  /** Libellé court affiché sur la carte. */
  label: string;
  /** Ce que la branche promet, en une phrase. */
  hint: string;
  /** Cette branche donne-t-elle droit à la récompense d'après-combat ? */
  rewarded: boolean;
  /**
   * Adversaires de la branche — fiches COMPLÈTES, stats de l'étage comprises.
   *
   * Pas seulement un portrait : c'est sur ces chiffres qu'on décide d'affronter
   * une élite ou de prendre le détour, et les cacher reviendrait à faire
   * choisir à l'aveugle.
   */
  enemies: TowerCardView[];
}

/** Un évènement en cours, avec ses deux issues possibles. */
export interface EventView {
  title: string;
  text: string;
  choices: { index: number; label: string }[];
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
  /** Options de récompense (`status: "reward"`). */
  rewards: RewardView[];
  /** Étal du marchand (`status: "merchant"`). */
  shop: ShopOfferView[];
  /** Prix et effet du soin vendu à l'étal. */
  healOffer: { price: number; pct: number; affordable: boolean };
  /** Objets déjà ramassés — l'inventaire est visible à tout moment. */
  inventory: ItemView[];
  /** Branches proposées (`status: "map"`). */
  options: NodeOptionView[];
  /** Évènement en cours (`status: "event"`). */
  event: EventView | null;
  /** Soin d'un nœud de repos, pour l'afficher sans le coder en dur. */
  restPct: number;
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
  | {
      ok: true;
      view: TowerView;
      combat?: CombatResult;
      exp?: ExpResult;
      /** Message à afficher après coup (issue d'une rencontre, par exemple). */
      notice?: string;
    }
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
  /** Catalogue d'objets de l'univers. */
  items?: TowerItem[];
  itemsById?: Record<string, TowerItem>;
  /** Catalogue d'évènements de l'univers. */
  events?: TowerEvent[];
  /** Les branches de l'étage courant, pour l'écran de carte. */
  options?: FloorPlan[];
}): TowerView {
  const { state, plan, roster, config } = params;
  const catalog = params.items ?? [];
  const byId = params.itemsById ?? {};

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
    rewards:
      state.status === "reward"
        ? rollRewards(state.seed, state.floor, plan.kind, catalog, state.items).map(
            toRewardView,
          )
        : [],
    shop:
      state.status === "merchant"
        ? rollShop(state.seed, state.floor, catalog, state.items).map((o) => ({
            item: toItemView(o.item),
            price: o.price,
            affordable: state.fragments >= o.price,
          }))
        : [],
    healOffer: {
      price: MERCHANT_HEAL_PRICE,
      pct: MERCHANT_HEAL_PCT,
      affordable: state.fragments >= MERCHANT_HEAL_PRICE,
    },
    inventory: resolveItems(state.items, byId).map(toItemView),
    options:
      state.status === "map"
        ? (params.options ?? []).map((option, index) =>
            toNodeView(option, index, roster, config, state.squad.length),
          )
        : [],
    event:
      state.status === "event"
        ? toEventView(eventFor(params.events ?? [], plan.eventIndex))
        : null,
    restPct: REST_HEAL_PCT,
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

/** Fiche affichable d'un objet. */
export function toItemView(item: TowerItem): ItemView {
  const style = itemRarityStyle(item.rarity);
  return {
    id: item.id,
    name: item.name,
    description: item.description,
    image: item.image,
    rarity: item.rarity,
    rarityLabel: style.label,
    color: style.color,
    effect: describeItem(item),
  };
}

function toRewardView(reward: Reward): RewardView {
  if (reward.kind === "item") return { kind: "item", item: toItemView(reward.item) };
  return reward;
}

/** Libellé et promesse d'un type de nœud, tels que le joueur les lit. */
const NODE_COPY: Record<NodeKind, { label: string; hint: string }> = {
  combat: { label: "Combat", hint: "Un ou plusieurs adversaires." },
  elite: { label: "Élite", hint: "Un adversaire de la strate supérieure." },
  boss: { label: "Boss", hint: "Le gardien de la strate. Pas de détour possible." },
  recruit: { label: "Renfort", hint: "Un personnage à faire entrer dans l'escouade" },
  merchant: { label: "Marchand", hint: "De quoi dépenser tes fragments" },
  rest: { label: "Repos", hint: "Un moment pour souffler" },
  event: { label: "Rencontre", hint: "Une situation, deux issues" },
};

/**
 * Fiche d'une branche.
 *
 * Le libellé dit le MARCHÉ, pas seulement le contenu : « Repos puis combat »
 * plutôt que « Repos », et la promesse rappelle ce qu'on gagne ou ce qu'on
 * cède. Sans ça, la branche bonus passerait pour un raccourci gratuit alors
 * qu'elle coûte la récompense d'après-combat.
 */
function toNodeView(
  option: FloorPlan,
  index: number,
  roster: Record<string, Character>,
  config: TowerConfig,
  squadSize: number,
): NodeOptionView {
  const fight = NODE_COPY[option.kind];
  const prelude = option.prelude ? NODE_COPY[option.prelude] : null;

  return {
    index,
    kind: option.kind,
    prelude: option.prelude,
    label: prelude ? `${prelude.label} puis combat` : fight.label,
    hint: prelude
      ? `${prelude.hint}, puis le combat de l'étage — mais pas de butin après.`
      : option.kind === "boss"
        ? fight.hint
        : `${fight.hint} Butin à la clé.`,
    rewarded: option.prelude === null,
    // On montre les adversaires, et avec les stats de CET étage (multiplicateur
    // d'élite ou de boss compris) : choisir sa branche à l'aveugle ne serait
    // pas un choix, juste un tirage.
    enemies: option.enemyIds
      .map((id) => roster[id])
      .filter((c): c is Character => Boolean(c))
      .map((c) =>
        toCardView(c, config, toEnemySpec(c, option.kind, config, squadSize).stats),
      ),
  };
}

function toEventView(event: TowerEvent | null): EventView | null {
  if (!event) return null;
  return {
    title: event.title,
    text: event.text,
    choices: event.choices.map((c, index) => ({ index, label: c.label })),
  };
}
