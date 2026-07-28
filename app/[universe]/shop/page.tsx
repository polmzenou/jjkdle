import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getCurrentUniverse } from "@/lib/universes/current";
import { getShopWindow } from "@/lib/cards/shop-store";
import { ShopView } from "@/components/shop/ShopView";

export const metadata: Metadata = {
  title: "Boutique",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * BOUTIQUE : boosters à la carte et étal exotic du jour, payés en coins.
 *
 * Scopée à l'univers courant comme l'onglet Deck : le solde de coins est global
 * au compte, mais on n'achète que des cartes et des boosters de l'anime où l'on
 * se trouve (`getShopWindow` prend l'`universeId`).
 */
export default async function ShopPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const universe = await getCurrentUniverse();
  const shop = await getShopWindow(user.id, universe.id);

  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-10 sm:px-6 sm:py-16">
      <header className="mb-10">
        <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.3em] text-domain-light/70">
          <span
            aria-hidden
            className="h-px w-6 bg-gradient-to-r from-transparent to-domain-light/60"
          />
          商店 · Boutique
        </span>
        <h1 className="mt-4 font-display text-3xl font-black tracking-tight text-white sm:text-4xl">
          Boutique {universe.config.name}
        </h1>
        <p className="mt-2 text-sm text-white/50">
          Dépense tes coins en boosters, ou achète directement une carte exotic
          de l&apos;étal du jour.
        </p>
      </header>

      <ShopView shop={shop} />
    </main>
  );
}
