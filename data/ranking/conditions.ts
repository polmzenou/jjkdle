/**
 * Conditions du jeu "JJK Pyramid" (jeu de classement).
 *
 * Chaque condition = une consigne + 8 personnages à classer du PLUS FORT (rang 1)
 * au plus faible (rang 8). L'ordre correct est porté par l'ordre du tableau
 * `order` (index 0 = rang 1). Les valeurs sont des `id` du roster
 * (data/roster/characters.ts) → on réutilise images + noms via CHARACTER_BY_ID.
 *
 * Pour ajouter une condition : pousser un objet ici avec 8 `id` valides.
 * Pour ajouter un personnage manquant : l'ajouter d'abord au roster.
 */

export interface RankingCondition {
  id: string;
  /** Étiquette courte affichée dans le bandeau (ex. "École de Kyoto"). */
  category: string;
  /** Consigne complète affichée au joueur. */
  prompt: string;
  /** 8 IDs de roster, du plus fort (rang 1) au plus faible (rang 8). */
  order: string[];
}

export const SLOT_COUNT = 8;

export const CONDITIONS: RankingCondition[] = [
  {
    id: "strongest",
    category: "Le plus fort",
    prompt: "Classe ces sorciers du plus fort au plus faible.",
    order: [
      "yuji-modulo",
      "gojo",
      "sukuna",
      "dabura",
      "yuta",
      "takaba",
      "kenjaku",
      "yuki-tsukumo",
    ],
  },
  {
    id: "cursed-energy",
    category: "Énergie occulte",
    prompt: "Classe ces personnages du plus grand au plus faible réservoir d'énergie occulte.",
    order: [
      "sukuna",
      "yuta",
      "gojo",
      "yuji-modulo",
      "geto",
      "hakari",
      "higuruma",
      "kashimo",
    ],
  },
  {
    id: "culling-game",
    category: "Traque mortelle",
    prompt: "Classe les plus forts lors de la Traque Mortelle (Culling Game).",
    order: [
      "yuta",
      "yuki-tsukumo",
      "kenjaku",
      "kashimo",
      "higuruma",
      "ryu-ishigori",
      "yuji",
      "choso",
    ],
  },
  {
    id: "kyoto-school",
    category: "École de Kyoto",
    prompt: "Classe les sorciers de l'École de Kyoto du plus fort au plus faible.",
    order: [
      "todo",
      "gakuganji",
      "utahime",
      "mai-zenin",
      "miwa",
      "mechamaru",
      "kamo",
      "momo",
    ],
  },
  {
    id: "tokyo-school",
    category: "École de Tokyo",
    prompt: "Classe les sorciers de l'École de Tokyo du plus fort au plus faible.",
    order: [
      "gojo",
      "yuta",
      "maki",
      "yuji",
      "hakari",
      "megumi",
      "nanami",
      "nobara",
    ],
  },
];
