import { UniverseChrome } from "@/components/universe/UniverseChrome";

/**
 * Layout de l'ADMINISTRATION. Hors univers côté URL : l'univers administré vient
 * du cookie `admin_universe` appliqué par le middleware (cf. admin-scope). Le
 * chrome suit donc l'univers CIBLÉ — changer de cible dans le sélecteur rethème
 * l'admin, ce qui rend la cible visible d'un coup d'œil.
 *
 * `SiteNav` s'efface d'elle-même sur `/admin` (en-tête propre à l'admin).
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <UniverseChrome>{children}</UniverseChrome>;
}
