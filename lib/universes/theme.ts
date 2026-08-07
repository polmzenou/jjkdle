import type { UniverseConfig, UniverseTheme } from "./types";

/**
 * Thème d'un univers → VARIABLES CSS (étape 4).
 *
 * Les composants continuent d'utiliser les classes Tailwind habituelles
 * (`bg-domain`, `text-cursed-light`, `bg-void-800/60`…) ; ces classes pointent
 * maintenant vers des variables CSS (cf. tailwind.config.ts), et c'est le layout
 * racine qui injecte les valeurs de l'univers courant. Changer d'anime change
 * donc toute la palette sans toucher une seule classe.
 *
 * ⚠️ Les variables contiennent des CANAUX RGB séparés par des espaces
 * ("124 58 237") et non des couleurs CSS : c'est ce qui permet aux modificateurs
 * d'opacité de Tailwind (`bg-domain/10`) de continuer à fonctionner, via
 * `rgb(var(--x) / <alpha-value>)`. Un hex direct les casserait toutes.
 *
 * Module PUR (aucun import serveur).
 */

/** "#7c3aed" → "124 58 237". Accepte les formes #rgb et #rrggbb. */
export function hexToRgbChannels(hex: string): string {
  let h = hex.trim().replace(/^#/, "");
  if (h.length === 3) {
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  }
  const n = Number.parseInt(h, 16);
  if (h.length !== 6 || Number.isNaN(n)) {
    throw new Error(`Couleur de thème invalide : "${hex}" (attendu #rrggbb).`);
  }
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
}

/** Nom de variable CSS → valeur, pour un thème d'univers. */
export function themeCssVars(theme: UniverseTheme): Record<string, string> {
  const c = hexToRgbChannels;
  return {
    "--color-domain": c(theme.primary),
    "--color-domain-light": c(theme.primaryLight),
    "--color-domain-dark": c(theme.primaryDark),
    "--color-cursed": c(theme.accent),
    "--color-cursed-light": c(theme.accentLight),
    "--color-cursed-dark": c(theme.accentDark),
    "--color-void": c(theme.surface.DEFAULT),
    "--color-void-900": c(theme.surface.s900),
    "--color-void-800": c(theme.surface.s800),
    "--color-void-700": c(theme.surface.s700),
    "--color-void-600": c(theme.surface.s600),
    // Halos : les box-shadows sont reconstruites depuis les canaux (cf. tailwind).
    "--glow": theme.glow,
    "--glow-accent": theme.glowAccent,
  };
}

/** Sérialise des variables CSS en bloc `:root { … }`. */
function rootBlock(vars: Record<string, string>): string {
  return `:root{${Object.entries(vars)
    .map(([name, value]) => `${name}:${value}`)
    .join(";")}}`;
}

/**
 * Bloc CSS `:root { … }` du thème d'un univers, à injecter dans un `<style>` du
 * layout racine. Sert de source unique : la page rend le thème AVANT le premier
 * paint, donc aucun flash de couleurs par défaut.
 */
export function themeCss(config: UniverseConfig): string {
  return rootBlock(themeCssVars(config.theme));
}

/**
 * Palette NEUTRE du hub : la page de choix d'univers ne doit porter la marque
 * d'AUCUN anime. On garde les surfaces sombres (cohérence de la plateforme) mais
 * un accent désaturé — chaque carte d'univers injecte ensuite sa propre palette.
 */
const HUB_THEME: Record<string, string> = {
  "--color-domain": "100 116 139", // slate-500
  "--color-domain-light": "148 163 184", // slate-400
  "--color-domain-dark": "51 65 85", // slate-700
  "--color-cursed": "120 113 108", // stone-500
  "--color-cursed-light": "168 162 158", // stone-400
  "--color-cursed-dark": "68 64 60", // stone-700
  "--color-void": "9 9 11",
  "--color-void-900": "9 9 11",
  "--color-void-800": "24 24 27",
  "--color-void-700": "39 39 42",
  "--color-void-600": "63 63 70",
  "--glow": "0 0 20px rgb(100 116 139 / 0.35)",
  "--glow-accent": "0 0 20px rgb(120 113 108 / 0.35)",
};

/** Bloc CSS du thème neutre du hub. */
export function hubThemeCss(): string {
  return rootBlock(HUB_THEME);
}

/**
 * Palette du CASINO : feutre vert + or. Comme le hub, le casino ne porte la
 * marque d'aucun anime (il est hors univers, cf. UNIVERSE_FREE_PREFIXES) — mais
 * là où le hub s'efface en gris neutre, le casino assume une identité propre :
 * c'est un lieu, pas un carrefour.
 *
 * `domain` = le tapis, `cursed` = les jetons et les liserés dorés. Les surfaces
 * restent très sombres, teintées vert, pour que les cartes blanches ressortent.
 */
const CASINO_THEME: Record<string, string> = {
  "--color-domain": "16 122 87", // feutre
  "--color-domain-light": "52 211 153",
  "--color-domain-dark": "6 78 59",
  "--color-cursed": "202 138 4", // or
  "--color-cursed-light": "250 204 21",
  "--color-cursed-dark": "133 77 14",
  "--color-void": "4 14 10",
  "--color-void-900": "6 20 15",
  "--color-void-800": "9 28 21",
  "--color-void-700": "14 38 29",
  "--color-void-600": "22 55 42",
  "--glow": "0 0 20px rgb(52 211 153 / 0.35)",
  "--glow-accent": "0 0 20px rgb(250 204 21 / 0.35)",
};

/** Bloc CSS du thème du casino. */
export function casinoThemeCss(): string {
  return rootBlock(CASINO_THEME);
}

/**
 * Variables CSS du casino, à poser en style inline sur un élément isolé — c'est
 * ce qui permet à la carte « Casino » du hub d'afficher son feutre et son or au
 * milieu d'une page rendue en gris neutre, sans écrire une seule couleur en dur.
 * Même mécanique que `themeCssVars` pour les cartes d'univers.
 */
export function casinoThemeVars(): Record<string, string> {
  return { ...CASINO_THEME };
}
