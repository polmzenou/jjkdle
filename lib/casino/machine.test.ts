import { describe, expect, it } from "vitest";
import { applyMove, everyoneHasBet, nextActiveSeat, nextPhase } from "./machine";
import { AFK_MAX_MISSED, BETTING_MS, TURN_MS } from "./rules";
import type { BjHand, SeatState, TableState } from "./types";

/**
 * Les tests posent des sabots DÉTERMINISTES (tableaux écrits à la main) : la
 * machine tire par l'avant sans jamais appeler `Math.random`, donc chaque
 * transition est entièrement prévisible. C'est aussi ce qui garantit qu'une
 * transition rejouée après un crash redonne le même résultat.
 */

function seat(over: Partial<SeatState> = {}): SeatState {
  return {
    id: over.id ?? "s0",
    seat: over.seat ?? 0,
    userId: over.userId ?? "u0",
    username: over.username ?? "joueur",
    level: 1,
    hands: over.hands ?? [],
    activeHand: over.activeHand ?? 0,
    bet: over.bet ?? 0,
    betHandNumber: over.betHandNumber ?? -1,
    settledHandNumber: over.settledHandNumber ?? -1,
    lastResult: over.lastResult ?? null,
    missedRounds: over.missedRounds ?? 0,
    leaving: over.leaving ?? false,
    ...over,
  };
}

function table(over: Partial<TableState> = {}): TableState {
  return {
    mode: over.mode ?? "PUBLIC",
    phase: over.phase ?? "BETTING",
    handNumber: over.handNumber ?? 0,
    activeSeat: over.activeSeat ?? null,
    dealerCards: over.dealerCards ?? [],
    shoe: over.shoe ?? [],
    seats: over.seats ?? [],
  };
}

function hand(cards: string[], over: Partial<BjHand> = {}): BjHand {
  return { cards, bet: 100, doubled: false, status: "PLAYING", ...over };
}

describe("BETTING", () => {
  it("rouvre les mises sans consommer de manche si personne n'a misé", () => {
    const state = table({ seats: [seat({ betHandNumber: -1 })] });
    const next = nextPhase(state, 0);
    expect(next.phase).toBe("BETTING");
    expect(next.handNumber).toBe(0);
    expect(next.deadlineMs).toBe(BETTING_MS);
  });

  it("distribue 2 cartes aux misants et 2 au croupier", () => {
    const state = table({
      seats: [seat({ id: "a", seat: 0, bet: 100, betHandNumber: 0 })],
      shoe: ["9S", "7H", "TD", "6C", "2S"],
    });
    const next = nextPhase(state, 0);
    expect(next.phase).toBe("DEALING");
    expect(next.seats[0].hands[0].cards).toEqual(["9S", "7H"]);
    expect(next.dealerCards).toEqual(["TD", "6C"]);
    expect(next.shoe).toEqual(["2S"]);
  });

  it("ne sert PAS un siège qui n'a pas misé cette manche", () => {
    const state = table({
      seats: [
        seat({ id: "a", seat: 0, bet: 100, betHandNumber: 0 }),
        // A misé la manche PRÉCÉDENTE : il ne doit pas être resservi.
        seat({ id: "b", seat: 1, userId: "u1", bet: 50, betHandNumber: -1 }),
      ],
      shoe: ["9S", "7H", "TD", "6C"],
    });
    const next = nextPhase(state, 0);
    expect(next.seats[0].hands).toHaveLength(1);
    expect(next.seats[1].hands).toHaveLength(0);
  });

  it("marque immédiatement un blackjack servi", () => {
    const state = table({
      seats: [seat({ id: "a", bet: 100, betHandNumber: 0 })],
      shoe: ["AS", "KH", "TD", "6C"],
    });
    const next = nextPhase(state, 0);
    expect(next.seats[0].hands[0].status).toBe("BLACKJACK");
  });

  it("une table SOLO n'a pas d'horloge de mise", () => {
    const state = table({ mode: "SOLO", seats: [seat()] });
    expect(nextPhase(state, 0).deadlineMs).toBeNull();
  });
});

