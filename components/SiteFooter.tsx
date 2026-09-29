import Link from "next/link";
import { UniverseLink } from "@/components/universe/UniverseLink";

/**
 * FOOTER COMMUN à toutes les pages.
 *
 * Monté par les layouts de SEGMENT (`UniverseChrome`, hub, casino) et jamais par
 * `app/layout.tsx` : comme la nav, il porte le nom de l'univers courant et doit
 * donc se re-rendre quand on passe d'un anime à l'autre.
 *
 * - `universe` : liens préfixés par l'univers courant (`UniverseLink`) ;
 * - `neutral` : hub et casino, qui n'appartiennent à aucun anime — liens nus.
 */

type Variant =
  | { variant: "universe"; name: string }
  | { variant: "neutral"; name?: undefined };

const UNIVERSE_LINKS = [
  { href: "/", label: "Accueil" },
  { href: "/games", label: "Jeux" },
  { href: "/shop", label: "Boutique" },
  { href: "/account", label: "Mon compte" },
  { href: "/account/deck", label: "Mon deck" },
];

const linkClass = "transition-colors hover:text-domain-light";

export function SiteFooter(props: Variant) {
  const year = new Date().getFullYear();

  return (
    <footer className="relative mt-16 border-t border-white/5 bg-void-900/60 backdrop-blur">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 px-5 pb-24 pt-8 sm:px-6 lg:w-3/4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="font-display text-sm font-black uppercase tracking-[0.2em] text-white/80">
            {props.variant === "universe" ? props.name : "Anime Arcade"}
          </p>
          <p className="mt-1 text-xs text-white/35">
            Fan-projet non officiel · aucun asset copyrighté · © {year}
          </p>
        </div>

        <nav aria-label="Pied de page">
          <ul className="flex flex-wrap gap-x-5 gap-y-2 text-xs font-bold uppercase tracking-wider text-white/45">
            {props.variant === "universe" &&
              UNIVERSE_LINKS.map((link) => (
                <li key={link.href}>
                  <UniverseLink href={link.href} className={linkClass}>
                    {link.label}
                  </UniverseLink>
                </li>
              ))}
            {/* Hors univers : liens NUS (préfixer ramènerait dans un anime). */}
            <li>
              <Link href="/" className={linkClass}>
                Tous les univers
              </Link>
            </li>
            <li>
              <Link href="/casino" className={linkClass}>
                Casino
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}
