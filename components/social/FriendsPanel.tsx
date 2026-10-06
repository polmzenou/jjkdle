"use client";

import { useState } from "react";
import {
  cancelFriendRequestAction,
  removeFriendAction,
  respondFriendRequestAction,
  sendCoinsAction,
  sendFriendRequestAction,
} from "@/app/[universe]/account/social/actions";
import { CoinIcon } from "@/components/progress/CoinWallet";
import { parseCoinAmount } from "@/lib/social/coins-amount";
import type {
  FriendRequestView,
  FriendView,
  PlayerDecorView,
} from "@/lib/social/types";
import { PlayerChip } from "./PlayerChip";
import type { SocialRun } from "./SocialHub";

const BTN =
  "rounded-full border px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-colors disabled:opacity-40";
const BTN_GHOST = `${BTN} border-white/10 bg-void-800/80 text-white/60 hover:border-domain/50 hover:text-white`;
const BTN_PRIMARY = `${BTN} border-domain/60 bg-domain/20 text-domain-light hover:bg-domain/30`;
const BTN_DANGER = `${BTN} border-white/10 bg-void-800/80 text-white/40 hover:border-cursed/50 hover:text-cursed-light`;
const BTN_COINS = `${BTN} border-amber-400/40 bg-amber-400/10 text-amber-300 hover:bg-amber-400/20`;

/** Montants rapides du formulaire d'envoi de coins. */
const QUICK_AMOUNTS = [100, 1_000, 10_000];

/**
 * Onglet AMIS : ajout par pseudo, demandes reçues / envoyées, liste d'amis
 * (échange, envoi de coins, message, retrait).
 */
export function FriendsPanel({
  friends,
  requests,
  coins,
  pending,
  run,
  onTrade,
  onMessage,
  onCoinsSent,
}: {
  friends: FriendView[];
  requests: { received: FriendRequestView[]; sent: FriendRequestView[] };
  /** Solde courant du joueur (global). */
  coins: number;
  pending: boolean;
  run: SocialRun;
  onTrade: (friendId: string) => void;
  onMessage: (friendId: string) => void;
  onCoinsSent: (to: PlayerDecorView, amount: number) => void;
}) {
  const [username, setUsername] = useState("");
  const [giftTo, setGiftTo] = useState<string | null>(null);

  return (
    <div className="space-y-10">
      <form
        className="flex max-w-lg gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const name = username.trim();
          if (!name) return;
          run(() => sendFriendRequestAction(name), () => setUsername(""));
        }}
      >
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Pseudo du joueur"
          maxLength={64}
          aria-label="Pseudo du joueur à ajouter"
          className="min-w-0 flex-1 rounded-xl border border-white/10 bg-void-800/80 px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-domain/60 focus:outline-none"
        />
        <button
          type="submit"
          disabled={pending || !username.trim()}
          className="rounded-xl bg-domain px-5 py-2.5 text-sm font-black uppercase tracking-wider text-white shadow-glow transition-transform hover:scale-105 disabled:scale-100 disabled:opacity-40"
        >
          Ajouter
        </button>
      </form>

      {requests.received.length > 0 && (
        <Section title="Demandes reçues" count={requests.received.length}>
          {requests.received.map((r) => (
            <Row key={r.id} decor={r.decor}>
              <button
                type="button"
                disabled={pending}
                className={BTN_PRIMARY}
                onClick={() => run(() => respondFriendRequestAction(r.id, true))}
              >
                Accepter
              </button>
              <button
                type="button"
                disabled={pending}
                className={BTN_DANGER}
                onClick={() => run(() => respondFriendRequestAction(r.id, false))}
              >
                Refuser
              </button>
            </Row>
          ))}
        </Section>
      )}

      <Section title="Mes amis" count={friends.length}>
        {friends.length === 0 ? (
          <Empty>
            Pas encore d&apos;amis. Ajoute un joueur par son pseudo, ou depuis
            son profil public.
          </Empty>
        ) : (
          friends.map((f) => (
            <Row
              key={f.userId}
              decor={f.decor}
              extra={
                giftTo === f.userId && (
                  <CoinGiftForm
                    friend={f}
                    coins={coins}
                    pending={pending}
                    onCancel={() => setGiftTo(null)}
                    onSend={(amount) =>
                      run(
                        () => sendCoinsAction(f.userId, amount),
                        () => {
                          setGiftTo(null);
                          onCoinsSent(f.decor, amount);
                        },
                      )
                    }
                  />
                )
              }
            >
              <button type="button" className={BTN_PRIMARY} onClick={() => onTrade(f.userId)}>
                Échanger
              </button>
              <button
                type="button"
                aria-expanded={giftTo === f.userId}
                className={`${BTN_COINS} inline-flex items-center gap-1`}
                onClick={() => setGiftTo((cur) => (cur === f.userId ? null : f.userId))}
              >
                <CoinIcon className="h-3.5 w-3.5" /> Coins
              </button>
              <button type="button" className={BTN_GHOST} onClick={() => onMessage(f.userId)}>
                Message
              </button>
              <button
                type="button"
                disabled={pending}
                className={BTN_DANGER}
                onClick={() => {
                  if (window.confirm(`Retirer ${f.username} de tes amis ?`)) {
                    run(() => removeFriendAction(f.userId));
                  }
                }}
              >
                Retirer
              </button>
            </Row>
          ))
        )}
      </Section>

      {requests.sent.length > 0 && (
        <Section title="Demandes envoyées" count={requests.sent.length}>
          {requests.sent.map((r) => (
            <Row key={r.id} decor={r.decor} muted>
              <span className="text-xs text-white/35">En attente…</span>
              <button
                type="button"
                disabled={pending}
                className={BTN_DANGER}
                onClick={() => run(() => cancelFriendRequestAction(r.id))}
              >
                Annuler
              </button>
            </Row>
          ))}
        </Section>
      )}
    </div>
  );
}

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-white/45">
        {title} <span className="text-white/25">· {count}</span>
      </h2>
      <ul className="divide-y divide-white/5 overflow-hidden rounded-2xl border border-white/10 bg-void-800/60 backdrop-blur">
        {children}
      </ul>
    </section>
  );
}

