/**
 * Identifiants des jeux du registre. Union fermée (et non `string`) pour que la
 * surcharge de titres d'un univers (`UniverseConfig.gameTitles`) soit vérifiée à
 * la compilation : une clé mal orthographiée serait sinon ignorée en silence.
 *
 * Ajouter un jeu = ajouter son id ici + son entrée dans `registry.ts`.
 */
export type GameId =
  | "builder"
  | "ranking"
  | "jujutsu-draft"
  | "battle"
  | "guesswho"
  | "codenames"
  | "jjkdle"
  | "higher-lower"
  | "tower";

/**
 * Textes d'un jeu propres à un univers. Tout champ absent garde la valeur par
 * défaut du registre. Le NOM, la DESCRIPTION et les TAGS d'un jeu contiennent du
 * vocabulaire de l'œuvre (« sorcier », « roster JJK ») : ils sont donc écrits
 * par univers, pas dans le registre.
 */
export interface GameCopy {
  title?: string;
  description?: string;
  tags?: string[];
  /**
   * Meta description de la page du jeu, quand elle doit différer du texte de la
   * carte (`description`). Absent = `description`.
   */
  seoDescription?: string;
  /**
   * Miniature/screenshot du jeu propre à l'univers (chemin sous public/). Une
   * capture montre le roster de l'anime : celle du registre est donc celle de
   * JJK. Absent = miniature par défaut du registre.
   */
  previewImage?: string;
}

/** Textes des jeux d'un univers : `{ [id du jeu]: textes }`. */
export type UniverseGameCopy = Partial<Record<GameId, GameCopy>>;

/**
 * Contrat d'un jeu de la plateforme. Le système est *pluggable* : pour ajouter
 * un jeu, on déclare une entrée `Game` dans le registre (`registry.ts`) et on
 * crée sa route sous `app/games/<id>/`.
 */
export interface Game {
  /** Identifiant unique, sert aussi de segment de route (`/games/<id>`). */
  id: GameId;
  title: string;
  description: string;
  /**
   * Meta description de la page, si elle diffère de `description`. Celle du
   * registre est écrite pour JJK : `applyCopy` l'écarte dès qu'un univers
   * réécrit la description, pour qu'elle ne fuie pas sur un autre anime.
   */
  seoDescription?: string;
  /** Chemin vers la page du jeu. */
  route: string;
  /**
   * Visuel de la vignette sur le hub : chemin vers un asset SVG maison. Absent,
   * le hub affiche le logo du jeu (`GameIcon`).
   */
  thumbnail?: string;
  // Le logo du jeu est un SVG maison indexé par `id` (components/icons/GameIcon).
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
