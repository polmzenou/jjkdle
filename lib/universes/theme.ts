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

/**
 * Bloc CSS `:root { … }` du thème d'un univers, à injecter dans un `<style>` du
 * layout racine. Sert de source unique : la page rend le thème AVANT le premier
 * paint, donc aucun flash de couleurs par défaut.
 */
export function themeCss(config: UniverseConfig): string {
  const vars = Object.entries(themeCssVars(config.theme))
    .map(([name, value]) => `${name}:${value}`)
    .join(";");
  return `:root{${vars}}`;
}
