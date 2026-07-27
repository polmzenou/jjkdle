"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { CSSProperties } from "react";

/**
 * Rendu du HUB multi-univers (la page de choix d'anime).
 *
 * Composant CLIENT uniquement pour les animations d'entrée : toutes les données
 * (liste, compteurs, flags) sont résolues côté serveur par `page.tsx` et passées
 * en props sérialisables — le hub reste donc une page de contenu, pas un écran
 * qui charge.
 *
 * ⚠️ Chaque carte porte les VARIABLES CSS de son univers (`vars`) en style
 * inline : les classes Tailwind habituelles (`bg-domain/15`, `text-domain-light`,
 * `bg-void-800`…) rendent alors la palette de CET anime, alors même que la page
 * est servie sous le thème neutre du hub. C'est ce qui donne une identité
 * visuelle par carte sans écrire une seule couleur en dur ici.
 */

/** Un univers tel qu'affiché par le hub (tout est précalculé côté serveur). */
export interface HubUniverse {
  slug: string;
  /** Nom de la marque (ex. « JJK Arcade »). */
  name: string;
  /** Nom de l'œuvre (ex. « Jujutsu Kaisen »). */
  sourceWork: string;
  tagline: string;
  logo: { src: string; alt: string };
  /** Palette de l'univers, sous forme de variables CSS. */
  vars: Record<string, string>;
  /** Nombre de jeux jouables (flags admin appliqués). */
  gameCount: number;
  /** Taille du roster de l'univers. */
  rosterCount: number;
  /** Quelques titres de jeux, avec les textes de CET univers. */
  highlights: string[];
  maintenance: boolean;
}

/** Avantages valables partout : un compte, une progression, tous les animes. */
const CROSS_UNIVERSE_PERKS = [
  { icon: "👤", label: "Un seul compte" },
  { icon: "⚡", label: "XP et niveau partagés" },
  { icon: "🏅", label: "Cosmétiques débloqués partout" },
] as const;

export function UniverseHub({ universes }: { universes: HubUniverse[] }) {
  return (
    <main className="relative mx-auto w-full max-w-6xl px-6 pb-24 pt-16 sm:pt-24">
      <HubBackdrop />

      <header className="mx-auto max-w-2xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/60">
            <span
              aria-hidden
              className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgb(52_211_153)]"
            />
            {universes.length} univers en ligne
          </span>

          <h1 className="mt-6 font-display text-4xl font-black uppercase leading-[1.05] tracking-tight text-white sm:text-6xl">
            Choisis ton
            <span className="block bg-gradient-to-b from-white to-white/45 bg-clip-text text-transparent">
              univers
            </span>
          </h1>

          <p className="mx-auto mt-5 max-w-md text-balance leading-relaxed text-white/55">
            Chaque anime a son arcade, son roster et ses classements. Ta
            progression, elle, te suit partout.
          </p>
        </motion.div>

        <motion.ul
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="mt-8 flex flex-wrap items-center justify-center gap-2"
        >
          {CROSS_UNIVERSE_PERKS.map((perk) => (
            <li
              key={perk.label}
              className="inline-flex items-center gap-2 rounded-full border border-white/[0.07] bg-white/[0.02] px-3 py-1.5 text-xs font-medium text-white/50"
            >
              <span aria-hidden>{perk.icon}</span>
              {perk.label}
            </li>
          ))}
        </motion.ul>
      </header>

      {universes.length === 0 ? (
        <p className="mx-auto mt-16 max-w-md rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-6 text-center text-sm text-white/50">
          Aucun univers configuré pour le moment.
        </p>
      ) : (
        // Grille ouverte : 1 → 2 → 3 colonnes. Les cartes se remplissent dans
        // l'ordre de création des univers, donc ajouter un anime n'impose AUCUNE
        // retouche de mise en page (la carte « bientôt » ferme toujours la file).
        <ul className="mt-14 grid gap-5 sm:mt-16 sm:grid-cols-2 lg:grid-cols-3">
          {universes.map((universe, i) => (
            <UniverseCard key={universe.slug} universe={universe} index={i} />
          ))}
          <ComingSoonCard index={universes.length} />
        </ul>
      )}
    </main>
  );
}

