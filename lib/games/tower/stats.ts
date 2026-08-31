import type { Character } from "@/data/roster/characters";
import { battleValueOf } from "@/lib/games/battle/battleValues";
import { archetypeOf } from "./abilities";
import { categoryForArchetype, type TowerConfig } from "./config";
import type { FighterSpec, FighterStats, Side } from "./types";

/**
 * Dérivation des statistiques de combat — module PUR.
 *
 * Aucune stat n'est saisie personnage par personnage : les quatre valeurs
 * viennent de données DÉJÀ remplies en /admin pour d'autres jeux
 * (`battleValue`, `ratings`, attributs de l'univers). Un personnage ajouté
 * demain entre donc en combat sans une ligne de saisie supplémentaire.
 *
 * ⚠️ Piège n°1 du jeu, à ne jamais oublier en touchant ce fichier :
 * `Character.ratings` est PARTIEL **par construction**. La présence d'une clé
 * signifie « éligible à cette catégorie » dans le builder, pas « note connue » —
 * sur le roster de seed, 36 personnages sur 45 n'ont aucune note de vitesse.
 * Toute lecture de `ratings` ou d'attribut a donc un repli chiffré, et
 * `stats.test.ts` fait passer le roster entier ici pour échouer sur un `NaN`.
 *
 * UNITÉS — les quatre stats sont exprimées PAR SECONDE, pas par tick. C'est ce
 * qui les rend lisibles dans l'UI et dans l'admin (« célérité 70 » = une frappe
 * toutes les 1,4 s) ; `combat.ts` est le seul endroit qui les convertit en
 * ticks, via `TICKS_PER_SECOND`.
 */

// ──────────────────────────────────────────────────────────────────────────
// Coefficients
// ──────────────────────────────────────────────────────────────────────────

/**
 * Coefficients d'équilibrage. Cible : un combat ordinaire de strate I dure
 * 15–25 s, un boss de strate IV 45–70 s.
 *
 * ⚠️ Le rapport PV/frappe est le curseur SENSIBLE, et il n'est pas intuitif.
 * Une première version linéaire douce (`40 + bv × 2.5`) donnait des combats de
 * 4 à 9 secondes : trois personnages concentrent leurs frappes sur une seule
 * cible, donc les dégâts de l'escouade triplent quand les PV du boss, eux, ne
 * suivent que sa `battleValue`. Le joueur n'avait même pas le temps de voir une
 * fenêtre s'ouvrir. Les PV doivent donc être BEAUCOUP plus élevés que la
 * frappe, et les boss reçoivent en plus leur propre multiplicateur (cf.
 * `ENEMY_HP_MULT`) — sans quoi un boss meurt plus vite qu'un sbire de strate I.
 *
 * À réviser par simulation (`scripts/calibrate-tower.mjs`, phase 4).
 */
export const HP_BASE = 120;
export const HP_PER_VALUE = 6;
export const STRIKE_BASE = 5;
export const STRIKE_PER_VALUE = 0.45;

/** Célérité : points de jauge d'action par seconde (la frappe part à 100). */
export const SPEED_BASE = 40;
export const SPEED_RANGE = 60;

/**
 * Flux : énergie occulte par seconde et par combattant.
 *
 * Calibré pour qu'un starter SEUL puisse s'offrir une technique dans son
 * premier combat (~45 d'énergie sur 24 s) et qu'une escouade de trois en
 * enchaîne quatre ou cinq sur un boss. En dessous, l'input du joueur devient
 * décoratif ; au-dessus, il n'a plus à choisir son moment.
 */
export const FLUX_BASE = 1.2;
export const FLUX_RANGE = 1.8;

/**
 * Multiplicateur de PV des ennemis selon le type d'étage.
 *
 * C'est ce qui fait qu'un boss est un boss : sans lui, un combat à trois contre
 * un se résout en quelques secondes quelle que soit la `battleValue` de la
 * cible, parce que le nombre l'emporte toujours sur la qualité.
 *
 * Mesuré, pas deviné : à ×5, le boss de la strate I était imperdable-ment
 * perdu même en jouant bien. À ×3, une escouade complète et fraîche l'emporte
 * en gardant 44 % de ses PV, 59 % si le joueur se sert de sa garde — et comme
 * les PV ne se régénèrent pas d'un étage à l'autre, la marge réelle est plus
 * mince que ces chiffres.
 */
export const ENEMY_HP_MULT: Readonly<Record<string, number>> = {
  combat: 1,
  elite: 2,
  boss: 3,
};

/**
 * Frappe ennemie réduite tant que l'escouade est INCOMPLÈTE, indexée par son
 * nombre de membres vivants.
 *
 * Sans cela, les premiers étages sont ingagnables par construction : le joueur
 * y entre SEUL (l'escouade se remplit en montant), donc il inflige un tiers des
 * dégâts d'une escouade complète tout en encaissant autant. Un combat dure
 * alors trois fois plus longtemps face au même adversaire — il perdait au
 * deuxième ou troisième étage sans avoir démérité.
 *
 * On ne touche QUE la frappe, pas les PV : baisser les PV raccourcirait les
 * combats, alors que le problème est justement qu'ils sont trop longs pour un
 * personnage seul.
 */
