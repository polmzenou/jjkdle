import { describe, expect, it } from "vitest";
import { ROSTER, type Character } from "@/data/roster/characters";
import { archetypeOf, excellenceCategory } from "./abilities";
import { JJK_TOWER_CONFIG } from "./config";
import {
  FALLBACK_ENERGY,
  FALLBACK_SPEED_RATING,
  booleanAttribute,
  deriveStats,
  numericAttribute,
  ratingOf,
  toFighterSpec,
  towerArchetypeOf,
  ultimateNameOf,
} from "./stats";
import { toCardView, toSpecFromView } from "./view";
import { resolveTowerConfig } from "./config";
import { aot } from "@/lib/universes/aot";
import { bleach } from "@/lib/universes/bleach";
import { csm } from "@/lib/universes/csm";
import { kny } from "@/lib/universes/kny";
import { tg } from "@/lib/universes/tg";
import { ARCHETYPES } from "./types";

/**
 * Le garde-fou n°1 du jeu.
 *
 * `Character.ratings` est PARTIEL par construction et les attributs ne sont
 * remplis qu'en base : sur le roster de seed, 36 personnages sur 45 n'ont
 * aucune note de vitesse et AUCUN n'a d'attribut. Une formule sans repli
 * enverrait donc la moitié du roster en combat avec une célérité `NaN`, et le
 * symptôme n'apparaîtrait qu'en production, sur un personnage au hasard.
 *
 * Ce fichier fait passer le roster ENTIER dans la dérivation et échoue sur la
 * moindre valeur non finie.
 */

const config = JJK_TOWER_CONFIG;

function character(overrides: Partial<Character> = {}): Character {
  return {
    id: "test",
    name: "Test",
    title: "Test",
    tier: "3",
    ratings: {},
    ...overrides,
  };
}

describe("robustesse sur le roster réel", () => {
  it("le roster de seed est bien lacunaire (sinon ce fichier ne teste rien)", () => {
    const withoutSpeed = ROSTER.filter((c) => c.ratings?.speed === undefined);
    expect(withoutSpeed.length).toBeGreaterThan(0);
  });

  it.each(ROSTER.map((c) => [c.id, c] as const))(
    "%s produit quatre stats finies et positives",
    (_id, c) => {
      const stats = deriveStats(c, config);

      for (const value of Object.values(stats)) {
        expect(Number.isFinite(value)).toBe(true);
        expect(value).toBeGreaterThan(0);
      }
    },
  );

  it("chaque personnage du roster reçoit un archétype connu", () => {
    for (const c of ROSTER) {
      expect(ARCHETYPES).toContain(archetypeOf(c, config.categoryArchetypes));
    }
  });

  it("chaque personnage du roster se convertit en combattant jouable", () => {
    for (const c of ROSTER) {
      const spec = toFighterSpec(c, "squad", config);
      expect(spec.id).toBe(c.id);
      expect(spec.side).toBe("squad");
      expect(typeof spec.hasDomain).toBe("boolean");
    }
  });
});

describe("replis", () => {
  it("une note absente retombe sur le repli, pas sur NaN", () => {
    expect(ratingOf(character(), "speed", FALLBACK_SPEED_RATING)).toBe(
      FALLBACK_SPEED_RATING,
    );
    expect(ratingOf(character(), null, FALLBACK_SPEED_RATING)).toBe(
      FALLBACK_SPEED_RATING,
    );
  });

  it("un attribut absent retombe sur le repli", () => {
    expect(numericAttribute(character(), "cursedEnergy", FALLBACK_ENERGY)).toBe(
      FALLBACK_ENERGY,
    );
  });

  it("un attribut numérique écrit en chaîne reste lisible", () => {
    const c = character({ attributes: { cursedEnergy: "75" } });
    expect(numericAttribute(c, "cursedEnergy", FALLBACK_ENERGY)).toBe(75);
  });

  it("une note hors barème ne fait pas sortir la célérité de son intervalle", () => {
    const low = deriveStats(character({ ratings: { speed: -500 } }), config);
    const high = deriveStats(character({ ratings: { speed: 5000 } }), config);

    expect(low.speed).toBe(40);
    expect(high.speed).toBe(100);
  });

  it("l'attribut d'ultime absent vaut faux (pas d'ultime offert par erreur)", () => {
    expect(booleanAttribute(character(), "hasDomain")).toBe(false);
    expect(
      booleanAttribute(character({ attributes: { hasDomain: "true" } }), "hasDomain"),
    ).toBe(true);
    expect(
      booleanAttribute(character({ attributes: { hasDomain: "false" } }), "hasDomain"),
    ).toBe(false);
  });
});

