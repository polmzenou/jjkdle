"use client";

import { CharacterImage } from "@/components/CharacterImage";
import { RAINBOW_GRADIENT } from "@/components/cards/CardArt";
import { ChevronIcon, PackIcon } from "@/components/cards/CardIcons";
import { CoinIcon } from "@/components/progress/CoinWallet";
import type { BoosterKind } from "@/lib/cards/boosters";
import { formatOdds } from "@/lib/cards/odds";
import { cardRarityStyle } from "@/lib/cards/rarity";
import type { ShopBoosterOffer } from "@/lib/cards/types";

/**
 * Un booster EN RAYON : affiche illustrée (un personnage de l'univers courant,
 * qui tourne chaque jour), portraits, promesse du pack, menu « Taux de drop »
 * et bouton d'achat.
 *
 * L'accent du pack (bronze, argent, or…) est une couleur de MÉTAL, identique
 * dans tous les univers ; tout le reste (fonds, voiles, focus) passe par les
 * variables `void`/`domain`, donc par le thème de l'univers.
 */

/** Étiquette de gamme du pack, affichée en haut à gauche. */
const TIER_CHIP: Record<BoosterKind, string> = {
  simple: "Standard",
  bronze: "Renforcé",
  silver: "Élite",
  gold: "Légendaire",
};

interface BoosterOfferCardProps {
  offer: ShopBoosterOffer;
  affordable: boolean;
  disabled: boolean;
  onBuy: () => void;
}

