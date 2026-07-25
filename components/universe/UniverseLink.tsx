"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { useUniverseHref } from "./UniverseProvider";

type LinkProps = ComponentProps<typeof Link>;

/**
 * Lien interne qui PRÉFIXE automatiquement son chemin par l'univers courant :
 * un `href` de « /games » mène à « /jjk/games ».
 *
 * À utiliser pour tout lien restant DANS l'univers. Les chemins hors univers
 * (connexion, inscription, administration, hub) et les URLs absolues passent
 * inchangés — c'est `universePath` qui décide (lib/universes/routing.ts).
 *
 * Pourquoi un composant plutôt qu'un helper appelé sur chaque lien : le JSX reste
 * lisible, et un oubli se repère à l'import (on a pris `Link` au lieu de
 * `UniverseLink`). Un lien non préfixé n'est de toute façon pas cassé : le
 * middleware le redirige vers le dernier univers visité, au prix d'un aller-retour.
 *
 * Composant client, donc utilisable aussi bien depuis un Server Component.
 */
export function UniverseLink({ href, ...props }: LinkProps) {
  const withUniverse = useUniverseHref();
  // `href` peut être un objet `UrlObject` : seul le cas chaîne est préfixé.
  const resolved = typeof href === "string" ? withUniverse(href) : href;
  return <Link href={resolved} {...props} />;
}
