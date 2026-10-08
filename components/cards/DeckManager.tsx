"use client";

import { useCallback, useMemo, useRef, useState, useTransition } from "react";
import { AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { BoosterPack } from "@/components/cards/BoosterPack";
import { BoosterOpening } from "@/components/cards/BoosterOpening";
import { CardArt } from "@/components/cards/CardArt";
import { CardGrid } from "@/components/cards/CardGrid";
import { DeckSlots } from "@/components/cards/DeckSlots";
import { CoinIcon } from "@/components/progress/CoinWallet";
import {
  equipCardAction,
  fuseCardsAction,
  openBoosterAction,
  sellCardAction,
  unequipCardAction,
} from "@/app/[universe]/account/card-actions";
import { DECK_SIZE } from "@/lib/cards/deck";
import { FUSION_SIZE, nextRarity, validateFusion } from "@/lib/cards/fusion";
import { cardRarityStyle, type CardRarity } from "@/lib/cards/rarity";
import type { CardPool } from "@/lib/cards/roll";
import type {
  CardView,
  CollectionCard,
  OpenedBooster,
  PendingBooster,
} from "@/lib/cards/types";

/**
 * Onglet DECK : boosters en attente, deck équipé, collection et doublons
 * (fusion 3 → 1, cf. lib/cards/fusion.ts).
 *
 * Suit le motif de mutation du repo (`app/[universe]/account/ProfileEditModal.tsx`) :
 * `useTransition` + server action + `router.refresh()`, avec un bandeau de
 * feedback emerald/cursed. Pas d'optimisme ici — l'ouverture d'un booster et la
 * revente changent le solde de coins, mieux vaut afficher l'état confirmé.
 */

interface DeckManagerProps {
  pendingBoosters: PendingBooster[];
  deck: CardView[];
  collection: CollectionCard[];
}

type RunAction = (
  action: () => Promise<{ ok: boolean; error?: string }>,
  successMsg: string,
) => void;

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
  // Verrou anti double-clic. Une ref et non `disabled` sur les packs : griser
  // toute la pile au clic changeait la page PENDANT le fondu de l'overlay
  // (« la carte disparaît puis revient »).
  const openingRef = useRef(false);

  const [tab, setTab] = useState<"collection" | "duplicates">("collection");
  const [picks, setPicks] = useState<string[]>([]);
  const [fusing, setFusing] = useState(false);
  const [fusionResult, setFusionResult] = useState<OpenedBooster | null>(null);
  const [fusionError, setFusionError] = useState<string | null>(null);

  const run: RunAction = (action, successMsg) => {
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
    if (openingRef.current) return;
    openingRef.current = true;
    setSkip(skipAnimation);
    setOpeningId(boosterId);
    setResult(null);
    setError(null);
    const res = await openBoosterAction(boosterId);
    if (res.ok && res.result) {
      setResult(res.result);
      // Rafraîchit la page MAINTENANT, cachée sous l'overlay opaque, et non à
      // la fermeture : sinon la liste et la collection changeaient pendant le
      // fondu de sortie, sous les yeux du joueur.
      router.refresh();
    } else setError(res.error ?? "Impossible d'ouvrir ce booster.");
  };

  const deckIds = new Set(deck.map((c) => c.characterId));
  const deckFull = deck.length >= DECK_SIZE;

  // ── Doublons & fusion ──
  const byId = useMemo(
    () => new Map(collection.map((c) => [c.characterId, c])),
    [collection],
  );
  const counts = useMemo(
    () => new Map(collection.map((c) => [c.characterId, c.count])),
    [collection],
  );
  const rarityById = useMemo(
    () => new Map(collection.map((c) => [c.characterId, c.rarity])),
    [collection],
  );
  const pool = useMemo(() => {
    const out: CardPool = {};
    for (const c of collection) (out[c.rarity] ??= []).push(c.characterId);
    return out;
  }, [collection]);
  const duplicateCount = collection.reduce(
    (sum, c) => sum + Math.max(0, c.count - 1),
    0,
  );
  const isDuplicate = useCallback((c: CollectionCard) => c.count > 1, []);

  // Sélection relue contre les compteurs : un exemplaire qui n'existe plus
  // (vendu, échangé…) sort de lui-même de la fusion.
  const validPicks = picks.filter(
    (id, i) => picks.slice(0, i + 1).filter((p) => p === id).length <= (counts.get(id) ?? 0),
  );
  /** Index des emplacements qui consomment le DERNIER exemplaire d'une carte. */
  const lastCopySlots = new Set(
    validPicks.flatMap((id, i) =>
      validPicks.slice(0, i + 1).filter((p) => p === id).length === (counts.get(id) ?? 0)
        ? [i]
        : [],
    ),
  );
  const pickRarity: CardRarity | null = validPicks[0]
    ? (rarityById.get(validPicks[0]) ?? null)
    : null;
  const fusionCheck =
    validPicks.length === FUSION_SIZE
      ? validateFusion(validPicks, counts, rarityById, pool)
      : null;

  const canPick = (card: CollectionCard) => {
    if (validPicks.length >= FUSION_SIZE) return false;
    if (pickRarity && card.rarity !== pickRarity) return false;
    if (!nextRarity(card.rarity)) return false;
    const used = validPicks.filter((id) => id === card.characterId).length;
    return used < card.count;
  };

  const fuse = async () => {
    if (!fusionCheck?.ok) return;
    const lost = [...lastCopySlots].map((i) => byId.get(validPicks[i]!)?.name);
    if (
      lost.length > 0 &&
      !window.confirm(
        `Tu vas perdre ta dernière carte : ${lost.join(", ")}. Elle quittera ta collection (et ton deck). Continuer ?`,
      )
    )
      return;
    setFusing(true);
    setFusionResult(null);
    setFusionError(null);
    const res = await fuseCardsAction(validPicks);
    if (res.ok && res.card) {
      setFusionResult({ boosterId: "fusion", kind: "simple", cards: [res.card] });
      setPicks([]);
      router.refresh();
    } else {
      setFusionError(res.error ?? "Fusion impossible.");
    }
  };

  /** Pastille « N » d'une carte sélectionnée pour la fusion. */
  const fusionBadge = (card: CollectionCard) => {
    const n = validPicks.filter((id) => id === card.characterId).length;
    return n > 0 ? (
      <span
        title="Sélectionnée pour la fusion"
        className="flex h-6 min-w-6 items-center justify-center rounded-full border border-domain/60 bg-domain px-1.5 text-xs font-black text-white shadow-glow"
      >
        {n}
      </span>
    ) : null;
  };

  const fusionButton = (card: CollectionCard) => (
    <button
      type="button"
      disabled={!canPick(card) || fusing}
      onClick={() => setPicks([...validPicks, card.characterId])}
      className="rounded-full border border-white/10 bg-void-800/80 px-2 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white/60 transition-colors hover:border-domain/50 hover:text-white disabled:opacity-40"
    >
      {nextRarity(card.rarity) ? "+ Fusion" : "Rareté max"}
    </button>
  );

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
          Boosters à ouvrir
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
                  onClick={() => void openPack(booster.id, false)}
                />
                <button
                  type="button"
                  onClick={() => void openPack(booster.id, true)}
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
          Mon deck
        </h2>
        <DeckSlots
          cards={deck}
          pending={pending}
          onRemove={(id) =>
            run(() => unequipCardAction(id), "Carte retirée du deck.")
          }
        />
      </section>

      {/* ── Collection / Doublons ── */}
      <section>
        <div className="mb-5 flex flex-wrap items-center gap-x-6 gap-y-2" role="tablist">
          <TabButton
            active={tab === "collection"}
            onClick={() => setTab("collection")}
            label="Ma collection"
          />
          <TabButton
            active={tab === "duplicates"}
            onClick={() => setTab("duplicates")}
            label="Doublons"
            badge={duplicateCount}
          />
        </div>

        <div className="mb-6">
          <FusionPanel
            picks={validPicks}
            lastCopySlots={lastCopySlots}
            byId={byId}
            rarity={pickRarity}
            error={fusionCheck && !fusionCheck.ok ? fusionCheck.error : null}
            ready={Boolean(fusionCheck?.ok)}
            disabled={fusing || pending}
            onRemove={(i) => setPicks(validPicks.filter((_, j) => j !== i))}
            onClear={() => setPicks([])}
            onFuse={() => void fuse()}
          />
        </div>

        {tab === "collection" ? (
          <CardGrid
            cards={collection}
            emptyLabel="Aucune carte dans cette rareté."
            renderBadge={(card) =>
              fusionBadge(card) ??
              (card.owned && deckIds.has(card.characterId) ? <EquippedBadge /> : null)
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
                  {fusionButton(card)}
                  <SellButton card={card} pending={pending} run={run} />
                </>
              );
            }}
          />
        ) : (
          <CardGrid
            cards={collection}
            ownedOnly
            filter={isDuplicate}
            emptyLabel="Aucun doublon pour l'instant. Ouvre des boosters !"
            renderBadge={fusionBadge}
            renderActions={(card) => (
              <>
                {fusionButton(card)}
                <SellButton card={card} pending={pending} run={run} />
              </>
            )}
          />
        )}
      </section>

      <AnimatePresence>
        {openingId && (
          <BoosterOpening
            key="booster"
            result={result}
            loading={!result && !error}
            error={error}
            initialSkip={skip}
            onClose={() => {
              openingRef.current = false;
              setOpeningId(null);
            }}
          />
        )}
        {fusing && (
          <BoosterOpening
            key="fusion"
            result={fusionResult}
            loading={!fusionResult && !fusionError}
            error={fusionError}
            label="Fusion"
            onClose={() => setFusing(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  label,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  badge?: number;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`border-b-2 pb-1 font-display text-xl font-bold uppercase tracking-wider transition-colors ${
        active
          ? "border-domain text-white/90"
          : "border-transparent text-white/35 hover:text-white/65"
      }`}
    >
      {label}
      {badge != null && badge > 0 && (
        <span className="ml-2 rounded-full bg-amber-300/15 px-2.5 py-0.5 align-middle text-sm text-amber-300">
          {badge}
        </span>
      )}
    </button>
  );
}

function EquippedBadge() {
  return (
    <span
      title="Équipée dans ton deck"
      className="flex h-6 w-6 items-center justify-center rounded-full border border-domain/60 bg-void-900/90 text-xs text-domain-light shadow-glow"
    >
      <span aria-hidden>★</span>
      <span className="sr-only">Équipée</span>
    </span>
  );
}

/**
 * Revente d'UN exemplaire. Un doublon part sans confirmation (la collection ne
 * bouge pas) ; le dernier exemplaire demande confirmation.
 */
function SellButton({
  card,
  pending,
  run,
}: {
  card: CollectionCard;
  pending: boolean;
  run: RunAction;
}) {
  const spare = card.count > 1;
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (
          !spare &&
          !window.confirm(
            `Vendre ${card.name} pour ${card.sellValue} coins ? Tu perdras la carte.`,
          )
        )
          return;
        run(
          () => sellCardAction(card.characterId),
          spare
            ? `Doublon de ${card.name} vendu pour ${card.sellValue} coins.`
            : `${card.name} vendue pour ${card.sellValue} coins.`,
        );
      }}
      className="flex items-center justify-center gap-1 rounded-full border border-white/10 bg-void-800/80 px-2 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white/50 transition-colors hover:border-amber-300/50 hover:text-amber-300 disabled:opacity-40"
    >
      {spare ? "Vendre 1 ·" : "Vendre"} {card.sellValue}
      <CoinIcon className="h-3 w-3" />
    </button>
  );
}

