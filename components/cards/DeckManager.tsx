"use client";

import { useState, useTransition } from "react";
import { AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { BoosterPack } from "@/components/cards/BoosterPack";
import { BoosterOpening } from "@/components/cards/BoosterOpening";
import { CardGrid } from "@/components/cards/CardGrid";
import { DeckSlots } from "@/components/cards/DeckSlots";
import { CoinIcon } from "@/components/progress/CoinWallet";
import {
  equipCardAction,
  openBoosterAction,
  sellCardAction,
  unequipCardAction,
} from "@/app/[universe]/account/card-actions";
import { DECK_SIZE } from "@/lib/cards/deck";
import type {
  CardView,
  CollectionCard,
  OpenedBooster,
  PendingBooster,
} from "@/lib/cards/types";

/**
 * Onglet DECK : boosters en attente, deck équipé, collection.
 *
 * Suit le motif de mutation du repo (`components/profile/TitleSelector.tsx`) :
 * `useTransition` + server action + `router.refresh()`, avec un bandeau de
 * feedback emerald/cursed. Pas d'optimisme ici — l'ouverture d'un booster et la
 * revente changent le solde de coins, mieux vaut afficher l'état confirmé.
 */

interface DeckManagerProps {
  pendingBoosters: PendingBooster[];
  deck: CardView[];
  collection: CollectionCard[];
}

export function DeckManager({
  pendingBoosters,
  deck,
  collection,
}: DeckManagerProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(
    null,
  );

  const [openingId, setOpeningId] = useState<string | null>(null);
  const [result, setResult] = useState<OpenedBooster | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [skip, setSkip] = useState(false);

  const run = (
    action: () => Promise<{ ok: boolean; error?: string }>,
    successMsg: string,
  ) => {
    setFeedback(null);
    startTransition(async () => {
      const res = await action();
      if (res.ok) {
        setFeedback({ ok: true, msg: successMsg });
        router.refresh();
      } else {
        setFeedback({ ok: false, msg: res.error ?? "Échec." });
      }
    });
  };

  const openPack = async (boosterId: string, skipAnimation: boolean) => {
    setSkip(skipAnimation);
    setOpeningId(boosterId);
    setResult(null);
    setError(null);
    const res = await openBoosterAction(boosterId);
    if (res.ok && res.result) setResult(res.result);
    else setError(res.error ?? "Impossible d'ouvrir ce booster.");
  };

  const deckIds = new Set(deck.map((c) => c.characterId));
  const deckFull = deck.length >= DECK_SIZE;

  return (
    <div className="space-y-12">
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

      {/* ── Boosters à ouvrir ── */}
      <section>
        <h2 className="mb-5 font-display text-xl font-bold uppercase tracking-wider text-white/85">
          🎴 Boosters à ouvrir
          {pendingBoosters.length > 0 && (
            <span className="ml-2 rounded-full bg-domain/20 px-2.5 py-0.5 align-middle text-sm text-domain-light">
              {pendingBoosters.length}
            </span>
          )}
        </h2>

        {pendingBoosters.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-void-800/60 px-6 py-10 text-center backdrop-blur">
            <p className="text-white/55">
              Aucun booster en attente. Termine une partie : une sur deux en fait
              tomber un.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4 sm:grid-cols-5 lg:grid-cols-6">
            {pendingBoosters.map((booster) => (
              <div key={booster.id} className="flex flex-col gap-2">
                <BoosterPack
                  kind={booster.kind}
                  animated
                  disabled={openingId !== null}
                  onClick={() => void openPack(booster.id, false)}
                />
                <button
                  type="button"
                  onClick={() => void openPack(booster.id, true)}
                  disabled={openingId !== null}
                  className="text-[10px] font-medium uppercase tracking-wider text-white/35 underline-offset-4 transition-colors hover:text-white/70 hover:underline disabled:opacity-50"
                >
                  Sans animation
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Deck équipé ── */}
      <section>
        <h2 className="mb-5 font-display text-xl font-bold uppercase tracking-wider text-white/85">
          🃏 Mon deck
        </h2>
        <DeckSlots
          cards={deck}
          pending={pending}
          onRemove={(id) =>
            run(() => unequipCardAction(id), "Carte retirée du deck.")
          }
        />
      </section>

      {/* ── Collection ── */}
      <section>
        <h2 className="mb-5 font-display text-xl font-bold uppercase tracking-wider text-white/85">
          📚 Ma collection
        </h2>
        <CardGrid
          cards={collection}
          emptyLabel="Aucune carte dans cette rareté."
          renderBadge={(card) =>
            card.owned && deckIds.has(card.characterId) ? (
              <span
                title="Équipée dans ton deck"
                className="flex h-6 w-6 items-center justify-center rounded-full border border-domain/60 bg-void-900/90 text-xs text-domain-light shadow-glow"
              >
                <span aria-hidden>★</span>
                <span className="sr-only">Équipée</span>
              </span>
            ) : null
          }
          renderActions={(card) => {
            if (!card.owned) return null;
            const equipped = deckIds.has(card.characterId);
            return (
              <>
                <button
                  type="button"
                  disabled={pending || (!equipped && deckFull)}
                  onClick={() =>
                    run(
                      () =>
                        equipped
                          ? unequipCardAction(card.characterId)
                          : equipCardAction(card.characterId),
                      equipped ? "Carte retirée du deck." : "Carte équipée !",
                    )
                  }
                  className={`rounded-full border px-2 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-colors disabled:opacity-40 ${
                    equipped
                      ? "border-domain/60 bg-domain/15 text-domain-light hover:border-cursed/50 hover:text-cursed-light"
                      : "border-white/10 bg-void-800/80 text-white/60 hover:border-domain/50 hover:text-white"
                  }`}
                >
                  {equipped ? "Retirer" : deckFull ? "Deck plein" : "Équiper"}
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    if (
                      !window.confirm(
                        `Vendre ${card.name} pour ${card.sellValue} coins ? Tu perdras la carte.`,
                      )
                    )
                      return;
                    run(
                      () => sellCardAction(card.characterId),
                      `${card.name} vendue pour ${card.sellValue} coins.`,
                    );
                  }}
                  className="flex items-center justify-center gap-1 rounded-full border border-white/10 bg-void-800/80 px-2 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white/50 transition-colors hover:border-amber-300/50 hover:text-amber-300 disabled:opacity-40"
                >
                  Vendre {card.sellValue}
                  <CoinIcon className="h-3 w-3" />
                </button>
              </>
            );
          }}
        />
      </section>

      <AnimatePresence>
        {openingId && (
          <BoosterOpening
            result={result}
            loading={!result && !error}
            error={error}
            initialSkip={skip}
            onClose={() => {
              setOpeningId(null);
              // Le booster a disparu de la liste et la collection a changé.
              if (result) router.refresh();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
