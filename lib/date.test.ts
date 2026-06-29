import { describe, it, expect } from "vitest";
import { getWeekBounds, weekDateKeys } from "./date";
import { todayKey } from "./games/jjkdle/daily";

describe("getWeekBounds", () => {
  it("renvoie une fenêtre de 7 jours exactement", () => {
    const { start, end } = getWeekBounds(new Date("2026-06-24T12:00:00Z"));
    const days = (end.getTime() - start.getTime()) / 86_400_000;
    expect(days).toBe(7);
  });

  it("le lundi est le début de semaine (mercredi 24/06/2026 → lundi 22/06)", () => {
    const { start } = getWeekBounds(new Date("2026-06-24T12:00:00Z"));
    // start = lundi 22 juin 2026 minuit Europe/Paris.
    expect(todayKey(start, "Europe/Paris")).toBe("2026-06-22");
  });

  it("un dimanche appartient encore à la semaine du lundi précédent", () => {
    // Dimanche 28/06/2026.
    const { start } = getWeekBounds(new Date("2026-06-28T20:00:00Z"));
    expect(todayKey(start, "Europe/Paris")).toBe("2026-06-22");
  });

  it("le lundi lui-même démarre sa propre semaine", () => {
    const { start } = getWeekBounds(new Date("2026-06-22T06:00:00Z"));
    expect(todayKey(start, "Europe/Paris")).toBe("2026-06-22");
  });
});

describe("weekDateKeys", () => {
  it("renvoie 7 clés lundi→dimanche dans l'ordre", () => {
    const keys = weekDateKeys(new Date("2026-06-24T12:00:00Z"));
    expect(keys).toEqual([
      "2026-06-22",
      "2026-06-23",
      "2026-06-24",
      "2026-06-25",
      "2026-06-26",
      "2026-06-27",
      "2026-06-28",
    ]);
  });
});
