import { describe, expect, it } from "vitest";
import { AOT_ATTRIBUTES } from "@/lib/universes/aot-attributes";
import { CSM_CATEGORIES } from "@/lib/universes/csm-categories";
import { JJK_ATTRIBUTES } from "@/lib/universes/jjk-attributes";
import { KNY_ATTRIBUTES } from "@/lib/universes/kny-attributes";
import { KNY_CATEGORIES } from "@/lib/universes/kny-categories";
import { TG_ATTRIBUTES } from "@/lib/universes/tg-attributes";
import { TG_CATEGORIES } from "@/lib/universes/tg-categories";
import { listUniverses } from "@/lib/universes/registry";
import type { AttributeSpec } from "@/lib/games/jjkdle/attribute-schema";
import type { CategoryConfig } from "@/data/roster/categories";
import { JJK_TOWER_CONFIG, resolveTowerConfig } from "./config";
import { ARCHETYPES, type Archetype } from "./types";

/**
 * La Tour est data-driven : ouvrir un univers, c'est écrire un `tower` dans sa
 * config, pas du code. Ces tests gardent cette promesse — parce que RIEN, au
 * runtime, ne signale une config fausse.
 *
 * Un id de catégorie mal orthographié ne lève aucune erreur : `archetypeOf`
 * retombe sur `DEFAULT_ARCHETYPE` et TOUT le roster devient « brute ». Le jeu
 * tourne, les combats se résolvent, et les neuf capacités ont disparu sans
 * qu'aucun log ne le dise. C'est exactement le genre de panne qu'on ne
 * découvre qu'en jouant longtemps — d'où ces tests.
 */

const UNIVERSES = listUniverses();

/** Sources vérifiables à la compilation, par univers. AOT n'a pas de fichier de catégories. */
const SOURCES: Record<
  string,
  { attributes?: AttributeSpec[]; categories?: CategoryConfig[] }
> = {
  jjk: { attributes: JJK_ATTRIBUTES },
  aot: { attributes: AOT_ATTRIBUTES },
  kny: { attributes: KNY_ATTRIBUTES, categories: KNY_CATEGORIES },
  tg: { attributes: TG_ATTRIBUTES, categories: TG_CATEGORIES },
  csm: { categories: CSM_CATEGORIES },
};

describe("config de la Tour, tous univers", () => {
  it.each(UNIVERSES.map((u) => [u.slug, u] as const))(
    "%s : les neuf archétypes sont atteignables, chacun une seule fois",
    (_slug, universe) => {
      const config = resolveTowerConfig(universe.tower);
      const mapped = Object.values(config.categoryArchetypes);

      // Un archétype manquant, c'est une capacité que personne n'aura jamais ;
      // un archétype en double, c'est une catégorie qui ne sert à rien.
      expect([...mapped].sort()).toEqual([...ARCHETYPES].sort());
    },
  );

  it.each(UNIVERSES.map((u) => [u.slug, u] as const))(
    "%s : les trois attributs de config existent dans l'univers",
    (slug, universe) => {
      const specs = SOURCES[slug]?.attributes;
      if (!specs) return; // univers sans fichier d'attributs : rien à vérifier ici

      const config = resolveTowerConfig(universe.tower);
      const keys = new Set(specs.map((a) => a.key));

      expect(keys).toContain(config.arcAttributeKey);
      expect(keys).toContain(config.ultimateAttributeKey);
      expect(keys).toContain(config.energyAttributeKey);
    },
  );

  it.each(UNIVERSES.map((u) => [u.slug, u] as const))(
    "%s : l'attribut d'arc est bien ORDINAL — c'est l'échelle du récit",
    (slug, universe) => {
      const specs = SOURCES[slug]?.attributes;
      if (!specs) return;

      const config = resolveTowerConfig(universe.tower);
      const arc = specs.find((a) => a.key === config.arcAttributeKey);

      // Un attribut CATEGORICAL n'a pas d'ordre : les strates seraient tirées
      // au hasard et la tour n'aurait plus de courbe du tout.
      expect(arc?.kind).toBe("ORDINAL");
    },
  );

  it.each(UNIVERSES.map((u) => [u.slug, u] as const))(
    "%s : chaque catégorie mappée existe vraiment",
    (slug, universe) => {
      const categories = SOURCES[slug]?.categories;
      if (!categories) return;

      const config = resolveTowerConfig(universe.tower);
      const known = new Set(categories.map((c) => c.id));

      for (const key of Object.keys(config.categoryArchetypes)) {
        expect(known, `catégorie inconnue : ${key}`).toContain(key);
      }
    },
  );

  it.each(UNIVERSES.map((u) => [u.slug, u] as const))(
    "%s : les valeurs d'ultime, si listées, existent dans leur attribut",
    (slug, universe) => {
      const config = resolveTowerConfig(universe.tower);
      const allowed = config.ultimateAttributeValues;
      if (!allowed) return;

      // Une liste vide ferait retomber la lecture en mode booléen sur un
      // attribut qui n'est pas booléen : personne n'aurait d'ultime.
      expect(allowed.length).toBeGreaterThan(0);

      const specs = SOURCES[slug]?.attributes;
      if (!specs) return;

      const spec = specs.find((a) => a.key === config.ultimateAttributeKey);
      const values = new Set(
        (spec?.options ?? []).map((option) => option.value),
      );
      for (const value of allowed) {
        expect(values, `valeur inconnue : ${value}`).toContain(value);
      }
    },
  );
});

describe("résolution des surcharges", () => {
  it("un univers sans surcharge hérite entièrement de JJK", () => {
    expect(resolveTowerConfig(undefined)).toEqual(JJK_TOWER_CONFIG);
  });

  it("une surcharge partielle ne perd pas les autres clés", () => {
    const config = resolveTowerConfig({ arcAttributeKey: "monArc" });

    expect(config.arcAttributeKey).toBe("monArc");
    expect(config.energyAttributeKey).toBe(JJK_TOWER_CONFIG.energyAttributeKey);
  });

  /**
   * Le piège que ce test garde : hériter les valeurs d'ultime de JJK
   * (`"true"`/booléen) alors que l'univers a redéfini l'attribut lui-même
   * donnerait un filtre appliqué à un attribut qui n'a pas ces valeurs — donc
   * zéro personnage avec ultime, en silence.
   */
  it("redéfinir l'attribut d'ultime SANS valeurs le fait lire comme un booléen", () => {
    const config = resolveTowerConfig({ ultimateAttributeKey: "monFlag" });

    expect(config.ultimateAttributeKey).toBe("monFlag");
    expect(config.ultimateAttributeValues).toBeUndefined();
  });

  it("les valeurs listées accompagnent leur attribut", () => {
    const config = resolveTowerConfig({
      ultimateAttributeKey: "grade",
      ultimateAttributeValues: ["SOMMET"],
    });

    expect(config.ultimateAttributeValues).toEqual(["SOMMET"]);
  });
});

describe("lecture de l'ultime", () => {
  const ARCHETYPE_SAMPLE: Archetype = "domain";

  it("chaque univers mappe une catégorie sur l'archétype d'ultime", () => {
    // Sans elle, le passif « Territoire » (seuil d'ultime abaissé) serait
    // inaccessible dans cet univers.
    for (const universe of UNIVERSES) {
      const config = resolveTowerConfig(universe.tower);
      expect(
        Object.values(config.categoryArchetypes),
        `${universe.slug} n'a pas de catégorie « ${ARCHETYPE_SAMPLE} »`,
      ).toContain(ARCHETYPE_SAMPLE);
    }
  });
});
