"use client";

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
import { CasinoGameIcon, type CasinoIconId } from "./CasinoGameIcon";

/**
 * Accueil du casino : le choix du jeu.
 *
 * Même mise en scène « orbite » que le hub d'univers (app/universes/UniverseHub.tsx) :
 * le titre occupe le centre et chaque jeu flotte autour, sur une ellipse, sous
 * forme de JETON de casino. Deux entrées par jeu :
 * - le jeton est un lien direct vers la table ;
 * - la petite FLÈCHE ouvre la vue « zoom » : la scène plonge vers le jeton
 *   pendant que celui-ci quitte son emplacement pour grandir au milieu de
 *   l'écran, le détail à côté. On en sort par la croix, Échap, ou un clic hors
 *   du jeton et du texte.
 *
 * Mêmes règles de performance que le hub : tout ce qui bouge pendant le zoom
 * est en `transform` / `opacity` (compositeur), le trajet du jeton est un FLIP
 * piloté à la main, et le flottement réutilise `.hub-float` (app/globals.css).
 *
 * Les tuiles « bientôt » gardent leur place dans l'orbite (l'ellipse reste
 * équilibrée) mais n'ont ni lien ni aperçu.
 *
 * Composant client uniquement pour les animations — toutes les données sont
 * résolues côté serveur par app/casino/page.tsx.
 */

export interface CasinoGameTile {
  id: string;
  title: string;
  description: string;
  /** Icône SVG affichée au centre du jeton (cf. CasinoGameIcon). */
  icon: CasinoIconId;
  href: string | null;
  status: "live" | "coming-soon";
  /** Ligne de teasing affichée sous le titre (mise minimale, nb de joueurs…). */
  hint?: string;
}

/**
 * Couleur du liseré de chaque jeton (triplets RGB), comme les valeurs d'un jeu
 * de jetons : chaque table a la sienne, l'or du thème reste l'accent commun.
 */
const CHIP_COLORS = ["220 38 38", "37 99 235", "124 58 237", "16 185 129"];

/** Aller : léger dépassement en fin de course — le jeton « jaillit ». */
const ZOOM_IN = {
  duration: 720,
  easing: "cubic-bezier(0.3, 1.25, 0.5, 1)",
} as const;
/** Retour : courbe sans rebond, pour que le jeton se pose pile à sa place. */
const ZOOM_OUT = {
  duration: 520,
  easing: "cubic-bezier(0.65, 0, 0.35, 1)",
} as const;
/** Plongée de la scène (plus longue que le jeton : la caméra « suit »). */
const STAGE_IN = "860ms cubic-bezier(0.22, 1, 0.36, 1)";
/** Grossissement de la scène pendant le zoom. */
const STAGE_ZOOM = 1.35;

/** Rayons de l'orbite, en % de la scène (ellipse plus large que haute). */
const ORBIT_RX = 38;
const ORBIT_RY = 34;

/** Jeu zoomé + rectangle de son jeton au moment du clic (point de départ). */
interface ZoomState {
  id: string;
  origin: DOMRect;
}

