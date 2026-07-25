import { UniverseChrome } from "@/components/universe/UniverseChrome";

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
 * `params.universe` n'est volontairement pas lu ici : le slug est déjà résolu par
 * le middleware dans le header `x-universe`, seule source consultée par
 * `getCurrentUniverse()` — y compris depuis les Server Actions et les composants
 * profonds, qui n'ont accès à aucun `params`.
 */
export default function UniverseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <UniverseChrome jsonLd>{children}</UniverseChrome>;
}
