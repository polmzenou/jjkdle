/**
 * Conditions du jeu "JJK Pyramid" (jeu de classement).
 *
 * ── Classification à 2 axes ───────────────────────────────────────────────
 * Chaque consigne croise :
 *   • un POOL    (axe « QUI on classe »)    → ex. "École de Tokyo", "Fléaux".
 *   • un CRITÈRE (axe « SELON QUOI »)        → ex. "Vitesse", "Puissance".
 *
 * ── Cohérence : l'ordre est DÉRIVÉ du roster ──────────────────────────────
 * Pour tout critère « stat » (battleValue ou une note de `ratings`), on ne
 * tape PAS l'ordre à la main : on liste seulement les 8 personnages, et
 * `deriveConditions()` les TRIE depuis le roster. L'ordre correct est donc
 * toujours cohérent avec les données (et se met à jour au prochain `db:seed`
 * si on rééquilibre un perso). Garde-fou : `conditions.test.ts` vérifie que les
 * 8 valeurs sont DISTINCTES (sinon le classement serait ambigu).
 *
 * Le critère `lore` est le seul cas d'ordre MANUEL : classements canoniques /
 * subjectifs que les données ne capturent pas (ex. « domaine le plus dangereux »).
 *
 * Pour ajouter une consigne : pousser un `ConditionDef` ci-dessous (8 ids du
 * roster). Pour un perso manquant : l'ajouter d'abord au roster.
 */

import type { CategoryId } from "../roster/categories";
import { CHARACTER_BY_ID, type Character } from "../roster/characters";

export const SLOT_COUNT = 8;

/** Consigne résolue, consommée par le jeu (UI + logique). */
export interface RankingCondition {
  id: string;
  /** Pool / thème — axe « qui » (ex. "École de Tokyo"). Affiché en chip. */
  pool: string;
  /** Critère — axe « selon quoi » (ex. "Vitesse"). Affiché en chip + titre. */
  category: string;
  /** Consigne complète affichée au joueur. */
  prompt: string;
  /** 8 IDs de roster, du plus fort (rang 1) au plus faible (rang 8). */
  order: string[];
}

/**
 * Critère de classement :
 *  - "battle"        → trie sur `battleValue` ;
 *  - un `CategoryId` → trie sur `ratings[categoryId]` ;
 *  - "lore"          → ordre manuel (canon / subjectif).
 */
export type StatCriterion = "battle" | CategoryId;

/** Libellé + tournure de phrase pour chaque critère dérivé. */
const CRITERION_META: Record<StatCriterion, { label: string; verb: string }> = {
  battle: { label: "Puissance", verb: "du plus fort au plus faible au combat" },
  "innate-technique": {
    label: "Sort inné",
    verb: "de la technique innée la plus puissante à la plus faible",
  },
  speed: { label: "Vitesse", verb: "du plus rapide au plus lent" },
  "curse-status": {
    label: "Statut de fléau",
    verb: "du fléau le plus puissant au plus faible",
  },
  "battle-iq": {
    label: "Battle IQ",
    verb: "du plus fin tacticien au plus impulsif",
  },
  "physical-strength": {
    label: "Force physique",
    verb: "du plus fort physiquement au plus fragile",
  },
  "cursed-energy": {
    label: "Énergie occulte",
    verb: "du plus grand réservoir d'énergie occulte au plus faible",
  },
  "domain-expansion": {
    label: "Extension du Territoire",
    verb: "de la meilleure maîtrise du Territoire à la plus faible",
  },
  versatility: {
    label: "Polyvalence",
    verb: "du plus polyvalent au plus spécialisé",
  },
  endurance: { label: "Endurance", verb: "du plus endurant au plus fragile" },
};

/** Définition d'auteur : on choisit le pool, le critère et les 8 persos. */
type StatConditionDef = {
  id: string;
  pool: string;
  criterion: StatCriterion;
  /** Les 8 personnages à classer (ordre indifférent : il est dérivé). */
  ids: string[];
};

type LoreConditionDef = {
  id: string;
  pool: string;
  criterion: "lore";
  /** Libellé du critère affiché (ex. "Force physique"). */
  category: string;
  prompt: string;
  /** Ordre correct MANUEL, rang 1→8. */
  order: string[];
};

export type ConditionDef = StatConditionDef | LoreConditionDef;

