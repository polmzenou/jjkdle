"use client";

import { useEffect, useState } from "react";
import { CardArt } from "@/components/cards/CardArt";
import {
  acceptTradeAction,
  cancelTradeAction,
  createTradeAction,
  declineTradeAction,
  loadTradeSparesAction,
} from "@/app/[universe]/account/social/actions";
import { MAX_TRADE_CARDS, TRADE_MESSAGE_MAX } from "@/lib/cards/trade";
import { rarityRank } from "@/lib/cards/rarity";
import type {
  FriendView,
  SpareCard,
  TradeLine,
  TradeStatusView,
  TradeView,
} from "@/lib/social/types";
import type { SocialRun } from "./SocialHub";

const STATUS_LABEL: Record<TradeStatusView, { label: string; className: string }> = {
  PENDING: { label: "En attente", className: "text-amber-300" },
  ACCEPTED: { label: "Échange effectué", className: "text-emerald-300" },
  DECLINED: { label: "Refusée", className: "text-white/40" },
  CANCELLED: { label: "Annulée", className: "text-white/40" },
  FAILED: { label: "Échouée (doublon indisponible)", className: "text-cursed-light" },
};

/** Onglet ÉCHANGES : composeur, offres reçues / envoyées, historique. */
export function TradesPanel({
  friends,
  trades,
  universeId,
  composeWith,
  onComposeChange,
  pending,
  run,
}: {
  friends: FriendView[];
  trades: TradeView[];
  universeId: string;
  composeWith: string | null;
  onComposeChange: (friendId: string | null) => void;
  pending: boolean;
  run: SocialRun;
}) {
  const incoming = trades.filter((t) => t.status === "PENDING" && !t.outgoing);
  const outgoing = trades.filter((t) => t.status === "PENDING" && t.outgoing);
  const history = trades.filter((t) => t.status !== "PENDING");

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="trade-friend" className="text-sm text-white/55">
          Proposer un échange à
        </label>
        <select
          id="trade-friend"
          value={composeWith ?? ""}
          onChange={(e) => onComposeChange(e.target.value || null)}
          className="rounded-xl border border-white/10 bg-void-800/80 px-3 py-2 text-sm text-white focus:border-domain/60 focus:outline-none"
        >
          <option value="">— choisir un ami —</option>
          {friends.map((f) => (
            <option key={f.userId} value={f.userId}>
              {f.username}
            </option>
          ))}
        </select>
        {friends.length === 0 && (
          <span className="text-sm text-white/40">Ajoute d&apos;abord des amis.</span>
        )}
      </div>

      {composeWith && (
        <TradeComposer
          key={composeWith}
          friend={friends.find((f) => f.userId === composeWith) ?? null}
          pending={pending}
          onCancel={() => onComposeChange(null)}
          onSubmit={(give, take, message) =>
            run(
              () => createTradeAction(composeWith, give, take, message),
              () => onComposeChange(null),
            )
          }
        />
      )}

      <TradeList title="Offres reçues" empty="Aucune offre reçue." trades={incoming} universeId={universeId}>
        {(t) => (
          <>
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => acceptTradeAction(t.id))}
              className="rounded-full bg-domain px-4 py-1.5 text-[11px] font-black uppercase tracking-wider text-white shadow-glow disabled:opacity-40"
            >
              Accepter
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => declineTradeAction(t.id))}
              className="rounded-full border border-white/10 px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white/50 hover:text-cursed-light disabled:opacity-40"
            >
              Refuser
            </button>
          </>
        )}
      </TradeList>

      <TradeList title="Offres envoyées" empty="Aucune offre en attente." trades={outgoing} universeId={universeId}>
        {(t) => (
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => cancelTradeAction(t.id))}
            className="rounded-full border border-white/10 px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white/50 hover:text-cursed-light disabled:opacity-40"
          >
            Annuler
          </button>
        )}
      </TradeList>

      {history.length > 0 && (
        <TradeList title="Historique" empty="" trades={history} universeId={universeId} />
      )}
    </div>
  );
}

