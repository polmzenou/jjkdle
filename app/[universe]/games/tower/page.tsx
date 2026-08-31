import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isGameEnabled } from "@/lib/config/app-config";
import { GameJsonLd } from "@/components/seo/JsonLd";
import { gameMetadata } from "@/lib/seo/config";
import { universeHref } from "@/lib/universes/current";
import { TowerGame } from "./TowerGame";

export async function generateMetadata(): Promise<Metadata> {
  return gameMetadata("tower");
}

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
export default async function TowerPage() {
  if (!(await isGameEnabled("tower"))) redirect(await universeHref("/games"));

  return (
    <main className="mx-auto max-w-5xl px-4 pb-24 sm:px-6">
      <GameJsonLd id="tower" />
      <TowerGame />
    </main>
  );
}
