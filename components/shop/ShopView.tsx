"use client";

import { useState, useTransition } from "react";
import { AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BoosterOpening } from "@/components/cards/BoosterOpening";
import { ArrowRightIcon, SpadeIcon } from "@/components/cards/CardIcons";
import { BoosterOfferCard } from "@/components/shop/BoosterOfferCard";
import { RouletteSection } from "@/components/roulette/RouletteSection";
import { CardArt } from "@/components/cards/CardArt";
import { Countdown } from "@/components/Countdown";
import { CoinIcon } from "@/components/progress/CoinWallet";
import { UniverseLink } from "@/components/universe/UniverseLink";
import { openBoosterAction } from "@/app/[universe]/account/card-actions";
import {
  buyBoosterAction,
  buyExoticCardAction,
} from "@/app/[universe]/shop/actions";
import type { BoosterKind } from "@/lib/cards/boosters";
import type { RouletteState } from "@/lib/roulette/types";
import type {
  CardView,
  OpenedBooster,
  ShopBoosterOffer,
  ShopExoticOffer,
  ShopWindow,
} from "@/lib/cards/types";

/**
 * Vitrine de la boutique.
 *
 * Motif de mutation habituel du repo (`DeckManager`) : `useTransition` + server
 * action + `router.refresh()`, feedback emerald/cursed. Aucun optimisme — un
 * achat change le solde, on n'affiche que l'état confirmé par le serveur.
 *
 * Un booster acheté enchaîne DIRECTEMENT sur l'animation d'ouverture (la même
 * que celle de l'onglet Deck) : c'est le moment fort de l'achat. Le booster
 * existe déjà en base à cet instant — fermer la page avant l'ouverture ne le
 * perd pas, il attend dans « Mon deck ».
 */