export function BoosterOfferCard({
  offer,
  affordable,
  disabled,
  onBuy,
}: BoosterOfferCardProps) {
  const { accent } = offer;
  const subtitle = [
    `${offer.cardCount} cartes`,
    offer.guarantee?.replace(/^1 carte /, ""),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <article
      className="group relative flex h-full flex-col overflow-hidden rounded-2xl border bg-void-900/90 transition-transform duration-300 hover:-translate-y-1"
      style={{
        borderColor: `${accent}55`,
        boxShadow: `0 18px 40px -24px ${accent}aa`,
      }}
    >
      {/* Liseré cranté aux couleurs du métal */}
      <div
        aria-hidden
        className="relative h-2.5 shrink-0"
        style={{
          background: `repeating-linear-gradient(90deg, ${accent} 0 3px, ${accent}99 3px 5px)`,
        }}
      >
        <span className="absolute inset-x-0 bottom-0 h-px bg-black/40" />
      </div>

      {/* Affiche */}
      <div className="relative aspect-[4/5] overflow-hidden">
        {offer.cover ? (
          <CharacterImage
            character={{
              name: offer.cover.name,
              ...(offer.cover.image ? { image: offer.cover.image } : {}),
            }}
            className="transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div
            className="flex h-full items-center justify-center"
            style={{
              background: `radial-gradient(circle at 50% 40%, ${accent}40, transparent 70%)`,
              color: accent,
            }}
          >
            <PackIcon className="h-20 w-20" />
          </div>
        )}

        {/* Voile : fond de l'univers qui remonte sous le texte */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-void-900 via-void-900/40 to-transparent"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-60 mix-blend-soft-light"
          style={{ background: `linear-gradient(160deg, ${accent}55, transparent 55%)` }}
        />

        <span
          className="absolute left-3 top-3 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white backdrop-blur"
          style={{ borderColor: `${accent}90`, background: `${accent}40` }}
        >
          {TIER_CHIP[offer.kind]}
        </span>

        <div className="absolute inset-x-0 bottom-0 px-4 pb-3">
          {offer.previews.length > 0 && (
            <div className="mb-2 flex gap-1.5">
              {offer.previews.map((card) => (
                <span
                  key={card.characterId}
                  title={card.name}
                  className="h-8 w-8 overflow-hidden rounded-lg border-2"
                  style={{ borderColor: cardRarityStyle(card.rarity).color }}
                >
                  <CharacterImage
                    character={{
                      name: card.name,
                      ...(card.image ? { image: card.image } : {}),
                    }}
                  />
                </span>
              ))}
            </div>
          )}
          <h3
            className="line-clamp-2 font-display text-2xl font-black uppercase leading-none tracking-wide drop-shadow"
            style={{ color: offer.kind === "simple" ? "#fff" : accent }}
          >
            {offer.label}
          </h3>
          <p className="mt-1 truncate text-[10px] font-bold uppercase tracking-[0.18em] text-white/70">
            {subtitle}
          </p>
        </div>
      </div>

      {/* Promesse + taux */}
      <div className="flex flex-1 flex-col gap-3 px-4 pb-4 pt-2">
        {/* Hauteur réservée à 2 lignes : toutes les cartes d'une rangée alignent
            leur « Taux de drop » et leur bouton, quel que soit le texte. */}
        <p className="line-clamp-2 min-h-[2lh] text-xs leading-snug text-white/55">
          {offer.perk}
        </p>

        {/* `relative` : le tableau s'ouvre EN SURIMPRESSION vers le haut. S'il
            poussait la carte, la grille (étirée) agrandirait toute la rangée. */}
        <details className="group/odds relative mt-auto">
          <summary className="flex cursor-pointer list-none items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-domain-light transition-colors hover:text-white [&::-webkit-details-marker]:hidden">
            <ChevronIcon className="h-3 w-3 -rotate-90 transition-transform group-open/odds:rotate-0" />
            Taux de drop
          </summary>
          <OddsTable offer={offer} />
        </details>

        <button
          type="button"
          disabled={disabled || !affordable}
          onClick={onBuy}
          className="flex w-full items-center justify-center gap-2 rounded-xl border px-3 py-2.5 font-display text-sm font-black tracking-wider transition-colors disabled:cursor-not-allowed disabled:opacity-45"
          style={{
            borderColor: `${accent}60`,
            background: `linear-gradient(180deg, ${accent}26, ${accent}0d)`,
            color: offer.kind === "simple" ? "#e2e8f0" : accent,
          }}
        >
          <CoinIcon className="h-4 w-4" />
          {offer.price.toLocaleString("fr-FR")}
        </button>
        {/* Ligne toujours présente (invisible si inutile) : sinon la carte qu'on
            peut s'offrir serait plus courte que ses voisines. */}
        <p
          aria-hidden={affordable}
          className={`-mt-1.5 text-center text-[10px] font-bold uppercase tracking-wider text-white/30 ${
            affordable ? "invisible" : ""
          }`}
        >
          Solde insuffisant
        </p>
      </div>
    </article>
  );
}

/**
 * Détail des taux : par carte (slots libres) et « au moins une » sur le pack
 * entier — le second est celui qui intéresse vraiment l'acheteur.
 */
function OddsTable({ offer }: { offer: ShopBoosterOffer }) {
  return (
    <div className="absolute inset-x-0 bottom-full z-20 mb-2 rounded-xl border border-white/15 bg-void-800/95 p-3 shadow-2xl backdrop-blur">
      <div className="mb-1.5 grid grid-cols-[1fr_auto_auto] gap-x-3 text-[9px] font-bold uppercase tracking-wider text-white/35">
        <span>Rareté</span>
        <span className="text-right">Par carte</span>
        <span className="w-12 text-right">Par pack</span>
      </div>
      <ul className="space-y-1.5">
        {offer.odds
          .slice()
          .reverse()
          .map((o) => {
            const style = cardRarityStyle(o.rarity);
            const fill = style.rainbow ? RAINBOW_GRADIENT : style.color;
            return (
              <li key={o.rarity}>
                <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-3 text-[11px]">
                  <span className="flex min-w-0 items-center gap-1.5 font-bold text-white/80">
                    <span
                      aria-hidden
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ background: fill }}
                    />
                    <span className="truncate">{style.label}</span>
                  </span>
                  <span className="text-right tabular-nums text-white/55">
                    {formatOdds(o.perCard)}
                  </span>
                  <span className="w-12 text-right font-bold tabular-nums text-white">
                    {formatOdds(o.atLeastOne)}
                  </span>
                </div>
                <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/5">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.max(2, Math.min(100, o.atLeastOne))}%`,
                      background: fill,
                    }}
                  />
                </div>
              </li>
            );
          })}
      </ul>
      <p className="mt-2.5 text-[10px] leading-snug text-white/35">
        « Par pack » : chance d&apos;avoir au moins une carte de cette rareté dans
        le booster.
        {offer.guarantee && ` ${offer.guarantee}.`}
      </p>
    </div>
  );
}