describe("DEALING", () => {
  it("donne la main au premier siège encore en jeu", () => {
    const state = table({
      phase: "DEALING",
      seats: [
        seat({ id: "a", seat: 0, bet: 100, betHandNumber: 0, hands: [hand(["9S", "7H"])] }),
        seat({ id: "b", seat: 2, userId: "u1", bet: 100, betHandNumber: 0, hands: [hand(["5S", "5H"])] }),
      ],
    });
    const next = nextPhase(state, 0);
    expect(next.phase).toBe("PLAYER_TURNS");
    expect(next.activeSeat).toBe(0);
  });

  it("saute la phase de tours si tout le monde a un blackjack", () => {
    const state = table({
      phase: "DEALING",
      seats: [
        seat({ id: "a", bet: 100, betHandNumber: 0, hands: [hand(["AS", "KH"], { status: "BLACKJACK" })] }),
      ],
    });
    const next = nextPhase(state, 0);
    expect(next.phase).toBe("DEALER");
    expect(next.activeSeat).toBeNull();
  });
});

describe("PLAYER_TURNS — expiration du tour", () => {
  it("fait STAND d'office, jamais HIT", () => {
    const state = table({
      phase: "PLAYER_TURNS",
      activeSeat: 0,
      seats: [seat({ id: "a", bet: 100, betHandNumber: 0, hands: [hand(["TS", "TH"])] })],
      shoe: ["9C"],
    });
    const next = nextPhase(state, 0);
    expect(next.seats[0].hands[0].status).toBe("STAND");
    // Aucune carte tirée : le sabot est intact.
    expect(next.shoe).toEqual(["9C"]);
  });

  it("passe au siège suivant, en ordre croissant", () => {
    const state = table({
      phase: "PLAYER_TURNS",
      activeSeat: 0,
      seats: [
        seat({ id: "a", seat: 0, bet: 100, betHandNumber: 0, hands: [hand(["TS", "TH"])] }),
        seat({ id: "b", seat: 3, userId: "u1", bet: 100, betHandNumber: 0, hands: [hand(["5S", "5H"])] }),
      ],
    });
    const next = nextPhase(state, 0);
    expect(next.phase).toBe("PLAYER_TURNS");
    expect(next.activeSeat).toBe(3);
    expect(next.deadlineMs).toBe(TURN_MS);
  });

  it("passe au croupier quand plus personne n'a de décision", () => {
    const state = table({
      phase: "PLAYER_TURNS",
      activeSeat: 0,
      seats: [seat({ id: "a", bet: 100, betHandNumber: 0, hands: [hand(["TS", "TH"])] })],
    });
    expect(nextPhase(state, 0).phase).toBe("DEALER");
  });
});

describe("nextActiveSeat", () => {
  it("saute les sièges dont les mains sont finies", () => {
    const state = table({
      seats: [
        seat({ id: "a", seat: 0, bet: 100, betHandNumber: 0, hands: [hand(["AS", "KH"], { status: "BLACKJACK" })] }),
        seat({ id: "b", seat: 1, userId: "u1", bet: 100, betHandNumber: 0, hands: [hand(["5S", "5H"])] }),
      ],
    });
    expect(nextActiveSeat(state, null)).toBe(1);
  });
});

