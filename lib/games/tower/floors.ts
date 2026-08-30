import type { Character } from "@/data/roster/characters";
import { battleValueOf } from "@/lib/games/battle/battleValues";
import { mulberry32 } from "@/lib/games/battle/rng";
import { passiveOf, archetypeOf } from "./abilities";
import type { TowerConfig } from "./config";
import {
  FLOORS_PER_STRATE,
  STRATE_COUNT,
  TOWER_FLOORS,
  type FloorPlan,
  type NodeKind,
} from "./types";

/**
 * Structure de la tour — module PUR et DÉTERMINISTE.
 *
 * L'idée fondatrice : **les étages sont dérivés de l'attribut ORDINAL d'arc de
 * l'univers**, déjà rempli en /admin pour JJKdle. L'ordre chronologique du
 * récit sert à la fois d'échelle de puissance et de fil narratif — on monte
 * l'histoire dans l'ordre. Rien n'est écrit à la main, et un univers qui a son
 * propre attribut d'arc obtient sa tour sans une ligne de code.
 *
 * Tout ce fichier est une fonction de `(seed, roster)` : le serveur peut
 * régénérer la tour à volonté sans rien stocker, et n'envoie au client que
 * l'étage courant — jamais la suite (§14 du doc).
 */

/**
 * Plafond de `battleValue` recrutable par strate. C'est le curseur qui fait que
 * Gojo et Sukuna n'apparaissent qu'après 15 étages de survie : les rencontrer
 * est une récompense de fin de run, pas une ouverture.
 */
export const RECRUIT_CAPS: readonly number[] = [35, 55, 80, Infinity];

/** Nombre d'ennemis par étage, par strate (bornes incluses). */
const ENEMY_COUNT: ReadonlyArray<readonly [number, number]> = [
  [1, 1],
  [1, 2],
  [2, 2],
  [2, 3],
];

/** Candidats proposés à un nœud de recrutement, avant filtrage par l'escouade. */
export const RECRUIT_CANDIDATES = 5;

/** Un personnage prêt à être placé dans la tour. */
export interface TowerEntry {
  id: string;
  /** Rang de son arc dans l'ordre du récit. */
  arcIndex: number;
  value: number;
  /** Passif « Polyvalence » : ignore le plafond de recrutement. */
  ignoresRecruitCap: boolean;
}

export interface TowerRoster {
  /** Ids par strate, triés par `battleValue` CROISSANTE. */
  byStrate: string[][];
  entries: Record<string, TowerEntry>;
}

// ──────────────────────────────────────────────────────────────────────────
// Découpage en strates
// ──────────────────────────────────────────────────────────────────────────

/**
 * Strate d'un arc, par découpage proportionnel de l'échelle du récit.
 *
 * Proportionnel et non par paquets fixes : JJK compte 12 arcs (3 par strate),
 * un autre anime en comptera 8 ou 20, et la tour doit rester à 4 strates dans
 * tous les cas. Avec 12 arcs, ce calcul redonne exactement le découpage du doc.
 */
export function strateOfArc(arcIndex: number, arcCount: number): number {
  if (arcCount <= 0) return 0;
  const clamped = Math.max(0, Math.min(arcCount - 1, arcIndex));
  const strate = Math.floor((clamped * STRATE_COUNT) / arcCount);
  return Math.min(STRATE_COUNT - 1, strate);
}

/** Strate d'un étage (1-indexé). */
export function strateOfFloor(floor: number): number {
  const index = Math.floor((floor - 1) / FLOORS_PER_STRATE);
  return Math.max(0, Math.min(STRATE_COUNT - 1, index));
}

/** Un étage est-il un boss de strate ? (5, 10, 15, 20) */
export function isBossFloor(floor: number): boolean {
  return floor % FLOORS_PER_STRATE === 0;
}

/**
 * Un étage propose-t-il un recrutement ?
 *
 * Tous les 3 étages et à chaque boss — soit 8 occasions sur la tour. Assez pour
 * remplir les 3 slots ET pour que la mécanique de SACRIFICE se présente
 * plusieurs fois : c'est elle, et pas l'accumulation, qui fait la décision.
 * Le sommet est exclu : y recruter n'aurait plus d'usage.
 */