describe("catégorie d'excellence", () => {
  it("retient la note la plus haute", () => {
    const c = character({
      ratings: { speed: 40, "battle-iq": 90, endurance: 60 },
    });
    expect(excellenceCategory(c)).toBe("battle-iq");
  });

  it("tranche les ex æquo de façon STABLE (sinon serveur et client divergent)", () => {
    const c = character({ ratings: { speed: 80, endurance: 80 } });
    const first = excellenceCategory(c);

    for (let i = 0; i < 10; i += 1) {
      expect(excellenceCategory(c)).toBe(first);
    }
    expect(first).toBe("endurance"); // ordre alphabétique
  });

  it("sans aucune note, renvoie null et l'archétype par défaut s'applique", () => {
    const c = character({ ratings: {} });
    expect(excellenceCategory(c)).toBeNull();
    expect(archetypeOf(c, config.categoryArchetypes)).toBe("brute");
  });

  it("une catégorie non mappée retombe sur l'archétype par défaut", () => {
    const c = character({ ratings: { "categorie-inconnue": 99 } });
    expect(archetypeOf(c, config.categoryArchetypes)).toBe("brute");
  });
});

describe("échelle", () => {
  it("un personnage plus fort a plus de PV et de frappe", () => {
    const weak = deriveStats(character({ battleValue: 10 }), config);
    const strong = deriveStats(character({ battleValue: 90 }), config);

    expect(strong.maxHp).toBeGreaterThan(weak.maxHp);
    expect(strong.strike).toBeGreaterThan(weak.strike);
  });

  it("la célérité se lit dans la catégorie qui mappe `swift`, pas dans une clé codée en dur", () => {
    const jjk = deriveStats(character({ ratings: { speed: 100 } }), config);
    const other = deriveStats(character({ ratings: { "csm-speed": 100 } }), {
      ...config,
      categoryArchetypes: { "csm-speed": "swift" },
    });

    expect(jjk.speed).toBe(100);
    expect(other.speed).toBe(100);
  });
});

