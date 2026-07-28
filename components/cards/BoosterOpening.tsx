"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CardArt } from "@/components/cards/CardArt";
import { CoinIcon } from "@/components/progress/CoinWallet";
import { getBooster } from "@/lib/cards/boosters";
import { cardRarityStyle } from "@/lib/cards/rarity";
import type { OpenedBooster } from "@/lib/cards/types";

/**
 * Overlay d'OUVERTURE d'un booster : défilement des cartes une par une, puis
 * récapitulatif.
 *
 * Réutilisé à l'identique par l'écran de fin de partie, l'onglet Deck et
 * l'admin (y compris pour l'octroi d'une carte unique) — c'est ce qui fait que
 * l'animation vérifiée dans l'admin est bien celle que voient les joueurs.
 *
 * Le composant est PUREMENT présentationnel : le parent lance la server action
 * et lui passe le résultat. Il ne sait rien de la base.
 */

interface BoosterOpeningProps {
  /** Résultat de l'ouverture. `null` tant que la server action n'a pas répondu. */
  result: OpenedBooster | null;
  loading?: boolean;
  error?: string | null;
  /** Démarrer directement sur le récap (bouton « passer l'animation »). */
  initialSkip?: boolean;
  onClose: () => void;
}

export function BoosterOpening({
  result,
  loading = false,
  error = null,
  initialSkip = false,
  onClose,
}: BoosterOpeningProps) {
  // `index` parcourt les cartes ; une fois égal à `cards.length`, on est au récap.
  const [index, setIndex] = useState(0);
  const [skipped, setSkipped] = useState(initialSkip);

  const cards = result?.cards ?? [];
  const atRecap = skipped || (result != null && index >= cards.length);
  const current = cards[index];

  // Fermeture au clavier (Échap) + verrou du scroll de fond, comme les autres
  // modales du site (cf. MultiplayerPicker).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const advance = () => {
    if (atRecap || !result) return;
    setIndex((i) => i + 1);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-[110] flex items-center justify-center overflow-y-auto bg-void-900/92 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Ouverture d'un booster"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Fermer"
        className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-void-800/80 text-white/60 transition-colors hover:border-white/25 hover:text-white"
      >
        ✕
      </button>

      <div className="my-auto w-full max-w-3xl text-center">
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
          <Recap result={result} onClose={onClose} />
        ) : (
          <Reveal
            card={current!}
            index={index}
            total={cards.length}
            onAdvance={advance}
            onSkip={() => setSkipped(true)}
          />
        )}
      </div>
    </motion.div>
  );
}

// ──────────────────────────────────────────────────────────────────────────

function Reveal({
  card,
  index,
  total,
  onAdvance,
  onSkip,
}: {
  card: OpenedBooster["cards"][number];
  index: number;
  total: number;
  onAdvance: () => void;
  onSkip: () => void;
}) {
  const style = cardRarityStyle(card.rarity);
  // Les hautes raretés méritent un flash plus long et plus large.
  const isHigh = card.rarity === "legendary" || card.rarity === "exotic";

  return (
    <div className="flex flex-col items-center gap-6">
      <p className="text-xs font-bold uppercase tracking-[0.3em] text-white/40">
        Carte {index + 1} / {total}
      </p>

      {/* `key` sur l'index : remonte le composant à chaque carte, ce qui rejoue
          le flip et le flash sans avoir à piloter l'animation à la main. */}
      <AnimatePresence mode="wait">
        <motion.button
          key={index}
          type="button"
          onClick={onAdvance}
          aria-label="Carte suivante"
          initial={{ rotateY: 90, scale: 0.8, opacity: 0 }}
          animate={{ rotateY: 0, scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 18 }}
          className="relative w-48 focus:outline-none sm:w-56"
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

          {card.duplicate && (
            <span className="absolute -right-2 -top-2 z-30 rounded-full border border-amber-300/50 bg-void-900/95 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-amber-300">
              Doublon +{card.coins} 🪙
            </span>
          )}
        </motion.button>
      </AnimatePresence>

      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={onAdvance}
          className="rounded-full bg-domain px-7 py-2.5 font-display text-sm font-bold uppercase tracking-wider text-white shadow-glow transition-transform hover:scale-105"
        >
          {index + 1 < total ? "Suivante →" : "Voir le récap →"}
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
  onClose,
}: {
  result: OpenedBooster;
  onClose: () => void;
}) {
  const def = getBooster(result.kind);
  const newCards = result.cards.filter((c) => !c.duplicate).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="rounded-3xl border border-white/10 bg-void-800/90 p-6 backdrop-blur sm:p-8"
    >
      <p
        className="text-xs font-black uppercase tracking-[0.3em]"
        style={{ color: def.accent }}
      >
        {def.label}
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
              <span className="absolute -right-1.5 -top-1.5 z-30 flex items-center gap-1 rounded-full border border-amber-300/50 bg-void-900/95 px-2 py-0.5 text-[10px] font-black text-amber-300">
                +{card.coins}
                <CoinIcon className="h-3 w-3" />
              </span>
            ) : (
              <span className="absolute -right-1.5 -top-1.5 z-30 rounded-full border border-emerald-400/50 bg-void-900/95 px-2 py-0.5 text-[10px] font-black uppercase text-emerald-300">
                New
              </span>
            )}
          </div>
        ))}
      </div>

      {result.coinsEarned > 0 && (
        <p className="mt-6 flex items-center justify-center gap-2 font-display text-xl font-black text-amber-300">
          +{result.coinsEarned}
          <CoinIcon className="h-5 w-5" />
          <span className="text-sm font-medium normal-case text-white/45">
            convertis depuis les doublons
          </span>
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
