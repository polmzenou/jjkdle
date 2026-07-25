import { describe, it, expect } from "vitest";
import { deriveRanking } from "./derive";
import type { Character } from "@/data/roster/characters";

/** Personnage minimal : seuls la note de la catégorie testée et les critères de
 *  repli (battleValue, nom) comptent ici. */
function char(
  id: string,
  rating: number | undefined,
  battleValue?: number,
  name = id,
): Character {
  return {
    id,
    name,
    title: "",
    tier: "3",
    ratings: rating === undefined ? {} : { speed: rating },
    ...(battleValue != null ? { battleValue } : {}),
  };
}

const CAT = "speed";

describe("deriveRanking", () => {
  it("classe par note décroissante et tronque au nombre de rangs", () => {
    const roster = [char("a", 50), char("b", 90), char("c", 70)];
    const { order } = deriveRanking(roster, CAT, [], 2);
    expect(order).toEqual(["b", "c"]);
  });

  it("exclut les personnages NON notés (pas de 0 implicite)", () => {
    const roster = [char("noted", 10), char("unrated", undefined)];
    const { order, ratedCount } = deriveRanking(roster, CAT, [], 8);
    expect(order).toEqual(["noted"]);
    expect(ratedCount).toBe(1);
  });

  it("compte les notés même au-delà des rangs disponibles", () => {
    const roster = [char("a", 10), char("b", 20), char("c", 30)];
    expect(deriveRanking(roster, CAT, [], 2).ratedCount).toBe(3);
  });

  it("garde une note de 0 (éligible mais nul), contrairement à l'absence", () => {
    const roster = [char("zero", 0), char("absent", undefined)];
    expect(deriveRanking(roster, CAT, [], 8).order).toEqual(["zero"]);
  });

  it("IGNORE le tiebreak quand les notes sont distinctes", () => {
    const roster = [char("a", 90), char("b", 80)];
    // L'arbitrage voudrait b devant a : la note doit l'emporter.
    const { order } = deriveRanking(roster, CAT, ["b", "a"], 8);
    expect(order).toEqual(["a", "b"]);
  });

  it("APPLIQUE le tiebreak entre notes égales", () => {
    const roster = [char("a", 90, 10), char("b", 90, 99), char("c", 90, 50)];
    // Sans arbitrage, battleValue trierait b > c > a.
    const { order } = deriveRanking(roster, CAT, ["a", "c", "b"], 8);
    expect(order).toEqual(["a", "c", "b"]);
  });

  it("n'arbitre que dans le groupe d'égalité, jamais entre groupes", () => {
    const roster = [char("hi1", 90), char("hi2", 90), char("lo", 50)];
    // « lo » placé premier dans l'arbitrage ne remonte pas : sa note est plus basse.
    const { order } = deriveRanking(roster, CAT, ["lo", "hi2", "hi1"], 8);
    expect(order).toEqual(["hi2", "hi1", "lo"]);
  });

  it("place les non-arbitrés après les arbitrés à note égale", () => {
    const roster = [char("a", 90, 1), char("b", 90, 2), char("c", 90, 3)];
    const { order } = deriveRanking(roster, CAT, ["a"], 8);
    // a arbitré en tête, puis repli battleValue décroissant sur b et c.
    expect(order).toEqual(["a", "c", "b"]);
  });

  it("reste déterministe sans arbitrage (battleValue puis nom)", () => {
    const roster = [
      char("x", 90, 5, "Zoe"),
      char("y", 90, 5, "Alice"),
      char("z", 90, 9, "Bob"),
    ];
    const first = deriveRanking(roster, CAT, [], 8).order;
    const second = deriveRanking([...roster].reverse(), CAT, [], 8).order;
    expect(first).toEqual(["z", "y", "x"]); // battleValue 9, puis Alice avant Zoe
    expect(second).toEqual(first); // l'ordre d'entrée n'influe pas
  });

  it("détecte les groupes d'égalité du top retenu", () => {
    const roster = [
      char("a", 97),
      char("b", 90, 3),
      char("c", 90, 2),
      char("d", 90, 1),
      char("e", 80),
    ];
    const { ties } = deriveRanking(roster, CAT, [], 8);
    expect(ties).toEqual([["b", "c", "d"]]);
  });

  it("ignore les égalités situées hors du top retenu", () => {
    const roster = [char("a", 97), char("b", 90), char("c", 50), char("d", 50)];
    // Avec 2 rangs, l'égalité à 50 ne sera jamais montrée au joueur.
    expect(deriveRanking(roster, CAT, [], 2).ties).toEqual([]);
  });

  it("signale plusieurs groupes d'égalité distincts", () => {
    const roster = [
      char("a", 90, 2),
      char("b", 90, 1),
      char("c", 70, 2),
      char("d", 70, 1),
    ];
    expect(deriveRanking(roster, CAT, [], 8).ties).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
  });

  it("renvoie un classement vide sur une catégorie que personne ne porte", () => {
    const roster = [char("a", undefined), char("b", undefined)];
    expect(deriveRanking(roster, "unknown-category", [], 8)).toEqual({
      order: [],
      ties: [],
      ratedCount: 0,
    });
  });
});
