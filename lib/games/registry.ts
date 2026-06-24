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
