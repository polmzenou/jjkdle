import { describe, expect, it } from "vitest";
import { listUniverses } from "@/lib/universes/registry";
import { jjk } from "@/lib/universes/jjk";
import { GAMES, gamesForUniverse } from "./registry";

/**
 * Meta descriptions des jeux, pour TOUS les univers.
 *
 * Les pages JJKdle, Random Battle, Qui est-ce ? et Codenames passaient une meta
 * description écrite en dur pour Jujutsu Kaisen : CSMdle s'annonçait dans Google
 * comme « le jeu du jour Jujutsu Kaisen ». Elle vit désormais dans le registre
 * (`seoDescription`), et `applyCopy` doit l'écarter dès qu'un univers réécrit la
 * description d'un jeu.
 */

const others = listUniverses().filter((u) => u.slug !== jjk.slug);

describe("seoDescription des jeux", () => {
  it.each(others.map((u) => [u.slug, u] as const))(
    "%s : aucune description de jeu ne parle de Jujutsu Kaisen",
    (_slug, universe) => {
      for (const game of gamesForUniverse(universe.gameCopy)) {
        const text = `${game.seoDescription ?? ""} ${game.description}`;
        expect(text, game.id).not.toMatch(/Jujutsu|JJK/);
      }
    },
  );

  it("JJK garde ses descriptions SEO dédiées", () => {
    const withSeo = gamesForUniverse(jjk.gameCopy).filter(
      (g) => g.seoDescription,
    );
    expect(withSeo.map((g) => g.id).sort()).toEqual(
      GAMES.filter((g) => g.seoDescription)
        .map((g) => g.id)
        .sort(),
    );
  });
});