function Row({
  decor,
  muted = false,
  extra,
  children,
}: {
  decor: PlayerDecorView;
  muted?: boolean;
  /** Contenu déplié sous la ligne (formulaire d'envoi de coins). */
  extra?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <li className="px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PlayerChip decor={decor} muted={muted} />
        <div className="flex flex-wrap items-center gap-2">{children}</div>
      </div>
      {extra}
    </li>
  );
}

/** Formulaire inline d'envoi de coins à un ami (sans contrepartie). */
function CoinGiftForm({
  friend,
  coins,
  pending,
  onSend,
  onCancel,
}: {
  friend: FriendView;
  coins: number;
  pending: boolean;
  onSend: (amount: number) => void;
  onCancel: () => void;
}) {
  const [raw, setRaw] = useState("");
  const amount = parseCoinAmount(raw);
  const tooMuch = amount != null && amount > coins;

  return (
    <form
      className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-amber-400/20 bg-amber-400/[0.04] p-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (amount != null && !tooMuch) onSend(amount);
      }}
    >
      <label className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-white/10 bg-void-900/80 px-3 py-2 focus-within:border-amber-400/50">
        <CoinIcon className="h-4 w-4 shrink-0 text-amber-300" />
        <input
          value={raw}
          onChange={(e) => setRaw(e.target.value.replace(/\D/g, ""))}
          inputMode="numeric"
          placeholder={`Montant pour ${friend.username}`}
          aria-label={`Montant de coins à envoyer à ${friend.username}`}
          autoFocus
          className="min-w-0 flex-1 bg-transparent text-sm tabular-nums text-white placeholder:text-white/30 focus:outline-none"
        />
      </label>
      {QUICK_AMOUNTS.filter((q) => q <= coins).map((q) => (
        <button key={q} type="button" className={BTN_GHOST} onClick={() => setRaw(String(q))}>
          {q.toLocaleString("fr-FR")}
        </button>
      ))}
      {coins >= 1 && (
        <button
          type="button"
          className={BTN_GHOST}
          onClick={() => setRaw(String(Math.floor(coins)))}
        >
          Max
        </button>
      )}
      <button
        type="submit"
        disabled={pending || amount == null || tooMuch}
        className="rounded-lg bg-amber-400 px-4 py-2 text-xs font-black uppercase tracking-wider text-void-900 transition-transform hover:scale-105 disabled:scale-100 disabled:opacity-40"
      >
        Envoyer
      </button>
      <button type="button" className={BTN_DANGER} onClick={onCancel}>
        Annuler
      </button>
      <p className={`w-full text-xs ${tooMuch ? "text-cursed-light" : "text-white/40"}`}>
        {tooMuch
          ? "Solde insuffisant."
          : `Ton solde : ${coins.toLocaleString("fr-FR")} coins. L'envoi est immédiat et sans contrepartie.`}
      </p>
    </form>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <li className="px-4 py-8 text-center text-sm text-white/45">{children}</li>;
}
