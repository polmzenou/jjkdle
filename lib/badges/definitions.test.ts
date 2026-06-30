import { describe, it, expect } from "vitest";
import { BADGES, getBadge, isBadgeKey } from "./definitions";
import type { UserStatsContext } from "@/lib/progress/context";

function ctx(partial: Partial<UserStatsContext> = {}): UserStatsContext {
  return {
    role: "PLAYER",
    builderBest: 0,
    rankingBest: 0,
    draftKills: 0,
    draftVictory: false,
    jjkdleStreak: 0,
    jjkdleBestStreak: 0,
    jjkdleBestAttempts: 0,
    gamesPlayed: 0,
    playedBuilder: false,
    playedRanking: false,
    playedDraft: false,
    playedJjkdle: false,
    ...partial,
  };
}

function check(key: string, c: UserStatsContext): boolean {
  const badge = getBadge(key);
  if (!badge) throw new Error(`badge ${key} introuvable`);
  return badge.check(c);
}

describe("règles de badges", () => {
  it("clés uniques", () => {
    const keys = BADGES.map((b) => b.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("badges de première partie selon le jeu joué", () => {
    expect(check("FIRST_PLAY_BUILDER", ctx({ playedBuilder: true }))).toBe(true);
    expect(check("FIRST_PLAY_BUILDER", ctx())).toBe(false);
    expect(check("FIRST_PLAY_RANKING", ctx({ playedRanking: true }))).toBe(true);
    expect(check("FIRST_PLAY_DRAFT", ctx({ playedDraft: true }))).toBe(true);
    expect(check("FIRST_PLAY_JJKDLE", ctx({ playedJjkdle: true }))).toBe(true);
    // Jouer à un jeu ne débloque pas le badge d'un autre.
    expect(check("FIRST_PLAY_DRAFT", ctx({ playedBuilder: true }))).toBe(false);
  });

  it("FIRST_S_GRADE au seuil 980", () => {
    expect(check("FIRST_S_GRADE", ctx({ builderBest: 979 }))).toBe(false);
    expect(check("FIRST_S_GRADE", ctx({ builderBest: 980 }))).toBe(true);
  });

  it("PYRAMID_PERFECT à 10000", () => {
    expect(check("PYRAMID_PERFECT", ctx({ rankingBest: 9999 }))).toBe(false);
    expect(check("PYRAMID_PERFECT", ctx({ rankingBest: 10000 }))).toBe(true);
  });

  it("DRAFT_CONQUEROR sur la victoire", () => {
    expect(check("DRAFT_CONQUEROR", ctx({ draftVictory: false }))).toBe(false);
    expect(check("DRAFT_CONQUEROR", ctx({ draftVictory: true }))).toBe(true);
  });

  it("JJKDLE_STREAK_7 à 7 jours (courant ou record)", () => {
    expect(check("JJKDLE_STREAK_7", ctx({ jjkdleStreak: 6 }))).toBe(false);
    expect(check("JJKDLE_STREAK_7", ctx({ jjkdleStreak: 7 }))).toBe(true);
    expect(check("JJKDLE_STREAK_7", ctx({ jjkdleBestStreak: 7 }))).toBe(true);
  });

  it("POLYVALENT à 4 jeux", () => {
    expect(check("POLYVALENT", ctx({ gamesPlayed: 3 }))).toBe(false);
    expect(check("POLYVALENT", ctx({ gamesPlayed: 4 }))).toBe(true);
  });

  it("les badges manuels ne se débloquent jamais automatiquement", () => {
    const manual = BADGES.filter((b) => b.key === "STAFF_PICK");
    expect(manual).toHaveLength(1);
    // Aucun contexte ne doit satisfaire un badge manuel.
    expect(
      check("STAFF_PICK", ctx({ builderBest: 1000, rankingBest: 10000, draftVictory: true, gamesPlayed: 9, jjkdleStreak: 99 })),
    ).toBe(false);
  });

  it("isBadgeKey valide l'appartenance au catalogue", () => {
    expect(isBadgeKey("FIRST_S_GRADE")).toBe(true);
    expect(isBadgeKey("NOPE")).toBe(false);
  });
});
