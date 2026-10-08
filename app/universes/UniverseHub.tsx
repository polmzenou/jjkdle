"use client";

import Image from "next/image";
import Link from "next/link";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  usePresence,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";

/**
 * Rendu du HUB multi-univers (la page de choix d'anime).
 *
 * Mise en scène « orbite » : le titre occupe le centre de l'écran et chaque
 * univers flotte autour, sur une ellipse. Deux entrées par univers :
 * - le LOGO est un lien direct vers l'univers ;
 * - la petite FLÈCHE ouvre la vue « zoom » : la caméra plonge vers l'univers
 *   (la scène grossit autour de lui et se floute) pendant que son disque quitte
 *   SON emplacement pour grandir au milieu de l'écran, le détail à côté. On en
 *   sort par la croix, Échap, ou un clic hors du logo et du texte : le disque
 *   revient se poser exactement où il était.
 *
 * Le trajet du disque est piloté à la main (FLIP) plutôt que par un `layoutId` :
 * on mesure la boule au clic et la vue zoom part de ce rectangle. C'est ce qui
 * permet de zoomer la scène en même temps sans fausser les mesures.
 *
 * Toutes les données (liste, compteurs, flags) sont résolues côté serveur par
 * `page.tsx` et passées en props sérialisables.
 *
 * ⚠️ Chaque univers porte ses VARIABLES CSS (`vars`) en style inline : les
 * classes Tailwind habituelles (`bg-domain/15`, `text-domain-light`…) rendent
 * alors la palette de CET anime, alors même que la page est servie sous le
 * thème neutre du hub.
 */

/** Un jeu tel qu'annoncé dans la vue détaillée d'un univers. */
export interface HubGame {
  id: string;
  /** Titre réécrit par l'univers (ex. « CSMdle »). */
  title: string;
  description: string;
}

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
  /** Jeux jouables, avec les textes de CET univers. */
  games: HubGame[];
  maintenance: boolean;
}

/** Avantages valables partout : un compte, une progression, tous les animes. */
const CROSS_UNIVERSE_PERKS = [
  { icon: "👤", label: "Un seul compte" },
  { icon: "⚡", label: "XP et niveau partagés" },
  { icon: "🏅", label: "Cosmétiques débloqués partout" },
] as const;

/*
 * Tout ce qui bouge PENDANT le zoom (disque, scène) est animé par le navigateur
 * lui-même (Web Animations / transitions CSS) et uniquement en `transform` /
 * `opacity` : ces animations tournent sur le compositeur, à l'abri du thread
 * principal où React monte la vue zoom au même moment. Aucun `filter` ni
 * `backdrop-filter` animé : recalculer un flou plein écran à chaque image est
 * ce qui faisait saccader la première version.
 */

/** Aller : léger dépassement en fin de course — le disque « jaillit ». */
const ZOOM_IN = {
  duration: 720,
  easing: "cubic-bezier(0.3, 1.25, 0.5, 1)",
} as const;
/** Retour : courbe sans rebond, pour que le disque se pose pile à sa place. */
const ZOOM_OUT = {
  duration: 520,
  easing: "cubic-bezier(0.65, 0, 0.35, 1)",
} as const;
/** Plongée de la scène (plus longue que le disque : la caméra « suit »). */
const STAGE_IN = "860ms cubic-bezier(0.22, 1, 0.36, 1)";
/** Grossissement de la scène pendant le zoom (la « plongée » caméra). */
const STAGE_ZOOM = 1.35;

/** Rayons de l'orbite, en % de la scène (ellipse plus large que haute). */
const ORBIT_RX = 40;
const ORBIT_RY = 36;

/** Univers zoomé + rectangle de sa boule au moment du clic (point de départ). */
interface ZoomState {
  slug: string;
  origin: DOMRect;
}

