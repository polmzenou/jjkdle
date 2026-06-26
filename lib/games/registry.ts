import type { Game } from "./types";

/**
 * Registre central des jeux. Le hub (`app/page.tsx`) mappe sur ce tableau.
 * Ajouter un jeu = ajouter une entrée ici + sa route sous `app/games/<id>/`.
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
