import type { Metadata } from "next";
import {
  listAdminUniverses,
  listUnclaimedConfigs,
} from "@/lib/admin/universe-store";
import { getCurrentUniverseSlug } from "@/lib/universes/current";
import { requireAdmin } from "../AccessDenied";
import { UniversesAdmin } from "./UniversesAdmin";

/**
 * GESTION DES UNIVERS — la vue « au-dessus » de l'admin.
 *
 * L'admin classique (`/admin`) travaille TOUJOURS dans un univers : son roster,
 * ses attributs, ses classements. Cette page-ci gère les univers eux-mêmes
 * (créer / renommer / supprimer) et sert de point d'entrée vers l'admin de
 * chacun — `/admin?universe=<slug>` ouvre exactement les mêmes onglets, branchés
 * sur les données de cet anime.
 */
export const metadata: Metadata = {
  title: "Admin · Univers",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminUniversesPage() {
  const { user, denied } = await requireAdmin();
  if (!user) return denied;

  const [universes, unclaimed, currentUniverse] = await Promise.all([
    listAdminUniverses(),
    listUnclaimedConfigs(),
    getCurrentUniverseSlug(),
  ]);

  return (
    <UniversesAdmin
      universes={universes}
      unclaimed={unclaimed}
      currentUniverse={currentUniverse}
    />
  );
}