export function UniverseHub({
  universes,
  casino,
}: {
  universes: HubUniverse[];
  /** Palette + disponibilité du casino. `null` = casino coupé, lien masqué. */
  casino: { vars: Record<string, string> } | null;
}) {
  const [zoom, setZoom] = useState<ZoomState | null>(null);
  // La boule reste masquée jusqu'à la FIN du retour : c'est la vue zoom qui la
  // ramène, puis la boule réapparaît au même pixel (pas de double affichage).
  const [hiddenSlug, setHiddenSlug] = useState<string | null>(null);
  const [stageOrigin, setStageOrigin] = useState("50% 50%");
  const stageRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef<ZoomState | null>(null);
  zoomRef.current = zoom;

  const selected = zoom
    ? (universes.find((u) => u.slug === zoom.slug) ?? null)
    : null;
  const close = useCallback(() => setZoom(null), []);

  const open = useCallback((slug: string, origin: DOMRect) => {
    const stage = stageRef.current?.getBoundingClientRect();
    if (stage) {
      // La scène grossit AUTOUR de la boule choisie : elle reste fixe pendant
      // que le reste de l'orbite s'écarte — d'où l'effet de plongée.
      setStageOrigin(
        `${origin.left + origin.width / 2 - stage.left}px ${origin.top + origin.height / 2 - stage.top}px`,
      );
    }
    setHiddenSlug(slug);
    setZoom({ slug, origin });
  }, []);

  // La page derrière le zoom ne défile plus. Verrou posé ICI (sur l'état) et pas
  // dans la vue zoom : rouvrir un univers pendant l'animation de sortie du
  // précédent monterait deux vues, et la seconde « restaurerait » le verrou.
  const isZoomed = zoom !== null;
  useEffect(() => {
    if (!isZoomed) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isZoomed]);

  // Parallaxe : position du pointeur normalisée (-1 → 1), lissée par ressort.
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const smoothX = useSpring(pointerX, { stiffness: 60, damping: 20 });
  const smoothY = useSpring(pointerY, { stiffness: 60, damping: 20 });

  const onPointerMove = (e: ReactPointerEvent<HTMLElement>) => {
    // Figée pendant le zoom : la boule doit rester là où le disque reviendra.
    if (e.pointerType !== "mouse" || zoomRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    pointerX.set(((e.clientX - rect.left) / rect.width) * 2 - 1);
    pointerY.set(((e.clientY - rect.top) / rect.height) * 2 - 1);
  };

  return (
    <>
      {/* Hors de la scène : un `filter` sur un ancêtre casserait son `fixed`. */}
      <HubBackdrop />

      <main
        onPointerMove={onPointerMove}
        className="relative w-full overflow-hidden"
      >
        {/* Scène : simple transition CSS (compositeur). L'origine change au
            moment du clic, alors que l'échelle vaut encore 1 — sans effet visible. */}
        <div
          ref={stageRef}
          style={{
            transformOrigin: stageOrigin,
            transform: isZoomed ? `scale(${STAGE_ZOOM})` : "none",
            opacity: isZoomed ? 0.3 : 1,
            transition: isZoomed
              ? `transform ${STAGE_IN}, opacity ${STAGE_IN}`
              : `transform ${ZOOM_OUT.duration}ms ${ZOOM_OUT.easing}, opacity ${ZOOM_OUT.duration}ms ${ZOOM_OUT.easing}`,
          }}
        >
          {universes.length === 0 ? (
            <div className="mx-auto max-w-2xl px-6 pb-24 pt-24">
              <HubHeader count={0} casino={casino} />
              <p className="mx-auto mt-16 max-w-md rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-6 text-center text-sm text-white/50">
                Aucun univers configuré pour le moment.
              </p>
            </div>
          ) : (
            // UNE seule liste pour toutes les tailles d'écran : grille sur mobile,
            // orbite (positions absolues) à partir de `lg`. Ne jamais dupliquer
            // les univers entre deux mises en page masquées en CSS — la copie
            // cachée n'a pas de position réelle et fausse les mesures du zoom.
            <section className="relative mx-auto w-full max-w-7xl px-4 pb-20 pt-14 lg:h-[max(100svh,860px)] lg:p-0">
              <OrbitRing />
              <div className="lg:absolute lg:left-1/2 lg:top-1/2 lg:w-full lg:max-w-md lg:-translate-x-1/2 lg:-translate-y-1/2">
                <HubHeader count={universes.length} casino={casino} />
              </div>

              <ul className="mx-auto mt-12 grid max-w-2xl grid-cols-2 gap-x-3 gap-y-10 sm:grid-cols-3 lg:pointer-events-none lg:absolute lg:inset-0 lg:mt-0 lg:block lg:max-w-none">
                {universes.map((universe, i) => {
                  // Premier univers en haut, puis sens horaire.
                  const angle =
                    (-90 + (i * 360) / universes.length) * (Math.PI / 180);
                  return (
                    <li
                      key={universe.slug}
                      className="flex justify-center lg:pointer-events-auto lg:absolute lg:left-[var(--orbit-x)] lg:top-[var(--orbit-y)] lg:-translate-x-1/2 lg:-translate-y-1/2"
                      style={
                        {
                          "--orbit-x": `${50 + Math.cos(angle) * ORBIT_RX}%`,
                          "--orbit-y": `${50 + Math.sin(angle) * ORBIT_RY}%`,
                        } as CSSProperties
                      }
                    >
                      <OrbitUniverse
                        universe={universe}
                        index={i}
                        hidden={hiddenSlug === universe.slug}
                        onOpen={open}
                        parallaxX={smoothX}
                        parallaxY={smoothY}
                      />
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </div>
      </main>

      <AnimatePresence
        // Le retour est fini : on rend la boule — sauf si un autre univers a été
        // ouvert entre-temps, auquel cas c'est LUI qui reste masqué.
        onExitComplete={() => setHiddenSlug(zoomRef.current?.slug ?? null)}
      >
        {selected && zoom && (
          <UniverseZoom
            key={selected.slug}
            universe={selected}
            origin={zoom.origin}
            onClose={close}
          />
        )}
      </AnimatePresence>
    </>
  );
}

/** Bloc central : badge « en ligne », titre, accroche, avantages, casino. */
function HubHeader({
  count,
  casino,
}: {
  count: number;
  casino: { vars: Record<string, string> } | null;
}) {
  return (
    <header className="text-center">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/60">
          <span
            aria-hidden
            className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_10px_rgb(52_211_153)]"
          />
          {count} univers en ligne
        </span>

        <h1 className="mt-5 font-display text-4xl font-black uppercase leading-[1.02] tracking-tight text-white sm:text-[3.4rem]">
          {/* Texte lu par les moteurs/lecteurs d'écran : la marque de la plateforme. */}
          <span className="sr-only">Anime Arcade — mini-jeux anime gratuits · </span>
          Choisis ton{" "}
          <span className="block bg-gradient-to-b from-white to-white/40 bg-clip-text text-transparent">
            univers
          </span>
        </h1>

        <p className="mx-auto mt-4 max-w-sm text-balance text-sm leading-relaxed text-white/55">
          Chaque anime a son arcade, son roster et ses classements. Ta
          progression, elle, te suit partout.
        </p>
      </motion.div>

      <motion.ul
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.25 }}
        className="mt-5 flex flex-wrap items-center justify-center gap-1.5"
      >
        {CROSS_UNIVERSE_PERKS.map((perk) => (
          <li
            key={perk.label}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.07] bg-white/[0.03] px-2.5 py-1 text-[11px] font-medium text-white/50"
          >
            <span aria-hidden>{perk.icon}</span>
            {perk.label}
          </li>
        ))}
      </motion.ul>

      {/* Le casino n'est pas un anime de plus : c'est un lieu transverse (il mise
          les coins du compte, globaux). Il reste donc au centre, hors orbite. */}
      {casino && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-5"
        >
          <Link
            href="/casino"
            style={casino.vars as CSSProperties}
            className="group inline-flex items-center gap-2.5 rounded-full border border-cursed/30 bg-cursed/10 px-4 py-2 text-xs font-bold uppercase tracking-wider text-cursed-light transition hover:border-cursed/70 hover:bg-cursed/20 hover:shadow-[0_0_30px_-8px_rgb(var(--color-cursed))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cursed-light"
          >
            <span aria-hidden className="text-sm">
              ♠
            </span>
            Casino — tous univers
            <span
              aria-hidden
              className="transition-transform duration-300 group-hover:translate-x-1"
            >
              →
            </span>
          </Link>
        </motion.div>
      )}
    </header>
  );
}

/**
 * Un univers en orbite : disque du logo (lien direct) + nom + flèche d'aperçu.
 * Flotte en continu (bobbing) et suit légèrement le pointeur (parallaxe).
 */
function OrbitUniverse({
  universe,
  index,
  hidden,
  onOpen,
  parallaxX,
  parallaxY,
}: {
  universe: HubUniverse;
  index: number;
  /** Vrai pendant que l'univers est zoomé : son disque vit dans la vue zoom. */
  hidden: boolean;
  /** Reçoit le rectangle ACTUEL de la boule : point de départ du zoom. */
  onOpen: (slug: string, origin: DOMRect) => void;
  parallaxX: MotionValue<number>;
  parallaxY: MotionValue<number>;
}) {
  const diskRef = useRef<HTMLDivElement>(null);
  // Profondeur pseudo-aléatoire mais stable : chaque univers bouge différemment.
  const depth = 10 + ((index * 7) % 4) * 6;
  const x = useTransform(parallaxX, (v) => v * -depth);
  const y = useTransform(parallaxY, (v) => v * -depth);
  const bobDuration = 5 + ((index * 3) % 5) * 0.6;

  return (
    <motion.div
      style={{ ...(universe.vars as CSSProperties), x, y }}
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        duration: 0.9,
        delay: 0.25 + index * 0.09,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      {/* Flottement en CSS (compositeur, cf. `.hub-float`). Mis en PAUSE pendant
          le zoom : la boule reste figée là où le disque reviendra se poser. */}
      <div
        className="hub-float group flex flex-col items-center"
        style={{
          animationDuration: `${bobDuration}s`,
          animationDelay: `${index * 0.4}s`,
          animationPlayState: hidden ? "paused" : "running",
        }}
      >
        <div
          ref={diskRef}
          className="relative aspect-square w-32 sm:w-36 lg:w-44"
        >
          {/* Masquée (pas démontée) pendant le zoom : elle garde sa place et
              reste mesurable pour le retour du disque. */}
          <div className={hidden ? "invisible" : undefined}>
            <Link
              href={`/${universe.slug}`}
              aria-label={`Entrer dans ${universe.name}`}
              className="absolute inset-0 block rounded-full transition-transform duration-500 ease-out hover:scale-[1.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-domain-light focus-visible:ring-offset-4 focus-visible:ring-offset-void-900"
            >
              <UniverseDisk universe={universe} />
            </Link>

            {/* Flèche d'aperçu : ouvre la vue zoom. */}
            <button
              type="button"
              onClick={() => {
                const rect = diskRef.current?.getBoundingClientRect();
                if (rect) onOpen(universe.slug, rect);
              }}
              aria-label={`Découvrir ${universe.name}`}
              title="Découvrir l'univers"
              className="absolute -bottom-1 -right-1 z-10 grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-void-900 text-white/80 shadow-[0_8px_24px_-6px_rgb(0_0_0/0.8)] transition duration-300 hover:scale-110 hover:border-domain/70 hover:bg-domain hover:text-white hover:shadow-[0_0_28px_-4px_rgb(var(--color-domain))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-domain-light"
            >
              <ArrowIcon className="h-4 w-4 transition-transform duration-300 group-hover:rotate-45" />
            </button>
          </div>
        </div>

        <div className="mt-4 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-domain-light">
            {universe.sourceWork}
          </p>
          <p className="mt-1 font-display text-base font-black tracking-tight text-white lg:text-lg">
            {universe.name}
          </p>
          {universe.maintenance && (
            <span className="mt-1.5 inline-block rounded-full border border-amber-400/40 bg-amber-400/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-200">
              Maintenance
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Disque de marque d'un univers. Rendu à l'identique en orbite et en vue zoom,
 * tout en % : le passage de l'un à l'autre est une pure mise à l'échelle.
 */
function UniverseDisk({ universe }: { universe: HubUniverse }) {
  return (
    <div className="relative h-full w-full overflow-hidden rounded-full border border-white/10 bg-void-800 shadow-[0_30px_80px_-30px_rgb(var(--color-domain)/0.9)]"
    >
      <span
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(85% 85% at 50% 20%, rgb(var(--color-domain) / 0.6) 0%, rgb(var(--color-domain) / 0.14) 50%, transparent 78%)",
        }}
      />
      {/* Trame façon manga, très discrète. */}
      <span
        aria-hidden
        className="absolute inset-0 opacity-[0.14]"
        style={{
          backgroundImage:
            "radial-gradient(rgb(255 255 255 / 0.8) 1px, transparent 1px)",
          backgroundSize: "9px 9px",
          maskImage: "radial-gradient(circle at 50% 50%, black 30%, transparent 72%)",
          WebkitMaskImage:
            "radial-gradient(circle at 50% 50%, black 30%, transparent 72%)",
        }}
      />
      {/* Anneau d'accent intérieur. */}
      <span
        aria-hidden
        className="absolute inset-[6%] rounded-full border border-domain/30"
      />
      {/* next/image, chargé en différé : en <img>, React préchargeait les six
          logos (~830 Ko) en tête de page, en concurrence avec le CSS et le JS. */}
      <Image
        src={universe.logo.src}
        alt={universe.logo.alt}
        width={800}
        height={500}
        // Le même disque sert la vue zoom (logo ~300 px de large) : la variante
        // doit y rester nette, pas seulement à la taille d'orbite.
        sizes="(min-width: 1024px) 360px, 300px"
        draggable={false}
        className="absolute inset-0 m-auto h-auto max-h-[52%] w-[68%] object-contain drop-shadow-[0_10px_30px_rgb(0_0_0_/_0.7)]"
      />
    </div>
  );
}

/** Vue zoom d'un univers : disque agrandi + détail + entrée. */
function UniverseZoom({
  universe,
  origin,
  onClose,
}: {
  universe: HubUniverse;
  /** Rectangle de la boule en orbite : d'où part le disque, où il revient. */
  origin: DOMRect;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const slotRef = useRef<HTMLDivElement>(null);
  const diskRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLSpanElement>(null);
  const flightRef = useRef<Animation | null>(null);
  const titleId = `zoom-title-${universe.slug}`;
  const [isPresent, safeToRemove] = usePresence();

  /**
   * Transform (FLIP) qui pose le disque EXACTEMENT sur la boule d'origine ;
   * `none` le laisse à sa place dans la vue zoom. Le slot, lui, n'est jamais
   * transformé : son rectangle est la place finale.
   */
  const transformToOrigin = useCallback(() => {
    const slot = slotRef.current?.getBoundingClientRect();
    if (!slot || slot.width === 0) return null;
    const dx = origin.left + origin.width / 2 - (slot.left + slot.width / 2);
    const dy = origin.top + origin.height / 2 - (slot.top + slot.height / 2);
    return `translate3d(${dx}px, ${dy}px, 0) scale(${origin.width / slot.width})`;
  }, [origin]);

  // Aller : avant le premier affichage, le disque est posé SUR la boule, puis
  // s'envole vers sa place. Web Animations → l'animation vit sur le
  // compositeur et reste fluide même si React travaille pendant ce temps.
  useLayoutEffect(() => {
    const disk = diskRef.current;
    const from = transformToOrigin();
    if (!disk || !from) return;
    flightRef.current = disk.animate(
      [{ transform: from }, { transform: "none" }],
      { ...ZOOM_IN, fill: "both" },
    );
    const glowIn = glowRef.current?.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: 500,
      delay: 200,
      easing: "ease-out",
      fill: "both",
    });
    return () => {
      flightRef.current?.cancel();
      glowIn?.cancel();
    };
  }, [transformToOrigin]);

  // Retour : le disque repart de là où il en est (même en plein vol), rejoint
  // la boule, PUIS la vue se démonte.
  useEffect(() => {
    if (isPresent) return;
    const disk = diskRef.current;
    const to = transformToOrigin();
    if (!disk || !to) {
      safeToRemove?.();
      return;
    }
    const current = getComputedStyle(disk).transform;
    flightRef.current?.cancel();
    glowRef.current?.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: 250,
      fill: "forwards",
    });
    const back = disk.animate(
      [{ transform: current === "none" ? "none" : current }, { transform: to }],
      { ...ZOOM_OUT, fill: "forwards" },
    );
    back.finished.then(() => safeToRemove?.()).catch(() => {});
  }, [isPresent, safeToRemove, transformToOrigin]);

  // Échap ferme, le focus va sur la croix.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    closeRef.current?.focus({ preventScroll: true });
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const stop = (e: React.MouseEvent) => e.stopPropagation();

  // `transform` en chaîne (et non `x`/`y`) : framer-motion le confie alors aux
  // Web Animations du navigateur, comme `opacity` — rien ne passe par le JS.
  const panel = {
    hidden: { opacity: 0, transform: "translate3d(24px, 0, 0)" },
    show: {
      opacity: 1,
      transform: "translate3d(0px, 0, 0)",
      transition: {
        duration: 0.5,
        ease: [0.22, 1, 0.36, 1],
        staggerChildren: 0.05,
        delayChildren: 0.18,
      },
    },
    exit: {
      opacity: 0,
      transform: "translate3d(16px, 0, 0)",
      transition: { duration: 0.18 },
    },
  };
  const item = {
    hidden: { opacity: 0, transform: "translate3d(0, 14px, 0)" },
    show: {
      opacity: 1,
      transform: "translate3d(0, 0px, 0)",
      transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
    },
  };

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      style={universe.vars as CSSProperties}
      className="fixed inset-0 z-50"
      onClick={onClose}
    >
      {/* Voile : assombrit le hub (déjà zoomé), teinté de l'accent. */}
      <motion.div
        aria-hidden
        className="absolute inset-0 bg-void-900/70"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(60% 70% at 30% 50%, rgb(var(--color-domain) / 0.28) 0%, transparent 70%)",
          }}
        />
      </motion.div>

      <motion.button
        ref={closeRef}
        type="button"
        onClick={onClose}
        aria-label="Fermer"
        initial={{ opacity: 0, transform: "scale(0.6) rotate(-90deg)" }}
        animate={{ opacity: 1, transform: "scale(1) rotate(0deg)" }}
        exit={{ opacity: 0, transform: "scale(0.6) rotate(90deg)" }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="absolute right-4 top-4 z-10 grid h-11 w-11 place-items-center rounded-full border border-white/15 bg-void-800/90 text-white/80 transition-colors hover:border-white/40 hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-domain-light sm:right-6 sm:top-6"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden>
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </motion.button>

      <div className="relative h-full overflow-y-auto overscroll-contain">
        <div className="mx-auto flex min-h-full w-full max-w-6xl flex-col items-center justify-center gap-10 px-6 py-20 lg:flex-row lg:gap-16">
          {/* Emplacement final du disque. Le disque lui-même y est décalé
              (transform FLIP) pour partir de la boule d'origine. */}
          <div
            ref={slotRef}
            className="relative aspect-square w-[min(68vw,300px)] shrink-0 lg:w-[min(38vw,440px)]"
          >
            <div
              ref={diskRef}
              onClick={stop}
              className="absolute inset-0 rounded-full"
            >
              <span
                ref={glowRef}
                aria-hidden
                className="pointer-events-none absolute -inset-[18%] rounded-full opacity-0"
                style={{
                  background:
                    "radial-gradient(circle, rgb(var(--color-domain) / 0.4) 0%, transparent 65%)",
                }}
              />
              <Link
                href={`/${universe.slug}`}
                aria-label={`Entrer dans ${universe.name}`}
                className="relative block h-full w-full rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-domain-light"
              >
                <UniverseDisk universe={universe} />
              </Link>
            </div>
          </div>

          {/* Détail de l'univers. */}
          <motion.div
            onClick={stop}
            variants={panel}
            initial="hidden"
            animate="show"
            exit="exit"
            className="w-full max-w-xl"
          >
            <motion.p
              variants={item}
              className="text-xs font-bold uppercase tracking-[0.25em] text-domain-light"
            >
              {universe.sourceWork}
            </motion.p>
            <motion.h2
              id={titleId}
              variants={item}
              className="mt-2 font-display text-4xl font-black tracking-tight text-white sm:text-5xl"
            >
              {universe.name}
            </motion.h2>
            <motion.p
              variants={item}
              className="mt-4 max-w-lg text-base leading-relaxed text-white/60"
            >
              {universe.tagline}
            </motion.p>

            <motion.div variants={item} className="mt-6 flex flex-wrap gap-2.5">
              <Stat
                value={universe.gameCount}
                label={universe.gameCount > 1 ? "jeux" : "jeu"}
              />
              <Stat
                value={universe.rosterCount}
                label={universe.rosterCount > 1 ? "personnages" : "personnage"}
              />
              {universe.maintenance && (
                <span className="inline-flex items-center rounded-xl border border-amber-400/40 bg-amber-400/15 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-amber-200">
                  Maintenance
                </span>
              )}
            </motion.div>

            {universe.games.length > 0 && (
              <motion.ul
                variants={item}
                className="mt-7 grid gap-2 sm:grid-cols-2"
              >
                {universe.games.map((game) => (
                  <li
                    key={game.id}
                    className="rounded-xl border border-white/[0.07] bg-white/[0.03] px-3.5 py-2.5 transition-colors hover:border-domain/40 hover:bg-domain/[0.08]"
                  >
                    <p className="text-sm font-bold text-white/90">
                      {game.title}
                    </p>
                    <p className="mt-0.5 line-clamp-1 text-xs text-white/40">
                      {game.description}
                    </p>
                  </li>
                ))}
              </motion.ul>
            )}

            <motion.div variants={item} className="mt-8">
              <Link
                href={`/${universe.slug}`}
                className="group relative inline-flex items-center gap-3 overflow-hidden rounded-full bg-domain px-7 py-3.5 font-display text-sm font-black uppercase tracking-wider text-white shadow-[0_18px_50px_-15px_rgb(var(--color-domain))] transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-void-900"
              >
                <span
                  aria-hidden
                  className="absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-[420%]"
                />
                Entrer dans l&apos;univers
                <span
                  aria-hidden
                  className="transition-transform duration-300 group-hover:translate-x-1.5"
                >
                  →
                </span>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

/** Chiffre-clé d'un univers (jeux, roster). */
function Stat({ value, label }: { value: number; label: string }) {
  return (
    <span className="inline-flex items-baseline gap-1.5 rounded-xl border border-domain/30 bg-domain/10 px-3.5 py-2">
      <span className="font-display text-xl font-black leading-none text-white">
        {value}
      </span>
      <span className="text-[11px] font-medium uppercase tracking-wider text-white/55">
        {label}
      </span>
    </span>
  );
}

/** Flèche diagonale de la pastille d'aperçu. */
function ArrowIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M7 17L17 7M9 7h8v8" />
    </svg>
  );
}

