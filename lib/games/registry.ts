import type { Game, GameId, UniverseGameCopy } from "./types";

/**
 * Registre central des jeux. Le hub (`app/page.tsx`) mappe sur ce tableau.
 * Ajouter un jeu = ajouter une entrée ici + sa route sous `app/games/<id>/`.
 *
 * ⚠️ `title`, `description` et `tags` ci-dessous sont ceux de l'univers PAR
 * DÉFAUT (JJK) : ils contiennent du vocabulaire Jujutsu Kaisen. Chaque univers
 * réécrit les siens dans `UniverseConfig.gameCopy` (ex. « JJKdle » → « CSMdle »).
 * Ne JAMAIS afficher ces champs directement dans l'UI : passer par
 * `gamesForUniverse()` / `gameForUniverse()` (ou, côté serveur/client, par
 * `lib/games/universe.ts` et `useUniverseGames()`).
 */
export const GAMES: Game[] = [
  {
    id: "builder",
    title: "Build the Perfect Sorcerer",
    description:
      "Compose ton sorcier idéal catégorie par catégorie. Chaque choix verrouille une stat et re-mélange le reste. Score sur 1000, du Grade 4− au Grade S.",
    route: "/games/builder",
    glyph: "🩸",
    tags: ["tap game", "roster JJK", "score"],
    accent: "#dc2626",
    previewImage: "/assets/builder-screen.png",
    status: "live",
    multiplayer: { status: "live", route: "/games/multiplayer" },
  },
  {
    id: "ranking",
    title: "JJK Pyramid",
    description:
      "Classe 8 personnages du plus fort au plus faible selon la consigne. Les bonnes positions se verrouillent, les fausses reviennent. 4 tentatives, jusqu'à 10 000 points.",
    route: "/games/ranking",
    glyph: "🔺",
    tags: ["ranking", "drag & drop", "roster JJK"],
    accent: "#7c3aed",
    previewImage: "/assets/pyramid-screen.png",
    status: "live",
    multiplayer: { status: "coming-soon" },
  },
  {
    id: "jujutsu-draft",
    title: "Jujutsu Draft",
    description:
      "Drafte 1 sorcier par catégorie sous budget, place chacun au bon endroit, puis affronte une série de boss de plus en plus forts. Va le plus loin possible.",
    route: "/games/jujutsu-draft",
    glyph: "⚔️",
    tags: ["draft", "combat", "roster JJK"],
    accent: "#f59e0b",
    previewImage: "/assets/draft-screen.png",
    status: "live",
    multiplayer: { status: "coming-soon" },
  },
  {
    id: "battle",
    title: "JJK Random Battle",
    description:
      "Affronte un ami en 1v1 : drafte une carte tirée au hasard à tour de rôle (garde-la ou refile-la), compose ton équipe de 5, puis laisse parler le combat. Le cumul le plus fort gagne.",
    route: "/games/battle",
    glyph: "⚡",
    tags: ["1v1", "multijoueur", "draft", "roster JJK"],
    accent: "#dc2626",
    previewImage: "/assets/battle-screen.png",
    status: "live",
    multiplayerOnly: true,
  },
  {
    id: "guesswho",
    title: "Qui est-ce ?",
    description:
      "Affronte un ami en 1v1 : une grille de 25 personnages, un secret pour chacun. Pose des questions, élimine des cartes et devine le perso secret de l'adversaire avant lui. Un mauvais guess et c'est perdu.",
    route: "/games/guesswho",
    glyph: "🕵️",
    tags: ["1v1", "multijoueur", "déduction", "roster JJK"],
    accent: "#7c3aed",
    previewImage: "/assets/guesswho-screen.png",
    status: "live",
    multiplayerOnly: true,
  },
  {
    id: "codenames",
    title: "JJK Codenames",
    description:
      "En équipe (4 à 6 joueurs, rouge vs violet) : les maîtres-espions donnent des indices, les agents révèlent les bons personnages d'une grille de 36. Évitez l'assassin, révélez vos 8 cartes avant l'équipe adverse.",
    route: "/games/codenames",
    glyph: "🎯",
    tags: ["multijoueur", "2-6", "déduction", "roster JJK"],
    accent: "#dc2626",
    previewImage: "/assets/codenames-screen.png",
    status: "live",
    multiplayerOnly: true,
  },
  {
    id: "jjkdle",
    title: "JJKdle",
    description:
      "Devine le personnage JJK mystère du jour. Chaque proposition révèle des indices par attribut (race, grade, clan, arc…) avec des flèches ↑/↓. Un perso par jour, essais illimités.",
    route: "/games/jjkdle",
    glyph: "🎭",
    tags: ["quotidien", "déduction", "roster JJK"],
    accent: "#7c3aed",
    previewImage: "/assets/idle-screen.png",
    status: "live",
  },
  {
    id: "higher-lower",
    title: "JJK Higher/Lower",
    description:
      "Plus ou moins d'énergie occulte ? Compare deux personnages du roster, devine si celui de droite dépasse celui de gauche et enchaîne les bonnes réponses le plus loin possible.",
    route: "/games/higher-lower",
    glyph: "📊",
    tags: ["quickfire", "déduction", "roster JJK"],
    accent: "#7c3aed",
    previewImage: "/assets/higher-lower-screen.png",
    status: "live",
  },
  // Exemple de jeu futur (grisé sur le hub) :
  // {
  //   id: "domain-clash",
  //   title: "Domain Clash",
  //   description: "À venir.",
  //   route: "/games/domain-clash",
  //   glyph: "🌀",
  //   status: "coming-soon",
  // },
];

export function getGame(id: string): Game | undefined {
  return GAMES.find((g) => g.id === id);
}

/**
 * Registre vu par un univers : mêmes jeux, mêmes routes, mais nom, description
 * et tags réécrits selon sa config. Un anime ne change QUE des textes — aucun
 * code de jeu n'est dupliqué (cf. `lib/universes/types.ts`).
 *
 * Fonction PURE (client + serveur). Les appelants serveur passent par
 * `lib/games/universe.ts`, les composants client par `useUniverseGames()`.
 */
export function gamesForUniverse(copy?: UniverseGameCopy): Game[] {
  if (!copy) return GAMES;
  return GAMES.map((g) => applyCopy(g, copy));
}

/** Idem `getGame`, avec les textes de l'univers. */
export function gameForUniverse(
  id: string,
  copy?: UniverseGameCopy,
): Game | undefined {
  const game = getGame(id);
  if (!game || !copy) return game;
  return applyCopy(game, copy);
}

/** Titre d'un jeu dans un univers (repli sur l'id si le jeu est inconnu). */
export function gameTitleForUniverse(
  id: string,
  copy?: UniverseGameCopy,
): string {
  return gameForUniverse(id, copy)?.title ?? id;
}

/** Fusionne les textes de l'univers sur l'entrée du registre (champ par champ). */
function applyCopy(game: Game, copy: UniverseGameCopy): Game {
  const c = copy[game.id as GameId];
  if (!c) return game;
  return {
    ...game,
    ...(c.title ? { title: c.title } : {}),
    ...(c.description ? { description: c.description } : {}),
    ...(c.tags ? { tags: c.tags } : {}),
  };
}