/** Valeur du critère pour un perso (undefined = non noté/non éligible). */
export function criterionValue(
  ch: Character,
  criterion: StatCriterion,
): number | undefined {
  return criterion === "battle" ? ch.battleValue : ch.ratings[criterion];
}

/** Résout un `ConditionDef` en `RankingCondition` (ordre dérivé ou manuel). */
function derive(def: ConditionDef): RankingCondition {
  if (def.criterion === "lore") {
    return {
      id: def.id,
      pool: def.pool,
      category: def.category,
      prompt: def.prompt,
      order: def.order,
    };
  }
  const meta = CRITERION_META[def.criterion];
  // Tri décroissant sur la valeur du critère (valeur absente → tout en bas).
  const order = [...def.ids].sort((a, b) => {
    const va = criterionValue(CHARACTER_BY_ID[a], def.criterion) ?? -Infinity;
    const vb = criterionValue(CHARACTER_BY_ID[b], def.criterion) ?? -Infinity;
    return vb - va;
  });
  return {
    id: def.id,
    pool: def.pool,
    category: meta.label,
    prompt: `Classe ces personnages ${meta.verb}.`,
    order,
  };
}

// ──────────────────────────────────────────────────────────────────────────
// Définitions des consignes. Regroupées par POOL pour la lisibilité.
// ──────────────────────────────────────────────────────────────────────────
const DEFS: ConditionDef[] = [
  // ── L'élite (tout le roster) × chaque critère ──
  {
    id: "all-battle",
    pool: "L'élite",
    criterion: "battle",
    ids: ["yuji-modulo", "sukuna", "gojo", "dabura", "mahoraga", "kenjaku", "yuta", "yuki-tsukumo"],
  },
  {
    id: "all-innate",
    pool: "L'élite",
    criterion: "innate-technique",
    ids: ["takaba", "yuji-modulo", "sukuna", "gojo", "dabura", "yuta", "yuki-tsukumo", "geto"],
  },
  {
    id: "all-speed",
    pool: "L'élite",
    criterion: "speed",
    ids: ["dabura", "yuji-modulo", "gojo", "sukuna", "toji", "maki", "kashimo", "naoya"],
  },
  {
    id: "all-battle-iq",
    pool: "L'élite",
    criterion: "battle-iq",
    ids: ["gojo", "yuji-modulo", "sukuna", "dabura", "kenjaku", "geto", "yuta", "yuki-tsukumo"],
  },
  {
    id: "all-cursed-energy",
    pool: "L'élite",
    criterion: "cursed-energy",
    ids: ["sukuna", "yuta", "gojo", "geto", "hakari", "kashimo", "nanami", "megumi"],
  },
  {
    id: "all-domain",
    pool: "L'élite",
    criterion: "domain-expansion",
    ids: ["higuruma", "gojo", "yuji-modulo", "sukuna", "kenjaku", "yuta", "mahito", "ryu-ishigori"],
  },
  {
    id: "all-versatility",
    pool: "L'élite",
    criterion: "versatility",
    ids: ["yuta", "yuji-modulo", "gojo", "megumi", "ryu-ishigori", "choso", "higuruma", "nanami"],
  },
  {
    id: "all-endurance",
    pool: "L'élite",
    criterion: "endurance",
    ids: ["yuji-modulo", "gojo", "dabura", "toji", "kenjaku", "yuki-tsukumo", "todo", "choso"],
  },

  // ── Fléaux ──
  {
    id: "curses-status",
    pool: "Fléaux",
    criterion: "curse-status",
    ids: ["mahoraga", "rika", "naoya-fleau", "kurourushi", "mahito", "jogo", "dagon", "hanami"],
  },
  {
    id: "curses-battle",
    pool: "Fléaux",
    criterion: "battle",
    ids: ["mahoraga", "naoya-fleau", "mahito", "jogo", "hanami", "dagon", "kurourushi", "rika"],
  },

  // ── École de Tokyo ──
  {
    id: "tokyo-battle",
    pool: "École de Tokyo",
    criterion: "battle",
    ids: ["gojo", "yuta", "maki", "hakari", "choso", "megumi", "yuji", "nanami"],
  },
  {
    id: "tokyo-innate",
    pool: "École de Tokyo",
    criterion: "innate-technique",
    ids: ["yuta", "megumi", "yuji", "nanami", "inumaki", "nobara", "yaga", "panda"],
  },

  // ── École de Kyoto ──
  {
    id: "kyoto-battle",
    pool: "École de Kyoto",
    criterion: "battle",
    ids: ["todo", "kamo", "mechamaru", "gakuganji", "utahime", "mai-zenin", "miwa", "momo"],
  },

  // ── Niveau spécial (sorciers & entités d'élite) ──
  {
    id: "special-battle",
    pool: "Niveau spécial",
    criterion: "battle",
    ids: ["gojo", "kenjaku", "yuta", "yuki-tsukumo", "kashimo", "geto", "naoya-fleau", "mahito"],
  },
  {
    id: "special-innate",
    pool: "Niveau spécial",
    criterion: "innate-technique",
    ids: ["yuji-modulo", "sukuna", "gojo", "yuta", "yuki-tsukumo", "geto", "uraume", "mahito"],
  },
  {
    id: "special-domain",
    pool: "Niveau spécial",
    criterion: "domain-expansion",
    ids: ["gojo", "yuji-modulo", "sukuna", "kenjaku", "yuta", "mahito", "hakari", "jogo"],
  },
  {
    id: "special-battle-iq",
    pool: "Niveau spécial",
    criterion: "battle-iq",
    ids: ["gojo", "sukuna", "kenjaku", "geto", "yuta", "yuki-tsukumo", "mahito", "hakari"],
  },

  // ── Arc de Shibuya ──
  {
    id: "shibuya-battle",
    pool: "Arc de Shibuya",
    criterion: "battle",
    ids: ["gojo", "toji", "mahito", "jogo", "dagon", "naoya", "mei-mei", "nanami"],
  },
  {
    id: "shibuya-innate",
    pool: "Arc de Shibuya",
    criterion: "innate-technique",
    ids: ["gojo", "geto", "mahito", "jogo", "hanami", "dagon", "naoya", "choso"],
  },

  // ── Traque Mortelle (Culling Game) ──
  {
    id: "culling-battle",
    pool: "Traque Mortelle",
    criterion: "battle",
    ids: ["kenjaku", "yuta", "kashimo", "higuruma", "hakari", "choso", "yuji", "reggie"],
  },
  {
    id: "culling-innate",
    pool: "Traque Mortelle",
    criterion: "innate-technique",
    ids: ["yuta", "yuki-tsukumo", "kenjaku", "hakari", "kashimo", "choso", "reggie", "mei-mei"],
  },

  // ── Anciens & mentors ──
  {
    id: "mentors-battle",
    pool: "Anciens & mentors",
    criterion: "battle",
    ids: ["gojo", "yuki-tsukumo", "geto", "mei-mei", "nanami", "yaga", "gakuganji", "utahime"],
  },

  // ── Lore / canon (ordre manuel : non capturé par les stats) ──
  {
    id: "lore-physical",
    pool: "L'élite",
    criterion: "lore",
    category: "Force physique",
    prompt: "Classe ces bagarreurs du plus fort physiquement au plus fragile.",
    order: ["sukuna", "toji", "maki", "todo", "gojo", "yuji", "hakari", "ryu-ishigori"],
  },
  {
    id: "lore-domain-danger",
    pool: "Extension du Territoire",
    criterion: "lore",
    category: "Domaine le plus dangereux",
    prompt: "Classe ces Extensions du Territoire de la plus mortelle à la moins dangereuse.",
    order: ["sukuna", "gojo", "higuruma", "mahito", "dabura", "kenjaku", "jogo", "dagon"],
  },
  {
    id: "lore-black-flash",
    pool: "L'élite",
    criterion: "lore",
    category: "Black Flash",
    prompt: "Classe ces sorciers du plus à l'aise avec le Black Flash au moins à l'aise.",
    order: ["yuji-modulo", "sukuna", "yuji", "todo", "nanami", "maki", "hakari", "megumi"],
  },
];

/** Consignes résolues (ordre dérivé du roster, sauf `lore`). */
export const CONDITIONS: RankingCondition[] = DEFS.map(derive);

/** Définitions brutes — exposées pour les tests d'intégrité (valeurs distinctes). */
export const CONDITION_DEFS: ConditionDef[] = DEFS;