/** Trajectoire d'orbite (décor) : ellipse pointillée qui tourne lentement. */
function OrbitRing() {
  return (
    <motion.svg
      aria-hidden
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 hidden h-full w-full lg:block"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.2, delay: 0.2 }}
    >
      <ellipse
        cx="50"
        cy="50"
        rx={ORBIT_RX}
        ry={ORBIT_RY}
        fill="none"
        stroke="rgb(255 255 255 / 0.08)"
        strokeWidth="1"
        strokeDasharray="2 6"
        vectorEffect="non-scaling-stroke"
      >
        <animate
          attributeName="stroke-dashoffset"
          from="0"
          to="-80"
          dur="20s"
          repeatCount="indefinite"
        />
      </ellipse>
      <ellipse
        cx="50"
        cy="50"
        rx={ORBIT_RX * 0.55}
        ry={ORBIT_RY * 0.62}
        fill="none"
        stroke="rgb(255 255 255 / 0.04)"
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
      />
    </motion.svg>
  );
}

/**
 * Décor de fond du hub : halo central + trame quadrillée estompée. En `fixed` et
 * en `-z-10` pour rester derrière le contenu sans intercepter les clics.
 */
function HubBackdrop() {
  const fade =
    "radial-gradient(ellipse 70% 60% at 50% 50%, black 10%, transparent 75%)";
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
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(40% 45% at 50% 50%, rgb(148 163 184 / 0.14) 0%, transparent 70%)",
        }}
      />
    </div>
  );
}
