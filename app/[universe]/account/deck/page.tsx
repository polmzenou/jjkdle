import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getCurrentUniverse } from "@/lib/universes/current";
import {
  getCollection,
  getDeck,
  getPendingBoosters,
} from "@/lib/cards/store";
import { DeckManager } from "@/components/cards/DeckManager";
import { AccountTabs } from "../AccountTabs";

export const metadata: Metadata = {
  title: "Mon deck",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Onglet DECK du compte : boosters en attente, deck équipé, collection.
 *
 * Tout est scopé à l'univers courant (la possession des cartes est globale,
 * mais une carte JJK n'a rien à faire dans une grille CSM — même règle que les
 * cosmétiques, cf. lib/cosmetics/universe.ts).
 */
export default async function DeckPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const universe = await getCurrentUniverse();
  const [pendingBoosters, deck, collection] = await Promise.all([
    getPendingBoosters(user.id, universe.id),
    getDeck(user.id, universe.id),
    getCollection(user.id, universe.id),
  ]);

  const ownedCount = collection.filter((c) => c.owned).length;
  const pct =
    collection.length > 0
      ? Math.round((ownedCount / collection.length) * 100)
      : 0;

  return (
    <main className="mx-auto w-full max-w-4xl px-5 py-10 sm:px-6 sm:py-16">
      <header className="mb-8">
        <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.3em] text-domain-light/70">
          <span
            aria-hidden
            className="h-px w-6 bg-gradient-to-r from-transparent to-domain-light/60"
          />
          収集 · Mon deck
        </span>
        <h1 className="mt-4 font-display text-3xl font-black tracking-tight text-white sm:text-4xl">
          Collection {universe.config.name}
        </h1>
        <p className="mt-2 text-sm text-white/50">
          {ownedCount} / {collection.length} cartes ({pct} %) · les doublons sont
          convertis en coins automatiquement.
        </p>
      </header>

      <AccountTabs />

      <DeckManager
        pendingBoosters={pendingBoosters}
        deck={deck.cards}
        collection={collection}
      />
    </main>
  );
}
