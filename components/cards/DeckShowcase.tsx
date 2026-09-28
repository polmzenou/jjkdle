"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { CardArt, RAINBOW_GRADIENT } from "@/components/cards/CardArt";
import {
  ArrowRightIcon,
  ChevronIcon,
  DeckIcon,
  PencilIcon,
} from "@/components/cards/CardIcons";
import { UniverseLink } from "@/components/universe/UniverseLink";
import { DECK_SIZE } from "@/lib/cards/deck";
import { cardRarityStyle } from "@/lib/cards/rarity";
import type { CardView, DeckShowcaseData } from "@/lib/cards/types";

/**
 * Boîte « DECK » : progression de collection, deck équipé en éventail, compteurs
 * par rareté, carrousel des meilleures cartes et bouton vers `/account/deck`.
 *
 * Montée sur la page compte ET sur le profil public. `isOwner` n'y change que
 * les actions (Modifier + bouton DECK) : un visiteur voit la même vitrine,
 * mais ne peut pas être envoyé vers SON propre deck depuis le profil d'autrui.
 *
 * Tout le chrome passe par `domain`/`cursed`/`void` : la boîte prend le thème de
 * l'univers courant ; seules les couleurs de rareté sont communes.
 */

const DECK_HREF = "/account/deck";

interface DeckShowcaseProps {
  data: DeckShowcaseData;
  isOwner: boolean;
}

