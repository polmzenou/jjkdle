"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useUniverse } from "./UniverseProvider";

/**
 * Sélecteur d'ARCADE : voyager d'un univers à l'autre depuis n'importe quelle
 * page, sans repasser par le hub. Affiché dans l'en-tête, juste à côté du lien
 * hub (l'icône maison) — les deux sont complémentaires : la maison montre TOUTES
 * les arcades avec leur présentation, ce menu saute directement dans l'une
 * d'elles.
 *
 * ⚠️ `next/link` NU, jamais `UniverseLink` : chaque entrée pointe vers la RACINE
 * d'un autre univers (`/csm`), un préfixage la renverrait sur l'univers courant.
 *
 * La liste vient de la BASE (cf. `listAvailableUniverses`, résolue par
 * `UniverseChrome`) : une arcade ajoutée apparaît ici automatiquement, et une
 * arcade encore sans ligne `Universe` n'y apparaît pas — sinon le clic finirait
 * sur un 500.
 *
 * `prefetch={false}` : préchargerait sinon la landing de chaque arcade au simple
 * survol du bouton, alors qu'on n'en visite qu'une.
 */

/** Une arcade telle qu'affichée par le sélecteur (tout est précalculé serveur). */
export interface SwitcherUniverse {
  slug: string;
  /** Nom de la marque (ex. « JJK Arcade »). */
  name: string;
  /** Nom de l'œuvre (ex. « Jujutsu Kaisen »), en sous-titre. */
  sourceWork: string;
  logo: { src: string; alt: string };
  /** Palette de l'arcade, en variables CSS (cf. `themeCssVars`). */
  vars: Record<string, string>;
}

export function UniverseSwitcher({
  universes,
  className = "",
}: {
  universes: SwitcherUniverse[];
  className?: string;
}) {
  const { slug: currentSlug } = useUniverse();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Fermeture au clic extérieur + à Échap (le focus revient sur le bouton).
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  // Une seule arcade en ligne : le menu n'aurait qu'une entrée, celle où l'on est.
  if (universes.length < 2) return null;

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Changer d'arcade"
        title="Changer d'arcade"
        className={`group flex h-9 shrink-0 items-center gap-1 rounded-xl border px-1.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-domain-light sm:px-2 ${
          open
            ? "border-domain/50 bg-domain/10 text-white"
            : "border-white/10 bg-white/[0.03] text-white/50 hover:border-domain/50 hover:bg-domain/10 hover:text-white"
        }`}
      >
        {/* Grille de 4 carreaux = « les autres arcades » (SVG maison : aucune
            librairie d'icônes dans le projet). */}
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.9}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-[18px] w-[18px]"
        >
          <rect x="3" y="3" width="7.5" height="7.5" rx="2" />
          <rect x="13.5" y="3" width="7.5" height="7.5" rx="2" />
          <rect x="3" y="13.5" width="7.5" height="7.5" rx="2" />
          <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2" />
        </svg>
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`hidden h-3 w-3 transition-transform duration-200 sm:block ${
            open ? "rotate-180" : ""
          }`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            aria-label="Arcades"
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            className="absolute left-0 top-full z-50 mt-2 w-[17rem] origin-top-left overflow-hidden rounded-2xl border border-white/10 bg-void-800/95 p-1.5 shadow-2xl backdrop-blur-xl"
          >
            <p className="px-2.5 pb-1.5 pt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">
              Changer d&apos;arcade
            </p>

            {universes.map((universe) => {
              const active = universe.slug === currentSlug;

              return (
                <Link
                  key={universe.slug}
                  role="menuitem"
                  href={`/${universe.slug}`}
                  prefetch={false}
                  onClick={() => setOpen(false)}
                  aria-current={active ? "page" : undefined}
                  // La ligne porte les variables CSS de SON arcade : les classes
                  // `bg-domain/…` rendent donc sa couleur, pas celle de l'univers
                  // courant — sans écrire une seule couleur en dur ici.
                  style={universe.vars as CSSProperties}
                  className={`flex items-center gap-3 rounded-xl px-2.5 py-2 transition-colors ${
                    active
                      ? "bg-domain/15 ring-1 ring-inset ring-domain/40"
                      : "hover:bg-domain/10"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={universe.logo.src}
                    alt=""
                    aria-hidden
                    className="h-7 w-14 shrink-0 object-contain"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-white">
                      {universe.name}
                    </span>
                    <span className="block truncate text-[11px] text-white/45">
                      {universe.sourceWork}
                    </span>
                  </span>
                  {active && (
                    <svg
                      aria-hidden
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2.4}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-4 w-4 shrink-0 text-domain-light"
                    >
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  )}
                </Link>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
