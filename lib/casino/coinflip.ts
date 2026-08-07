/**
 * PILE OU FACE — règles et calcul de gain. Module PUR (aucun import), donc
 * lisible depuis le serveur, depuis le composant client et depuis les tests.
 *
 * ── Pourquoi ce jeu n'a NI table, NI état persisté ────────────────────────
 * Une manche tient tout entière dans un aller-retour : on mise, la pièce tombe,
 * le solde est à jour. Il n'y a donc rien à mémoriser entre deux lancers — ni
 * ligne en base (comme `CasinoTable`), ni cookie scellé (comme les jeux à état
 * de lib/games/seal.ts).
 *
 * C'est un choix de SÛRETÉ autant que de simplicité. La variante « quitte ou
 * double » où une cagnotte s'accumule côté serveur entre deux lancers obligerait
 * à stocker un montant gagné mais pas encore crédité ; un état scellé côté
 * client serait alors REJOUABLE (encaisser, puis renvoyer l'ancien sceau pour
 * encaisser une seconde fois). Ici la relance est économiquement identique et
 * gratuite à sécuriser : le gain est crédité immédiatement, et « relancer avec
 * les gains » n'est qu'une mise ordinaire du montant qu'on vient d'encaisser.
 *
 * Corollaire : la SÉRIE de victoires affichée à l'écran est purement
 * décorative. Le serveur ne la connaît pas, ne la vérifie pas et ne l'utilise
 * dans aucun calcul de gain — elle ne peut donc pas être trichée.
 */

/** Les deux faces. `PILE` = le revers, `FACE` = l'effigie. */
export type CoinSide = "PILE" | "FACE";

export const COIN_SIDES: readonly CoinSide[] = ["PILE", "FACE"] as const;

/**
 * Ce que rapporte un lancer gagné, MISE INCLUSE.
 *
 * ⚠️ Même convention que lib/casino/payout.ts, et pour la même raison : la mise
 * est DÉJÀ partie du solde au moment du lancer (cf. `flipCoinAction`). Un gain
 * doit donc recréditer la mise ET le bénéfice. Compter ce multiplicateur en gain
 * net reviendrait à voler une mise au joueur à chaque lancer gagné.
 *
 * 1,95 et non 2 : la pièce, elle, est parfaitement équilibrée (tirage
 * cryptographique, cf. `flipCoinAction`). Payer 2 × rendrait le jeu exactement
 * neutre — le casino ne serait plus qu'un tirage au sort et ne gagnerait jamais
 * rien. Les 5 % retenus sur le gain sont l'avantage de la maison, l'équivalent
 * du bust du joueur au blackjack, et c'est la SEULE façon dont la table gagne
 * ici. Il est affiché en clair au joueur, sur la page comme sur la tuile
 * d'accueil : un casino honnête annonce son taux.
 */
export const COINFLIP_MULTIPLIER = 1.95;

/** Avantage de la maison, en % — dérivé, jamais saisi deux fois. */
export const COINFLIP_HOUSE_EDGE_PCT = (1 - COINFLIP_MULTIPLIER / 2) * 100;

/** Bilan d'un lancer, tel qu'il est renvoyé au client et affiché. */
export interface CoinflipResult {
  /** Le camp choisi par le joueur. */
  side: CoinSide;
  /** Le camp sorti. */
  landed: CoinSide;
  won: boolean;
  bet: number;
  /** Total recrédité, MISE INCLUSE (0 si perdu). */
  payout: number;
  /** Gain NET (payout − mise) : négatif si perdu. C'est ce qu'on affiche. */
  net: number;
}

/** Valide une face reçue du client (le serveur ne croit jamais la chaîne). */
export function isCoinSide(value: unknown): value is CoinSide {
  return value === "PILE" || value === "FACE";
}

/** L'autre face. Sert à l'affichage (« il fallait dire… »). */
export function otherSide(side: CoinSide): CoinSide {
  return side === "PILE" ? "FACE" : "PILE";
}

/**
 * Résout un lancer.
 *
 * L'arrondi est au PLUS PROCHE et non tronqué, contrairement au blackjack. La
 * mise minimale peut descendre à 1 coin en admin (`MIN_BET_FLOOR`) : tronquer
 * ferait qu'un lancer gagné à 1 coin rendrait exactement la mise — un gain qui
 * ne rapporte rien est un bug du point de vue du joueur, pas une subtilité de
 * taux. Le demi-coin ainsi lâché sur les toutes petites mises est sans effet sur
 * l'équilibre de la maison.
 */
export function resolveFlip(
  bet: number,
  side: CoinSide,
  landed: CoinSide,
): CoinflipResult {
  const won = side === landed;
  const payout = won ? Math.round(bet * COINFLIP_MULTIPLIER) : 0;
  return { side, landed, won, bet, payout, net: payout - bet };
}
