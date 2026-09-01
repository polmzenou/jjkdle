import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isGameEnabled } from "@/lib/config/app-config";
import { GameJsonLd } from "@/components/seo/JsonLd";
import { TowerLeaderboard } from "@/components/leaderboard/TowerLeaderboard";
import { parseTowerScope } from "@/lib/games/tower/ranking";
import { gameMetadata } from "@/lib/seo/config";
import { getCurrentUniverse, universeHref } from "@/lib/universes/current";
import { TOWER_FLOORS } from "@/lib/games/tower/types";
import { TowerGame } from "./TowerGame";

/**
 * Aperçu social. Une ascension PARTAGÉE porte son résultat dans l'URL
 * (`?floor=…&score=…`), et l'image devient alors celle du résultat.
 *
 * C'est tout l'intérêt du partage : « j'ai atteint l'étage 17 » invite à faire
 * mieux, la vignette générique du jeu n'invite à rien. Sans paramètre, la page
 * garde son aperçu habituel — un lien nu ne doit pas afficher l'étage 0.
 */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<TowerParams>;
}): Promise<Metadata> {
  const base = await gameMetadata("tower");
  const { floor, score, attempt } = await searchParams;
  if (!floor) return base;

  const universe = await getCurrentUniverse();
  const query = new URLSearchParams({
    floor: String(floor),
    score: String(score ?? 0),
    attempt: String(attempt ?? 0),
    u: universe.slug,
  });
  const image = `/og/tower?${query}`;
  const reached = Number(floor);
  const title =
    reached >= TOWER_FLOORS
      ? "J'ai franchi The Culling Tower"
      : `J'ai atteint l'étage ${reached} de The Culling Tower`;

  return {
    ...base,
    openGraph: { ...base.openGraph, title, images: [{ url: image, alt: title }] },
    twitter: { ...base.twitter, title, images: [image] },
  };
}

/** Résultat d'ascension porté par l'URL (partage), et portée du classement. */
type TowerParams = {
  scope?: string;
  floor?: string;
  score?: string;
  attempt?: string;
};

// Cookie de run + auth : la page ne peut pas être servie statiquement.
export const dynamic = "force-dynamic";

/**
 * Page serveur de « The Culling Tower ».
 *
 * Volontairement nue : contrairement aux autres jeux, elle ne précharge RIEN
 * (ni roster, ni étage). Toute la partie passe par les Server Actions, qui
 * n'envoient jamais que l'étage courant — précharger le contenu du jeu ici
 * reviendrait à livrer la tour entière dans le HTML.
 */
export default async function TowerPage({
  searchParams,
}: {
  searchParams: Promise<TowerParams>;
}) {
  if (!(await isGameEnabled("tower"))) redirect(await universeHref("/games"));
  const { scope } = await searchParams;

  return (
    <main className="mx-auto max-w-5xl px-4 pb-24 sm:px-6">
      <GameJsonLd id="tower" />
      <TowerGame />

      <div className="mt-10">
        <TowerLeaderboard limit={20} scope={parseTowerScope(scope)} />
      </div>
    </main>
  );
}