export function isRecruitFloor(floor: number): boolean {
  if (floor >= TOWER_FLOORS) return false;
  return floor % 3 === 0 || floor % FLOORS_PER_STRATE === 0;
}

// ──────────────────────────────────────────────────────────────────────────
// Construction du vivier
// ──────────────────────────────────────────────────────────────────────────

/**
 * Range le roster par strate.
 *
 * ⚠️ Un personnage SANS arc renseigné est EXCLU, jamais rangé par défaut dans
 * la strate I. Sans cette règle, tout personnage dont l'attribut n'a pas encore
 * été saisi en admin — Sukuna compris — se retrouverait à l'étage 2. C'est la
 * même garde d'éligibilité que le pool quotidien de JJKdle.
 */
export function buildTowerRoster(
  roster: readonly Character[],
  arcOrder: readonly string[],
  config: TowerConfig,
): TowerRoster {
  const byStrate: string[][] = Array.from({ length: STRATE_COUNT }, () => []);
  const entries: Record<string, TowerEntry> = {};

  for (const character of roster) {
    const raw = character.attributes?.[config.arcAttributeKey];
    const arcIndex = arcOrder.indexOf(String(raw ?? ""));
    if (arcIndex < 0) continue; // arc non renseigné ⇒ hors tour

    const strate = strateOfArc(arcIndex, arcOrder.length);
    const passive = passiveOf(archetypeOf(character, config.categoryArchetypes));

    entries[character.id] = {
      id: character.id,
      arcIndex,
      value: battleValueOf(character),
      ignoresRecruitCap: passive.ignoresRecruitCap,
    };
    byStrate[strate].push(character.id);
  }

  // Tri par valeur croissante, `id` en départage : deux personnages de même
  // valeur doivent toujours sortir dans le même ordre, sinon la tour générée
  // depuis une graine donnée n'est plus reproductible.
  for (const pool of byStrate) {
    pool.sort((a, b) => {
      const delta = entries[a].value - entries[b].value;
      return delta !== 0 ? delta : a.localeCompare(b);
    });
  }

  return { byStrate, entries };
}

/** Le vivier a-t-il de quoi faire tenir une tour debout ? */
export function isTowerPlayable(tower: TowerRoster): boolean {
  return tower.byStrate.every((pool) => pool.length >= 2);
}

// ──────────────────────────────────────────────────────────────────────────
// Génération
// ──────────────────────────────────────────────────────────────────────────

/**
 * Génère la tour entière à partir de la seule graine.
 *
 * Générer d'un bloc plutôt qu'étage par étage garantit qu'un joueur qui reprend
 * sa run retombe exactement sur la même tour, sans qu'on ait à persister les
 * étages : l'état de run ne stocke que le numéro d'étage.
 */
export function planTower(seed: number, tower: TowerRoster): FloorPlan[] {
  const rand = mulberry32(seed);
  const plans: FloorPlan[] = [];
  const usedBosses = new Set<string>();

  for (let floor = 1; floor <= TOWER_FLOORS; floor += 1) {
    const strate = strateOfFloor(floor);
    const kind = kindOf(floor);

    plans.push({
      floor,
      strate,
      kind,
      enemyIds: pickEnemies(rand, tower, strate, kind, usedBosses),
      recruitIds: isRecruitFloor(floor)
        ? pickRecruits(rand, tower, strate)
        : [],
    });
  }

  return plans;
}

/**
 * Type d'un étage. La phase 1 est une tour LINÉAIRE : seuls `combat`, `elite`
 * et `boss` sont produits. Les nœuds à choix arrivent en phase 3 sans changer
 * la forme de `FloorPlan`, donc sans migration de l'état de run.
 */
function kindOf(floor: number): NodeKind {
  if (isBossFloor(floor)) return "boss";
  // Un étage sur cinq est une élite : assez pour casser le rythme, assez peu
  // pour rester une surprise.
  return floor % FLOORS_PER_STRATE === 3 ? "elite" : "combat";
}

