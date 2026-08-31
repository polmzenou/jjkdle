import { describe, expect, it } from "vitest";
import { JJK_ITEMS } from "@/lib/universes/jjk-items";
import { EFFECT_SPECS, NO_MODIFIERS } from "./effects";
import {
  MIN_ITEMS,
  describeItem,
  isItemRarity,
  modifiersOf,
  normalizeItem,
  resolveItems,
  validateEffect,
  type TowerItem,
} from "./items";
import {
  ITEM_PRICES,
  rollRewards,
  rollShop,
} from "./rewards";

/**
 * Objets et récompenses.
 *
 * Deux propriétés comptent plus que les autres :
 *  - le DÉTERMINISME des tirages (le serveur régénère l'offre pour la valider,
 *    et deux joueurs sur la même tour du jour doivent voir la même chose) ;
 *  - la ROBUSTESSE de la lecture (une ligne écrite avant un durcissement des
 *    bornes, ou dont l'effet a disparu du catalogue, ne doit pas casser un
 *    combat en cours).
 */

function item(id: string, overrides: Partial<TowerItem> = {}): TowerItem {
  return {
    id,
    slug: id,
    name: id,
    description: "",
    rarity: "COMMON",
    effects: [{ kind: "FRAPPE_PCT", value: 10 }],
    enabled: true,
    position: 0,
    ...overrides,
  };
}

/** Un catalogue assez fourni pour franchir le seuil de viabilité. */
function catalog(size = 20): TowerItem[] {
  return Array.from({ length: size }, (_, i) =>
    item(`i${i}`, {
      rarity: i % 5 === 0 ? "EPIC" : i % 2 === 0 ? "RARE" : "COMMON",
    }),
  );
}

const row = {
  id: "x",
  slug: "x",
  name: "Objet",
  description: "",
  image: null,
  rarity: "RARE",
  effectKind: "FRAPPE_PCT",
  effectValue: 15,
  effectKind2: null,
  effectValue2: null,
  enabled: true,
  position: 0,
};

describe("lecture d'un objet en base", () => {
  it("lit un objet à un effet", () => {
    const parsed = normalizeItem(row);
    expect(parsed?.effects).toEqual([{ kind: "FRAPPE_PCT", value: 15 }]);
    expect(parsed?.rarity).toBe("RARE");
  });

  it("lit un objet à double tranchant", () => {
    const parsed = normalizeItem({
      ...row,
      effectKind2: "PV_MAX_PCT",
      effectValue2: -8,
    });
    expect(parsed?.effects).toHaveLength(2);
  });

  it("écarte un objet dont plus aucun effet n'est reconnaissable", () => {
    expect(normalizeItem({ ...row, effectKind: "EFFET_SUPPRIME" })).toBeNull();
  });

  it("ignore un SECOND effet devenu inconnu sans jeter l'objet", () => {
    const parsed = normalizeItem({
      ...row,
      effectKind2: "EFFET_SUPPRIME",
      effectValue2: 5,
    });
    expect(parsed?.effects).toHaveLength(1);
  });

  it("ramène une valeur hors bornes dans les clous plutôt que de la servir telle quelle", () => {
    const parsed = normalizeItem({ ...row, effectValue: 9999 });
    expect(parsed?.effects[0].value).toBe(EFFECT_SPECS.FRAPPE_PCT.max);
  });

  it("retombe sur COMMON pour une rareté inconnue", () => {
    expect(normalizeItem({ ...row, rarity: "MYTHIQUE" })?.rarity).toBe("COMMON");
  });

  it("pointe sur la route d'image dès qu'un binaire existe", () => {
    expect(normalizeItem({ ...row, imageData: true })?.image).toBe(
      "/api/items/x/image",
    );
    expect(normalizeItem(row)?.image).toBeUndefined();
  });
});

describe("validation admin", () => {
  it("accepte une valeur dans les bornes", () => {
    expect(validateEffect("FRAPPE_PCT", 20)).toEqual({
      kind: "FRAPPE_PCT",
      value: 20,
    });
  });

  it("REFUSE une valeur hors bornes (la faute de frappe qui casse un univers)", () => {
    expect(validateEffect("FRAPPE_PCT", 9999)).toBeNull();
    expect(validateEffect("FRAPPE_PCT", -9999)).toBeNull();
  });

  it("refuse un effet inconnu", () => {
    expect(validateEffect("PAS_UN_EFFET", 10)).toBeNull();
  });

  it("tolère une valeur envoyée en chaîne par un formulaire", () => {
    expect(validateEffect("FRAPPE_PCT", "20")).toEqual({
      kind: "FRAPPE_PCT",
      value: 20,
    });
  });

  it("reconnaît les trois raretés, et rien d'autre", () => {
    expect(isItemRarity("EPIC")).toBe(true);
    expect(isItemRarity("legendary")).toBe(false);
  });
});