export const SQUAD_HANDICAP: readonly number[] = [0.5, 0.75, 1];

/** Replis appliqués quand la donnée source est absente (cas NORMAL, cf. supra). */
export const FALLBACK_SPEED_RATING = 50;
export const FALLBACK_ENERGY = 40;

// ──────────────────────────────────────────────────────────────────────────
// Lecture défensive de la donnée
// ──────────────────────────────────────────────────────────────────────────

/**
 * Note d'un personnage dans une catégorie, ou `fallback`.
 * `category` peut être `null` : un univers dont aucune catégorie ne mappe
 * l'archétype recherché est un cas légitime, pas une erreur.
 */
export function ratingOf(
  character: Character,
  category: string | null,
  fallback: number,
): number {
  if (!category) return fallback;
  const value = character.ratings?.[category];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

/**
 * Attribut NUMERIC d'un personnage, ou `fallback`.
 * Tolère la valeur écrite en chaîne : les attributs sont saisis en admin et un
 * import passé peut avoir laissé un `"75"` là où on attend un `75`.
 */
export function numericAttribute(
  character: Character,
  key: string,
  fallback: number,
): number {
  const raw = character.attributes?.[key];
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string") {
    const parsed = Number.parseFloat(raw);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

/**
 * Attribut BOOLEAN d'un personnage. Un BOOLEAN est stocké comme une liste
 * fermée à deux options `"true"` / `"false"` ; l'absence vaut `false`, ce qui
 * est le bon défaut ici (pas d'attribut renseigné ⇒ pas d'ultime).
 */
export function booleanAttribute(character: Character, key: string): boolean {
  const raw = character.attributes?.[key];
  if (typeof raw === "boolean") return raw;
  return String(raw ?? "").toLowerCase() === "true";
}

// ──────────────────────────────────────────────────────────────────────────
// Dérivation
// ──────────────────────────────────────────────────────────────────────────

/** Statistiques de combat d'un personnage, toutes par seconde (cf. en-tête). */
export function deriveStats(
  character: Character,
  config: TowerConfig,
): FighterStats {
  const value = battleValueOf(character);

  // La catégorie de vitesse n'est pas une clé de config : c'est celle qui mappe
  // sur l'archétype `swift`, quel que soit son slug dans l'univers.
  const speedCategory = categoryForArchetype(config, "swift");
  const speedRating = ratingOf(character, speedCategory, FALLBACK_SPEED_RATING);
  const energy = numericAttribute(
    character,
    config.energyAttributeKey,
    FALLBACK_ENERGY,
  );

  return {
    maxHp: Math.max(1, Math.round(HP_BASE + value * HP_PER_VALUE)),
    strike: Math.max(1, Math.round(STRIKE_BASE + value * STRIKE_PER_VALUE)),
    speed: SPEED_BASE + clamp01(speedRating / 100) * SPEED_RANGE,
    flux: FLUX_BASE + clamp01(energy / 100) * FLUX_RANGE,
  };
}

/**
 * Fiche complète d'un combattant, prête pour `combat.ts`.
 * C'est le SEUL point de passage du roster vers le moteur : le moteur ne voit
 * jamais un `Character`, donc jamais une image, un tier ou un attribut brut.
 */
export function toFighterSpec(
  character: Character,
  side: Side,
  config: TowerConfig,
): FighterSpec {
  return {
    id: character.id,
    name: character.name,
    side,
    stats: deriveStats(character, config),
    archetype: archetypeOf(character, config.categoryArchetypes),
    hasDomain: booleanAttribute(character, config.ultimateAttributeKey),
  };
}

/**
 * Fiche d'un ennemi, gonflée selon le type d'étage (`ENEMY_HP_MULT`).
 * Seuls les PV sont multipliés, jamais la frappe : un boss doit tenir plus
 * longtemps, pas tuer d'un coup — sinon le joueur perd sans avoir pu jouer.
 */
export function toEnemySpec(
  character: Character,
  kind: string,
  config: TowerConfig,
  squadSize = SQUAD_HANDICAP.length,
): FighterSpec {
  const spec = toFighterSpec(character, "enemy", config);
  const hpMult = ENEMY_HP_MULT[kind] ?? 1;
  const strikeMult =
    SQUAD_HANDICAP[Math.max(0, Math.min(SQUAD_HANDICAP.length - 1, squadSize - 1))];

  return {
    ...spec,
    stats: {
      ...spec.stats,
      maxHp: Math.max(1, Math.round(spec.stats.maxHp * hpMult)),
      strike: Math.max(1, Math.round(spec.stats.strike * strikeMult)),
    },
  };
}

/** Ramène un ratio dans [0, 1] : une note hors barème ne doit pas fausser tout. */
function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}