describe("nom et accès à l'ultime, par univers", () => {
  const withAttrs = (attributes: Record<string, string>) =>
    character({ attributes });

  it("JJK garde l'Extension de Territoire, sur `hasDomain`", () => {
    expect(ultimateNameOf(withAttrs({ hasDomain: "true" }), config)).toBe(
      "Extension de Territoire",
    );
    expect(ultimateNameOf(withAttrs({ hasDomain: "false" }), config)).toBeNull();
  });

  it("AOT : Transformation en Titan pour les titans", () => {
    const c = resolveTowerConfig(aot.tower);
    expect(ultimateNameOf(withAttrs({ aottitan: "true" }), c)).toBe(
      "Transformation en Titan",
    );
    expect(ultimateNameOf(withAttrs({ aottitan: "false" }), c)).toBeNull();
  });

  it("Bleach : chaque libération finale nomme son propre ultime", () => {
    const c = resolveTowerConfig(bleach.tower);
    const name = (bleachrelease: string) =>
      ultimateNameOf(withAttrs({ bleachrelease }), c);

    expect(name("BANKAI")).toBe("Bankai");
    expect(name("RESURRECCION")).toBe("Resurrección");
    expect(name("SEGUNDA_ETAPA")).toBe("Segunda Etapa");
    expect(name("VOLLSTANDIG")).toBe("Vollständig");
    expect(name("SHIKAI")).toBeNull();
  });

  it("TG : Surpuissance pour les menaces SS et SSS seulement", () => {
    const c = resolveTowerConfig(tg.tower);
    expect(ultimateNameOf(withAttrs({ tgrate: "SS" }), c)).toBe("Surpuissance");
    expect(ultimateNameOf(withAttrs({ tgrate: "SSS" }), c)).toBe("Surpuissance");
    expect(ultimateNameOf(withAttrs({ tgrate: "S_PLUS" }), c)).toBeNull();
  });

  it("CSM : Surpuissance pour Extrême et Surpuissant (CATASTROPHIC)", () => {
    const c = resolveTowerConfig(csm.tower);
    expect(ultimateNameOf(withAttrs({ csmpower: "EXTREME" }), c)).toBe("Surpuissance");
    expect(ultimateNameOf(withAttrs({ csmpower: "CATASTROPHIC" }), c)).toBe(
      "Surpuissance",
    );
    expect(ultimateNameOf(withAttrs({ csmpower: "VERY_HIGH" }), c)).toBeNull();
  });

  it("KNY : Surpuissance pour les Piliers ET pour les Douze Lunes", () => {
    const c = resolveTowerConfig(kny.tower);
    expect(ultimateNameOf(withAttrs({ knyrank: "HASHIRA" }), c)).toBe("Surpuissance");
    expect(
      ultimateNameOf(
        withAttrs({ knyrank: "NO_RANK", knyaffiliation: "TWELVE_KIZUKI" }),
        c,
      ),
    ).toBe("Surpuissance");
    expect(
      ultimateNameOf(
        withAttrs({ knyrank: "KINOE", knyaffiliation: "DEMON_SLAYER_CORPS" }),
        c,
      ),
    ).toBeNull();
  });

  /**
   * Régression : la fiche de carte relisait l'attribut en BOOLÉEN. Le serveur
   * simulait l'ultime (`toFighterSpec`), le client — qui rejoue depuis la
   * fiche — non : l'animation divergeait du résultat sur tout univers à liste
   * de valeurs.
   */
  it("la fiche client ouvre l'ultime exactement comme le serveur", () => {
    const c = resolveTowerConfig(bleach.tower);
    const espada = withAttrs({ bleachrelease: "RESURRECCION" });
    const card = toCardView(espada, c);

    expect(card.ultimateName).toBe("Resurrección");
    expect(toSpecFromView(card, "squad").hasDomain).toBe(
      toFighterSpec(espada, "squad", c).hasDomain,
    );
    expect(card.hasDomain).toBe(true);
  });
});

describe("archétype Territoire sans ultime", () => {
  const tgConfig = resolveTowerConfig(tg.tower);

  /**
   * Régression : Tsuneyoshi Washuu, n°1 dans la catégorie « CCG » (mappée sur
   * `domain`) mais humain, donc sans Menace SS — ni technique ni ultime, son
   * bouton restait grisé tout le combat.
   */
  it("un personnage sans ultime retombe sur sa meilleure catégorie suivante", () => {
    const washuu = character({
      ratings: { "tg-ccg": 95, "tg-battle-iq": 80, "tg-speed": 40 },
      attributes: { tgrate: "NO_RATE" },
    });

    const archetype = towerArchetypeOf(washuu, tgConfig);
    expect(archetype).not.toBe("domain");
    expect(archetype).toBe(tgConfig.categoryArchetypes["tg-battle-iq"]);
    expect(toCardView(washuu, tgConfig).technique).not.toBeNull();
  });

  it("un personnage AVEC ultime garde l'archétype Territoire", () => {
    const eto = character({
      ratings: { "tg-ccg": 95, "tg-battle-iq": 80 },
      attributes: { tgrate: "SSS" },
    });
    expect(towerArchetypeOf(eto, tgConfig)).toBe("domain");
  });

  it("serveur et fiche client tombent sur le même archétype", () => {
    const washuu = character({
      ratings: { "tg-ccg": 95, "tg-battle-iq": 80 },
      attributes: { tgrate: "NO_RATE" },
    });
    expect(toCardView(washuu, tgConfig).archetype).toBe(
      toFighterSpec(washuu, "squad", tgConfig).archetype,
    );
  });

  it("aucune fiche ne se retrouve sans technique ni ultime", () => {
    for (const c of ROSTER) {
      const card = toCardView(c, config);
      expect(card.technique !== null || card.hasDomain, c.id).toBe(true);
    }
  });
});
