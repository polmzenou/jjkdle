import { describe, expect, it } from "vitest";
import {
  cardValue,
  draw,
  fullShoeSize,
  newDeck,
  newShoe,
  parseCard,
  shuffle,
} from "./cards";

describe("newDeck", () => {
  it("contient 52 cartes distinctes", () => {
    const deck = newDeck();
    expect(deck).toHaveLength(52);
    expect(new Set(deck).size).toBe(52);
  });

  it("a 4 cartes par rang et 13 par couleur", () => {
    const deck = newDeck();
    expect(deck.filter((c) => c[0] === "A")).toHaveLength(4);
    expect(deck.filter((c) => c[1] === "S")).toHaveLength(13);
  });
});

describe("newShoe", () => {
  it("empile 6 jeux par défaut", () => {
    const shoe = newShoe();
    expect(shoe).toHaveLength(312);
    expect(fullShoeSize()).toBe(312);
  });

  it("contient 24 cartes par rang et 78 par couleur", () => {
    const shoe = newShoe();
    expect(shoe.filter((c) => c[0] === "K")).toHaveLength(24);
    expect(shoe.filter((c) => c[1] === "H")).toHaveLength(78);
  });
});

describe("shuffle", () => {
  it("est une permutation : mêmes cartes, même compte", () => {
    const deck = newDeck();
    const mixed = shuffle(deck);
    expect(mixed).toHaveLength(deck.length);
    expect([...mixed].sort()).toEqual([...deck].sort());
  });

  it("ne mute pas l'entrée", () => {
    const deck = newDeck();
    const copy = [...deck];
    shuffle(deck);
    expect(deck).toEqual(copy);
  });
});

describe("cardValue", () => {
  it("compte les figures pour 10 et l'as pour 11", () => {
    expect(cardValue("KS")).toBe(10);
    expect(cardValue("TD")).toBe(10);
    expect(cardValue("AS")).toBe(11);
    expect(cardValue("7H")).toBe(7);
  });
});

describe("parseCard", () => {
  it("sépare rang et couleur", () => {
    expect(parseCard("TD")).toEqual({ rank: "T", suit: "D" });
  });
});

describe("draw", () => {
  it("tire par l'avant et renvoie le reste", () => {
    const { cards, shoe } = draw(["AS", "KH", "2C"], 2);
    expect(cards).toEqual(["AS", "KH"]);
    expect(shoe).toEqual(["2C"]);
  });

  it("ne mute pas le sabot d'entrée", () => {
    const shoe = ["AS", "KH", "2C"];
    draw(shoe, 2);
    expect(shoe).toEqual(["AS", "KH", "2C"]);
  });

  it("reconstitue un sabot plutôt que de rendre des undefined s'il est à sec", () => {
    const { cards, shoe } = draw(["AS"], 3);
    expect(cards).toHaveLength(3);
    expect(cards.every((c) => typeof c === "string" && c.length === 2)).toBe(true);
    expect(shoe.length).toBeGreaterThan(0);
  });
});
