"use client";

import { createContext, useContext } from "react";
import type { RankingCardData } from "@/app/games/ranking/types";

/**
 * Fournit les cartes en jeu (indexées par id) aux composants client du jeu Pyramid.
 *
 * Anti-triche : ce ne sont PAS des personnages complets mais des données
 * d'affichage réduites (id/nom/titre/image), sans AUCUNE statistique — sinon un
 * joueur pourrait re-trier par la stat du critère pour deviner le classement.
 * Les 8 cartes sont fournies par la Server Action `startRankingRun`.
 */
const RosterContext = createContext<Record<string, RankingCardData>>({});

export function RosterProvider({
  value,
  children,
}: {
  value: Record<string, RankingCardData>;
  children: React.ReactNode;
}) {
  return (
    <RosterContext.Provider value={value}>{children}</RosterContext.Provider>
  );
}

/** Résout une carte par id depuis les cartes fournies (ou undefined). */
export function useCharacter(id: string): RankingCardData | undefined {
  return useContext(RosterContext)[id];
}
