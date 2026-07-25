import { UniverseChrome } from "@/components/universe/UniverseChrome";

/**
 * Layout des pages d'AUTHENTIFICATION. Le compte est global à la plateforme, donc
 * ces routes ne portent pas de préfixe d'univers — mais elles gardent le chrome
 * de l'univers de repli (dernier visité, cf. middleware) pour ne pas basculer
 * brutalement sur une palette neutre entre deux pages d'un même anime.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <UniverseChrome>{children}</UniverseChrome>;
}
