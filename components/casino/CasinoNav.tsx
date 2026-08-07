import Link from "next/link";
import { CoinWallet } from "@/components/progress/CoinWallet";

/**
 * Barre du casino. Volontairement MINIMALE, et surtout pas `SiteNav` : celle-ci
 * porte le logo, les jeux et le lien boutique d'un anime, or le casino n'en a
 * aucun (il est hors univers, cf. UNIVERSE_FREE_PREFIXES).
 *
 * Il ne reste donc que ce qui compte à une table : d'où l'on vient, et combien
 * on a en poche.
 */
export function CasinoNav({
  coins,
  username,
}: {
  coins: number | null;
  username: string | null;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-cursed/20 bg-void-900/85 backdrop-blur">
      <nav className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-3">
        <Link
          href="/casino"
          className="group flex items-center gap-2.5 font-display text-lg font-black uppercase tracking-wide text-white"
        >
          <span
            aria-hidden
            className="grid h-8 w-8 place-items-center rounded-lg border border-cursed/40 bg-cursed/10 text-base text-cursed-light transition-transform duration-300 group-hover:scale-110"
          >
            ♠
          </span>
          Casino
        </Link>

        <div className="flex items-center gap-3">
          {coins !== null && <CoinWallet coins={coins} />}
          {username && (
            <span className="hidden text-xs font-semibold text-white/50 sm:inline">
              {username}
            </span>
          )}
          <Link
            href="/"
            className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-white/60 transition hover:border-white/25 hover:text-white"
          >
            ← Univers
          </Link>
        </div>
      </nav>
    </header>
  );
}
