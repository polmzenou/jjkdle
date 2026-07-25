"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { UniverseLabels, UniverseLogo } from "@/lib/universes/types";

/**
 * Branding de l'univers courant, exposé aux composants CLIENT (étape 4).
 *
 * Le hostname est résolu côté serveur (middleware → `getCurrentUniverse`), mais
 * beaucoup de composants d'UI sont des composants client (`Logo`, les écrans de
 * jeu…) : ils ne peuvent pas appeler une fonction serveur. Le layout racine
 * monte donc ce provider une seule fois avec la part SÉRIALISABLE de la config
 * (nom, logo, libellés), et tout l'arbre client y accède via `useUniverse()`.
 *
 * Évite de faire descendre le branding en props à travers chaque jeu, et donne
 * automatiquement le bon logo/vocabulaire à tout nouveau composant.
 *
 * ⚠️ Ne mettre ici QUE des données publiques et sérialisables — pas de thème
 * (injecté en CSS), pas d'`id` de base.
 */
export interface UniverseBranding {
  slug: string;
  /** Nom de marque affiché (ex. « JJK Arcade »). */
  name: string;
  logo: UniverseLogo;
  labels: UniverseLabels;
}

const UniverseContext = createContext<UniverseBranding | null>(null);

export function UniverseProvider({
  branding,
  children,
}: {
  branding: UniverseBranding;
  children: ReactNode;
}) {
  return (
    <UniverseContext.Provider value={branding}>
      {children}
    </UniverseContext.Provider>
  );
}

/**
 * Branding de l'univers courant. Lève si le provider est absent : c'est un bug
 * de câblage (le layout racine doit toujours le monter), pas un cas à gérer.
 */
export function useUniverse(): UniverseBranding {
  const branding = useContext(UniverseContext);
  if (!branding) {
    throw new Error(
      "useUniverse() hors UniverseProvider — le layout racine doit le monter.",
    );
  }
  return branding;
}
