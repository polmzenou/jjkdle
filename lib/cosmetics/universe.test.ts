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
 * Portée d'univers des cosmétiques (étape 2d). Deux garanties testées ici :
 *   1. NON-RÉGRESSION JJK : le catalogue vu depuis "jjk" est exactement le
 *      catalogue complet d'aujourd'hui (rien ne disparaît du site actuel) ;
 *   2. ISOLATION : depuis un autre univers, seuls les cosmétiques NEUTRES
 *      passent — c'est la validation appelée par equipTitleAction /
 *      equipFrameAction / PATCH /api/profile.
 */

const OTHER = "csm"; // univers tiers (pas encore peuplé) — doit tout rejeter

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
  it("expose tout le catalogue de titres sur jjk", () => {
    expect(titlesForUniverse("jjk")).toHaveLength(TITLES.length);
    expect(TITLES.every((t) => t.universe === "jjk")).toBe(true);
  });

  it("expose tout le catalogue de badges sur jjk", () => {
    expect(badgesForUniverse("jjk")).toHaveLength(BADGES.length);
    expect(BADGES.every((b) => b.universe === "jjk")).toBe(true);
  });

  it("expose tout le catalogue de cadres sur jjk", () => {
    expect(framesForUniverse("jjk")).toHaveLength(FRAMES.length);
  });

  it("expose toute la palette de bannières sur jjk", () => {
    expect(bannerKeysForUniverse("jjk")).toHaveLength(
      Object.keys(BANNER_PALETTE).length,
    );
  });
});

describe("isolation d'un univers tiers", () => {
  it("ne propose aucun titre ni badge JJK ailleurs", () => {
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