export function DeckShowcase({ data, isOwner }: DeckShowcaseProps) {
  const { summary, deck, showcase, multipliers } = data;
  const pct = summary.total > 0 ? (summary.owned / summary.total) * 100 : 0;
  const rarities = summary.byRarity.filter((r) => r.total > 0);

  return (
    <div className="relative overflow-hidden rounded-3xl border border-domain/25 bg-gradient-to-b from-void-800/90 to-void-900/90 p-5 shadow-[0_24px_60px_-30px_rgb(var(--color-domain)/0.6)] backdrop-blur sm:p-6">
      {/* En-tête : titre + compteur d'uniques + barre de progression */}
      <div className="flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 font-display text-base font-black uppercase tracking-[0.15em] text-white">
          <DeckIcon className="h-5 w-5 text-domain-light" />
          Deck
        </h3>
        <span className="rounded-full border border-domain/40 bg-domain/10 px-3 py-1 text-[11px] font-black tabular-nums text-domain-light">
          {summary.owned}/{summary.total} uniques
        </span>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/5">
        <div
          className="h-full rounded-full bg-gradient-to-r from-domain to-cursed"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Vitrine : le deck équipé en éventail */}
      <div className="mt-5 flex items-center justify-between">
        <p className="text-[11px] font-black uppercase tracking-[0.25em] text-white/45">
          En vitrine
        </p>
        {isOwner && (
          <UniverseLink
            href={DECK_HREF}
            className="flex items-center gap-1.5 rounded-full border border-domain/40 bg-domain/10 px-3 py-1 text-[11px] font-bold text-domain-light transition-colors hover:bg-domain/20 hover:text-white"
          >
            <PencilIcon />
            Modifier
          </UniverseLink>
        )}
      </div>
      <FeaturedFan cards={deck} />
      {(multipliers.xpPct > 0 || multipliers.coinPct > 0) && (
        <p className="mt-1 text-center text-[11px] font-bold uppercase tracking-wider text-white/45">
          Bonus <span className="text-domain-light">+{multipliers.xpPct} % XP</span>
          {multipliers.coinPct > 0 && (
            <>
              {" · "}
              <span className="text-amber-300">+{multipliers.coinPct} % coins</span>
            </>
          )}
        </p>
      )}

      {/* Compteurs par rareté */}
      {rarities.length > 0 && (
        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {rarities.map((r) => {
            const style = cardRarityStyle(r.rarity);
            return (
              <div
                key={r.rarity}
                className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-void-900/60 px-3 py-2"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    aria-hidden
                    className="h-2.5 w-2.5 shrink-0 rounded-[3px]"
                    style={{
                      background: style.rainbow ? RAINBOW_GRADIENT : style.color,
                      boxShadow: `0 0 8px ${style.color}88`,
                    }}
                  />
                  <span className="truncate text-[10px] font-black uppercase tracking-wider text-white/60">
                    {style.label}
                  </span>
                </span>
                <span className="text-xs font-black tabular-nums text-white">
                  {r.owned}
                  <span className="font-bold text-white/30">/{r.total}</span>
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Carrousel des meilleures cartes */}
      {showcase.length > 0 && <CoverFlow cards={showcase} />}

      {isOwner && (
        <UniverseLink
          href={DECK_HREF}
          className="group mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-domain to-cursed px-5 py-3.5 font-display text-sm font-black uppercase tracking-[0.2em] text-white shadow-glow transition-[filter,transform] hover:brightness-110 active:scale-[0.99]"
        >
          Deck
          <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </UniverseLink>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────

/** Rotation / décalage vertical de chaque slot de l'éventail. */
const FAN = [
  { rotate: -9, y: 10 },
  { rotate: 0, y: 0 },
  { rotate: 9, y: 10 },
];

function FeaturedFan({ cards }: { cards: CardView[] }) {
  const slots = Array.from({ length: DECK_SIZE }, (_, i) => cards[i] ?? null);

  return (
    <div className="mt-3 flex items-start justify-center pb-3 pt-1">
      {slots.map((card, i) => {
        const fan = FAN[i] ?? FAN[1]!;
        return (
          <div
            key={card?.characterId ?? `empty-${i}`}
            className={`w-[30%] max-w-[8.5rem] ${
              i === 1 ? "z-10" : ""
            } ${i > 0 ? "-ml-4 sm:-ml-5" : ""}`}
            style={{ transform: `translateY(${fan.y}px) rotate(${fan.rotate}deg)` }}
          >
            {card ? (
              <CardArt card={card} glow />
            ) : (
              <div className="flex aspect-[3/4] items-center justify-center rounded-2xl border-2 border-dashed border-white/15 bg-void-900/60 text-white/25">
                <DeckIcon className="h-7 w-7" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Carrousel en « coverflow » : la carte centrale devant, les voisines plus
 * petites, inclinées et atténuées. Clic sur une voisine ou flèches pour tourner.
 */
function CoverFlow({ cards }: { cards: CardView[] }) {
  const [center, setCenter] = useState(Math.min(1, cards.length - 1));
  const go = (delta: number) =>
    setCenter((c) => Math.max(0, Math.min(cards.length - 1, c + delta)));

  return (
    <div className="relative mt-5 -mx-2">
      <div
        className="relative mx-auto h-52 overflow-hidden sm:h-60"
        style={{ perspective: 900 }}
      >
        {cards.map((card, i) => {
          const offset = i - center;
          const dist = Math.abs(offset);
          const hidden = dist > 3;
          return (
            <motion.button
              key={card.characterId}
              type="button"
              aria-label={card.name}
              tabIndex={offset === 0 ? -1 : 0}
              onClick={() => setCenter(i)}
              className="absolute left-[calc(50%-4rem)] top-1/2 w-32 focus:outline-none sm:left-[calc(50%-4.5rem)] sm:w-36"
              initial={false}
              animate={{
                x: offset * 92,
                y: "-50%",
                scale: 1 - dist * 0.14,
                rotateY: -offset * 22,
                opacity: hidden ? 0 : 1 - dist * 0.22,
              }}
              transition={{ type: "spring", stiffness: 260, damping: 28 }}
              style={{ zIndex: 10 - dist, pointerEvents: hidden ? "none" : "auto" }}
            >
              <CardArt card={card} glow={offset === 0} />
            </motion.button>
          );
        })}
      </div>

      {cards.length > 1 && (
        <>
          <ArrowButton side="left" disabled={center === 0} onClick={() => go(-1)} />
          <ArrowButton
            side="right"
            disabled={center === cards.length - 1}
            onClick={() => go(1)}
          />
        </>
      )}
    </div>
  );
}

function ArrowButton({
  side,
  disabled,
  onClick,
}: {
  side: "left" | "right";
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={side === "left" ? "Carte précédente" : "Carte suivante"}
      className={`absolute top-1/2 z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-void-900/85 text-white/70 transition hover:border-domain/60 hover:text-white disabled:opacity-0 ${
        side === "left" ? "left-1" : "right-1"
      }`}
    >
      <ChevronIcon className={`h-4 w-4 ${side === "left" ? "rotate-90" : "-rotate-90"}`} />
    </button>
  );
}
