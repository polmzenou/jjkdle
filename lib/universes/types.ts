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
   * Nom de la « jauge de puissance » lore du monde, affichée par Higher/Lower et
   * (par défaut) par l'attribut numérique JJKdle. JJK : « Énergie occulte ».
   */
  energyLabel: string;
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
}
