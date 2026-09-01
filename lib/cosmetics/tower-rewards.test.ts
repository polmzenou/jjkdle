import { describe, expect, it } from "vitest";
import { FRAMES } from "@/lib/frames/definitions";
import { FRAME_STYLES } from "@/lib/frames/styles";
import { TITLES } from "@/lib/titles/definitions";
import type { UnlockContext } from "./types";
import type { UserStatsContext } from "@/lib/progress/context";

/**
 * Titres et cadres de « The Culling Tower ».
 *
 * Ces récompenses ont une particularité que rien d'autre sur le site ne
 * partage : les essais de la tour sont ILLIMITÉS. Un palier « aller plus
 * haut » finit donc par tomber pour quiconque insiste, et ne distingue
 * personne. Ce qui distingue, c'est d'y arriver DU PREMIER ESSAI — d'où un
 * palier `towerBestAttempt === 1` plutôt qu'un simple `towerCleared` en haut de
 * l'échelle.
 *
 * Ces tests vérifient donc que chaque palier s'ouvre AU BON MOMENT, et surtout
 * qu'aucun ne s'ouvre trop tôt : un titre légendaire distribué à tout le monde
 * ne vaut plus rien, et rien au runtime ne le signalerait.
 */

function stats(partial: Partial<UserStatsContext> = {}): UserStatsContext {
  return {
    role: "PLAYER",
    builderBest: 0,
    rankingBest: 0,
    draftKills: 0,
    draftVictory: false,
    jjkdleStreak: 0,
    jjkdleBestStreak: 0,
    jjkdleBestAttempts: 0,
    guessWhoWins: 0,
    guessWhoLosses: 0,
    gamesPlayed: 0,
    playedBuilder: false,
    playedRanking: false,
    playedDraft: false,
    playedJjkdle: false,
    playedGuessWho: false,
    towerBestFloor: 0,
    towerCleared: false,
    towerBestAttempt: 0,
    playedTower: false,
    ...partial,
  };
}

function ctx(partial: Partial<UserStatsContext> = {}): UnlockContext {
  return { stats: stats(partial), level: 1, badgeCount: 0, badgeKeys: new Set() };
}

const TOWER_TITLES = ["TOWER_CLIMBER", "TOWER_SUMMIT", "TOWER_FLAWLESS"];
const TOWER_FRAMES = ["TOWER_SUMMIT_FRAME", "TOWER_FLAWLESS_FRAME"];

function title(key: string) {
  const found = TITLES.find((t) => t.key === key);
  if (!found) throw new Error(`titre ${key} introuvable`);
  return found;
}

function frame(key: string) {
  const found = FRAMES.find((f) => f.key === key);
  if (!found) throw new Error(`cadre ${key} introuvable`);
  return found;
}

describe("paliers de la Tour", () => {
  it("un joueur qui n'y a jamais touché n'a rien", () => {
    const fresh = ctx();
    for (const key of TOWER_TITLES) {
      expect(title(key).isUnlocked(fresh), key).toBe(false);
    }
    for (const key of TOWER_FRAMES) {
      expect(frame(key).isUnlocked(fresh), key).toBe(false);
    }
  });

  it("« Grimpeur » s'ouvre à l'étage 10, pas au 9", () => {
    expect(title("TOWER_CLIMBER").isUnlocked(ctx({ towerBestFloor: 9 }))).toBe(false);
    expect(title("TOWER_CLIMBER").isUnlocked(ctx({ towerBestFloor: 10 }))).toBe(true);
  });

  it("monter haut sans boucler ne donne PAS le sommet", () => {
    // L'étage 19 n'est pas le sommet, et c'est tout l'intérêt du palier.
    const almost = ctx({ towerBestFloor: 19, towerCleared: false });

    expect(title("TOWER_SUMMIT").isUnlocked(almost)).toBe(false);
    expect(frame("TOWER_SUMMIT_FRAME").isUnlocked(almost)).toBe(false);
  });

  it("boucler la tour ouvre le sommet, quel que soit le nombre d'essais", () => {
    const grind = ctx({ towerBestFloor: 20, towerCleared: true, towerBestAttempt: 12 });

    expect(title("TOWER_SUMMIT").isUnlocked(grind)).toBe(true);
    expect(frame("TOWER_SUMMIT_FRAME").isUnlocked(grind)).toBe(true);
  });

  it("mais PAS l'ascension parfaite : c'est la manière qui compte", () => {
    const grind = ctx({ towerBestFloor: 20, towerCleared: true, towerBestAttempt: 2 });

    expect(title("TOWER_FLAWLESS").isUnlocked(grind)).toBe(false);
    expect(frame("TOWER_FLAWLESS_FRAME").isUnlocked(grind)).toBe(false);
  });

  it("le premier essai réussi ouvre tout", () => {
    const perfect = ctx({ towerBestFloor: 20, towerCleared: true, towerBestAttempt: 1 });

    for (const key of TOWER_TITLES) {
      expect(title(key).isUnlocked(perfect), key).toBe(true);
    }
    for (const key of TOWER_FRAMES) {
      expect(frame(key).isUnlocked(perfect), key).toBe(true);
    }
  });

  it("l'échelle de rareté monte avec l'exigence", () => {
    expect(title("TOWER_CLIMBER").rarity).toBe("rare");
    expect(title("TOWER_SUMMIT").rarity).toBe("epic");
    expect(title("TOWER_FLAWLESS").rarity).toBe("legendary");
  });
});

describe("intégrité des catalogues", () => {
  // Ces deux tests couvrent bien plus que la Tour : la possession est indexée
  // PAR CLÉ et globale à tous les univers. Deux définitions partageant une clé
  // débloqueraient donc l'une par l'autre, en silence.
  it("les clés de titres sont uniques", () => {
    const keys = TITLES.map((t) => t.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("les clés de cadres sont uniques", () => {
    const keys = FRAMES.map((f) => f.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("chaque cadre pointe sur un style qui existe", () => {
    // Un `styleKey` inconnu ne lève rien : `frameRingForStyle` retombe sur le
    // cadre par défaut, et le joueur voit une bordure grise à la place de sa
    // récompense légendaire.
    for (const f of FRAMES) {
      expect(FRAME_STYLES, `${f.key} → ${f.styleKey}`).toHaveProperty(f.styleKey);
    }
  });
});
