import { draw, fullShoeSize, newShoe, type Card } from "./cards";
import { playDealer } from "./dealer";
import { handValue, isBlackjack } from "./hand";
import { resolveSeat, seatPayout } from "./payout";
import {
  AFK_MAX_MISSED,
  BETTING_MS,
  DEALER_MS,
  DEAL_MS,
  RECAP_MS,
  RESHUFFLE_RATIO,
  TURN_MS,
} from "./rules";
import type {
  BjHand,
  CasinoPhaseValue,
  SeatState,
  TableState,
  Transition,
} from "./types";

/**
 * MACHINE À ÉTATS de la manche de blackjack. Module PUR — c'est le point
 * essentiel de ce fichier.
 *
 * Toute la boucle de jeu (mises → distribution → tours → croupier → paiements →
 * manche suivante) est ici, sous forme d'une fonction de l'état vers l'état
 * suivant. Rien n'écrit en base, rien ne lit l'horloge autrement que par le
 * `nowMs` reçu. Deux conséquences qui portent tout le reste :
 *
 *  1. La boucle est testable exhaustivement sans base ni serveur
 *     (cf. machine.test.ts).
 *  2. Une transition peut être REJOUÉE à l'identique. C'est ce qui autorise la
 *     reprise après crash dans engine.ts : si une fonction serverless meurt
 *     entre le verrou et l'écriture, rejouer depuis l'état persisté redonne
 *     exactement la même transition.
 *
 * ⚠️ Les tirages consomment le sabot par l'avant sans le muter. `nextPhase` ne
 * doit JAMAIS appeler `Math.random` en dehors du rebattage : c'est le sabot déjà
 * mélangé qui fait foi, sinon le rejeu tirerait d'autres cartes.
 */

/** Timings d'une phase. `null` = pas d'horloge, la table attend le joueur. */
function deadlineFor(phase: CasinoPhaseValue, state: TableState): number | null {
  // Une table SOLO n'a pas d'horloge sur les phases où le joueur décide :
  // personne n'attend derrière lui. Les phases d'animation gardent la leur, ce
  // sont elles qui font avancer la main.
  const solo = state.mode === "SOLO";
  switch (phase) {
    case "BETTING":
      return solo ? null : BETTING_MS;
    case "DEALING":
      return DEAL_MS;
    case "PLAYER_TURNS":
      return solo ? null : TURN_MS;
    case "DEALER":
      return DEALER_MS;
    case "SETTLED":
      return solo ? null : RECAP_MS;
  }
}

/** Un siège a-t-il misé pour la manche en cours ? */
export function hasBet(seat: SeatState, handNumber: number): boolean {
  return seat.betHandNumber === handNumber && seat.bet > 0;
}

/** Sièges servis cette manche, dans l'ordre des places. */
function bettingSeats(state: TableState): SeatState[] {
  return state.seats
    .filter((seat) => hasBet(seat, state.handNumber))
    .sort((a, b) => a.seat - b.seat);
}

/** La main est-elle terminée (plus aucune décision à prendre) ? */
function handDone(hand: BjHand): boolean {
  return hand.status !== "PLAYING";
}

/** Toutes les mains d'un siège sont-elles terminées ? */
export function seatDone(seat: SeatState): boolean {
  return seat.hands.length > 0 && seat.hands.every(handDone);
}

/**
 * Prochain siège à jouer, après `from` (exclu). `null` si plus personne.
 * Un siège dont toutes les mains sont finies (blackjack servi, bust) est sauté.
 */
export function nextActiveSeat(
  state: TableState,
  from: number | null,
): number | null {
  const candidates = bettingSeats(state).filter(
    (seat) => !seatDone(seat) && (from === null || seat.seat > from),
  );
  return candidates.length > 0 ? candidates[0].seat : null;
}

/** Transition « rien ne bouge » : sert de base à chaque cas. */
function stay(state: TableState, phase: CasinoPhaseValue): Transition {
  return {
    phase,
    deadlineMs: deadlineFor(phase, state),
    activeSeat: state.activeSeat,
    dealerCards: state.dealerCards,
    shoe: state.shoe,
    seats: state.seats,
    handNumber: state.handNumber,
    credits: [],
    evict: [],
  };
}

/**
 * Reconstitue le sabot s'il descend sous le seuil de coupe. Fait ENTRE deux
 * manches uniquement — rebattre en pleine main changerait les cartes déjà
 * comptées par les joueurs.
 */
function reshuffleIfNeeded(shoe: Card[]): Card[] {
  return shoe.length < fullShoeSize() * RESHUFFLE_RATIO ? newShoe() : shoe;
}

/**
 * LA transition. Prend l'état courant et l'instant, renvoie l'état suivant.
 *
 * Appelée uniquement quand l'échéance de la phase est atteinte (le contrôle est
 * fait par l'appelant, qui détient le verrou — cf. engine.ts).
 */
