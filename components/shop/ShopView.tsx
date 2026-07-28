"use client";

import { useState, useTransition } from "react";
import { AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { BoosterOpening } from "@/components/cards/BoosterOpening";
import { BoosterPack } from "@/components/cards/BoosterPack";
import { CardArt } from "@/components/cards/CardArt";
import { Countdown } from "@/components/Countdown";
import { CoinIcon } from "@/components/progress/CoinWallet";
import { UniverseLink } from "@/components/universe/UniverseLink";
import { openBoosterAction } from "@/app/[universe]/account/card-actions";
import {
  buyBoosterAction,
  buyExoticCardAction,
} from "@/app/[universe]/shop/actions";
import type {
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
export function ShopView({ shop }: { shop: ShopWindow }) {
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
      setOpening(true);
      setResult(null);
      setError(null);
      const opened = await openBoosterAction(bought.boosterId);
      if (opened.ok && opened.result) setResult(opened.result);
      else {
        setError(
          opened.error ??
            "Booster acheté, mais l'ouverture a échoué. Retrouve-le dans « Mon deck ».",
        );
      }
    });
  };

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
          Ouverture immédiate. Les doublons sont convertis en coins.
        </p>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {shop.boosters.map((offer) => {
            const affordable = shop.coins >= offer.price;
            return (
              <div key={offer.kind} className="flex flex-col gap-3">
                <BoosterPack
                  kind={offer.kind}
                  disabled={pending || opening || !affordable}
                  onClick={() => buyBooster(offer)}
                  className={affordable ? "" : "opacity-45 grayscale"}
                />
                <div className="text-center">
                  <p className="min-h-[2.5rem] text-[11px] leading-tight text-white/40">
                    {offer.perk}
                  </p>
                  <button
                    type="button"
                    disabled={pending || opening || !affordable}
                    onClick={() => buyBooster(offer)}
                    className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-full border px-3 py-2 text-xs font-black uppercase tracking-wider transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                    style={{
                      borderColor: `${offer.accent}80`,
                      color: offer.accent,
                      background: `${offer.accent}18`,
                    }}
                  >
                    {offer.price.toLocaleString("fr-FR")}
                    <CoinIcon className="h-3.5 w-3.5" />
                  </button>
                  {!affordable && (
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-white/30">
                      Solde insuffisant
                    </p>
                  )}
                </div>
              </div>
            );
          })}
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
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {shop.exotics.map((offer) => {
              const affordable = shop.coins >= offer.price;
              const disabled = pending || opening || offer.owned || !affordable;
              return (
                <div key={offer.characterId} className="flex flex-col gap-3">
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
            onClose={() => {
              setOpening(false);
              // Le solde a baissé et la collection a changé.
              router.refresh();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
