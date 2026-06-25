"use client";

import { createContext, useContext } from "react";
import type { Character } from "@/data/roster/characters";

/**
 * Fournit le roster (indexé par id) aux composants client du jeu Pyramid.
 *
 * Le roster vit désormais en base : la page serveur le charge et le passe ici,
 * pour que les cartes (`RankingCard`) résolvent un personnage par id sans
 * import statique de données.
 */
const RosterContext = createContext<Record<string, Character>>({});

export function RosterProvider({
  value,
  children,
}: {
  value: Record<string, Character>;
  children: React.ReactNode;
}) {
  return (
    <RosterContext.Provider value={value}>{children}</RosterContext.Provider>
  );
}

/** Résout un personnage par id depuis le roster fourni (ou undefined). */
export function useCharacter(id: string): Character | undefined {
  return useContext(RosterContext)[id];
}