export function nextPhase(state: TableState, nowMs: number): Transition {
  switch (state.phase) {
    case "BETTING":
      return fromBetting(state);
    case "DEALING":
      return fromDealing(state);
    case "PLAYER_TURNS":
      return fromPlayerTurns(state);
    case "DEALER":
      return fromDealer(state);
    case "SETTLED":
      return fromSettled(state, nowMs);
  }
}

// ── BETTING → DEALING ─────────────────────────────────────────────────────

function fromBetting(state: TableState): Transition {
  const players = bettingSeats(state);
  // Personne n'a misé : la table publique tourne à vide, on rouvre les mises
  // sans consommer de manche. C'est aussi ce qui laisse le temps à un joueur qui
  // vient de s'asseoir de miser à la manche suivante.
  if (players.length === 0) return stay(state, "BETTING");

  // Distribution réelle : 2 cartes par joueur, 2 au croupier.
  let shoe = state.shoe;
  const dealt = new Map<string, BjHand[]>();
  for (const seat of players) {
    const pulled = draw(shoe, 2);
    shoe = pulled.shoe;
    dealt.set(seat.id, [
      {
        cards: pulled.cards,
        bet: seat.bet,
        doubled: false,
        status: isBlackjack(pulled.cards) ? "BLACKJACK" : "PLAYING",
      },
    ]);
  }
  const dealerPull = draw(shoe, 2);
  shoe = dealerPull.shoe;

  const seats = state.seats.map((seat) =>
    dealt.has(seat.id)
      ? { ...seat, hands: dealt.get(seat.id)!, activeHand: 0, lastResult: null }
      : { ...seat, hands: [], activeHand: 0, lastResult: null },
  );

  return {
    phase: "DEALING",
    deadlineMs: deadlineFor("DEALING", state),
    activeSeat: null,
    dealerCards: dealerPull.cards,
    shoe,
    seats,
    handNumber: state.handNumber,
    credits: [],
    evict: [],
  };
}

// ── DEALING → PLAYER_TURNS | DEALER ───────────────────────────────────────

function fromDealing(state: TableState): Transition {
  // Si tout le monde a un blackjack naturel (ou que personne n'a de décision à
  // prendre), la phase de tours n'aurait rien à faire jouer : on passe la main
  // au croupier directement.
  const active = nextActiveSeat(state, null);
  const phase: CasinoPhaseValue = active === null ? "DEALER" : "PLAYER_TURNS";
  return {
    ...stay(state, phase),
    activeSeat: active,
  };
}

// ── PLAYER_TURNS : expiration du tour = STAND d'office ────────────────────

function fromPlayerTurns(state: TableState): Transition {
  const current = state.activeSeat;
  // Le joueur n'a pas décidé à temps : on le fait RESTER, jamais tirer. Un stand
  // ne peut pas faire sauter une main — un hit d'office pourrait ruiner un 20.
  const seats = state.seats.map((seat) =>
    seat.seat === current
      ? {
          ...seat,
          hands: seat.hands.map((hand) =>
            hand.status === "PLAYING" ? { ...hand, status: "STAND" as const } : hand,
          ),
        }
      : seat,
  );

  const after: TableState = { ...state, seats };
  const active = nextActiveSeat(after, current);
  const phase: CasinoPhaseValue = active === null ? "DEALER" : "PLAYER_TURNS";
  return {
    ...stay(after, phase),
    activeSeat: active,
    seats,
  };
}

// ── DEALER → SETTLED : le croupier joue, puis on paie ─────────────────────

function fromDealer(state: TableState): Transition {
  const players = bettingSeats(state);

  // Le croupier ne tire QUE s'il reste une main à battre. Si tout le monde a
  // sauté, sa carte cachée est révélée mais il ne joue pas — c'est la règle, et
  // ça évite de brûler des cartes du sabot pour rien.
  const someoneStanding = players.some((seat) =>
    seat.hands.some((hand) => handValue(hand.cards).total <= 21),
  );
  const played = someoneStanding
    ? playDealer(state.dealerCards, state.shoe)
    : { cards: [...state.dealerCards], shoe: [...state.shoe] };

  // Paiements. Ils sont calculés À L'ENTRÉE dans SETTLED, pas à la sortie : le
  // joueur voit son solde bouger en même temps que le récapitulatif s'affiche,
  // et un joueur parti entre-temps est quand même payé.
  const credits: Transition["credits"] = [];
  const seats = state.seats.map((seat) => {
    if (!hasBet(seat, state.handNumber)) return seat;
    const result = resolveSeat(seat, played.cards);
    const amount = seatPayout(result);
    if (amount > 0) {
      credits.push({
        seatId: seat.id,
        userId: seat.userId,
        amount,
        handNumber: state.handNumber,
      });
    }
    return { ...seat, lastResult: result };
  });

  return {
    phase: "SETTLED",
    deadlineMs: deadlineFor("SETTLED", state),
    activeSeat: null,
    dealerCards: played.cards,
    shoe: played.shoe,
    seats,
    handNumber: state.handNumber,
    credits,
    evict: [],
  };
}

