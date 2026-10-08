"use client";

import { Logo } from "@/components/Logo";
import {
  useGameTitle,
  useUniverse,
} from "@/components/universe/UniverseProvider";
import type { GameId } from "@/lib/games/types";

/**
 * Titre H1 d'une page de jeu : visuellement, le logo de l'univers (la barre de
 * tête unifiée), mais nommé en texte pour les moteurs et lecteurs d'écran —
 * même principe que le H1 de la landing.
 *
 * Sans lui, ces pages n'avaient AUCUN H1 : le seul texte titre était l'`alt` du
 * logo (« JJK Arcade »), identique sur tous les jeux d'un univers.
 *
 * `logo={false}` : titre seul, invisible — pour un écran de chargement, qui est
 * aussi ce que sert le rendu serveur quand le jeu se charge côté client.
 */
export function GameHeading({
  id,
  logo = true,
}: {
  id: GameId;
  logo?: boolean;
}) {
  const { sourceWork } = useUniverse();
  const title = `${useGameTitle(id)} — jeu ${sourceWork} gratuit`;
  if (!logo) return <h1 className="sr-only">{title}</h1>;
  return (
    <h1 className="flex">
      <span className="sr-only">{title}</span>
      <Logo className="h-12 w-auto sm:h-14" />
    </h1>
  );
}
