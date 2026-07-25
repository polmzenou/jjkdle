import { describe, expect, it } from "vitest";
import { GAMES, gamesForUniverse } from "@/lib/games/registry";
import { csm } from "./csm";

/**
 * Textes des jeux côté CSM. Le registre (`lib/games/registry.ts`) porte les
 * textes de l'univers PAR DÉFAUT, qui sont ceux de JJK : un jeu que CSM oublie
 * de réécrire retomberait donc silencieusement sur du vocabulaire Jujutsu
 * Kaisen. C'est exactement ce que ces deux tests empêchent.
 */
describe("copy des jeux CSM", () => {
  const games = gamesForUniverse(csm.gameCopy);

  it("réécrit les trois champs pour CHAQUE jeu du registre", () => {
    for (const g of GAMES) {
      const copy = csm.gameCopy?.[g.id];
      expect(copy, `jeu « ${g.id} » absent de csm.gameCopy`).toBeDefined();
      expect(copy?.title).toBeTruthy();
      expect(copy?.description).toBeTruthy();
      expect(copy?.tags?.length).toBeGreaterThan(0);
    }
  });

  it("ne laisse fuiter aucun vocabulaire JJK", () => {
    for (const g of games) {
      const texts = [g.title, g.description, ...(g.tags ?? [])];
      for (const t of texts) {
        expect(t, `« ${g.id} » : ${t}`).not.toMatch(
          /JJK|Jujutsu|sorcier|exorcis|occulte|maudit/i,
        );
      }
    }
  });
});
