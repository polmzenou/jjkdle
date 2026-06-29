import { describe, it, expect } from "vitest";
import {
  computeTotalXp,
  xpForLevel,
  xpToLevel,
  levelToMinXp,
} from "./xp";
import type { UserStatsContext } from "./context";

function ctx(partial: Partial<UserStatsContext> = {}): UserStatsContext {
  return {
    role: "PLAYER",
    builderBest: 0,
    rankingBest: 0,
    draftKills: 0,
    draftVictory: false,
    jjkdleStreak: 0,
    jjkdleBestStreak: 0,
    gamesPlayed: 0,
    playedBuilder: false,
    playedRanking: false,
    playedDraft: false,
    playedJjkdle: false,
    ...partial,
  };
}

describe("computeTotalXp", () => {
  it("vaut 0 pour un contexte vierge", () => {
    expect(computeTotalXp(ctx())).toBe(0);
  });

  it("agrège les jeux selon les poids", () => {
    // builder 1000*1 + ranking 10000*0.1 + 6 boss*200 + streak 10*100
    const xp = computeTotalXp(
      ctx({ builderBest: 1000, rankingBest: 10000, draftKills: 6, jjkdleBestStreak: 10 }),
    );
    expect(xp).toBe(1000 + 1000 + 1200 + 1000);
  });

  it("ne renvoie jamais de valeur négative", () => {
    expect(computeTotalXp(ctx())).toBeGreaterThanOrEqual(0);
  });
});

describe("xpToLevel / levelToMinXp", () => {
  it("0 XP = niveau 1", () => {
    expect(xpToLevel(0).level).toBe(1);
  });

  it("le seuil exact d'un niveau fait basculer au niveau suivant", () => {
    const min2 = levelToMinXp(2); // = xpForLevel(1)
    expect(min2).toBe(xpForLevel(1));
    expect(xpToLevel(min2).level).toBe(2);
    expect(xpToLevel(min2 - 1).level).toBe(1);
  });

  it("levelToMinXp est l'inverse de xpToLevel aux bornes", () => {
    for (let lvl = 1; lvl <= 10; lvl++) {
      const minXp = levelToMinXp(lvl);
      expect(xpToLevel(minXp).level).toBe(lvl);
    }
  });

  it("current + paliers consommés = XP totale", () => {
    const total = 5000;
    const { level, current } = xpToLevel(total);
    const consumed = levelToMinXp(level);
    expect(consumed + current).toBe(total);
  });
});
