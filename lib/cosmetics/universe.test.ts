import { describe, expect, it } from "vitest";
import {
  ANY_UNIVERSE,
  inUniverse,
  isInUniverse,
  tagUniverse,
} from "./universe";
import { BADGES, badgesForUniverse } from "@/lib/badges/definitions";
import {
  DEFAULT_FRAME_KEY,
  FRAMES,
  framesForUniverse,
  isFrameInUniverse,
} from "@/lib/frames/definitions";
import {
  TITLES,
  isTitleInUniverse,
  titlesForUniverse,
} from "@/lib/titles/definitions";
import {
  BANNER_PALETTE,
  bannerKeysForUniverse,
  isBannerInUniverse,
} from "@/lib/profile/banners";

/**
 * Portée d'univers des cosmétiques (étape 2d). Trois garanties testées ici :
 *   1. NON-RÉGRESSION JJK : le catalogue vu depuis "jjk" est exactement le
 *      sous-catalogue tagué "jjk" (rien ne disparaît du site actuel, et rien
 *      d'un autre anime n'y apparaît) ;
 *   2. CATALOGUE CSM : peuplé, disjoint de JJK, sans vocabulaire JJK ;
 *   3. ISOLATION : depuis un univers inconnu, seuls les cosmétiques NEUTRES
 *      passent — c'est la validation appelée par equipTitleAction /
 *      equipFrameAction / PATCH /api/profile.
 */

const OTHER = "unknown-universe"; // univers non peuplé — doit tout rejeter

/** Sous-catalogue tagué d'un univers, vu depuis le catalogue complet. */
const taggedJjk = <T extends { universe: string }>(items: readonly T[]) =>
  items.filter((i) => i.universe === "jjk");

describe("isInUniverse", () => {
  it("accepte le même univers et refuse les autres", () => {
    expect(isInUniverse("jjk", "jjk")).toBe(true);
    expect(isInUniverse("jjk", OTHER)).toBe(false);
  });

  it("accepte un cosmétique neutre dans n'importe quel univers", () => {
    expect(isInUniverse(ANY_UNIVERSE, "jjk")).toBe(true);
    expect(isInUniverse(ANY_UNIVERSE, OTHER)).toBe(true);
  });
});

describe("inUniverse / tagUniverse", () => {
  it("filtre sur le slug en gardant les neutres", () => {
    const items = [
      { key: "a", universe: "jjk" },
      { key: "b", universe: OTHER },
      { key: "c", universe: ANY_UNIVERSE },
    ];
    expect(inUniverse(items, "jjk").map((i) => i.key)).toEqual(["a", "c"]);
    expect(inUniverse(items, OTHER).map((i) => i.key)).toEqual(["b", "c"]);
  });

  it("tague un catalogue sans altérer les autres champs", () => {
    const tagged = tagUniverse([{ key: "x" }], "jjk");
    expect(tagged).toEqual([{ key: "x", universe: "jjk" }]);
  });
});

describe("catalogues JJK (non-régression)", () => {
  it("expose tout le catalogue de titres JJK sur jjk, et rien d'un autre anime", () => {
    expect(titlesForUniverse("jjk")).toEqual(taggedJjk(TITLES));
  });

  it("expose tout le catalogue de badges JJK sur jjk", () => {
    expect(badgesForUniverse("jjk")).toEqual(taggedJjk(BADGES));
  });

  it("expose les cadres JJK + le cadre neutre sur jjk", () => {
    expect(framesForUniverse("jjk")).toHaveLength(
      taggedJjk(FRAMES).length + 1, // + DEFAULT (neutre)
    );
  });

  it("expose les bannières JJK + la bannière neutre sur jjk", () => {
    const jjkKeys = Object.values(BANNER_PALETTE).filter(
      (b) => b.universe === "jjk",
    );
    expect(bannerKeysForUniverse("jjk")).toHaveLength(jjkKeys.length + 1);
  });
});

