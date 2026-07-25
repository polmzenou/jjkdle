import type { Metadata } from "next";
import Link from "next/link";
import { listAvailableUniverses } from "@/lib/universes/current";
import { themeCssVars } from "@/lib/universes/theme";

/**
 * HUB multi-univers (étape 5) : liste les animes disponibles sur la plateforme.
 *
 * Alimenté par la BASE (table `Universe`) croisée avec le registre de configs :
 * un anime ajouté apparaît ici automatiquement, sans toucher cette page.
 *
 * Chaque carte est rendue avec la PALETTE de son univers (variables CSS posées
 * en style inline sur la carte) : on voit d'un coup d'œil l'identité de chacun,
 * alors même que la page est servie sous le thème de l'univers courant.
 */
export const metadata: Metadata = {
  title: "Les univers",
  description:
    "Tous les univers d'arcade de la plateforme : un anime, un domaine, ses jeux et son roster.",
};

export const dynamic = "force-dynamic";

export default async function UniversesHubPage() {
  const universes = await listAvailableUniverses();

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-16">
      <header className="text-center">
        <h1 className="font-display text-3xl font-black uppercase tracking-wider text-white sm:text-4xl">
          Les univers
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-balance text-white/55">
          Chaque anime a sa propre arcade, son roster et ses classements. Ton
          compte, ton XP et tes cosmétiques débloqués te suivent partout.
        </p>
      </header>

      {universes.length === 0 ? (
        <p className="mt-12 rounded-xl border border-cursed/40 bg-cursed/10 px-4 py-3 text-center text-sm text-cursed-light">
          Aucun univers configuré.
        </p>
      ) : (
        <ul className="mt-12 grid gap-5 sm:grid-cols-2">
          {universes.map(({ slug, name, config }) => {
            // Palette de CET univers, appliquée à la carte uniquement.
            const vars = themeCssVars(config.theme);
            return (
              <li key={slug}>
                <Link
                  href={`https://${config.domains[0]}`}
                  className="group flex h-full flex-col gap-4 rounded-2xl border p-5 transition-transform hover:scale-[1.02]"
                  style={{
                    ...vars,
                    borderColor: "rgb(var(--color-domain) / 0.45)",
                    background:
                      "linear-gradient(140deg, rgb(var(--color-void-800)) 0%, rgb(var(--color-domain) / 0.18) 100%)",
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={config.logo.src}
                    alt={config.logo.alt}
                    className="h-16 w-auto self-start object-contain"
                  />
                  <div>
                    <p className="font-display text-lg font-black text-white">
                      {name}
                    </p>
                    <p className="mt-1 text-sm text-white/60">
                      {config.sourceWork}
                    </p>
                  </div>
                  <p className="mt-auto text-xs font-semibold uppercase tracking-wider text-white/40 group-hover:text-white/70">
                    {config.domains[0]} →
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
