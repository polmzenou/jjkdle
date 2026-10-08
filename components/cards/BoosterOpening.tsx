"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { CardArt, RAINBOW_GRADIENT } from "@/components/cards/CardArt";
import { CloseIcon } from "@/components/cards/CardIcons";
import { getBooster } from "@/lib/cards/boosters";
import { cardRarityStyle } from "@/lib/cards/rarity";
import type { OpenedBooster } from "@/lib/cards/types";

/**
 * Overlay d'OUVERTURE d'un booster : défilement des cartes une par une, puis
 * récapitulatif.
 *
 * Réutilisé à l'identique par l'écran de fin de partie, l'onglet Deck, la
 * boutique et l'admin (y compris pour l'octroi d'une carte unique) — c'est ce
 * qui fait que l'animation vérifiée dans l'admin est bien celle que voient les
 * joueurs.
 *
 * Le composant est PUREMENT présentationnel : le parent lance la server action
 * et lui passe le résultat. Il ne sait rien de la base.
 *
 * Thème : le fond et l'aura mêlent la couleur de rareté (identique partout) à
 * `--color-domain` (celle de l'univers courant).
 */

interface BoosterOpeningProps {
  /** Résultat de l'ouverture. `null` tant que la server action n'a pas répondu. */
  result: OpenedBooster | null;
  loading?: boolean;
  error?: string | null;
  /** Démarrer directement sur le récap (bouton « passer l'animation »). */
  initialSkip?: boolean;
  /** Titre du récap à la place du nom du booster (ex. « Fusion »). */
  label?: string;
  onClose: () => void;
}

