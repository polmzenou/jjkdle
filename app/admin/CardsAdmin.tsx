"use client";

import { useState, useTransition } from "react";
import { AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { BoosterPack } from "@/components/cards/BoosterPack";
import { BoosterOpening } from "@/components/cards/BoosterOpening";
import { CardGrid } from "@/components/cards/CardGrid";
import {
  adminGiveBoosterAction,
  adminGrantCardAction,
  adminRevokeCardAction,
} from "./actions";
import { BOOSTERS, BOOSTER_KINDS } from "@/lib/cards/boosters";
import { BASE_RATES, BOOST_RATES } from "@/lib/cards/rates";
import { CARD_RARITIES, cardRarityStyle } from "@/lib/cards/rarity";
import type { CollectionCard, OpenedBooster } from "@/lib/cards/types";

/**
 * Onglet admin « Booster Pack ».
 *
 * Double usage : bac à sable pour vérifier l'animation d'ouverture (elle passe
 * par la MÊME table et le même `openBooster` que celle des joueurs, donc ce qui
 * est validé ici est exactement ce qu'ils verront), et outil d'octroi ciblé
 * carte par carte.
 */

interface CardsAdminProps {
  /** Collection de l'admin dans l'univers administré (roster complet). */
  collection: CollectionCard[];
  universeName: string;
}

export function CardsAdmin({ collection, universeName }: CardsAdminProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(
    null,
  );

  const [overlay, setOverlay] = useState(false);
  const [result, setResult] = useState<OpenedBooster | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ownedCount = collection.filter((c) => c.owned).length;

  const giveBooster = async (kind: string) => {
    setFeedback(null);
    setOverlay(true);
    setResult(null);
    setError(null);
    const res = await adminGiveBoosterAction(kind);
    if (res.ok && res.result) setResult(res.result);
    else setError(res.error ?? "Échec de l'octroi.");
  };

  /**
   * Clic sur une carte : la donne si elle manque (avec l'animation de
   * révélation), la retire si elle est déjà possédée.
   */
  const toggleCard = (card: CollectionCard) => {
    setFeedback(null);
    if (card.owned) {
      startTransition(async () => {
        const res = await adminRevokeCardAction(card.characterId);
        if (res.ok) {
          setFeedback({ ok: true, msg: `${card.name} retirée.` });
          router.refresh();
        } else {
          setFeedback({ ok: false, msg: res.error ?? "Échec." });
        }
      });
      return;
    }

    void (async () => {
      setOverlay(true);
      setResult(null);
      setError(null);
      const res = await adminGrantCardAction(card.characterId);
      if (res.ok && res.card) {
        // On habille l'octroi en booster d'une carte : même overlay, même
        // animation de révélation que pour un vrai booster.
        setResult({
          boosterId: "admin",
          kind: "simple",
          cards: [{ ...res.card, duplicate: Boolean(res.alreadyOwned), coins: 0 }],
          coinsEarned: 0,
        });
      } else {
        setError(res.error ?? "Échec de l'octroi.");
      }
    })();
  };

  return (
    <div className="space-y-10">
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

      {/* ── Octroi de boosters ── */}
      <section>
        <h3 className="mb-1 font-display text-lg font-bold text-white">
          Se donner un booster
        </h3>
        <p className="mb-5 text-sm text-white/50">
          Le booster est créé puis ouvert immédiatement, sur ton compte, dans
          l&apos;univers <strong className="text-white/80">{universeName}</strong>.
          Les cartes obtenues entrent réellement dans ta collection.
        </p>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {BOOSTER_KINDS.map((kind) => {
            const def = BOOSTERS[kind];
            return (
              <div key={kind} className="flex flex-col gap-2">
                <BoosterPack
                  kind={kind}
                  onClick={() => void giveBooster(kind)}
                  disabled={overlay || pending}
                />
                <p className="text-center text-[11px] text-white/40">
                  {def.guaranteed?.length
                    ? `${def.cardCount} cartes · 1 garantie`
                    : `${def.cardCount} cartes`}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Rappel des taux (référence d'équilibrage) ── */}
      <section>
        <h3 className="mb-3 font-display text-lg font-bold text-white">
          Taux de tirage
        </h3>
        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-void-800/60 backdrop-blur">
          <table className="w-full min-w-[420px] text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wider text-white/45">
                <th className="px-4 py-3 font-bold">Rareté</th>
                <th className="px-4 py-3 font-bold">Base (simple/bronze)</th>
                <th className="px-4 py-3 font-bold">Boosté (argent/doré)</th>
                <th className="px-4 py-3 font-bold">Revente</th>
              </tr>
            </thead>
            <tbody>
              {CARD_RARITIES.map((rarity) => {
                const style = cardRarityStyle(rarity);
                return (
                  <tr key={rarity} className="border-b border-white/5 last:border-0">
                    <td
                      className="px-4 py-2.5 font-bold uppercase tracking-wider"
                      style={{ color: style.color }}
                    >
                      {style.label}
                    </td>
                    <td className="px-4 py-2.5 text-white/70">
                      {BASE_RATES[rarity]} %
                    </td>
                    <td className="px-4 py-2.5 text-white/70">
                      {BOOST_RATES[rarity]} %
                    </td>
                    <td className="px-4 py-2.5 text-amber-300/80">
                      {style.sellValue} 🪙
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-white/35">
          Les raretés sans aucun personnage dans le roster sont retirées et leur
          masse redistribuée au prorata sur les autres.
        </p>
      </section>

      {/* ── Octroi carte par carte ── */}
      <section>
        <h3 className="mb-1 font-display text-lg font-bold text-white">
          Ma collection · {ownedCount} / {collection.length}
        </h3>
        <p className="mb-5 text-sm text-white/50">
          Clique une carte grisée pour te la donner (avec l&apos;animation de
          révélation), ou une carte possédée pour te la retirer.
        </p>
        <CardGrid
          cards={collection}
          onCardClick={toggleCard}
          emptyLabel="Aucun personnage dans cette rareté."
        />
      </section>

      <AnimatePresence>
        {overlay && (
          <BoosterOpening
            result={result}
            loading={!result && !error}
            error={error}
            onClose={() => {
              setOverlay(false);
              if (result) router.refresh();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
