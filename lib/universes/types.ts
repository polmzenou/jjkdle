/**
 * Type d'un UNIVERS (anime) de la plateforme multi-univers "anime-arcade".
 *
 * Un univers = des DONNÉES (lignes en base taggées par `universeId`) + cette
 * petite CONFIG de thème/branding. Ce module est PUR (aucun import serveur,
 * aucune dépendance Prisma) → utilisable côté client ET serveur.
 *
 * Ajouter un anime = 1 ligne dans la table `Universe` + 1 fichier
 * `lib/universes/<slug>.ts` exportant un `UniverseConfig` + du contenu rempli
 * via l'admin. Aucun nouveau code métier.
 */

import type { UniverseGameCopy } from "@/lib/games/types";
import type { TowerConfigOverride } from "@/lib/games/tower/config";

/** Palette de thème d'un univers. Sert à générer des variables CSS (cf. étape 4). */
export interface UniverseTheme {
  /** Accent principal (JJK : violet « Domain Expansion » #7c3aed). */
  primary: string;
  primaryLight: string;
  primaryDark: string;
  /** Accent secondaire (JJK : rouge « Cursed » #dc2626). */
  accent: string;
  accentLight: string;
  accentDark: string;
  /** Fonds/surfaces sombres, du plus profond (900) au plus clair (600). */
  surface: {
    DEFAULT: string;
    s900: string;
    s800: string;
    s700: string;
    s600: string;
  };
  /** Halos néon (box-shadow) dérivés des accents. */
  glow: string;
  glowAccent: string;
}

/**
 * Libellés propres à l'univers. Un terme lore d'un anime (ex. « Énergie occulte »
 * pour JJK) devient un autre terme ailleurs, ou est absent. Étendre au besoin.
 */
export interface UniverseLabels {
  /**
   * Accroche de la landing (1–2 phrases). Contient du vocabulaire lore, donc
   * propre à chaque anime — d'où sa place ici plutôt qu'en dur dans la page.
   */
  tagline: string;
  /**
   * Ouverture de la phrase de la landing, juste AVANT le nom de l'œuvre, qui est
   * rendu à part en surbrillance : « La salle d'arcade maudite dédiée à » +
   * *Jujutsu Kaisen*. Se termine donc par « à » / « au » et sans ponctuation.
   *
   * Était en dur dans `app/[universe]/page.tsx` : « maudite » est du vocabulaire
   * JJK, qui s'affichait tel quel sur les autres animes.
   */
  arcadeLead: string;
  /** Titre du bloc d'appel à l'action en bas de la landing (question courte). */
  ctaTitle: string;
  /**
   * Titre de l'écran de MAINTENANCE. Était « Extension de Territoire en cours »
   * en dur — du lore JJK, et c'est la seule page que voit un visiteur pendant la
   * maintenance : sur un autre anime, elle ne parlait donc que de JJK.
   */
  maintenanceTitle: string;
  /** Titre H1 de la liste des jeux (`/games`). */
  gamesHeading: string;
  /** Paragraphe sous le H1 de la liste des jeux — 1 phrase, avant « Chaque jeu… ». */
  gamesLead: string;
  /**
   * Kanji unique affiché dans la pastille du hero (呪 pour JJK). Un seul
   * caractère : au-delà, la pastille déborde.
   */
  heroKanji: string;
  /**
   * Les 4 colonnes de kanji du décor de fond (`MangaDecor`), dans l'ordre :
   * haut-gauche, bas-gauche, haut-droit, bas-droit. Du lore de l'œuvre — 呪術廻
   * sur une landing Demon Slayer n'aurait aucun sens.
   */
  kanjiColumns: [string, string, string, string];
}

/**
 * Synchro d'images automatique (bouton « OUAIS ») pour cet univers.
 *
 * Vit ici et non dans `.env` : le tag de série change d'un anime à l'autre, alors
 * qu'une variable d'environnement est unique pour tout le déploiement — avec elle,
 * la synchro CSM ramenait des images de Jujutsu Kaisen.
 *
 * Absent = pas de synchro pour cet univers (le bouton le dit au lieu d'interroger
 * l'API avec le tag d'un autre anime).
 */
export interface UniverseBooru {
  /** Tag de série ajouté à chaque requête (ex. `chainsaw_man`). */
  seriesTag: string;
  /**
   * Restreint la synchro aux personnages portant cette valeur d'attribut. La CLÉ
   * est propre à l'univers (les attributs sont data-driven : `gender` en JJK,
   * `csmgender` en CSM), d'où sa présence dans la config plutôt qu'en dur.
   * Absent = tout le roster.
   */
  filter?: {
    attributeKey: string;
    value: string;
  };
}