function pickEnemies(
  rand: () => number,
  tower: TowerRoster,
  strate: number,
  kind: NodeKind,
  usedBosses: Set<string>,
): string[] {
  if (kind === "boss") {
    const boss = pickBoss(tower, strate, usedBosses);
    return boss ? [boss] : [];
  }

  // Une élite puise une strate plus haut : c'est un avant-goût de ce qui vient,
  // et la seule façon de croiser un personnage hors de sa strate.
  const pool =
    kind === "elite"
      ? tower.byStrate[Math.min(STRATE_COUNT - 1, strate + 1)]
      : tower.byStrate[strate];

  if (pool.length === 0) return [];
  if (kind === "elite") return [biasedPick(rand, pool, 0.5)];

  const [min, max] = ENEMY_COUNT[strate] ?? [1, 1];
  const count = min + Math.floor(rand() * (max - min + 1));

  const chosen: string[] = [];
  for (let i = 0; i < count; i += 1) {
    // Le même personnage peut revenir d'un étage à l'autre, jamais deux fois
    // dans le même combat.
    const candidate = pickDistinct(rand, pool, chosen);
    if (candidate) chosen.push(candidate);
  }
  return chosen;
}

/**
 * Boss d'une strate : le personnage le plus fort de son vivier, jamais réutilisé
 * comme boss d'une autre strate. Le vivier étant trié croissant, c'est le
 * dernier élément encore disponible.
 */
function pickBoss(
  tower: TowerRoster,
  strate: number,
  usedBosses: Set<string>,
): string | null {
  const pool = tower.byStrate[strate];
  for (let i = pool.length - 1; i >= 0; i -= 1) {
    if (!usedBosses.has(pool[i])) {
      usedBosses.add(pool[i]);
      return pool[i];
    }
  }
  return pool[pool.length - 1] ?? null;
}

/**
 * Tirage biaisé dans un vivier trié par force CROISSANTE.
 *
 * `power > 1` tire vers le bas du vivier (les ennemis ordinaires restent
 * ordinaires), `power < 1` vers le haut (une élite doit faire mal). Sans ce
 * biais, un tirage uniforme sortirait le second couteau et le monstre de fin
 * d'arc à la même fréquence, et la courbe de difficulté disparaîtrait à
 * l'intérieur de chaque strate.
 */
function biasedPick(rand: () => number, pool: string[], power: number): string {
  const r = Math.pow(rand(), power);
  const index = Math.min(pool.length - 1, Math.floor(r * pool.length));
  return pool[index];
}

function pickDistinct(
  rand: () => number,
  pool: string[],
  exclude: string[],
): string | null {
  const available = pool.filter((id) => !exclude.includes(id));
  if (available.length === 0) return null;
  return biasedPick(rand, available, 2);
}

/**
 * Candidats au recrutement, sous le plafond de la strate.
 *
 * On en propose `RECRUIT_CANDIDATES` et non 3 : `run.ts` doit pouvoir en écarter
 * ceux déjà présents dans l'escouade sans se retrouver à court, et sans avoir à
 * re-tirer (ce qui casserait le déterminisme).
 */
function pickRecruits(
  rand: () => number,
  tower: TowerRoster,
  strate: number,
): string[] {
  const cap = RECRUIT_CAPS[strate] ?? Infinity;
  const eligible = tower.byStrate[strate].filter((id) => {
    const entry = tower.entries[id];
    return entry.value <= cap || entry.ignoresRecruitCap;
  });

  if (eligible.length === 0) return [];

  const chosen: string[] = [];
  for (let i = 0; i < RECRUIT_CANDIDATES; i += 1) {
    const candidate = pickDistinct(rand, eligible, chosen);
    if (!candidate) break;
    chosen.push(candidate);
  }
  return chosen;
}

/** Un personnage est-il recrutable à cette strate ? (garde serveur) */
export function canRecruit(
  tower: TowerRoster,
  id: string,
  strate: number,
): boolean {
  const entry = tower.entries[id];
  if (!entry) return false;
  const cap = RECRUIT_CAPS[strate] ?? Infinity;
  return entry.value <= cap || entry.ignoresRecruitCap;
}