describe("DEALER → SETTLED", () => {
  it("fait jouer le croupier et calcule les paiements", () => {
    const state = table({
      phase: "DEALER",
      seats: [seat({ id: "a", bet: 100, betHandNumber: 0, hands: [hand(["TS", "9H"], { status: "STAND" })] })],
      dealerCards: ["TD", "6C"],
      shoe: ["2S", "KH"], // 16 → tire le 2 → 18 : le croupier bat 19 ? non, 18 < 19.
    });
    const next = nextPhase(state, 0);
    expect(next.phase).toBe("SETTLED");
    expect(next.dealerCards).toEqual(["TD", "6C", "2S"]); // 18
    expect(next.seats[0].lastResult?.hands[0].outcome).toBe("WIN");
    expect(next.credits).toEqual([
      { seatId: "a", userId: "u0", amount: 200, handNumber: 0 },
    ]);
  });

  it("ne fait PAS tirer le croupier si tout le monde a sauté", () => {
    const state = table({
      phase: "DEALER",
      seats: [seat({ id: "a", bet: 100, betHandNumber: 0, hands: [hand(["TS", "9H", "5C"], { status: "BUST" })] })],
      dealerCards: ["TD", "6C"],
      shoe: ["2S"],
    });
    const next = nextPhase(state, 0);
    expect(next.dealerCards).toEqual(["TD", "6C"]); // inchangé
    expect(next.shoe).toEqual(["2S"]); // aucune carte brûlée
    expect(next.credits).toHaveLength(0);
  });

  it("ne crédite rien sur une main perdue", () => {
    const state = table({
      phase: "DEALER",
      seats: [seat({ id: "a", bet: 100, betHandNumber: 0, hands: [hand(["TS", "7H"], { status: "STAND" })] })],
      dealerCards: ["TD", "9C"],
    });
    const next = nextPhase(state, 0);
    expect(next.credits).toHaveLength(0);
    expect(next.seats[0].lastResult?.net).toBe(-100);
  });

  it("crédite un push (la mise a déjà été débitée)", () => {
    const state = table({
      phase: "DEALER",
      seats: [seat({ id: "a", bet: 100, betHandNumber: 0, hands: [hand(["TS", "9H"], { status: "STAND" })] })],
      dealerCards: ["TD", "9C"],
    });
    const next = nextPhase(state, 0);
    expect(next.credits[0].amount).toBe(100);
    expect(next.seats[0].lastResult?.net).toBe(0);
  });
});

describe("SETTLED → BETTING", () => {
  it("incrémente la manche et vide les mains", () => {
    const state = table({
      phase: "SETTLED",
      handNumber: 3,
      seats: [seat({ id: "a", bet: 100, betHandNumber: 3, hands: [hand(["TS", "9H"])] })],
      dealerCards: ["TD", "9C"],
    });
    const next = nextPhase(state, 0);
    expect(next.phase).toBe("BETTING");
    expect(next.handNumber).toBe(4);
    expect(next.seats[0].hands).toEqual([]);
    expect(next.seats[0].bet).toBe(0);
    expect(next.dealerCards).toEqual([]);
  });

  it("remet le compteur d'absence à zéro pour qui a misé", () => {
    const state = table({
      phase: "SETTLED",
      handNumber: 0,
      seats: [seat({ id: "a", bet: 100, betHandNumber: 0, missedRounds: 1 })],
    });
    expect(nextPhase(state, 0).seats[0].missedRounds).toBe(0);
  });

  it("évince un siège AFK après AFK_MAX_MISSED manches sans miser", () => {
    const state = table({
      phase: "SETTLED",
      handNumber: 0,
      seats: [seat({ id: "afk", betHandNumber: -1, missedRounds: AFK_MAX_MISSED - 1 })],
    });
    const next = nextPhase(state, 0);
    expect(next.evict).toEqual(["afk"]);
    expect(next.seats).toHaveLength(0);
  });

  it("évince un siège qui a demandé à partir", () => {
    const state = table({
      phase: "SETTLED",
      handNumber: 0,
      seats: [seat({ id: "bye", bet: 100, betHandNumber: 0, leaving: true })],
    });
    expect(nextPhase(state, 0).evict).toEqual(["bye"]);
  });

  it("une table SOLO attend le joueur pour relancer", () => {
    const state = table({ mode: "SOLO", phase: "SETTLED", seats: [seat()] });
    expect(nextPhase(state, 0).deadlineMs).toBeNull();
  });
});

