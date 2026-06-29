/**
 * Contrat d'un jeu de la plateforme. Le système est *pluggable* : pour ajouter
 * un jeu, on déclare une entrée `Game` dans le registre (`registry.ts`) et on
 * crée sa route sous `app/games/<id>/`.
 */
export interface Game {
  /** Identifiant unique, sert aussi de segment de route (`/games/<id>`). */
  id: string;
  title: string;
  description: string;
  /** Chemin vers la page du jeu. */
  route: string;
  /**
   * Visuel de la vignette sur le hub. Chemin vers un asset SVG maison, ou un
   * emoji de fallback si l'asset n'existe pas encore.
   */
  thumbnail?: string;
  /** Emoji/glyphe de secours affiché si `thumbnail` est absent. */
  glyph?: string;
  tags?: string[];
  /** Couleur d'accent (hex) de la carte sur le hub. Défaut : violet "domain". */
  accent?: string;
  /** Screenshot du jeu, révélé en fond de carte au survol (chemin sous public/). */
  previewImage?: string;
  /** Permet de griser une carte "à venir" sans la retirer du registre. */
  status?: "live" | "coming-soon";
  /**
   * Disponibilité d'un mode multijoueur pour ce jeu — alimente la modale
   * multijoueur du hub. Absent = ce jeu n'a pas de mode multi listé.
   */
  multiplayer?: {
    status: "live" | "coming-soon";
    /** Route du hub multi (requise si `status: "live"`). */
    route?: string;
  };
  /**
   * Jeu jouable UNIQUEMENT en multijoueur : affiche un badge sur sa carte et
   * l'exclut de la modale (il a déjà sa propre carte/hub). Ex. JJK Random Battle.
   */
  multiplayerOnly?: boolean;
}
