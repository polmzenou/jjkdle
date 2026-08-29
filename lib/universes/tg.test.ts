import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { GAMES, gamesForUniverse } from "@/lib/games/registry";
import { tg } from "./tg";
import { jjk } from "./jjk";
import { TG_CATEGORIES } from "./tg-categories";

/**
 * Textes des jeux côté TG. Le registre (`lib/games/registry.ts`) porte les
 * textes de l'univers PAR DÉFAUT, qui sont ceux de JJK : un jeu que TG oublie
 * de réécrire retomberait donc silencieusement sur du vocabulaire Jujutsu
 * Kaisen. C'est exactement ce que ces deux tests empêchent.
 *
 * Décalque de `kny.test.ts` : c'est le filet documenté pour un nouvel univers.
 */
describe("copy des jeux TG", () => {
  const games = gamesForUniverse(tg.gameCopy);

  it("réécrit les trois champs pour CHAQUE jeu du registre", () => {
    for (const g of GAMES) {
      const copy = tg.gameCopy?.[g.id];
      expect(copy, `jeu « ${g.id} » absent de tg.gameCopy`).toBeDefined();
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
   * l'anime, et celle du registre montre des persos JJK. Aucune capture TG
   * n'existe encore — ce test ne devient donc actif qu'au moment où le champ
   * `previewImage` est renseigné, et attrape alors le chemin mal écrit.
   */
  it("pointe vers des miniatures TG qui existent", () => {
    for (const g of GAMES) {
      const src = tg.gameCopy?.[g.id]?.previewImage;
      if (!src) continue; // jeu sans capture TG dédiée : repli assumé sur JJK
      expect(src, `« ${g.id} » : miniature non TG`).toMatch(/-tg\.\w+$/);
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
        resolve(__dirname, "../../public", tg.logo.src.replace(/^\//, "")),
      ),
      `logo introuvable (${tg.logo.src})`,
    ).toBe(true);
  });
});

/**
 * Synchro d'images (bouton « OUAIS »). Le tag de série et la clé de l'attribut de
 * filtrage étaient codés en dur sur JJK : la copie du bloc d'un univers à l'autre
 * sans en changer les valeurs ramènerait les images du mauvais anime, ou ne
 * trouverait personne. Ces tests attrapent précisément ce copier-coller.
 */
describe("synchro d'images TG", () => {
  it("cible la série Tokyo Ghoul, pas celle de JJK", () => {
    expect(tg.booru?.seriesTag).toBe("tokyo_ghoul");
    expect(tg.booru?.seriesTag).not.toBe(jjk.booru?.seriesTag);
  });

  it("filtre sur un attribut qui existe VRAIMENT dans l'univers TG", () => {
    // Les attributs TG sont préfixés `tg…` (ils sont créés par univers) : une
    // clé JJK comme « gender » ne renverrait aucun personnage.
    expect(tg.booru?.filter?.attributeKey).toMatch(/^tg/);
    expect(tg.booru?.filter?.attributeKey).not.toBe(
      jjk.booru?.filter?.attributeKey,
    );
  });
});

/**
 * Higher/Lower et TGdle lisent tous deux `tgpower` : la config du jeu et le
 * fichier d'amorçage des attributs doivent donc désigner la MÊME clé. Un
 * renommage d'un seul côté casserait le jeu sans erreur de compilation.
 */
describe("attribut comparé par Higher/Lower", () => {
  it("désigne une clé définie dans les attributs TG", async () => {
    const { TG_ATTRIBUTES } = await import("./tg-attributes");
    const key = tg.higherLower?.attributeKey;
    expect(key).toBe("tgpower");
    expect(TG_ATTRIBUTES.map((a) => a.key)).toContain(key);
  });

  it("filtre le booru sur une clé, elle aussi, définie", async () => {
    const { TG_ATTRIBUTES } = await import("./tg-attributes");
    expect(TG_ATTRIBUTES.map((a) => a.key)).toContain(
      tg.booru?.filter?.attributeKey,
    );
  });
});

/**
 * Les DEUX hiérarchies de Tokyo Ghoul (menace des goules, grade du CCG) doivent
 * rester deux colonnes ORDINALES distinctes, chacune dotée d'une valeur non
 * ordonnée pour les personnages de l'autre camp. Sans ce `order: null`, TGdle
 * afficherait une flèche ↑/↓ entre une goule de classe A et un enquêteur de
 * rang 1 — une comparaison qui n'a aucun sens dans l'œuvre.
 */
describe("hiérarchies séparées goules / CCG", () => {
  it("garde « non classé » et « sans grade » hors de tout ordre", async () => {
    const { TG_ATTRIBUTES } = await import("./tg-attributes");
    for (const [key, unranked] of [
      ["tgrate", "NO_RATE"],
      ["tgrank", "NO_RANK"],
    ] as const) {
      const attribute = TG_ATTRIBUTES.find((a) => a.key === key);
      expect(attribute, `attribut « ${key} » absent`).toBeDefined();
      expect(attribute?.kind).toBe("ORDINAL");
      const option = attribute?.options.find((o) => o.value === unranked);
      expect(option, `« ${unranked} » absent de ${key}`).toBeDefined();
      expect(option?.order).toBeNull();
      // Les autres options, elles, DOIVENT être ordonnées : sans ordre, la
      // colonne perd ses flèches et l'attribut ne sert plus à rien.
      for (const other of attribute?.options.filter(
        (o) => o.value !== unranked,
      ) ?? []) {
        expect(other.order, `${key}/${other.value}`).not.toBeNull();
      }
    }
  });
});

/**
 * Catégories du builder TG.
 *
 * Le piège que ces tests ferment : une catégorie SANS personnage noté rend la
 * partie INFINISSABLE. `drawOne` renvoie `null`, la case ne peut pas se
 * verrouiller, et `lockedIds.length` n'atteint donc jamais `categories.length`
 * — la condition de fin de partie. Rien ne plante, le joueur reste juste coincé.
 *
 * On vérifie ici les données d'amorçage (`tg-categories.ts`), pas la base : la
 * source de vérité au runtime reste la table `Category`. Le contrôle « chaque
 * catégorie a au moins `drawCount` personnages notés » n'est PAS reproductible
 * tant que le roster TG n'est pas saisi (aucun `data/ratings/tg.json`) : il est
 * à ajouter, sur le modèle de `kny.test.ts`, en même temps que ce fichier.
 */
describe("catégories du builder TG", () => {
  it("préfixe chaque id par l'univers", () => {
    // `Category.id` est une clé primaire GLOBALE et la clé du JSON
    // `Character.ratings` : un id non préfixé entrerait en collision avec un
    // autre univers, et serait impossible à renommer après coup.
    for (const c of TG_CATEGORIES) {
      expect(c.id, `catégorie « ${c.label} »`).toMatch(/^tg-/);
    }
    expect(new Set(TG_CATEGORIES.map((c) => c.id)).size).toBe(
      TG_CATEGORIES.length,
    );
  });

  it("ne laisse fuiter aucun vocabulaire JJK", () => {
    for (const c of TG_CATEGORIES) {
      for (const t of [c.label, c.description]) {
        expect(t, `« ${c.id} » : ${t}`).not.toMatch(
          /JJK|Jujutsu|sorcier|exorcis|occulte|maudit/i,
        );
      }
    }
  });

  it("garde des poids et des tirages exploitables", () => {
    for (const c of TG_CATEGORIES) {
      expect(c.weight, `« ${c.id} »`).toBeGreaterThan(0);
      // Sous 2 cartes, la ligne n'offre aucun choix au joueur.
      expect(c.drawCount, `« ${c.id} »`).toBeGreaterThanOrEqual(2);
    }
  });
});
