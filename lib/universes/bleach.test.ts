import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { GAMES, gamesForUniverse } from "@/lib/games/registry";
import { bleach } from "./bleach";
import { jjk } from "./jjk";
import { BLEACH_CATEGORIES } from "./bleach-categories";

/**
 * Textes des jeux côté Bleach. Le registre (`lib/games/registry.ts`) porte les
 * textes de l'univers PAR DÉFAUT, qui sont ceux de JJK : un jeu que Bleach
 * oublie de réécrire retomberait donc silencieusement sur du vocabulaire Jujutsu
 * Kaisen. C'est exactement ce que ces deux tests empêchent.
 *
 * Décalque de `tg.test.ts` : c'est le filet documenté pour un nouvel univers.
 */
describe("copy des jeux Bleach", () => {
  const games = gamesForUniverse(bleach.gameCopy);

  it("réécrit les trois champs pour CHAQUE jeu du registre", () => {
    for (const g of GAMES) {
      const copy = bleach.gameCopy?.[g.id];
      expect(copy, `jeu « ${g.id} » absent de bleach.gameCopy`).toBeDefined();
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
   * l'anime, et celle du registre montre des persos JJK. Aucune capture Bleach
   * n'existe encore — ce test ne devient donc actif qu'au moment où le champ
   * `previewImage` est renseigné, et attrape alors le chemin mal écrit.
   */
  it("pointe vers des miniatures Bleach qui existent", () => {
    for (const g of GAMES) {
      const src = bleach.gameCopy?.[g.id]?.previewImage;
      if (!src) continue; // jeu sans capture Bleach : repli assumé sur JJK
      expect(src, `« ${g.id} » : miniature non Bleach`).toMatch(
        /-bleach\.\w+$/,
      );
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
        resolve(__dirname, "../../public", bleach.logo.src.replace(/^\//, "")),
      ),
      `logo introuvable (${bleach.logo.src})`,
    ).toBe(true);
  });
});

/**
 * Synchro d'images (bouton « OUAIS »). Le tag de série et la clé de l'attribut de
 * filtrage étaient codés en dur sur JJK : la copie du bloc d'un univers à l'autre
 * sans en changer les valeurs ramènerait les images du mauvais anime, ou ne
 * trouverait personne. Ces tests attrapent précisément ce copier-coller.
 */
describe("synchro d'images Bleach", () => {
  it("cible la série Bleach, pas celle de JJK", () => {
    expect(bleach.booru?.seriesTag).toBe("bleach");
    expect(bleach.booru?.seriesTag).not.toBe(jjk.booru?.seriesTag);
  });

  it("filtre sur un attribut qui existe VRAIMENT dans l'univers Bleach", () => {
    // Les attributs Bleach sont préfixés `bleach…` (ils sont créés par univers) :
    // une clé JJK comme « gender » ne renverrait aucun personnage.
    expect(bleach.booru?.filter?.attributeKey).toMatch(/^bleach/);
    expect(bleach.booru?.filter?.attributeKey).not.toBe(
      jjk.booru?.filter?.attributeKey,
    );
  });
});

/**
 * Higher/Lower et Bleachdle lisent tous deux `bleachpower` : la config du jeu et
 * le fichier d'amorçage des attributs doivent donc désigner la MÊME clé. Un
 * renommage d'un seul côté casserait le jeu sans erreur de compilation.
 */
describe("attribut comparé par Higher/Lower", () => {
  it("désigne une clé définie dans les attributs Bleach", async () => {
    const { BLEACH_ATTRIBUTES } = await import("./bleach-attributes");
    const key = bleach.higherLower?.attributeKey;
    expect(key).toBe("bleachpower");
    expect(BLEACH_ATTRIBUTES.map((a) => a.key)).toContain(key);
  });

  it("filtre le booru sur une clé, elle aussi, définie", async () => {
    const { BLEACH_ATTRIBUTES } = await import("./bleach-attributes");
    expect(BLEACH_ATTRIBUTES.map((a) => a.key)).toContain(
      bleach.booru?.filter?.attributeKey,
    );
  });
});

/**
 * Palier d'ultime de la Tour.
 *
 * `lib/games/tower/config.test.ts` vérifie déjà que les valeurs listées existent
 * dans leur attribut. Ce test-ci garde la règle MÉTIER que ce contrôle générique
 * ne voit pas : chaque grande faction jouable doit avoir SA libération finale
 * dans la liste. Oublier `RESURRECCION` reproduirait à l'identique le bug de
 * Tokyo Ghoul — un palier lu sur un attribut qui ne décrit qu'un seul camp, donc
 * une moitié du roster privée d'ultime, sans erreur ni trace.
 */
describe("palier d'ultime de la Tour", () => {
  it("ouvre l'ultime à chaque faction, et jamais sur la libération de base", () => {
    const values = bleach.tower?.ultimateAttributeValues ?? [];
    for (const faction of [
      "BANKAI", // shinigami
      "RESURRECCION", // arrancar
      "VOLLSTANDIG", // quincy
    ]) {
      expect(values, `faction sans ultime : ${faction}`).toContain(faction);
    }
    // `SHIKAI` est la libération de BASE : l'y mettre donnerait un ultime à
    // presque tout le roster, et la mécanique perdrait tout son sens.
    expect(values).not.toContain("SHIKAI");
  });

  it("lit le palier sur un attribut à liste fermée, valeurs comprises", async () => {
    const { BLEACH_ATTRIBUTES } = await import("./bleach-attributes");
    const spec = BLEACH_ATTRIBUTES.find(
      (a) => a.key === bleach.tower?.ultimateAttributeKey,
    );
    expect(spec, "attribut d'ultime absent des attributs Bleach").toBeDefined();
    expect(spec?.options.length).toBeGreaterThan(0);
  });
});

/**
 * Catégories du builder Bleach.
 *
 * Le piège que ces tests ferment : une catégorie SANS personnage noté rend la
 * partie INFINISSABLE. `drawOne` renvoie `null`, la case ne peut pas se
 * verrouiller, et `lockedIds.length` n'atteint donc jamais `categories.length`
 * — la condition de fin de partie. Rien ne plante, le joueur reste juste coincé.
 *
 * On vérifie ici les données d'amorçage (`bleach-categories.ts`), pas la base :
 * la source de vérité au runtime reste la table `Category`. Le contrôle « chaque
 * catégorie a au moins `drawCount` personnages notés » n'est PAS reproductible
 * tant que le roster Bleach n'est pas saisi (aucun `data/ratings/bleach.json`) :
 * il est à ajouter, sur le modèle de `kny.test.ts`, en même temps que lui.
 */
describe("catégories du builder Bleach", () => {
  it("préfixe chaque id par l'univers", () => {
    // `Category.id` est une clé primaire GLOBALE et la clé du JSON
    // `Character.ratings` : un id non préfixé entrerait en collision avec un
    // autre univers, et serait impossible à renommer après coup.
    for (const c of BLEACH_CATEGORIES) {
      expect(c.id, `catégorie « ${c.label} »`).toMatch(/^bleach-/);
    }
    expect(new Set(BLEACH_CATEGORIES.map((c) => c.id)).size).toBe(
      BLEACH_CATEGORIES.length,
    );
  });

  it("ne laisse fuiter aucun vocabulaire JJK", () => {
    for (const c of BLEACH_CATEGORIES) {
      for (const t of [c.label, c.description]) {
        expect(t, `« ${c.id} » : ${t}`).not.toMatch(
          /JJK|Jujutsu|sorcier|exorcis|occulte|maudit/i,
        );
      }
    }
  });

  it("garde des poids et des tirages exploitables", () => {
    for (const c of BLEACH_CATEGORIES) {
      expect(c.weight, `« ${c.id} »`).toBeGreaterThan(0);
      // Sous 2 cartes, la ligne n'offre aucun choix au joueur.
      expect(c.drawCount, `« ${c.id} »`).toBeGreaterThanOrEqual(2);
    }
  });
});
