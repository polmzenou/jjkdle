import type { BoosterKind } from "@/lib/cards/boosters";

/**
 * ROULETTE de la boutique — catalogue des lots. Module PUR (aucune I/O, `rng`
 * injectable) : importable côté client pour dessiner la roue, et côté serveur,
 * seul endroit où le lot est réellement TIRÉ (lib/roulette/store.ts).
 *
 * Une roue par univers, mais un seul catalogue : les lots sont identiques dans
 * tous les animes, seuls le thème et le pool de cartes changent.
 */

/** Générateur pseudo-aléatoire : renvoie un flottant dans [0, 1[. */
export type Rng = () => number;

export type RouletteSlot =
  | { id: string; kind: "coins"; amount: number; weight: number }
  | { id: string; kind: "booster"; booster: BoosterKind; weight: number }
  | { id: string; kind: "card"; weight: number };

/** Un tour gratuit toutes les 5 h, par univers. */
export const FREE_SPIN_COOLDOWN_MS = 5 * 60 * 60 * 1000;

/** Prix d'un tour supplémentaire avant la fin du délai. */
export const PAID_SPIN_PRICE = 100;

/**
 * Les 12 cases, dans l'ORDRE DE LA ROUE (sens horaire, case 0 sous le pointeur
 * au repos). Coins et lots « objet » alternent, et les deux boosters simples
 * sont diamétralement opposés — deux cases identiques côte à côte feraient une
 * grosse part monochrome.
 *
 * Poids en pourcentages entiers (somme = 100, vérifiée par les tests) : ce sont
 * les taux affichés au joueur, tels quels.
 */
export const ROULETTE_SLOTS: readonly RouletteSlot[] = [
  { id: "coins-50", kind: "coins", amount: 50, weight: 18 },
  { id: "booster-gold", kind: "booster", booster: "gold", weight: 1 },
  { id: "coins-300", kind: "coins", amount: 300, weight: 8 },
  { id: "booster-simple-a", kind: "booster", booster: "simple", weight: 12 },
  { id: "coins-75", kind: "coins", amount: 75, weight: 15 },
  { id: "card", kind: "card", weight: 4 },
  { id: "coins-1000", kind: "coins", amount: 1000, weight: 3 },
  { id: "booster-bronze", kind: "booster", booster: "bronze", weight: 8 },
  { id: "coins-100", kind: "coins", amount: 100, weight: 14 },
  { id: "booster-simple-b", kind: "booster", booster: "simple", weight: 12 },
  { id: "coins-2000", kind: "coins", amount: 2000, weight: 1 },
  { id: "booster-silver", kind: "booster", booster: "silver", weight: 4 },
];

/** Tire l'INDEX d'une case, pondéré par `weight`. */
export function pickSlot(rng: Rng = Math.random): number {
  const total = ROULETTE_SLOTS.reduce((sum, s) => sum + s.weight, 0);
  // `rng()` ∈ [0, 1[ → `roll` ∈ [0, total[, jamais égal au total.
  let roll = rng() * total;
  for (let i = 0; i < ROULETTE_SLOTS.length; i++) {
    roll -= ROULETTE_SLOTS[i]!.weight;
    if (roll < 0) return i;
  }
  // Filet de sécurité contre les arrondis flottants.
  return ROULETTE_SLOTS.length - 1;
}

/** Index d'une case par son id, -1 si inconnue. */
export function slotIndex(id: string): number {
  return ROULETTE_SLOTS.findIndex((s) => s.id === id);
}

/** Libellé court d'un lot (FR), pour la légende et le « dernier gain ». */
export function slotLabel(slot: RouletteSlot): string {
  switch (slot.kind) {
    case "coins":
      return `${slot.amount.toLocaleString("fr-FR")} coins`;
    case "card":
      return "Carte au hasard";
    case "booster":
      return BOOSTER_LABELS[slot.booster];
  }
}

const BOOSTER_LABELS: Record<BoosterKind, string> = {
  simple: "Booster simple",
  bronze: "Booster bronze",
  silver: "Booster argent",
  gold: "Booster doré",
};

/**
 * Temps restant avant le prochain tour gratuit (0 = disponible).
 * `lastFreeSpinAt = null` → jamais tourné → disponible.
 */
export function msUntilFreeSpin(
  lastFreeSpinAt: Date | null | undefined,
  now: number = Date.now(),
): number {
  if (!lastFreeSpinAt) return 0;
  return Math.max(0, lastFreeSpinAt.getTime() + FREE_SPIN_COOLDOWN_MS - now);
}