describe("applyMove", () => {
  const playing = () =>
    table({
      phase: "PLAYER_TURNS",
      activeSeat: 0,
      seats: [seat({ id: "a", bet: 100, betHandNumber: 0, hands: [hand(["5S", "6H"])] })],
      shoe: ["4C", "KD", "2S"],
    });

  it("HIT tire une carte et laisse la main au joueur", () => {
    const next = applyMove(playing(), 0, "HIT")!;
    expect(next.seats[0].hands[0].cards).toEqual(["5S", "6H", "4C"]);
    expect(next.seats[0].hands[0].status).toBe("PLAYING");
    expect(next.activeSeat).toBe(0);
    expect(next.shoe).toEqual(["KD", "2S"]);
  });

  it("HIT qui fait sauter termine le siège", () => {
    const state = table({
      phase: "PLAYER_TURNS",
      activeSeat: 0,
      seats: [seat({ id: "a", bet: 100, betHandNumber: 0, hands: [hand(["TS", "9H"])] })],
      shoe: ["KD"],
    });
    const next = applyMove(state, 0, "HIT")!;
    expect(next.seats[0].hands[0].status).toBe("BUST");
    expect(next.phase).toBe("DEALER");
  });

  it("STAND fige la main sans tirer", () => {
    const next = applyMove(playing(), 0, "STAND")!;
    expect(next.seats[0].hands[0].status).toBe("STAND");
    expect(next.shoe).toEqual(["4C", "KD", "2S"]);
    expect(next.phase).toBe("DEALER");
  });

  it("DOUBLE tire UNE carte, double la mise et fige la main", () => {
    const next = applyMove(playing(), 0, "DOUBLE")!;
    const h = next.seats[0].hands[0];
    expect(h.cards).toEqual(["5S", "6H", "4C"]);
    expect(h.bet).toBe(200);
    expect(h.doubled).toBe(true);
    expect(h.status).toBe("STAND");
  });

  it("refuse un coup hors de son tour", () => {
    expect(applyMove(playing(), 1, "HIT")).toBeNull();
  });

  it("refuse un coup hors de la phase de tours", () => {
    const state = { ...playing(), phase: "BETTING" as const };
    expect(applyMove(state, 0, "HIT")).toBeNull();
  });

  it("refuse un coup sur une main déjà finie", () => {
    const state = table({
      phase: "PLAYER_TURNS",
      activeSeat: 0,
      seats: [seat({ id: "a", bet: 100, betHandNumber: 0, hands: [hand(["TS", "9H"], { status: "STAND" })] })],
      shoe: ["4C"],
    });
    expect(applyMove(state, 0, "HIT")).toBeNull();
  });
});

describe("everyoneHasBet", () => {
  it("est vrai quand tous les sièges occupés ont misé", () => {
    const state = table({
      seats: [
        seat({ id: "a", seat: 0, bet: 100, betHandNumber: 0 }),
        seat({ id: "b", seat: 1, userId: "u1", bet: 50, betHandNumber: 0 }),
      ],
    });
    expect(everyoneHasBet(state)).toBe(true);
  });

  it("ignore un siège en partance", () => {
    const state = table({
      seats: [
        seat({ id: "a", seat: 0, bet: 100, betHandNumber: 0 }),
        seat({ id: "b", seat: 1, userId: "u1", leaving: true }),
      ],
    });
    expect(everyoneHasBet(state)).toBe(true);
  });

  it("est faux si un joueur n'a pas encore misé", () => {
    const state = table({
      seats: [
        seat({ id: "a", seat: 0, bet: 100, betHandNumber: 0 }),
        seat({ id: "b", seat: 1, userId: "u1" }),
      ],
    });
    expect(everyoneHasBet(state)).toBe(false);
  });

  it("est faux sur une table vide", () => {
    expect(everyoneHasBet(table())).toBe(false);
  });
});
