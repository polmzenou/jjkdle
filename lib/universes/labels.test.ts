import { describe, expect, it } from "vitest";
import { listUniverses } from "./registry";
import { jjk } from "./jjk";

/**
 * Libellés de la landing et de la liste des jeux, pour TOUS les univers.
 *
 * Ces textes étaient écrits en dur dans `app/[universe]/page.tsx` et
 * `app/[universe]/games/page.tsx`, entièrement en vocabulaire Jujutsu Kaisen
 * (« La salle d'arcade maudite », « Les jeux maudits », les kanji 呪術廻…) : ils
 * s'affichaient donc tels quels sur Chainsaw Man, AOT et KNY. Maintenant qu'ils
 * viennent de `UniverseConfig.labels`, ce test empêche qu'un univers ajouté plus
 * tard les recopie sans les traduire — le compilateur, lui, exige juste qu'ils
 * soient présents, pas qu'ils parlent du bon anime.
 */

const universes = listUniverses();
const others = universes.filter((u) => u.slug !== jjk.slug);

describe("libellés de tous les univers", () => {
  it.each(universes.map((u) => [u.slug, u] as const))(
    "%s : tous les libellés sont renseignés",
    (_slug, universe) => {
      const { labels } = universe;
      for (const [field, value] of Object.entries(labels)) {
        if (field === "kanjiColumns") continue;
        expect(value, `${field} vide`).toBeTruthy();
      }
      // Exactement 4 colonnes : le décor en pose deux à gauche, deux à droite,
      // et un tableau plus court laisserait un `undefined` rendu comme du vide.
      expect(labels.kanjiColumns).toHaveLength(4);
      for (const column of labels.kanjiColumns) {
        expect(column.length).toBeGreaterThan(0);
      }
      // La pastille du hero n'a la place que d'un seul caractère.
      expect([...labels.heroKanji]).toHaveLength(1);
    },
  );

  it.each(others.map((u) => [u.slug, u] as const))(
    "%s : aucun vocabulaire JJK dans ses libellés",
    (_slug, universe) => {
      for (const text of Object.values(universe.labels).flat()) {
        expect(text).not.toMatch(/JJK|Jujutsu|sorcier|exorcis|occulte|maudit/i);
      }
    },
  );

  it("aucun univers ne reprend les kanji de JJK", () => {
    // Le copier-coller le plus probable, et le plus invisible en relecture :
    // 呪術廻 (« jujutsu kaisen ») sur une landing Demon Slayer.
    for (const universe of others) {
      expect(universe.labels.kanjiColumns).not.toEqual(jjk.labels.kanjiColumns);
      expect(universe.labels.heroKanji).not.toBe(jjk.labels.heroKanji);
    }
  });

  it("l'artwork décoratif de JJK ne fuite pas sur les autres univers", () => {
    // L'ofuda et le sceau d'asservissement sont des objets JJK dessinés en dur.
    expect(jjk.decorArtwork).toBe("jjk-cursed-objects");
    for (const universe of others) {
      expect(universe.decorArtwork).toBeUndefined();
    }
  });
});
