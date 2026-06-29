/**
 * Mise en page du profil PUBLIC (`/u/[username]`).
 *
 * Le joueur choisit, depuis `/account/customize`, ce qu'il expose sur son profil
 * public et dans quel ordre. Le bloc d'en-tête (bannière + avatar + pseudo +
 * barre de niveau) est TOUJOURS affiché tout en haut et n'est pas configurable.
 *
 * Deux familles d'options :
 *  - Toggles d'en-tête (`showTitle`, `showFrame`) : le titre sous le pseudo et le
 *    cadre autour de l'avatar sont ancrés à l'en-tête → visibilité seule.
 *  - Sections de corps (`sections`) : badges et scores. L'ORDRE du tableau = ordre
 *    d'affichage ; chaque entrée porte sa propre visibilité.
 *
 * La préférence est stockée en JSON libre sur `User.profileLayout` puis
 * normalisée à la lecture par `normalizeProfileLayout` (source de vérité = ce
 * fichier, jamais le JSON brut).
 */

/** Sections de corps réordonnables du profil public. */
export const PROFILE_SECTIONS = ["badges", "scores"] as const;
export type ProfileSectionKey = (typeof PROFILE_SECTIONS)[number];

/** Libellé humain d'une section (UI de customisation). */
export const SECTION_LABELS: Record<ProfileSectionKey, string> = {
  badges: "🎖️ Badges",
  scores: "🏆 Scores leaderboards",
};

/** Visibilité + position d'une section de corps. */
export interface ProfileSectionPref {
  key: ProfileSectionKey;
  visible: boolean;
}

export interface ProfileLayout {
  /** Afficher le titre équipé sous le pseudo. */
  showTitle: boolean;
  /** Afficher le cadre équipé autour de l'avatar. */
  showFrame: boolean;
  /** Sections de corps dans l'ordre d'affichage choisi. */
  sections: ProfileSectionPref[];
}

/** Layout par défaut : tout est affiché, badges avant scores. */
export const DEFAULT_PROFILE_LAYOUT: ProfileLayout = {
  showTitle: true,
  showFrame: true,
  sections: PROFILE_SECTIONS.map((key) => ({ key, visible: true })),
};

/** Copie indépendante du layout par défaut (sections clonées). */
function defaultLayout(): ProfileLayout {
  return {
    showTitle: true,
    showFrame: true,
    sections: PROFILE_SECTIONS.map((key) => ({ key, visible: true })),
  };
}

function isSectionKey(value: unknown): value is ProfileSectionKey {
  return (
    typeof value === "string" &&
    (PROFILE_SECTIONS as readonly string[]).includes(value)
  );
}

/**
 * Normalise un JSON brut (issu de la base ou du client) en `ProfileLayout`
 * valide : booléens contrôlés, sections dédupliquées et ramenées à l'ensemble
 * connu, toute section manquante ajoutée à la fin (visible par défaut). Tolérant
 * aux entrées partielles/corrompues → ne jette jamais.
 */
export function normalizeProfileLayout(raw: unknown): ProfileLayout {
  if (!raw || typeof raw !== "object") return defaultLayout();
  const obj = raw as Record<string, unknown>;

  const showTitle = typeof obj.showTitle === "boolean" ? obj.showTitle : true;
  const showFrame = typeof obj.showFrame === "boolean" ? obj.showFrame : true;

  const rawSections = Array.isArray(obj.sections) ? obj.sections : [];
  const seen = new Set<ProfileSectionKey>();
  const sections: ProfileSectionPref[] = [];

  for (const entry of rawSections) {
    if (!entry || typeof entry !== "object") continue;
    const key = (entry as Record<string, unknown>).key;
    if (!isSectionKey(key) || seen.has(key)) continue;
    seen.add(key);
    const visible = (entry as Record<string, unknown>).visible;
    sections.push({ key, visible: typeof visible === "boolean" ? visible : true });
  }

  // Toute section connue absente du JSON est ajoutée à la fin (visible).
  for (const key of PROFILE_SECTIONS) {
    if (!seen.has(key)) sections.push({ key, visible: true });
  }

  return { showTitle, showFrame, sections };
}