describe("catalogue CSM", () => {
  const csmBadges = badgesForUniverse("csm");
  const csmTitles = titlesForUniverse("csm");
  const csmFrames = framesForUniverse("csm").filter(
    (f) => f.key !== DEFAULT_FRAME_KEY,
  );

  it("est peuplé (un univers sans cosmétiques n'a rien à afficher)", () => {
    expect(csmBadges.length).toBeGreaterThan(0);
    expect(csmTitles.length).toBeGreaterThan(0);
    expect(csmFrames.length).toBeGreaterThan(0);
    expect(bannerKeysForUniverse("csm").length).toBeGreaterThan(1);
  });

  it("n'a AUCUNE clé en commun avec JJK (la possession est globale)", () => {
    const jjkKeys = new Set([
      ...taggedJjk(BADGES).map((b) => b.key),
      ...taggedJjk(TITLES).map((t) => t.key),
      ...taggedJjk(FRAMES).map((f) => f.key),
    ]);
    for (const k of [...csmBadges, ...csmTitles, ...csmFrames].map((c) => c.key)) {
      expect(jjkKeys.has(k)).toBe(false);
    }
  });

  it("nomme les jeux avec les titres CSM (et non l'id en repli)", () => {
    // `gameTitleIn("csm", …)` doit vraiment résoudre : un slug mal orthographié
    // retomberait sur l'id du jeu (« jjkdle »), sans autre signe visible.
    const daily = [...csmBadges, ...csmTitles].map((c) => c.description);
    expect(daily.some((d) => d.includes("CSMdle"))).toBe(true);
    expect(daily.some((d) => d.includes("jjkdle"))).toBe(false);
  });

  it("ne contient aucun vocabulaire JJK dans ses libellés", () => {
    const texts = [...csmBadges, ...csmTitles, ...csmFrames].flatMap((c) => [
      c.name,
      c.description,
    ]);
    for (const t of texts) {
      expect(t).not.toMatch(/JJK|Jujutsu|sorcier|exorcis|occulte/i);
    }
  });
});

describe("isolation d'un univers tiers", () => {
  it("ne propose aucun titre ni badge ailleurs", () => {
    expect(titlesForUniverse(OTHER)).toEqual([]);
    expect(badgesForUniverse(OTHER)).toEqual([]);
  });

  it("ne propose que le cadre par défaut (neutre) ailleurs", () => {
    expect(framesForUniverse(OTHER).map((f) => f.key)).toEqual([
      DEFAULT_FRAME_KEY,
    ]);
  });

  it("ne propose que la bannière `default` (neutre) ailleurs", () => {
    expect(bannerKeysForUniverse(OTHER)).toEqual(["default"]);
  });
});

describe("garde d'équipement (validation serveur)", () => {
  it("autorise un titre de l'univers courant", () => {
    expect(isTitleInUniverse("STRONGEST", "jjk")).toBe(true);
  });

  it("REFUSE un titre appartenant à un autre univers", () => {
    expect(isTitleInUniverse("STRONGEST", OTHER)).toBe(false);
    // Croisement JJK ↔ CSM : chacun refuse le titre de l'autre.
    expect(isTitleInUniverse("STRONGEST", "csm")).toBe(false);
    expect(isTitleInUniverse("CSM_HERO_OF_HELL", "csm")).toBe(true);
    expect(isTitleInUniverse("CSM_HERO_OF_HELL", "jjk")).toBe(false);
  });

  it("REFUSE un cadre d'un autre univers mais garde le neutre équipable", () => {
    expect(isFrameInUniverse("INFINITY", "jjk")).toBe(true);
    expect(isFrameInUniverse("INFINITY", OTHER)).toBe(false);
    expect(isFrameInUniverse(DEFAULT_FRAME_KEY, OTHER)).toBe(true);
  });

  it("REFUSE une bannière d'un autre univers mais garde `default` équipable", () => {
    expect(isBannerInUniverse("crimson", "jjk")).toBe(true);
    expect(isBannerInUniverse("crimson", OTHER)).toBe(false);
    // `default` est la valeur @default du schéma : valide dans tout univers.
    expect(isBannerInUniverse("default", OTHER)).toBe(true);
  });

  it("refuse une clé inconnue (anti-tamper) dans tous les cas", () => {
    expect(isTitleInUniverse("NOPE", "jjk")).toBe(false);
    expect(isFrameInUniverse("NOPE", "jjk")).toBe(false);
    expect(isBannerInUniverse("NOPE", "jjk")).toBe(false);
  });
});