/** Carte d'un univers : visuel de marque + ce qu'on y trouve + entrée. */
function UniverseCard({
  universe,
  index,
}: {
  universe: HubUniverse;
  index: number;
}) {
  const {
    slug,
    name,
    sourceWork,
    tagline,
    logo,
    vars,
    gameCount,
    rosterCount,
    highlights,
    maintenance,
  } = universe;

  return (
    <motion.li
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 + index * 0.08, ease: "easeOut" }}
    >
      <Link
        // Lien INTERNE : l'univers est un préfixe de chemin, la même URL marche
        // donc en local comme en prod (pas de renvoi vers un domaine de prod).
        href={`/${slug}`}
        style={vars as CSSProperties}
        className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-white/10 bg-void-800/70 transition duration-300 hover:-translate-y-1.5 hover:border-domain/60 hover:shadow-[0_30px_70px_-35px_rgb(var(--color-domain))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-domain-light focus-visible:ring-offset-2 focus-visible:ring-offset-void-900"
      >
        {/* Bandeau de marque : halo de l'accent de l'univers + logo. */}
        <div className="relative h-36 overflow-hidden">
          <span
            aria-hidden
            className="absolute inset-0 transition-opacity duration-500 group-hover:opacity-100"
            style={{
              background:
                "radial-gradient(120% 130% at 50% -10%, rgb(var(--color-domain) / 0.55) 0%, rgb(var(--color-domain) / 0.12) 45%, transparent 75%)",
              opacity: 0.8,
            }}
          />
          {/* Grain de trame façon manga, très discret. */}
          <span
            aria-hidden
            className="absolute inset-0 opacity-[0.12]"
            style={{
              backgroundImage:
                "radial-gradient(rgb(255 255 255 / 0.8) 1px, transparent 1px)",
              backgroundSize: "10px 10px",
            }}
          />
          {/* Reflet qui balaie la carte au survol. */}
          <span
            aria-hidden
            className="absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-[420%]"
          />

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logo.src}
            alt={logo.alt}
            className="absolute inset-0 m-auto h-16 w-auto max-w-[65%] object-contain drop-shadow-[0_8px_24px_rgb(0_0_0_/_0.6)] transition-transform duration-500 group-hover:scale-105"
          />

          {maintenance && (
            <span className="absolute right-3 top-3 rounded-full border border-amber-400/40 bg-amber-400/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-200">
              Maintenance
            </span>
          )}
        </div>

        {/* Liseré d'accent séparant le bandeau du contenu. */}
        <span
          aria-hidden
          className="h-px w-full"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgb(var(--color-domain) / 0.8), transparent)",
          }}
        />

        <div className="flex flex-1 flex-col gap-4 p-6">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-domain-light">
              {sourceWork}
            </p>
            <p className="mt-1.5 font-display text-2xl font-black tracking-tight text-white">
              {name}
            </p>
          </div>

          <p className="line-clamp-3 text-sm leading-relaxed text-white/50">
            {tagline}
          </p>

          {/* Ce qu'on trouve dans l'univers : chiffres réels, pas du décor. */}
          <div className="flex flex-wrap gap-2">
            <Stat value={gameCount} label={gameCount > 1 ? "jeux" : "jeu"} />
            <Stat
              value={rosterCount}
              label={rosterCount > 1 ? "personnages" : "personnage"}
            />
          </div>

          {highlights.length > 0 && (
            <ul className="flex flex-wrap gap-1.5">
              {highlights.map((title) => (
                <li
                  key={title}
                  className="rounded-full border border-white/[0.07] bg-white/[0.03] px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-white/45"
                >
                  {title}
                </li>
              ))}
              {gameCount > highlights.length && (
                <li className="rounded-full border border-white/[0.07] bg-white/[0.03] px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-white/45">
                  +{gameCount - highlights.length}
                </li>
              )}
            </ul>
          )}

          <span className="mt-auto flex items-center gap-2 pt-2 font-display text-sm font-bold uppercase tracking-wider text-white/60 transition-colors group-hover:text-white">
            Entrer
            <span
              aria-hidden
              className="transition-transform duration-300 group-hover:translate-x-1.5"
            >
              →
            </span>
          </span>
        </div>
      </Link>
    </motion.li>
  );
}

/** Chiffre-clé d'un univers (jeux, roster). */
function Stat({ value, label }: { value: number; label: string }) {
  return (
    <span className="inline-flex items-baseline gap-1.5 rounded-xl border border-domain/25 bg-domain/10 px-3 py-1.5">
      <span className="font-display text-base font-black leading-none text-white">
        {value}
      </span>
      <span className="text-[11px] font-medium uppercase tracking-wider text-white/50">
        {label}
      </span>
    </span>
  );
}

/**
 * Carte « à venir » qui ferme la grille. Elle n'est pas décorative : elle occupe
 * l'emplacement du prochain anime, donc la grille reste équilibrée quel que soit
 * le nombre d'univers (2 → 3 → 5…), sans jamais laisser un trou visuel.
 */
function ComingSoonCard({ index }: { index: number }) {
  return (
    <motion.li
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 + index * 0.08, ease: "easeOut" }}
    >
      <div className="flex h-full min-h-[19rem] flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-white/10 bg-white/[0.015] p-8 text-center">
        <span
          aria-hidden
          className="grid h-14 w-14 place-items-center rounded-2xl border border-white/10 bg-white/[0.03] text-2xl"
        >
          ✦
        </span>
        <p className="font-display text-lg font-black text-white/70">
          Prochain univers
        </p>
        <p className="max-w-[15rem] text-sm leading-relaxed text-white/35">
          Un nouvel anime est en préparation. Reviens vite.
        </p>
      </div>
    </motion.li>
  );
}

/**
 * Décor de fond du hub : halo central + trame quadrillée estompée. En `fixed` et
 * en `-z-10` pour rester derrière le contenu sans intercepter les clics.
 */
function HubBackdrop() {
  const fade =
    "radial-gradient(ellipse 75% 55% at 50% 0%, black 10%, transparent 75%)";
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgb(255 255 255 / 0.035) 1px, transparent 1px), linear-gradient(to bottom, rgb(255 255 255 / 0.035) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          maskImage: fade,
          WebkitMaskImage: fade,
        }}
      />
      <div
        className="absolute inset-x-0 top-0 h-[32rem]"
        style={{
          background:
            "radial-gradient(60% 100% at 50% 0%, rgb(148 163 184 / 0.16) 0%, transparent 70%)",
        }}
      />
    </div>
  );
}
