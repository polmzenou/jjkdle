import { notFound } from "next/navigation";
import { UniverseChrome } from "@/components/universe/UniverseChrome";
import { getUniverseBySlug } from "@/lib/universes/registry";

/**
 * Layout de l'ESPACE D'UN UNIVERS (`/jjk`, `/jjk/games/…`, `/jjk/account`…).
 *
 * L'univers est un vrai segment dynamique de l'arborescence, et non un préfixe
 * effacé par une réécriture : c'est ce qui permet à Next de savoir que passer de
 * `/jjk/games` à `/csm/games` change de segment, donc de RE-RENDRE ce layout —
 * et avec lui la palette, le logo et la nav. Avec une réécriture vers `/games`,
 * les deux URLs produisaient le même arbre et le chrome restait celui du premier
 * univers chargé.
 *
 * Le slug est résolu par le middleware dans le header `x-universe`, seule source
 * consultée par `getCurrentUniverse()` — y compris depuis les Server Actions et
 * les composants profonds, qui n'ont accès à aucun `params`. `params.universe`
 * ne sert ici qu'à une chose : refuser un slug inconnu. Les chemins exclus du
 * middleware (`/favicon.ico`, `/x.png`…) arrivent ici sans avoir été validés, et
 * rendaient sinon la landing de l'univers par défaut avec un statut 200.
 */
export default async function UniverseLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ universe: string }>;
}) {
  if (!getUniverseBySlug((await params).universe)) notFound();
  return <UniverseChrome jsonLd>{children}</UniverseChrome>;
}
