import type { Boss } from "./types";

/**
 * Boss du draft, par univers — module PUR.
 *
 * Source de vérité au runtime : la table `DraftBoss` (éditable en /admin, cf.
 * l'onglet Draft). Cette liste est le POINT DE DÉPART, écrit une fois par
 * univers : le bouton « Tout importer » la recopie en base, et
 * `getDraftBosses()` s'en sert de repli tant qu'aucune ligne n'existe — sans
 * quoi un univers fraîchement ouvert n'aurait aucun boss à affronter.
 *
 * ── Les PV ────────────────────────────────────────────────────────────────
 * Le « PV » d'un boss est le SEUIL de score global caché à dépasser pour le
 * vaincre (cf. `resolveCombat`). L'échelle 130 → 240 vient de la calibration
 * JJK par simulation (`scripts/calibrate.mjs`, cf. `scoring.ts`). Les autres
 * univers la reprennent telle quelle : formule de score, budget et barèmes de
 * tier y sont identiques, donc la courbe de difficulté part au même endroit.
 * C'est un point de départ, pas un verdict — l'admin l'ajuste boss par boss.
 */

/** Entrée de la liste par défaut : le boss et le personnage qui lui prête son visage. */
export interface BossSeed {
  /** Clé stable par univers (= slug de `DraftBoss`). */
  slug: string;
  /** Nom affiché si le personnage source est introuvable en base. */
  name: string;
  /** `Character.slug` fournissant nom et image. */
  characterSlug: string;
  /** Seuil de score à dépasser (« PV » dans l'admin). */
  threshold: number;
  /** Image de repli quand le personnage source n'existe pas (JJK historique). */
  image?: string;
}

/** Échelle de PV commune, du plus faible au plus fort. */
const THRESHOLDS = [130, 178, 197, 230, 235, 240] as const;

/** Construit les 6 entrées d'un univers depuis la liste ordonnée des boss. */
function ladder(
  entries: readonly (readonly [slug: string, name: string, image?: string])[],
): BossSeed[] {
  return entries.map(([characterSlug, name, image], i) => ({
    slug: characterSlug,
    name,
    characterSlug,
    threshold: THRESHOLDS[i] ?? THRESHOLDS[THRESHOLDS.length - 1],
    ...(image ? { image } : {}),
  }));
}

const ASSET = (file: string) => `/assets/characters/${file}`;

/**
 * Les 6 boss de chaque univers, dans l'ordre d'affrontement (du plus faible au
 * plus fort). Tous les `characterSlug` ont été vérifiés présents dans le roster
 * de leur univers.
 */
export const DEFAULT_DRAFT_BOSSES: Record<string, BossSeed[]> = {
  jjk: ladder([
    ["panda", "Panda", ASSET("Panda_Portrait_Anime.webp")],
    ["mahito", "Mahito", ASSET("Mahito_Portrait_Anime.webp")],
    ["geto", "Suguru Geto", ASSET("Suguru_Portrait_Anime.webp")],
    ["sukuna", "Ryomen Sukuna", ASSET("Sukuna_Portrait_Anime.webp")],
    ["gojo", "Satoru Gojo", ASSET("Satoru_Portrait_Anime.webp")],
    ["yuji", "Yuji Itadori", ASSET("Yuji_Portrait_Modulo.webp")],
  ]),
  csm: ladder([
    ["kobeni-higashiyama", "Kobeni Higashiyama"],
    ["aki-hayakawa", "Aki Hayakawa"],
    ["kishibe", "Kishibe"],
    ["makima", "Makima"],
    ["yoru", "Yoru"],
    ["darkness-devil", "Démon des Ténèbres"],
  ]),
  aot: ladder([
    ["flock-forster", "Flock Forster"],
    ["titan-charrette", "Titan Charrette"],
    ["titan-machoire", "Titan Mâchoire"],
    ["titan-assailant", "Titan Assaillant"],
    ["titan-colossal", "Titan Colossal"],
    ["titan-originel", "Titan Originel"],
  ]),
  kny: ladder([
    ["giyu-tomioka", "Giyu Tomioka"],
    ["gyomei-himejima", "Gyomei Himejima"],
    ["akaza", "Akaza"],
    ["kokushibo", "Kokushibo"],
    ["muzan-kibutsuji", "Muzan Kibutsuji"],
    ["yoriichi-tsugikuni", "Yoriichi Tsugikuni"],
  ]),
  tg: ladder([
    ["touka-kirishima", "Touka Kirishima"],
    ["juuzou-suzuya", "Juuzou Suzuya"],
    ["eto-yoshimura", "Eto Yoshimura"],
    ["ken-kaneki", "Ken Kaneki"],
    ["kichimura-washuu", "Kichimura Washuu"],
    ["kishou-arima", "Kishou Arima"],
  ]),
  bleach: ladder([
    ["ulquiorra-cifer", "Ulquiorra Cifer"],
    ["genryusai-yamamoto", "Genryusai Yamamoto"],
    ["ichigo-kurosaki", "Ichigo Kurosaki"],
    ["sosuke-aizen", "Sosuke Aizen"],
    ["yhwach", "Yhwach"],
    ["ichibe-hyosube", "Ichibe Hyosube"],
  ]),
};

/**
 * Liste par défaut d'un univers, prête à jouer. Un univers inconnu retombe sur
 * JJK plutôt que sur une liste vide : sans boss, le combat n'a pas lieu et le
 * joueur ne peut rien marquer.
 */
export function defaultBossesFor(universeSlug: string): Boss[] {
  const seeds = DEFAULT_DRAFT_BOSSES[universeSlug] ?? DEFAULT_DRAFT_BOSSES.jjk;
  return seeds.map((s) => ({
    id: s.slug,
    name: s.name,
    threshold: s.threshold,
    ...(s.image ? { image: s.image } : {}),
  }));
}
