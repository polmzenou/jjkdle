import type { Metadata } from "next";
import { getCurrentUser, isSuperAdmin } from "@/lib/auth/session";
import { readRoster } from "@/lib/admin/roster-store";
import { getCategories } from "@/lib/content/queries";
import { listDraftCharacters } from "@/lib/games/draft/queries";
import { listItems } from "@/lib/admin/item-store";
import { listAllScores, type AdminScore } from "@/lib/leaderboard/store";
import { listAllDraftScores } from "@/lib/games/draft/store";
import { listAllJjkdleScores } from "@/lib/games/jjkdle/leaderboard";
import { listAllHigherLowerScores } from "@/lib/games/higher-lower/store";
import { listUsers } from "@/lib/admin/users";
import { getCachedImageCount } from "@/lib/admin/image-cache";
import { getOverviewStats } from "@/lib/admin/analytics";
import { getJjkdleAnalytics } from "@/lib/admin/jjkdle-analytics";
import {
  getGameFlags,
  getMaintenance,
  getForcedTarget,
} from "@/lib/config/app-config";
import { todayKey } from "@/lib/games/jjkdle/daily";
import { loadAttributeSchema } from "@/lib/games/jjkdle/attributes-db";
import {
  getCurrentUniverseSlug,
  listAvailableUniverses,
} from "@/lib/universes/current";
import { listAttributes } from "@/lib/admin/attribute-store";
import { listCategories } from "@/lib/admin/category-store";
import { listRankingConditions } from "@/lib/admin/ranking-store";
import { getCollection } from "@/lib/cards/store";
import type { Character } from "@/data/roster/characters";
import type { DraftCharacter } from "@/lib/games/draft/types";
import type { TowerItem } from "@/lib/games/tower/items";
import { getCasinoAdminData } from "@/lib/admin/casino";
import { AdminDashboard } from "./AdminDashboard";
import { accessDeniedFor } from "./AccessDenied";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

// Toujours dynamique (auth par cookie + lecture du fichier à jour).
export const dynamic = "force-dynamic";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ jjkdleDate?: string }>;
}) {
  const [{ jjkdleDate }, user] = await Promise.all([
    searchParams,
    getCurrentUser(),
  ]);

  if (!user || user.role !== "ADMIN") {
    return accessDeniedFor(user);
  }

  let roster: Character[] = [];
  try {
    roster = await readRoster();
  } catch {
    roster = [];
  }
  let draftRoster: DraftCharacter[] = [];
  // Meme tolerance que le roster draft : une table vide ou absente ne doit pas
  // empecher l'admin de s'ouvrir.
  let towerItems: TowerItem[] = [];
  try {
    towerItems = await listItems();
  } catch {
    towerItems = [];
  }
  try {
    draftRoster = await listDraftCharacters();
  } catch {
    draftRoster = [];
  }
  const [categories, scores, users, attributeSchema, universes] =
    await Promise.all([
      getCategories(),
      listAllScores(),
      listUsers(),
      loadAttributeSchema(),
      listAvailableUniverses(),
    ]);
  // Attributs, catégories et consignes Pyramid de l'univers administré, plus le
  // roster en cartes marqué possédé/non pour l'ADMIN connecté (onglet Booster
  // Pack : c'est sa propre collection qu'il manipule).
  const [attributes, adminCategories, rankingConditions, cardCollection] =
    await Promise.all([
      listAttributes(),
      listCategories(),
      listRankingConditions(),
      getCollection(user.id),
    ]);
  // Univers administré : le middleware l'a déjà appliqué à toutes les lectures
  // ci-dessus (cf. lib/universes/admin-scope.ts) ; on ne lit ici que son slug
  // pour l'afficher dans le sélecteur.
  const currentUniverse = await getCurrentUniverseSlug();
  let draftScores: AdminScore[] = [];
  try {
    draftScores = await listAllDraftScores();
  } catch {
    draftScores = [];
  }
  let jjkdleScores: AdminScore[] = [];
  try {
    jjkdleScores = await listAllJjkdleScores();
  } catch {
    jjkdleScores = [];
  }
  let higherLowerScores: AdminScore[] = [];
  try {
    higherLowerScores = await listAllHigherLowerScores();
  } catch {
    higherLowerScores = [];
  }

  // ── Sections analytics + config (calculées côté serveur) ──
  const analyticsDate = /^\d{4}-\d{2}-\d{2}$/.test(jjkdleDate ?? "")
    ? (jjkdleDate as string)
    : todayKey();
  // `casino` est le seul de ce lot à NE PAS dépendre de l'univers administré :
  // il n'y a qu'un casino sur la plateforme (cf. lib/casino/config.ts).
  const [
    overview,
    jjkdleAnalytics,
    gameFlags,
    maintenance,
    forcedTarget,
    casino,
  ] = await Promise.all([
    getOverviewStats(roster),
    getJjkdleAnalytics(roster, analyticsDate),
    getGameFlags(),
    getMaintenance(),
    getForcedTarget(),
    getCasinoAdminData(),
  ]);

  return (
    <AdminDashboard
      roster={roster}
      attributeColumns={attributeSchema.columns}
      universes={universes.map((u) => ({ slug: u.slug, name: u.name }))}
      currentUniverse={currentUniverse}
      universeName={
        universes.find((u) => u.slug === currentUniverse)?.name ??
        currentUniverse
      }
      attributes={attributes}
      adminCategories={adminCategories}
      rankingConditions={rankingConditions}
      cardCollection={cardCollection}
      casino={casino}
      draftRoster={draftRoster}
      towerItems={towerItems}
      categories={categories}
      scores={[
        ...scores,
        ...draftScores,
        ...jjkdleScores,
        ...higherLowerScores,
      ]}
      users={users}
      currentUserId={user.id}
      isSuperAdmin={isSuperAdmin(user)}
      cachedImageCount={getCachedImageCount()}
      overview={overview}
      jjkdleAnalytics={jjkdleAnalytics}
      gameFlags={gameFlags}
      maintenance={maintenance}
      forcedTarget={forcedTarget}
    />
  );
}