describe("inventaire", () => {
  it("agrège les effets de plusieurs objets", () => {
    const mods = modifiersOf([
      item("a", { effects: [{ kind: "FRAPPE_PCT", value: 20 }] }),
      item("b", { effects: [{ kind: "FRAPPE_PCT", value: 15 }] }),
    ]);
    expect(mods.FRAPPE_PCT).toBe(35);
  });

  it("PLAFONNE le cumul — sans quoi trois objets contourneraient l'équilibrage", () => {
    const stack = Array.from({ length: 6 }, (_, i) =>
      item(`f${i}`, { effects: [{ kind: "FENETRE_PCT", value: 50 }] }),
    );
    expect(modifiersOf(stack).FENETRE_PCT).toBe(EFFECT_SPECS.FENETRE_PCT.cap);
  });

  it("un inventaire vide ne modifie rien", () => {
    expect(modifiersOf([])).toEqual(NO_MODIFIERS);
  });

  it("résout les ids en ignorant doublons et inconnus", () => {
    const byId = { a: item("a"), b: item("b") };
    expect(resolveItems(["a", "a", "zzz", "b"], byId).map((i) => i.id)).toEqual([
      "a",
      "b",
    ]);
  });

  it("décrit les effets en français lisible", () => {
    const text = describeItem(
      item("x", {
        effects: [
          { kind: "FRAPPE_PCT", value: 15 },
          { kind: "PV_MAX_PCT", value: -8 },
        ],
      }),
    );
    expect(text).toContain("+15");
    expect(text).toContain("-8");
  });
});

describe("récompenses de fin d'étage", () => {
  const pool = catalog();

  it("propose toujours trois options", () => {
    expect(rollRewards(1, 3, "combat", pool, [])).toHaveLength(3);
  });

  it("est déterministe pour une graine et un étage donnés", () => {
    expect(rollRewards(42, 7, "combat", pool, [])).toEqual(
      rollRewards(42, 7, "combat", pool, []),
    );
  });

  it("change d'un étage à l'autre", () => {
    const a = rollRewards(42, 2, "combat", pool, []);
    const b = rollRewards(42, 8, "combat", pool, []);
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(b));
  });

  it("ne propose JAMAIS un objet déjà possédé", () => {
    for (let floor = 1; floor <= 20; floor += 1) {
      const owned = pool.slice(0, 15).map((i) => i.id);
      const rewards = rollRewards(7, floor, "combat", pool, owned);
      for (const r of rewards) {
        if (r.kind === "item") expect(owned).not.toContain(r.item.id);
      }
    }
  });

  it("garde les épiques pour les élites et les boss", () => {
    const rarities = (kind: "combat" | "elite" | "boss") =>
      Array.from({ length: 20 }, (_, f) => rollRewards(3, f + 1, kind, pool, []))
        .flat()
        .filter((r) => r.kind === "item")
        .map((r) => (r.kind === "item" ? r.item.rarity : ""));

    expect(rarities("combat")).not.toContain("EPIC");
    expect(rarities("boss")).toContain("EPIC");
  });

  it("sert des fragments plutôt qu'un objet quand le catalogue est trop maigre", () => {
    const rewards = rollRewards(1, 3, "combat", catalog(MIN_ITEMS - 1), []);
    expect(rewards.every((r) => r.kind !== "item")).toBe(true);
  });

  it("sert des fragments plutôt qu'un doublon quand tout est ramassé", () => {
    const rewards = rollRewards(1, 3, "combat", pool, pool.map((i) => i.id));
    expect(rewards.every((r) => r.kind !== "item")).toBe(true);
  });

  it("paie mieux un boss qu'un combat ordinaire", () => {
    const amount = (kind: "combat" | "boss") => {
      const r = rollRewards(5, 5, kind, pool, []).find(
        (x) => x.kind === "fragments",
      );
      return r?.kind === "fragments" ? r.amount : 0;
    };
    expect(amount("boss")).toBeGreaterThan(amount("combat"));
  });
});

describe("étal du marchand", () => {
  const pool = catalog();

  it("propose trois objets distincts et non possédés", () => {
    const offers = rollShop(9, 4, pool, ["i0", "i1"]);
    expect(offers).toHaveLength(3);
    expect(new Set(offers.map((o) => o.item.id)).size).toBe(3);
    for (const o of offers) expect(["i0", "i1"]).not.toContain(o.item.id);
  });

  it("est déterministe", () => {
    expect(rollShop(9, 4, pool, [])).toEqual(rollShop(9, 4, pool, []));
  });

  it("facture chaque objet selon sa rareté", () => {
    for (const offer of rollShop(9, 4, pool, [])) {
      expect(offer.price).toBe(ITEM_PRICES[offer.item.rarity]);
    }
  });

  it("rend un étal vide plutôt que de vendre des doublons", () => {
    expect(rollShop(9, 4, pool, pool.map((i) => i.id))).toEqual([]);
  });
});

describe("les 24 objets de lancement", () => {
  it("respectent tous les bornes du catalogue d'effets", () => {
    for (const seed of JJK_ITEMS) {
      expect(validateEffect(seed.effectKind, seed.effectValue)).not.toBeNull();
      if (seed.effectKind2) {
        expect(validateEffect(seed.effectKind2, seed.effectValue2)).not.toBeNull();
      }
    }
  });

  it("ont des slugs uniques (clé du seed idempotent)", () => {
    const slugs = JJK_ITEMS.map((i) => i.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("suivent la répartition 12 / 8 / 4 et dépassent le seuil de viabilité", () => {
    const count = (r: string) => JJK_ITEMS.filter((i) => i.rarity === r).length;
    expect(count("COMMON")).toBe(12);
    expect(count("RARE")).toBe(8);
    expect(count("EPIC")).toBe(4);
    expect(JJK_ITEMS.length).toBeGreaterThanOrEqual(MIN_ITEMS);
  });
});
