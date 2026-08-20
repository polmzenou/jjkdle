import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { GAMES, gamesForUniverse } from "@/lib/games/registry";
import { kny } from "./kny";
import { jjk } from "./jjk";
import { KNY_CATEGORIES } from "./kny-categories";

/**
 * Textes des jeux côté KNY. Le registre (`lib/games/registry.ts`) porte les
 * textes de l'univers PAR DÉFAUT, qui sont ceux de JJK : un jeu que KNY oublie
 * de réécrire retomberait donc silencieusement sur du vocabulaire Jujutsu
 * Kaisen. C'est exactement ce que ces deux tests empêchent.
 *
 * Décalque de `csm.test.ts` : c'est le filet documenté pour un nouvel univers.
 */
describe("copy des jeux KNY", () => {
  const games = gamesForUniverse(kny.gameCopy);

  it("réécrit les trois champs pour CHAQUE jeu du registre", () => {
    for (const g of GAMES) {
      const copy = kny.gameCopy?.[g.id];
      expect(copy, `jeu « ${g.id} » absent de kny.gameCopy`).toBeDefined();
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

  /**
   * Même piège que les textes, en visuel : une miniature montre le roster de
   * l'anime, et celle du registre montre des persos JJK. Un chemin mal écrit
   * casserait l'image sans bruit, d'où la vérification que l'asset existe.
   */
  it("pointe vers des miniatures KNY qui existent", () => {
    for (const g of GAMES) {
      const src = kny.gameCopy?.[g.id]?.previewImage;
      if (!src) continue; // jeu sans capture KNY dédiée : repli assumé sur JJK
      expect(src, `« ${g.id} » : miniature non KNY`).toMatch(/-kny\.\w+$/);
      expect(
        existsSync(resolve(__dirname, "../../public", src.replace(/^\//, ""))),
        `« ${g.id} » : asset introuvable (${src})`,
      ).toBe(true);
    }
  });

  /** Le logo est référencé par `logo.src` : un chemin faux ne casse rien à la compilation. */
  it("pointe vers un logo qui existe", () => {
    expect(
      existsSync(
        resolve(__dirname, "../../public", kny.logo.src.replace(/^\//, "")),
      ),
      `logo introuvable (${kny.logo.src})`,
    ).toBe(true);
  });
});

/**
 * Synchro d'images (bouton « OUAIS »). Le tag de série et la clé de l'attribut de
 * filtrage étaient codés en dur sur JJK : la copie du bloc d'un univers à l'autre
 * sans en changer les valeurs ramènerait les images du mauvais anime, ou ne
 * trouverait personne. Ces tests attrapent précisément ce copier-coller.
 */
describe("synchro d'images KNY", () => {
  it("cible la série Kimetsu no Yaiba, pas celle de JJK", () => {
    expect(kny.booru?.seriesTag).toBe("kimetsu_no_yaiba");
    expect(kny.booru?.seriesTag).not.toBe(jjk.booru?.seriesTag);
  });

  it("filtre sur un attribut qui existe VRAIMENT dans l'univers KNY", () => {
    // Les attributs KNY sont préfixés `kny…` (ils sont créés par univers) : une
    // clé JJK comme « gender » ne renverrait aucun personnage.
    expect(kny.booru?.filter?.attributeKey).toMatch(/^kny/);
    expect(kny.booru?.filter?.attributeKey).not.toBe(
      jjk.booru?.filter?.attributeKey,
    );
  });
});

/**
 * Higher/Lower et KNYdle lisent tous deux `knypower` : la config du jeu et le
 * fichier d'amorçage des attributs doivent donc désigner la MÊME clé. Un
 * renommage d'un seul côté casserait le jeu sans erreur de compilation.
 */
describe("attribut comparé par Higher/Lower", () => {
  it("désigne une clé définie dans les attributs KNY", async () => {
    const { KNY_ATTRIBUTES } = await import("./kny-attributes");
    const key = kny.higherLower?.attributeKey;
    expect(key).toBe("knypower");
    expect(KNY_ATTRIBUTES.map((a) => a.key)).toContain(key);
  });

  it("filtre le booru sur une clé, elle aussi, définie", async () => {
    const { KNY_ATTRIBUTES } = await import("./kny-attributes");
    expect(KNY_ATTRIBUTES.map((a) => a.key)).toContain(
      kny.booru?.filter?.attributeKey,
    );
  });
});

/**
 * Catégories du builder KNY.
 *
 * Le piège que ces tests ferment : une catégorie SANS personnage noté rend la
 * partie INFINISSABLE. `drawOne` renvoie `null`, la case ne peut pas se
 * verrouiller, et `lockedIds.length` n'atteint donc jamais `categories.length`
 * — la condition de fin de partie. Rien ne plante, le joueur reste juste coincé.
 *
 * On vérifie ici les données d'amorçage (`kny-categories.ts` + `data/ratings/kny.json`),
 * pas la base : la source de vérité au runtime reste la table `Category`, mais
 * c'est de ce couple que part tout nouvel univers.
 *
 * Volontairement AUCUN test sur la distribution des scores : elle est aléatoire.
 * Le calibrage (moyenne ~870, Grade 1 ≈ 20 %, Grade S ≈ 0 %, aligné sur JJK/AOT)
 * se vérifie par simulation, pas par assertion.
 */
describe("catégories du builder KNY", () => {
  const ratings = JSON.parse(
    readFileSync(resolve(__dirname, "../../data/ratings/kny.json"), "utf8"),
  ) as Record<string, Record<string, number>>;

  it("préfixe chaque id par l'univers", () => {
    // `Category.id` est une clé primaire GLOBALE et la clé du JSON
    // `Character.ratings` : un id non préfixé entrerait en collision avec un
    // autre univers, et serait impossible à renommer après coup.
    for (const c of KNY_CATEGORIES) {
      expect(c.id, `catégorie « ${c.label} »`).toMatch(/^kny-/);
    }
    expect(new Set(KNY_CATEGORIES.map((c) => c.id)).size).toBe(
      KNY_CATEGORIES.length,
    );
  });

  it("ne laisse fuiter aucun vocabulaire JJK", () => {
    for (const c of KNY_CATEGORIES) {
      for (const t of [c.label, c.description]) {
        expect(t, `« ${c.id} » : ${t}`).not.toMatch(
          /JJK|Jujutsu|sorcier|exorcis|occulte|maudit/i,
        );
      }
    }
  });

  it("donne à chaque catégorie de quoi remplir un tirage", () => {
    for (const c of KNY_CATEGORIES) {
      // Le fichier de notes utilise le slug court ; l'id est aussi accepté.
      const slug = c.id.replace(/^kny-/, "");
      const rated = Object.values(ratings).filter(
        (r) => r[slug] !== undefined || r[c.id] !== undefined,
      );
      expect(
        rated.length,
        `« ${c.id} » : ${rated.length} personnage(s) noté(s) — en dessous de ` +
          `drawCount (${c.drawCount}), la case se vide et la partie ne peut plus finir`,
      ).toBeGreaterThanOrEqual(c.drawCount);
    }
  });

  it("ne note aucun personnage dans une catégorie inconnue", () => {
    const known = new Set(
      KNY_CATEGORIES.flatMap((c) => [c.id, c.id.replace(/^kny-/, "")]),
    );
    for (const [character, row] of Object.entries(ratings)) {
      for (const key of Object.keys(row)) {
        expect(known, `${character} : catégorie « ${key} » inconnue`).toContain(
          key,
        );
      }
    }
  });

  it("garde les notes dans 0–100", () => {
    for (const [character, row] of Object.entries(ratings)) {
      for (const [key, value] of Object.entries(row)) {
        expect(Number.isInteger(value), `${character}/${key} = ${value}`).toBe(
          true,
        );
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(100);
      }
    }
  });
});