// ── SETTLED → BETTING : nouvelle manche, ménage des sièges ────────────────

function fromSettled(state: TableState, _nowMs: number): Transition {
  const handNumber = state.handNumber + 1;

  // Ménage : qui reste à la table pour la manche suivante ?
  const evict: string[] = [];
  const seats: SeatState[] = [];
  for (const seat of state.seats) {
    // Un siège qui n'a pas misé la manche écoulée prend un point d'absence ; à
    // AFK_MAX_MISSED, il libère la place. Sans ça, un onglet oublié occuperait
    // un siège indéfiniment sur une table à 5 places.
    const missed = hasBet(seat, state.handNumber) ? 0 : seat.missedRounds + 1;
    if (seat.leaving || missed >= AFK_MAX_MISSED) {
      evict.push(seat.id);
      continue;
    }
    seats.push({
      ...seat,
      hands: [],
      activeHand: 0,
      bet: 0,
      missedRounds: missed,
      // `lastResult` survit à la nouvelle manche : le récapitulatif reste
      // lisible pendant que les mises rouvrent.
    });
  }

  return {
    phase: "BETTING",
    deadlineMs: deadlineFor("BETTING", state),
    activeSeat: null,
    dealerCards: [],
    shoe: reshuffleIfNeeded(state.shoe),
    seats,
    handNumber,
    credits: [],
    evict,
  };
}

// ── Coups du joueur (hors machine à échéances) ────────────────────────────

/**
 * Applique un coup à la main active d'un siège. Renvoie `null` si le coup est
 * illégal — l'appelant le traduit en erreur, il ne devine rien.
 *
 * Séparé de `nextPhase` parce qu'un coup n'est pas déclenché par une horloge
 * mais par une intention ; en revanche il PEUT terminer la phase (dernier joueur
 * qui reste), d'où le `phase`/`activeSeat` recalculés à la fin.
 */
export function applyMove(
  state: TableState,
  seatNumber: number,
  move: "HIT" | "STAND" | "DOUBLE",
): Transition | null {
  if (state.phase !== "PLAYER_TURNS") return null;
  if (state.activeSeat !== seatNumber) return null;

  const seat = state.seats.find((s) => s.seat === seatNumber);
  if (!seat) return null;
  const hand = seat.hands[seat.activeHand];
  if (!hand || hand.status !== "PLAYING") return null;

  let shoe = state.shoe;
  let updated: BjHand;

  if (move === "STAND") {
    updated = { ...hand, status: "STAND" };
  } else {
    // HIT et DOUBLE tirent tous deux une carte ; le DOUBLE fige la main après.
    const pulled = draw(shoe, 1);
    shoe = pulled.shoe;
    const cards = [...hand.cards, ...pulled.cards];
    const bust = handValue(cards).total > 21;
    updated =
      move === "DOUBLE"
        ? {
            ...hand,
            cards,
            // La mise est DOUBLÉE ici ; le débit de la mise supplémentaire est
            // fait par l'appelant AVANT d'en arriver là (cf. playAction).
            bet: hand.bet * 2,
            doubled: true,
            status: bust ? "BUST" : "STAND",
          }
        : { ...hand, cards, status: bust ? "BUST" : "PLAYING" };
  }

  const seats = state.seats.map((s) =>
    s.seat === seatNumber
      ? { ...s, hands: s.hands.map((h, i) => (i === s.activeHand ? updated : h)) }
      : s,
  );

  const after: TableState = { ...state, seats, shoe };
  // Le siège garde la main tant qu'il lui reste une décision à prendre.
  const stillPlaying = !seatDone(seats.find((s) => s.seat === seatNumber)!);
  const active = stillPlaying ? seatNumber : nextActiveSeat(after, seatNumber);
  const phase: CasinoPhaseValue = active === null ? "DEALER" : "PLAYER_TURNS";

  return {
    ...stay(after, phase),
    phase,
    deadlineMs: deadlineFor(phase, after),
    activeSeat: active,
    seats,
    shoe,
  };
}

/**
 * Toutes les places occupées ont misé → on peut distribuer sans attendre la fin
 * du chrono. C'est ce qui rend une table à 2 joueurs attentifs aussi nerveuse
 * qu'une table solo.
 */
export function everyoneHasBet(state: TableState): boolean {
  const seats = state.seats.filter((seat) => !seat.leaving);
  return seats.length > 0 && seats.every((seat) => hasBet(seat, state.handNumber));
}
