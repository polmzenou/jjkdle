"use client";

import { LazyMotion, domAnimation } from "framer-motion";

/**
 * Fonctionnalités d'animation de framer-motion fournies UNE fois, à la racine.
 *
 * Les composants montés sur TOUTES les pages (bandeau cookies, bouton tutoriel,
 * sélecteur d'arcade, bulle de messages) utilisent `m.*` au lieu de `motion.*` :
 * ils n'embarquent plus tout framer-motion dans le bundle commun. Les autres
 * composants peuvent garder `motion.*`, qui fonctionne normalement ici
 * (LazyMotion non strict).
 *
 * `domAnimation` est importé de façon synchrone (pas de chargement différé) :
 * les animations d'entrée jouent dès le premier rendu, sans à-coup.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <LazyMotion features={domAnimation}>{children}</LazyMotion>;
}
