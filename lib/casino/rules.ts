/**
 * Constantes de règle du casino. Module PUR (aucun import) : lisible depuis le
 * serveur, le client et les tests.
 *
 * Toutes les durées sont en millisecondes et servent à calculer une ÉCHÉANCE
 * ABSOLUE (`CasinoTable.phaseDeadline`), jamais un `setTimeout` serveur : sur
 * Vercel il n'y a ni tâche de fond ni cron, et une fonction serverless meurt
 * avec sa réponse. Ce sont les clients qui réclament l'avancement, mais c'est le
 * serveur qui vérifie l'échéance (cf. lib/casino/engine.ts).
 */

/** Sièges maximum à une table publique. */
export const MAX_SEATS = 5;

/** Jeux de 52 cartes dans le sabot. 6 = le standard des casinos. */
export const DECK_COUNT = 6;

/**
 * Sous ce ratio de cartes restantes, le sabot est reconstitué et rebattu entre
 * deux manches (le « cut card » réel). Rebattre systématiquement rendrait le
 * comptage inutile ; ne jamais rebattre viderait le sabot en pleine main.
 */
export const RESHUFFLE_RATIO = 0.25;

// ── Horloges de phase (tables PUBLIQUES uniquement) ───────────────────────
// Une table SOLO n'a aucune échéance sur BETTING et PLAYER_TURNS : personne
// n'attend, le joueur prend son temps.

/** Fenêtre de mise. */
export const BETTING_MS = 20_000;
/** Fenêtre d'animation de la distribution. */
export const DEAL_MS = 1_200;
/** Temps de réflexion par tour de joueur. À l'expiration : STAND d'office. */
export const TURN_MS = 20_000;
/** Fenêtre d'animation du croupier. */
export const DEALER_MS = 1_800;
/** Durée du récapitulatif avant la manche suivante. */
export const RECAP_MS = 7_000;

/** Mise minimale par défaut (réglable en admin, cf. lib/casino/config.ts). */
export const DEFAULT_MIN_BET = 10;

/** Manches consécutives sans miser avant éviction du siège (AFK silencieux). */
export const AFK_MAX_MISSED = 2;

/**
 * Une table sans signe de vie depuis ce délai est supprimée. Le balayage est
 * PARESSEUX (déclenché par le matchmaking) faute de cron : une table zombie ne
 * coûte qu'une ligne, mais elle bloquerait un `matchKey`.
 */
export const TABLE_TTL_MS = 30 * 60_000;

/**
 * Au-delà de ce délai sans avancer alors qu'aucune échéance n'est posée, une
 * table est considérée BLOQUÉE : le tick qui avait pris le verrou est mort avant
 * d'écrire. La transition étant une fonction pure de l'état persisté, on la
 * rejoue (cf. la branche de reprise dans engine.ts).
 */
export const STUCK_MS = 15_000;