export function CasinoHome({
  games,
  coins,
  isLoggedIn,
}: {
  games: CasinoGameTile[];
  coins: number;
  isLoggedIn: boolean;
}) {
  const [zoom, setZoom] = useState<ZoomState | null>(null);
  // Le jeton reste masqué jusqu'à la FIN du retour (cf. UniverseHub).
  const [hiddenId, setHiddenId] = useState<string | null>(null);
  const [stageOrigin, setStageOrigin] = useState("50% 50%");
  const stageRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef<ZoomState | null>(null);
  zoomRef.current = zoom;

  const selectedIndex = zoom ? games.findIndex((g) => g.id === zoom.id) : -1;
  const selected = selectedIndex >= 0 ? games[selectedIndex] : null;
  const close = useCallback(() => setZoom(null), []);

  const open = useCallback((id: string, origin: DOMRect) => {
    const stage = stageRef.current?.getBoundingClientRect();
    if (stage) {
      setStageOrigin(
        `${origin.left + origin.width / 2 - stage.left}px ${origin.top + origin.height / 2 - stage.top}px`,
      );
    }
    setHiddenId(id);
    setZoom({ id, origin });
  }, []);

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
    if (e.pointerType !== "mouse" || zoomRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    pointerX.set(((e.clientX - rect.left) / rect.width) * 2 - 1);
    pointerY.set(((e.clientY - rect.top) / rect.height) * 2 - 1);
  };

  return (
    <>
      <main onPointerMove={onPointerMove} className="relative w-full overflow-hidden">
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
          {/* UNE seule liste pour toutes les tailles : grille sur mobile, orbite
              à partir de `lg` (même contrainte de mesure que le hub). La hauteur
              retire la barre du casino (57px) pour que l'orbite tienne à l'écran. */}
          <section className="relative mx-auto w-full max-w-7xl px-4 pb-20 pt-14 lg:h-[max(calc(100svh-57px),800px)] lg:p-0">
            <OrbitRing />
            <div className="lg:absolute lg:left-1/2 lg:top-1/2 lg:w-full lg:max-w-md lg:-translate-x-1/2 lg:-translate-y-1/2">
              <CasinoHeader coins={coins} isLoggedIn={isLoggedIn} />
            </div>

            <ul className="mx-auto mt-12 grid max-w-2xl grid-cols-2 gap-x-3 gap-y-10 sm:grid-cols-3 lg:pointer-events-none lg:absolute lg:inset-0 lg:mt-0 lg:block lg:max-w-none">
              {games.map((game, i) => {
                // Premier jeu en haut, puis sens horaire.
                const angle = (-90 + (i * 360) / games.length) * (Math.PI / 180);
                return (
                  <li
                    key={game.id}
                    className="flex justify-center lg:pointer-events-auto lg:absolute lg:left-[var(--orbit-x)] lg:top-[var(--orbit-y)] lg:-translate-x-1/2 lg:-translate-y-1/2"
                    style={
                      {
                        "--orbit-x": `${50 + Math.cos(angle) * ORBIT_RX}%`,
                        "--orbit-y": `${50 + Math.sin(angle) * ORBIT_RY}%`,
                      } as CSSProperties
                    }
                  >
                    <OrbitGame
                      game={game}
                      index={i}
                      hidden={hiddenId === game.id}
                      onOpen={open}
                      parallaxX={smoothX}
                      parallaxY={smoothY}
                    />
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      </main>

      <AnimatePresence onExitComplete={() => setHiddenId(zoomRef.current?.id ?? null)}>
        {selected && zoom && (
          <GameZoom
            key={selected.id}
            game={selected}
            index={selectedIndex}
            origin={zoom.origin}
            onClose={close}
          />
        )}
      </AnimatePresence>
    </>
  );
}

/** Bloc central : badge « table ouverte », titre, accroche, solde. */
function CasinoHeader({ coins, isLoggedIn }: { coins: number; isLoggedIn: boolean }) {
  return (
    <header className="text-center">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        <span className="inline-flex items-center gap-2 rounded-full border border-cursed/30 bg-cursed/10 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-cursed-light">
          <span
            aria-hidden
            className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_10px_rgb(52_211_153)]"
          />
          Table ouverte
        </span>

        <h1 className="mt-5 font-display text-4xl font-black uppercase leading-[1.02] tracking-tight text-white sm:text-[3.4rem]">
          Le
          <span className="block bg-gradient-to-b from-cursed-light to-cursed/50 bg-clip-text text-transparent">
            casino
          </span>
        </h1>

        <p className="mx-auto mt-4 max-w-sm text-balance text-sm leading-relaxed text-white/55">
          Tes coins, gagnés dans tous les univers, se misent ici. Le même
          portefeuille partout.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="mt-5"
      >
        {isLoggedIn ? (
          <span className="inline-flex items-baseline gap-2 rounded-full border border-white/[0.07] bg-white/[0.03] px-4 py-2 text-xs font-medium uppercase tracking-wider text-white/50">
            En poche
            <span className="font-display text-base font-black tabular-nums tracking-normal text-cursed-light">
              {coins.toLocaleString("fr-FR")}
            </span>
            coins
          </span>
        ) : (
          <Link
            href="/login"
            className="group inline-flex items-center gap-2.5 rounded-full border border-cursed/30 bg-cursed/10 px-4 py-2 text-xs font-bold uppercase tracking-wider text-cursed-light transition hover:border-cursed/70 hover:bg-cursed/20 hover:shadow-[0_0_30px_-8px_rgb(var(--color-cursed))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cursed-light"
          >
            Se connecter pour jouer
            <span
              aria-hidden
              className="transition-transform duration-300 group-hover:translate-x-1"
            >
              →
            </span>
          </Link>
        )}
      </motion.div>
    </header>
  );
}

/**
 * Un jeu en orbite : jeton (lien direct) + nom + flèche d'aperçu.
 * Flotte en continu et suit légèrement le pointeur (parallaxe).
 */
function OrbitGame({
  game,
  index,
  hidden,
  onOpen,
  parallaxX,
  parallaxY,
}: {
  game: CasinoGameTile;
  index: number;
  hidden: boolean;
  onOpen: (id: string, origin: DOMRect) => void;
  parallaxX: MotionValue<number>;
  parallaxY: MotionValue<number>;
}) {
  const diskRef = useRef<HTMLDivElement>(null);
  const soon = game.status === "coming-soon" || !game.href;
  const depth = 10 + ((index * 7) % 4) * 6;
  const x = useTransform(parallaxX, (v) => v * -depth);
  const y = useTransform(parallaxY, (v) => v * -depth);
  const bobDuration = 5 + ((index * 3) % 5) * 0.6;

  return (
    <motion.div
      style={{ x, y }}
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.9, delay: 0.25 + index * 0.09, ease: [0.22, 1, 0.36, 1] }}
    >
      <div
        className="hub-float group flex flex-col items-center"
        style={{
          animationDuration: `${bobDuration}s`,
          animationDelay: `${index * 0.4}s`,
          animationPlayState: hidden ? "paused" : "running",
        }}
      >
        <div ref={diskRef} className="relative aspect-square w-32 sm:w-36 lg:w-44">
          <div className={hidden ? "invisible" : undefined}>
            {soon ? (
              <div className="absolute inset-0 opacity-40 grayscale">
                <GameChip game={game} index={index} />
              </div>
            ) : (
              <>
                <Link
                  href={game.href!}
                  aria-label={`Jouer à ${game.title}`}
                  className="absolute inset-0 block rounded-full transition-transform duration-500 ease-out hover:scale-[1.06] hover:rotate-[8deg] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cursed-light focus-visible:ring-offset-4 focus-visible:ring-offset-void-900"
                >
                  <GameChip game={game} index={index} />
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    const rect = diskRef.current?.getBoundingClientRect();
                    if (rect) onOpen(game.id, rect);
                  }}
                  aria-label={`Découvrir ${game.title}`}
                  title="Découvrir le jeu"
                  className="absolute -bottom-1 -right-1 z-10 grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-void-900 text-white/80 shadow-[0_8px_24px_-6px_rgb(0_0_0/0.8)] transition duration-300 hover:scale-110 hover:border-cursed/70 hover:bg-cursed hover:text-void-900 hover:shadow-[0_0_28px_-4px_rgb(var(--color-cursed))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cursed-light"
                >
                  <ArrowIcon className="h-4 w-4 transition-transform duration-300 group-hover:rotate-45" />
                </button>
              </>
            )}
          </div>
        </div>

        <div className="mt-4 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-cursed-light">
            {soon ? "Bientôt" : "Table"}
          </p>
          <p
            className={`mt-1 font-display text-base font-black tracking-tight lg:text-lg ${
              soon ? "text-white/40" : "text-white"
            }`}
          >
            {game.title}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Jeton de casino d'un jeu. Rendu à l'identique en orbite et en vue zoom, tout
 * en % : le passage de l'un à l'autre est une pure mise à l'échelle. 100 % CSS,
 * comme le décor (cf. CasinoBackdrop).
 */
function GameChip({ game, index }: { game: CasinoGameTile; index: number }) {
  const chip = CHIP_COLORS[index % CHIP_COLORS.length];
  return (
    <div
      className="relative h-full w-full overflow-hidden rounded-full border border-white/15 shadow-[0_30px_80px_-30px_rgb(var(--color-cursed)/0.7)]"
      style={{
        // Les « inserts » du bord : bandes blanches régulières sur la couleur
        // du jeton, comme sur un vrai jeton de casino.
        background: `repeating-conic-gradient(from 0deg, rgb(${chip}) 0deg 22.5deg, rgb(245 245 245 / 0.92) 22.5deg 30deg, rgb(${chip}) 30deg 45deg)`,
      }}
    >
      {/* Centre du jeton : le feutre de la table. */}
      <span
        aria-hidden
        className="absolute inset-[14%] rounded-full border-2 border-dashed border-cursed/50 bg-void-800"
        style={{
          backgroundImage:
            "radial-gradient(85% 85% at 50% 20%, rgb(var(--color-domain) / 0.75) 0%, rgb(var(--color-domain) / 0.2) 55%, transparent 80%)",
          boxShadow: "inset 0 4px 24px rgb(0 0 0 / 0.55)",
        }}
      />
      {/* Anneau d'or intérieur. */}
      <span
        aria-hidden
        className="absolute inset-[20%] rounded-full border border-cursed/40"
      />
      {/* Reflet. */}
      <span
        aria-hidden
        className="absolute inset-0 rounded-full"
        style={{
          background:
            "linear-gradient(140deg, rgb(255 255 255 / 0.22) 0%, transparent 38%, transparent 70%, rgb(0 0 0 / 0.3) 100%)",
        }}
      />
      {/* En % : l'icône suit la taille du jeton, en orbite comme en vue zoom. */}
      <CasinoGameIcon
        icon={game.icon}
        className="absolute inset-0 m-auto h-[50%] w-[50%] drop-shadow-[0_8px_20px_rgb(0_0_0_/_0.6)]"
      />
    </div>
  );
}

/** Vue zoom d'un jeu : jeton agrandi + détail + entrée. */
function GameZoom({
  game,
  index,
  origin,
  onClose,
}: {
  game: CasinoGameTile;
  index: number;
  origin: DOMRect;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const slotRef = useRef<HTMLDivElement>(null);
  const diskRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLSpanElement>(null);
  const flightRef = useRef<Animation | null>(null);
  const titleId = `zoom-title-${game.id}`;
  const [isPresent, safeToRemove] = usePresence();

  /** Transform (FLIP) qui pose le jeton EXACTEMENT sur celui de l'orbite. */
  const transformToOrigin = useCallback(() => {
    const slot = slotRef.current?.getBoundingClientRect();
    if (!slot || slot.width === 0) return null;
    const dx = origin.left + origin.width / 2 - (slot.left + slot.width / 2);
    const dy = origin.top + origin.height / 2 - (slot.top + slot.height / 2);
    return `translate3d(${dx}px, ${dy}px, 0) scale(${origin.width / slot.width})`;
  }, [origin]);

  // Aller : le jeton part de l'orbite et tourne d'un tour en grandissant.
  useLayoutEffect(() => {
    const disk = diskRef.current;
    const from = transformToOrigin();
    if (!disk || !from) return;
    flightRef.current = disk.animate(
      [{ transform: `${from} rotate(-180deg)` }, { transform: "none" }],
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

  // Retour : le jeton repart de là où il en est, rejoint l'orbite, PUIS la vue
  // se démonte.
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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    closeRef.current?.focus({ preventScroll: true });
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const stop = (e: React.MouseEvent) => e.stopPropagation();

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
      className="fixed inset-0 z-50"
      onClick={onClose}
    >
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
              "radial-gradient(60% 70% at 30% 50%, rgb(var(--color-domain) / 0.32) 0%, transparent 70%)",
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
        className="absolute right-4 top-4 z-10 grid h-11 w-11 place-items-center rounded-full border border-white/15 bg-void-800/90 text-white/80 transition-colors hover:border-white/40 hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cursed-light sm:right-6 sm:top-6"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden>
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </motion.button>

      <div className="relative h-full overflow-y-auto overscroll-contain">
        <div className="mx-auto flex min-h-full w-full max-w-6xl flex-col items-center justify-center gap-10 px-6 py-20 lg:flex-row lg:gap-16">
          <div
            ref={slotRef}
            className="relative aspect-square w-[min(68vw,300px)] shrink-0 lg:w-[min(38vw,440px)]"
          >
            <div ref={diskRef} onClick={stop} className="absolute inset-0 rounded-full">
              <span
                ref={glowRef}
                aria-hidden
                className="pointer-events-none absolute -inset-[18%] rounded-full opacity-0"
                style={{
                  background:
                    "radial-gradient(circle, rgb(var(--color-cursed) / 0.3) 0%, transparent 65%)",
                }}
              />
              <Link
                href={game.href!}
                aria-label={`Jouer à ${game.title}`}
                className="relative block h-full w-full rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cursed-light"
              >
                <GameChip game={game} index={index} />
              </Link>
            </div>
          </div>

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
              className="text-xs font-bold uppercase tracking-[0.25em] text-cursed-light"
            >
              Casino — tous univers
            </motion.p>
            <motion.h2
              id={titleId}
              variants={item}
              className="mt-2 font-display text-4xl font-black tracking-tight text-white sm:text-5xl"
            >
              {game.title}
            </motion.h2>
            <motion.p
              variants={item}
              className="mt-4 max-w-lg text-base leading-relaxed text-white/60"
            >
              {game.description}
            </motion.p>

            {game.hint && (
              <motion.ul variants={item} className="mt-6 flex flex-wrap gap-2.5">
                {game.hint.split(" · ").map((part) => (
                  <li
                    key={part}
                    className="inline-flex items-center rounded-xl border border-cursed/30 bg-cursed/10 px-3.5 py-2 text-[11px] font-semibold uppercase tracking-wider text-cursed-light"
                  >
                    {part}
                  </li>
                ))}
              </motion.ul>
            )}

            <motion.div variants={item} className="mt-8">
              <Link
                href={game.href!}
                className="group relative inline-flex items-center gap-3 overflow-hidden rounded-full bg-cursed px-7 py-3.5 font-display text-sm font-black uppercase tracking-wider text-void-900 shadow-[0_18px_50px_-15px_rgb(var(--color-cursed))] transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-void-900"
              >
                <span
                  aria-hidden
                  className="absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-[420%]"
                />
                À la table
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

/** Trajectoire d'orbite (décor) : ellipse pointillée dorée qui tourne lentement. */
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
        stroke="rgb(var(--color-cursed) / 0.18)"
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
        stroke="rgb(255 255 255 / 0.05)"
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
      />
    </motion.svg>
  );
}