export function BoosterOpening({
  result,
  loading = false,
  error = null,
  initialSkip = false,
  label,
  onClose,
}: BoosterOpeningProps) {
  // `index` parcourt les cartes ; une fois égal à `cards.length`, on est au récap.
  const [index, setIndex] = useState(0);
  const [skipped, setSkipped] = useState(initialSkip);

  const cards = result?.cards ?? [];
  const atRecap = skipped || (result != null && index >= cards.length);
  const current = cards[index];

  // Fermeture au clavier (Échap). `onClose` est une flèche recréée à chaque
  // rendu du parent : on la lit via une ref pour ne pas réabonner l'écouteur.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Verrou du scroll de fond, posé UNE fois pour toute la vie de l'overlay et
  // restauré à sa valeur précédente : l'overlay peut s'ouvrir par-dessus une
  // modale qui verrouille déjà (écran de victoire).
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  // Précharge TOUTES les images dès le résultat connu : sans ça, chaque carte
  // retournée apparaît sur un fond vide puis l'image « pope » une fraction de
  // seconde plus tard.
  useEffect(() => {
    for (const card of result?.cards ?? []) {
      if (!card.image) continue;
      const img = new Image();
      img.decoding = "async";
      img.src = card.image;
    }
  }, [result]);


  const advance = () => {
    if (atRecap || !result) return;
    setIndex((i) => i + 1);
  };

  const revealing = result != null && !atRecap && !error && cards.length > 0;

  // Rendu dans <body> : monté dans l'écran de victoire (lui-même animé en
  // `transform`), un `position: fixed` se calait sur cet ancêtre et non sur
  // l'écran — l'overlay sautait de place à la fin de l'animation du parent.
  // Toujours monté APRÈS un clic, jamais au rendu serveur : `document` existe.
  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-[110] flex items-center justify-center overflow-y-auto bg-void-900 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Ouverture d'un booster"
    >
      {/* Halo d'ambiance aux couleurs de l'univers */}
      <span
        aria-hidden
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 45%, rgb(var(--color-domain) / 0.16), transparent 70%)",
        }}
      />

      {/* Repère de progression : une pastille par carte, la courante étirée. */}
      {revealing && (
        <div
          className="fixed left-1/2 top-5 z-10 flex -translate-x-1/2 items-center gap-1.5"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={cards.length}
          aria-valuenow={index + 1}
          aria-label={`Carte ${index + 1} sur ${cards.length}`}
        >
          {cards.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === index
                  ? "w-7 bg-white"
                  : i < index
                    ? "w-1.5 bg-white/50"
                    : "w-1.5 bg-white/20"
              }`}
            />
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={onClose}
        aria-label="Fermer"
        className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-void-800/80 text-white/60 transition-colors hover:border-white/30 hover:text-white"
      >
        <CloseIcon />
      </button>

      <div className="relative my-auto w-full max-w-3xl text-center">
        {error ? (
          <div className="rounded-3xl border border-cursed/40 bg-void-800/90 p-8">
            <p className="font-display text-lg font-bold text-cursed-light">
              {error}
            </p>
            <CloseButton onClose={onClose} label="Fermer" />
          </div>
        ) : loading || !result ? (
          <p className="animate-glow-pulse font-display text-lg font-bold uppercase tracking-[0.3em] text-domain-light">
            Ouverture…
          </p>
        ) : atRecap ? (
          <Recap result={result} label={label} onClose={onClose} />
        ) : (
          <Reveal
            card={current!}
            kind={result.kind}
            index={index}
            total={cards.length}
            onAdvance={advance}
            onSkip={() => setSkipped(true)}
          />
        )}
      </div>
    </motion.div>,
    document.body,
  );
}

// ──────────────────────────────────────────────────────────────────────────

/**
 * Positions des particules autour de la carte (en % de la scène) et leur délai.
 * Figées plutôt qu'aléatoires : rendu équilibré et aucun écart d'hydratation.
 */
const SPARKS = [
  { x: 6, y: 18, d: 0 },
  { x: 92, y: 12, d: 0.6 },
  { x: 2, y: 62, d: 1.2 },
  { x: 97, y: 55, d: 0.3 },
  { x: 14, y: 92, d: 1.8 },
  { x: 86, y: 90, d: 0.9 },
  { x: 50, y: 2, d: 1.5 },
  { x: 24, y: 6, d: 2.1 },
  { x: 76, y: 97, d: 0.4 },
  { x: 99, y: 32, d: 2.4 },
  { x: 0, y: 40, d: 1.1 },
  { x: 60, y: 99, d: 2.0 },
];

function Reveal({
  card,
  kind,
  index,
  total,
  onAdvance,
  onSkip,
}: {
  card: OpenedBooster["cards"][number];
  kind: OpenedBooster["kind"];
  index: number;
  total: number;
  onAdvance: () => void;
  onSkip: () => void;
}) {
  const style = cardRarityStyle(card.rarity);
  const def = getBooster(kind);
  // Les hautes raretés méritent un flash plus long et plus large.
  const isHigh = card.rarity === "legendary" || card.rarity === "exotic";
  const remaining = total - index - 1;
  // Aura conique : arc-en-ciel pour l'EXOTIC, sinon la teinte de rareté qui
  // alterne avec la couleur de l'univers — le halo reste « chez soi ».
  const aura = style.rainbow
    ? "conic-gradient(from 0deg, #f87171, #fbbf24, #4ade80, #38bdf8, #a78bfa, #f472b6, #f87171)"
    : `conic-gradient(from 0deg, ${style.color}, rgb(var(--color-domain)), ${style.color}, transparent, ${style.color})`;
  const cta = style.rainbow
    ? RAINBOW_GRADIENT
    : `linear-gradient(90deg, ${style.color}, ${style.color}cc)`;

  return (
    <div className="flex flex-col items-center gap-7">
      <div>
        <p
          className="text-[11px] font-black uppercase tracking-[0.35em]"
          style={{ color: def.accent }}
        >
          {def.label}
        </p>
        <p className="mt-1 text-sm font-semibold text-white/60">
          Carte {index + 1} sur {total}
        </p>
      </div>

      {/* Scène : aura + particules + carte flottante */}
      <div className="relative w-52 sm:w-64">
        <span
          aria-hidden
          className="pointer-events-none absolute -inset-12 rounded-full opacity-55 blur-3xl animate-aura-spin motion-reduce:animate-none sm:-inset-20"
          style={{ background: aura }}
        />
        <span
          aria-hidden
          className="pointer-events-none absolute -inset-6 rounded-[2.5rem] blur-2xl"
          style={{
            background: `radial-gradient(circle, ${style.color}45, transparent 70%)`,
          }}
        />
        {SPARKS.map((p, i) => (
          <span
            key={i}
            aria-hidden
            className="pointer-events-none absolute h-1.5 w-1.5 rounded-full opacity-0 animate-twinkle motion-reduce:hidden"
            style={{
              left: `calc(${p.x}% - 3px)`,
              top: `calc(${p.y}% - 3px)`,
              background: style.rainbow ? "#fff" : style.color,
              boxShadow: `0 0 8px 2px ${style.rainbow ? "#f472b6" : style.color}`,
              animationDelay: `${p.d}s`,
            }}
          />
        ))}

        <div className="animate-float-slow motion-reduce:animate-none">
          {/* `key` sur l'index : remonte le composant à chaque carte, ce qui
              rejoue le flip et le flash sans piloter l'animation à la main.
              Pas d'AnimatePresence : l'animation de sortie laissait la carte
              précédente réapparaître un instant avant la suivante. L'opacité
              est en tween pour ne pas rebondir avec le ressort. */}
            <motion.button
              key={index}
              type="button"
              onClick={onAdvance}
              aria-label="Carte suivante"
              initial={{ rotateY: 90, scale: 0.8, opacity: 0 }}
              animate={{ rotateY: 0, scale: 1, opacity: 1 }}
              transition={{
                type: "spring",
                stiffness: 200,
                damping: 18,
                opacity: { duration: 0.2, ease: "easeOut" },
              }}
              className="relative block w-full focus:outline-none"
            >
              {/* Flash coloré à la rareté */}
              <motion.span
                aria-hidden
                className="pointer-events-none absolute -inset-6 rounded-[2.5rem]"
                style={{ background: `${style.color}55` }}
                initial={{ opacity: 0.9, scale: 0.6 }}
                animate={{ opacity: 0, scale: isHigh ? 2 : 1.5 }}
                transition={{ duration: isHigh ? 1.1 : 0.7, ease: "easeOut" }}
              />
              <CardArt card={card} glow />

              {/* Reflet qui balaie la carte en boucle */}
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 z-30 overflow-hidden rounded-2xl"
              >
                <span className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/35 to-transparent animate-shine motion-reduce:hidden" />
              </span>

              {card.duplicate ? (
                <span className="absolute -right-2 -top-2 z-40 rounded-full border border-amber-300/50 bg-void-900/95 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-amber-300">
                  Doublon ×{card.copies}
                </span>
              ) : (
                <span className="absolute left-2.5 top-2.5 z-40 rounded-full bg-domain px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white shadow-glow">
                  Nouveau
                </span>
              )}
            </motion.button>
        </div>
      </div>

      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={onAdvance}
          className="min-w-[12rem] rounded-xl px-7 py-3 font-display text-sm font-black text-void-900 transition-transform hover:scale-105"
          style={{
            background: cta,
            boxShadow: `0 10px 30px -10px ${style.color}`,
          }}
        >
          {remaining > 0
            ? `Suivante · ${remaining} restante${remaining > 1 ? "s" : ""}`
            : "Voir le récap"}
        </button>
        <button
          type="button"
          onClick={onSkip}
          className="text-xs font-medium uppercase tracking-wider text-white/40 underline-offset-4 transition-colors hover:text-white/70 hover:underline"
        >
          Passer l&apos;animation
        </button>
      </div>
    </div>
  );
}

function Recap({
  result,
  label,
  onClose,
}: {
  result: OpenedBooster;
  label?: string | undefined;
  onClose: () => void;
}) {
  const def = getBooster(result.kind);
  const newCards = result.cards.filter((c) => !c.duplicate).length;

  return (
    // Pas de fondu depuis 0 : la dernière carte disparaissait et laissait un
    // écran vide le temps que le récap remonte. Il glisse en place, déjà visible.
    <motion.div
      initial={{ y: 16, scale: 0.98 }}
      animate={{ y: 0, scale: 1 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="rounded-3xl border border-white/10 bg-void-800/95 p-6 sm:p-8"
    >
      <p
        className="text-xs font-black uppercase tracking-[0.3em]"
        style={{ color: def.accent }}
      >
        {label ?? def.label}
      </p>
      <h2 className="mt-2 font-display text-2xl font-black text-white sm:text-3xl">
        {newCards > 0
          ? `${newCards} nouvelle${newCards > 1 ? "s" : ""} carte${newCards > 1 ? "s" : ""} !`
          : "Que des doublons…"}
      </h2>

      <div className="mx-auto mt-6 grid max-w-md grid-cols-2 gap-3 sm:max-w-none sm:grid-cols-4">
        {result.cards.map((card, i) => (
          <div key={`${card.characterId}-${i}`} className="relative">
            <CardArt card={card} />
            {card.duplicate ? (
              <span className="absolute -right-1.5 -top-1.5 z-30 rounded-full border border-amber-300/50 bg-void-900/95 px-2 py-0.5 text-[10px] font-black text-amber-300">
                ×{card.copies}
              </span>
            ) : (
              <span className="absolute -right-1.5 -top-1.5 z-30 rounded-full bg-domain px-2 py-0.5 text-[10px] font-black uppercase text-white">
                Nouveau
              </span>
            )}
          </div>
        ))}
      </div>

      {result.cards.length > newCards && (
        <p className="mt-6 text-center text-sm text-white/45">
          Les doublons sont rangés dans l&apos;onglet Doublons : fusionne-les,
          échange-les ou revends-les.
        </p>
      )}

      <CloseButton onClose={onClose} label="Terminer" />
    </motion.div>
  );
}

function CloseButton({ onClose, label }: { onClose: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClose}
      className="mt-6 rounded-full bg-domain px-8 py-2.5 font-display text-sm font-bold uppercase tracking-wider text-white shadow-glow transition-transform hover:scale-105"
    >
      {label}
    </button>
  );
}
