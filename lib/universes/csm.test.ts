import { describe, expect, it } from "vitest";
import { GAMES, gamesForUniverse } from "@/lib/games/registry";
import { csm } from "./csm";
import { jjk } from "./jjk";

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

/**
 * Synchro d'images (bouton « OUAIS »). Le tag de série et la clé de l'attribut de
 * filtrage étaient codés en dur sur JJK : la copie du bloc d'un univers à l'autre
 * sans en changer les valeurs ramènerait les images du mauvais anime, ou ne
 * trouverait personne. Ces tests attrapent précisément ce copier-coller.
 */
describe("synchro d'images CSM", () => {
  it("cible la série Chainsaw Man, pas celle de JJK", () => {
    expect(csm.booru?.seriesTag).toBe("chainsaw_man");
    expect(csm.booru?.seriesTag).not.toBe(jjk.booru?.seriesTag);
  });

  it("filtre sur un attribut qui existe VRAIMENT dans l'univers CSM", () => {
    // Les attributs CSM sont préfixés `csm…` (ils sont créés par univers) : une
    // clé JJK comme « gender » ne renverrait aucun personnage.
    expect(csm.booru?.filter?.attributeKey).toMatch(/^csm/);
    expect(csm.booru?.filter?.attributeKey).not.toBe(
      jjk.booru?.filter?.attributeKey,
    );
  });
});
