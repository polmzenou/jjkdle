import { describe, expect, it } from "vitest";
import { ALL_TABS, TAB_GROUPS, TAB_LABELS, type Tab } from "./tabs";

/**
 * Ces tests existent à cause d'un bug réel : l'onglet « Objets » avait été
 * ajouté au type `Tab`, aux libellés, aux sous-titres et au montage du
 * panneau — partout SAUF dans `TAB_GROUPS`. Il existait donc, mais aucun
 * bouton ne permettait de l'atteindre, et rien ne l'a signalé.
 *
 * TypeScript ne peut pas l'attraper : un tableau qui oublie une valeur reste
 * un `Tab[]` valide. C'est le genre d'exhaustivité qui ne se vérifie qu'ici.
 */

/** Les clés de `TAB_LABELS` font foi : le type `Tab` s'y reflète en entier. */
const EVERY_TAB = Object.keys(TAB_LABELS) as Tab[];

describe("exhaustivité des onglets", () => {
  it("CHAQUE onglet est atteignable depuis la barre de navigation", () => {
    const missing = EVERY_TAB.filter((tab) => !ALL_TABS.includes(tab));
    expect(missing).toEqual([]);
  });

  it("aucun onglet n'apparaît dans deux groupes", () => {
    expect(new Set(ALL_TABS).size).toBe(ALL_TABS.length);
  });

  it("aucun groupe ne référence un onglet inconnu", () => {
    for (const tab of ALL_TABS) {
      expect(EVERY_TAB).toContain(tab);
    }
  });

  it("chaque onglet a un libellé non vide", () => {
    for (const tab of EVERY_TAB) {
      expect(TAB_LABELS[tab]?.trim()).toBeTruthy();
    }
  });

  it("les groupes ont un libellé et au moins un onglet", () => {
    expect(TAB_GROUPS.length).toBeGreaterThan(0);
    for (const group of TAB_GROUPS) {
      expect(group.label.trim()).toBeTruthy();
      expect(group.tabs.length).toBeGreaterThan(0);
    }
  });

  it("l'onglet Objets est bien rangé avec le contenu des jeux", () => {
    const content = TAB_GROUPS.find((g) => g.label === "Contenu des jeux");
    expect(content?.tabs).toContain("items");
  });
});