/** Les 3 emplacements de fusion + la rareté visée. */
function FusionPanel({
  picks,
  lastCopySlots,
  byId,
  rarity,
  error,
  ready,
  disabled,
  onRemove,
  onClear,
  onFuse,
}: {
  picks: string[];
  lastCopySlots: Set<number>;
  byId: Map<string, CollectionCard>;
  rarity: CardRarity | null;
  error: string | null;
  ready: boolean;
  disabled: boolean;
  onRemove: (index: number) => void;
  onClear: () => void;
  onFuse: () => void;
}) {
  const target = rarity ? nextRarity(rarity) : null;
  const from = rarity ? cardRarityStyle(rarity) : null;
  const to = target ? cardRarityStyle(target) : null;

  return (
    <div className="rounded-2xl border border-white/10 bg-void-800/60 p-4 backdrop-blur sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-black uppercase tracking-wider text-white/85">
            Fusion
          </h3>
          <p className="text-sm text-white/50">
            {from && to ? (
              <>
                3 <span style={{ color: from.color }}>{from.label}</span> → 1{" "}
                <span style={{ color: to.color }}>{to.label}</span> aléatoire
              </>
            ) : (
              "Choisis 3 cartes de même rareté (« + Fusion ») pour obtenir une carte de la rareté au-dessus."
            )}
          </p>
        </div>
        <div className="flex gap-2">
          {picks.length > 0 && (
            <button
              type="button"
              onClick={onClear}
              disabled={disabled}
              className="rounded-full border border-white/10 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white/50 transition-colors hover:text-white disabled:opacity-40"
            >
              Vider
            </button>
          )}
          <button
            type="button"
            onClick={onFuse}
            disabled={!ready || disabled}
            className="rounded-full bg-domain px-5 py-2 text-xs font-black uppercase tracking-wider text-white shadow-glow transition-transform hover:scale-105 disabled:scale-100 disabled:opacity-40"
          >
            Fusionner
          </button>
        </div>
      </div>

      <div className="mt-4 grid max-w-sm grid-cols-3 gap-3">
        {Array.from({ length: FUSION_SIZE }, (_, i) => {
          const id = picks[i];
          const card = id ? byId.get(id) : undefined;
          return card ? (
            <button
              key={i}
              type="button"
              onClick={() => onRemove(i)}
              disabled={disabled}
              aria-label={`Retirer ${card.name} de la fusion`}
              className="relative rounded-2xl transition-transform hover:scale-[1.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-domain"
            >
              <CardArt card={card} />
              {lastCopySlots.has(i) && (
                <span className="absolute inset-x-1 top-1 z-30 rounded-full bg-cursed/90 px-1.5 py-0.5 text-center text-[9px] font-black uppercase tracking-wider text-white">
                  Dernier exemplaire
                </span>
              )}
            </button>
          ) : (
            <div
              key={i}
              className="flex aspect-[3/4] items-center justify-center rounded-2xl border-2 border-dashed border-white/10 text-2xl text-white/20"
            >
              +
            </div>
          );
        })}
      </div>

      {error && picks.length === FUSION_SIZE && (
        <p className="mt-3 text-sm text-cursed-light">{error}</p>
      )}
    </div>
  );
}