export function ShopView({
  shop,
  roulette,
  casinoEnabled,
}: {
  shop: ShopWindow;
  /** État de la roulette de l'univers courant (tour gratuit, dernier gain). */
  roulette: RouletteState;
  /** Le casino est ouvert : on propose d'y aller dépenser autrement. */
  casinoEnabled: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(
    null,
  );

  // Modale d'ouverture du booster acheté.
  const [opening, setOpening] = useState(false);
  const [result, setResult] = useState<OpenedBooster | null>(null);
  const [error, setError] = useState<string | null>(null);

  const buyBooster = (offer: ShopBoosterOffer) => {
    if (pending || opening) return;
    if (
      !window.confirm(
        `Acheter un ${offer.label.toLowerCase()} pour ${offer.price.toLocaleString("fr-FR")} coins ?`,
      )
    ) {
      return;
    }

    setFeedback(null);
    startTransition(async () => {
      const bought = await buyBoosterAction(offer.kind);
      if (!bought.ok || !bought.boosterId) {
        setFeedback({ ok: false, msg: bought.error ?? "Achat impossible." });
        return;
      }

      // Le paiement est passé : on bascule sur la révélation. Une erreur ici ne
      // coûte rien au joueur, le booster reste en attente dans « Mon deck ».
      await revealBooster(bought.boosterId);
    });
  };

  /**
   * Ouvre un booster déjà en base (acheté, ou gagné à la roulette) dans la
   * modale de révélation.
   */
  const revealBooster = async (boosterId: string) => {
    setOpening(true);
    setResult(null);
    setError(null);
    const opened = await openBoosterAction(boosterId);
    if (opened.ok && opened.result) {
      setResult(opened.result);
      // Solde et collection rafraîchis MAINTENANT, sous l'overlay opaque, et
      // non à la fermeture où la page changeait pendant le fondu de sortie.
      router.refresh();
    } else {
      setError(
        opened.error ??
          "L'ouverture a échoué. Retrouve ton booster dans « Mon deck ».",
      );
    }
  };

  const openWonBooster = (boosterId: string) => {
    if (pending || opening) return;
    startTransition(() => revealBooster(boosterId));
  };

  // Affiches du jour des packs, réutilisées sur les cases booster de la roue.
  const covers: Partial<Record<BoosterKind, CardView | null>> = Object.fromEntries(
    shop.boosters.map((offer) => [offer.kind, offer.cover]),
  );

  const buyExotic = (offer: ShopExoticOffer) => {
    if (pending || opening) return;
    if (
      !window.confirm(
        `Acheter ${offer.name} pour ${offer.price.toLocaleString("fr-FR")} coins ?`,
      )
    ) {
      return;
    }

    setFeedback(null);
    startTransition(async () => {
      const res = await buyExoticCardAction(offer.characterId);
      if (res.ok) {
        setFeedback({ ok: true, msg: `${offer.name} rejoint ta collection !` });
        router.refresh();
      } else {
        setFeedback({ ok: false, msg: res.error ?? "Achat impossible." });
      }
    });
  };

  return (
    <div className="space-y-12">
      {/* ── Roulette ── */}
      <RouletteSection
        state={roulette}
        coins={shop.coins}
        covers={covers}
        onOpenBooster={openWonBooster}
        busy={pending || opening}
      />

      {/* ── Solde ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-400/25 bg-amber-400/[0.07] px-5 py-4 backdrop-blur">
        <span className="flex items-center gap-2 text-sm font-medium text-white/60">
          Ton solde
        </span>
        <span className="flex items-center gap-2 font-display text-2xl font-black tabular-nums text-amber-300">
          <CoinIcon className="h-6 w-6" />
          {shop.coins.toLocaleString("fr-FR")}
        </span>
      </div>

      {/* ── Casino ── */}
      {casinoEnabled && (
        // `next/link` brut et NON `UniverseLink` : le casino est hors univers
        // (cf. UNIVERSE_FREE_PREFIXES). `universePath` laisserait de toute façon
        // `/casino` intact, mais un lien nu rend l'intention explicite.
        <Link
          href="/casino"
          className="group flex items-center gap-4 rounded-2xl border border-emerald-400/25 bg-emerald-400/[0.06] px-5 py-4 transition hover:border-emerald-400/50 hover:bg-emerald-400/10"
        >
          <span
            aria-hidden
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-emerald-400/30 bg-emerald-400/10 text-emerald-300 transition-transform duration-300 group-hover:scale-110"
          >
            <SpadeIcon className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-display text-base font-black text-white">
              Passer au casino
            </span>
            <span className="block text-sm text-white/50">
              Fais fructifier tes coins au blackjack — ou perds-les.
            </span>
          </span>
          <span
            aria-hidden
            className="text-white/40 transition-transform duration-300 group-hover:translate-x-1.5 group-hover:text-white"
          >
            <ArrowRightIcon className="h-5 w-5" />
          </span>
        </Link>
      )}

      {feedback && (
        <p
          className={`rounded-xl border px-4 py-3 text-sm ${
            feedback.ok
              ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
              : "border-cursed/40 bg-cursed/10 text-cursed-light"
          }`}
        >
          {feedback.msg}
        </p>
      )}

      {/* ── Boosters ── */}
      <section>
        <h2 className="mb-1 font-display text-xl font-bold uppercase tracking-wider text-white/85">
          Boosters
        </h2>
        <p className="mb-5 text-sm text-white/45">
          Ouverture immédiate. Les doublons sont gardés pour la fusion et les échanges.
        </p>

        <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 lg:grid-cols-4">
          {shop.boosters.map((offer) => (
            <BoosterOfferCard
              key={offer.kind}
              offer={offer}
              affordable={shop.coins >= offer.price}
              disabled={pending || opening}
              onBuy={() => buyBooster(offer)}
            />
          ))}
        </div>
      </section>

      {/* ── Étal exotic ── */}
      <section>
        <h2 className="mb-1 font-display text-xl font-bold uppercase tracking-wider text-white/85">
          Étal exotic du jour
        </h2>
        <p className="text-sm text-white/45">
          {shop.exotics.length} carte{shop.exotics.length > 1 ? "s" : ""} EXOTIC
          en vente directe, sans hasard. L&apos;étal change chaque jour à minuit.
        </p>
        <Countdown
          ms={shop.msUntilRotation}
          label="Nouvel étal dans"
          className="mb-5 mt-1 text-sm text-white/45"
        />

        {shop.exotics.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-void-800/60 px-6 py-12 text-center backdrop-blur">
            <p className="text-white/55">
              Aucune carte exotic dans ce roster pour l&apos;instant.
            </p>
          </div>
        ) : (
          // Flex centré plutôt qu'une grille : un étal incomplet reste au milieu.
          <div className="flex flex-wrap justify-center gap-4">
            {shop.exotics.map((offer) => {
              const affordable = shop.coins >= offer.price;
              const disabled = pending || opening || offer.owned || !affordable;
              return (
                <div
                  key={offer.characterId}
                  className="flex w-[calc(50%-0.5rem)] flex-col gap-3 sm:w-[calc(33.333%-0.667rem)] lg:w-[calc(25%-0.75rem)] xl:w-[calc(20%-0.8rem)]"
                >
                  <div className="relative">
                    {/* Jamais grisée : en rayon, même une carte déjà possédée
                        doit s'afficher en pleine couleur. */}
                    <CardArt card={offer} glow />
                    {offer.owned && (
                      <span className="absolute right-1.5 top-1.5 z-30 rounded-full border border-emerald-400/50 bg-void-900/90 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-300">
                        Possédée
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => buyExotic(offer)}
                    className="flex items-center justify-center gap-1.5 rounded-full border border-amber-300/50 bg-amber-300/10 px-3 py-2 text-xs font-black uppercase tracking-wider text-amber-300 transition-colors enabled:hover:bg-amber-300/20 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {offer.owned ? (
                      "Déjà possédée"
                    ) : (
                      <>
                        {offer.price.toLocaleString("fr-FR")}
                        <CoinIcon className="h-3.5 w-3.5" />
                      </>
                    )}
                  </button>
                  {!offer.owned && !affordable && (
                    <p className="-mt-2 text-center text-[10px] font-bold uppercase tracking-wider text-white/30">
                      Solde insuffisant
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <p className="text-center text-sm text-white/40">
        Tes cartes et tes boosters non ouverts t&apos;attendent dans{" "}
        <UniverseLink
          href="/account/deck"
          className="font-bold text-domain-light underline-offset-4 hover:underline"
        >
          Mon deck
        </UniverseLink>
        .
      </p>

      <AnimatePresence>
        {opening && (
          <BoosterOpening
            result={result}
            loading={!result && !error}
            error={error}
            onClose={() => setOpening(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
