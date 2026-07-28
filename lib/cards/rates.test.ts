import { describe, it, expect } from "vitest";
import { BASE_RATES, BOOST_RATES, normalizeWeights, totalWeight } from "./rates";
import { CARD_RARITIES, type CardRarity } from "./rarity";

describe("tables de taux", () => {
  it("somment à 100 (lisibles comme des pourcentages)", () => {
    expect(totalWeight(BASE_RATES)).toBeCloseTo(100, 6);
    expect(totalWeight(BOOST_RATES)).toBeCloseTo(100, 6);
  });

  it("couvrent les 6 raretés", () => {
    for (const rarity of CARD_RARITIES) {
      expect(BASE_RATES[rarity]).toBeGreaterThan(0);
      expect(BOOST_RATES[rarity]).toBeGreaterThan(0);
    }
  });

  it("respecte le cadrage demandé : epic ≈ 1 carte sur 10, exotic très rare", () => {
    expect(BASE_RATES.epic).toBe(10);
    expect(BASE_RATES.legendary).toBeLessThan(2);
    expect(BASE_RATES.exotic).toBeLessThanOrEqual(0.2);
  });

  it("la table boostée décale bien la masse vers le haut", () => {
    expect(BOOST_RATES.epic).toBeGreaterThan(BASE_RATES.epic);
    expect(BOOST_RATES.rare).toBeGreaterThan(BASE_RATES.rare);
    expect(BOOST_RATES.common).toBeLessThan(BASE_RATES.common);
  });
});

describe("normalizeWeights", () => {
  it("renormalise sur 100 quand toutes les raretés sont disponibles", () => {
    const out = normalizeWeights(BASE_RATES, CARD_RARITIES);
    expect(totalWeight(out)).toBeCloseTo(100, 6);
    expect(Object.keys(out)).toHaveLength(6);
  });

  it("redistribue au prorata la masse d'une rareté absente", () => {
    // Cas réel du roster JJK : aucun perso tier 4minus ni tier 4.
    const available: CardRarity[] = ["rare", "epic", "legendary", "exotic"];
    const out = normalizeWeights(BASE_RATES, available);

    expect(out.common).toBeUndefined();
    expect(out.uncommon).toBeUndefined();
    expect(totalWeight(out)).toBeCloseTo(100, 6);
    // Le RAPPORT entre les raretés survivantes est préservé.
    expect(out.rare! / out.epic!).toBeCloseTo(
      BASE_RATES.rare / BASE_RATES.epic,
      6,
    );
  });

  it("ignore les poids nuls, négatifs ou non finis", () => {
    const out = normalizeWeights(
      { common: 50, rare: 0, epic: -10, legendary: Number.NaN, exotic: 50 },
      CARD_RARITIES,
    );
    expect(Object.keys(out).sort()).toEqual(["common", "exotic"]);
    expect(out.common).toBeCloseTo(50, 6);
  });

  it("renvoie un objet vide si plus rien n'est disponible", () => {
    expect(normalizeWeights(BASE_RATES, [])).toEqual({});
  });
});