function TradeList({
  title,
  empty,
  trades,
  universeId,
  children,
}: {
  title: string;
  empty: string;
  trades: TradeView[];
  universeId: string;
  children?: (t: TradeView) => React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-white/45">
        {title} <span className="text-white/25">· {trades.length}</span>
      </h2>
      {trades.length === 0 ? (
        <p className="rounded-2xl border border-white/10 bg-void-800/60 px-4 py-8 text-center text-sm text-white/45">
          {empty}
        </p>
      ) : (
        <ul className="space-y-3">
          {trades.map((t) => {
            const status = STATUS_LABEL[t.status];
            return (
              <li
                key={t.id}
                className="rounded-2xl border border-white/10 bg-void-800/60 p-4 backdrop-blur"
              >
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm">
                  <p className="text-white/70">
                    {t.outgoing ? "À " : "De "}
                    <span className="font-display font-bold text-white">{t.otherUsername}</span>
                    {t.universeId !== universeId && (
                      <span className="ml-2 rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-white/45">
                        {t.universeName}
                      </span>
                    )}
                  </p>
                  <span className={`text-xs font-bold uppercase tracking-wider ${status.className}`}>
                    {status.label}
                  </span>
                </div>
                {t.message && (
                  <p className="mb-3 rounded-xl bg-void-900/60 px-3 py-2 text-sm italic text-white/60">
                    « {t.message} »
                  </p>
                )}
                <div className="grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                  <Lines title="Tu donnes" lines={t.give} />
                  <span aria-hidden className="hidden text-2xl text-white/25 sm:block">⇄</span>
                  <Lines title="Tu reçois" lines={t.receive} />
                </div>
                {children && (
                  <div className="mt-4 flex flex-wrap justify-end gap-2">{children(t)}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function Lines({ title, lines }: { title: string; lines: TradeLine[] }) {
  return (
    <div>
      <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">{title}</p>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
        {lines.map((line) => (
          <div key={line.characterId} className="relative">
            <CardArt card={line} />
            {line.quantity > 1 && (
              <span className="absolute -right-1 -top-1 z-30 rounded-full bg-domain px-1.5 text-[10px] font-black text-white">
                ×{line.quantity}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Composeur
// ──────────────────────────────────────────────────────────────────────────

type Picks = Record<string, number>;

function toLines(picks: Picks) {
  return Object.entries(picks)
    .filter(([, q]) => q > 0)
    .map(([characterId, quantity]) => ({ characterId, quantity }));
}

const total = (picks: Picks) => Object.values(picks).reduce((a, b) => a + b, 0);

function TradeComposer({
  friend,
  pending,
  onCancel,
  onSubmit,
}: {
  friend: FriendView | null;
  pending: boolean;
  onCancel: () => void;
  onSubmit: (
    give: { characterId: string; quantity: number }[],
    take: { characterId: string; quantity: number }[],
    message: string,
  ) => void;
}) {
  const [data, setData] = useState<{ mine: SpareCard[]; theirs: SpareCard[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [give, setGive] = useState<Picks>({});
  const [take, setTake] = useState<Picks>({});
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!friend) return;
    let alive = true;
    void loadTradeSparesAction(friend.userId).then((res) => {
      if (!alive) return;
      if (res.ok && res.mine && res.theirs) setData({ mine: res.mine, theirs: res.theirs });
      else setError(res.error ?? "Chargement impossible.");
    });
    return () => {
      alive = false;
    };
  }, [friend]);

  if (!friend) return null;

  const ready = total(give) > 0 && total(take) > 0;

  return (
    <div className="rounded-2xl border border-domain/30 bg-void-800/70 p-4 backdrop-blur sm:p-6">
      <h3 className="font-display text-lg font-black uppercase tracking-wider text-white/85">
        Échange avec {friend.username}
      </h3>
      <p className="mt-1 text-sm text-white/45">
        Seuls les doublons s&apos;échangent ({MAX_TRADE_CARDS} cartes max de chaque côté).
        Les cartes sont vérifiées à nouveau quand ton ami accepte.
      </p>

      {error ? (
        <p className="mt-4 text-sm text-cursed-light">{error}</p>
      ) : !data ? (
        <p className="mt-6 animate-pulse text-sm text-white/45">Chargement des doublons…</p>
      ) : (
        <>
          <div className="mt-6 grid gap-8 lg:grid-cols-2">
            <SparePicker
              title="Tu donnes"
              cards={data.mine}
              picks={give}
              onChange={setGive}
              empty="Tu n'as aucun doublon dans cet univers."
            />
            <SparePicker
              title={`Tu demandes à ${friend.username}`}
              cards={data.theirs}
              picks={take}
              onChange={setTake}
              empty={`${friend.username} n'a aucun doublon dans cet univers.`}
            />
          </div>

          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={TRADE_MESSAGE_MAX}
            rows={2}
            placeholder="Petit mot (optionnel)"
            className="mt-6 w-full resize-none rounded-xl border border-white/10 bg-void-900/70 px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-domain/60 focus:outline-none"
          />
        </>
      )}

      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-white/10 px-5 py-2 text-xs font-bold uppercase tracking-wider text-white/50 hover:text-white"
        >
          Fermer
        </button>
        <button
          type="button"
          disabled={!ready || pending}
          onClick={() => onSubmit(toLines(give), toLines(take), message)}
          className="rounded-full bg-domain px-5 py-2 text-xs font-black uppercase tracking-wider text-white shadow-glow transition-transform hover:scale-105 disabled:scale-100 disabled:opacity-40"
        >
          Envoyer l&apos;offre
        </button>
      </div>
    </div>
  );
}

function SparePicker({
  title,
  cards,
  picks,
  onChange,
  empty,
}: {
  title: string;
  cards: SpareCard[];
  picks: Picks;
  onChange: (picks: Picks) => void;
  empty: string;
}) {
  const used = total(picks);
  const sorted = [...cards].sort(
    (a, b) => rarityRank(b.rarity) - rarityRank(a.rarity) || a.name.localeCompare(b.name, "fr"),
  );
  const set = (id: string, q: number) => onChange({ ...picks, [id]: q });

  return (
    <div>
      <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-white/45">
        {title} <span className="text-white/25">· {used}/{MAX_TRADE_CARDS}</span>
      </p>
      {sorted.length === 0 ? (
        <p className="rounded-xl border border-white/10 px-4 py-6 text-center text-sm text-white/40">
          {empty}
        </p>
      ) : (
        <div className="grid max-h-[28rem] grid-cols-3 gap-3 overflow-y-auto pr-1 sm:grid-cols-4">
          {sorted.map((card) => {
            const q = picks[card.characterId] ?? 0;
            return (
              <div key={card.characterId} className="flex flex-col gap-1.5">
                <div className={`rounded-2xl ${q > 0 ? "ring-2 ring-domain" : ""}`}>
                  <CardArt card={card} />
                </div>
                <div className="flex items-center justify-between rounded-full border border-white/10 bg-void-900/70 text-xs">
                  <button
                    type="button"
                    aria-label={`Retirer un ${card.name}`}
                    disabled={q === 0}
                    onClick={() => set(card.characterId, q - 1)}
                    className="px-2.5 py-1 text-white/60 hover:text-white disabled:opacity-30"
                  >
                    −
                  </button>
                  <span className="font-bold text-white/80">
                    {q}/{card.spare}
                  </span>
                  <button
                    type="button"
                    aria-label={`Ajouter un ${card.name}`}
                    disabled={q >= card.spare || used >= MAX_TRADE_CARDS}
                    onClick={() => set(card.characterId, q + 1)}
                    className="px-2.5 py-1 text-white/60 hover:text-white disabled:opacity-30"
                  >
                    +
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