/**
 * Attribut comparé par le jeu « Higher/Lower » dans cet univers.
 *
 * Le jeu classe deux personnages sur UN attribut du roster (défini en /admin,
 * donc data-driven) : NUMERIC, on compare les nombres ; ORDINAL, on compare le
 * rang des options et on départage les ex æquo par `Character.battleValue`.
 * Le LIBELLÉ affiché vient de l'attribut lui-même (`Attribute.label`), pas d'ici :
 * une seule source de vérité, éditable depuis l'admin.
 *
 * Absent = `cursedEnergy` (NUMERIC), l'attribut historique de JJK.
 */
export interface UniverseHigherLower {
  /** Clé de l'attribut comparé (ex. `csmpower` pour CSM). */
  attributeKey: string;
}

/** Branding logo d'un univers. */
export interface UniverseLogo {
  /** Chemin de l'image (asset statique). */
  src: string;
  /** Texte alternatif / nom de marque. */
  alt: string;
}

/** Configuration complète d'un univers (branding + thème + SEO). */
export interface UniverseConfig {
  /** Identifiant stable, minuscule, correspond à `Universe.slug` en base. */
  slug: string;
  /** Nom de marque affiché (ex. « JJK Arcade »). */
  name: string;
  /**
   * Nom de l'ŒUVRE dont le site est un fan-site (ex. « Jujutsu Kaisen »).
   * Distinct de `name` (la marque) : sert au JSON-LD (`isBasedOn`) et aux textes
   * qui parlent de l'anime lui-même, pas du site.
   */
  sourceWork: string;
  /** Titre SEO complet (balise <title> racine). */
  title: string;
  /** Meta description par défaut. */
  description: string;
  /**
   * Hostnames servant cet univers (sans port). Le matching accepte le domaine
   * exact ET ses sous-domaines. En dev/preview, la résolution retombe sur
   * `DEFAULT_UNIVERSE` (cf. registry).
   */
  domains: string[];
  /** Locale par défaut (ex. "fr_FR"). */
  locale: string;
  /** Mots-clés SEO cibles. */
  keywords: string[];
  logo: UniverseLogo;
  theme: UniverseTheme;
  labels: UniverseLabels;
  /**
   * Textes des jeux propres à cet univers (nom, description, tags), par id de
   * jeu (`lib/games/registry.ts`). Nom et description portent le vocabulaire de
   * l'œuvre (« JJKdle », « ton sorcier idéal », « roster JJK ») : chaque anime
   * les réécrit ici, sans dupliquer une ligne de code de jeu.
   *
   * Champ absent = valeur par défaut du registre, qui est celle de JJK : un
   * nouvel univers doit donc fournir un bloc COMPLET pour chaque jeu proposé.
   */
  gameCopy?: UniverseGameCopy;
  /**
   * Objets décoratifs flottants de la landing (SVG dessinés en code, cf.
   * `components/landing/MangaDecor`). Une VALEUR NOMMÉE et non un booléen : chaque
   * jeu d'objets est écrit pour un anime précis (l'ofuda et le sceau
   * d'asservissement de JJK ne veulent rien dire ailleurs).
   *
   * Absent = aucun objet flottant. Le décor se limite alors à la trame manga, aux
   * lignes de concentration et aux colonnes de kanji de l'univers, qui suffisent.
   */
  decorArtwork?: "jjk-cursed-objects";
  /** Attribut comparé par Higher/Lower. Absent = `cursedEnergy` (JJK). */
  higherLower?: UniverseHigherLower;
  /**
   * Réglages de « The Culling Tower » : quels attributs portent les arcs du
   * récit, l'ultime et l'énergie, et à quel archétype de capacité correspond
   * chaque catégorie du builder.
   *
   * Absent = la config JJK, qui fait office de défaut. Un champ absent au sein
   * de l'objet garde lui aussi la valeur JJK (même convention que `gameCopy`).
   * C'est le SEUL endroit où un univers déclare quoi que ce soit sur la Tour :
   * `lib/games/tower/` ne doit contenir aucun `if (universe === …)`.
   */
  tower?: TowerConfigOverride;
  /** Synchro d'images automatique (bouton « OUAIS »). Absent = désactivée. */
  booru?: UniverseBooru;
}
