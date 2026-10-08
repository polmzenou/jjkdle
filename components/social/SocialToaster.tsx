"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CoinIcon } from "@/components/progress/CoinWallet";
import { SOCIAL_EVENTS, SOCIAL_TOAST_EVENT } from "@/lib/social/events";
import type { CoinsReceivedPayload, PlayerDecorView } from "@/lib/social/types";
import { PlayerChip } from "./PlayerChip";
import { useUserChannel } from "./useUserChannel";

/** Toast social affichable : un joueur + un montant de coins. */
export interface SocialToast {
  kind: "coins-received" | "coins-sent";
  player: PlayerDecorView;
  amount: number;
}

type Shown = SocialToast & { id: number };

const DURATION_MS = 6000;
let nextId = 0;

/** Affiche un toast social depuis n'importe quel composant client. */
export function showSocialToast(toast: SocialToast): void {
  window.dispatchEvent(new CustomEvent<SocialToast>(SOCIAL_TOAST_EVENT, { detail: toast }));
}

/**
 * Notifications « push » à l'écran, montées dans la nav (donc sur toutes les
 * pages d'univers) :
 *  - le RECEVEUR d'un envoi de coins est prévenu en direct par Pusher (pseudo
 *    décoré + montant), et son portemonnaie se rafraîchit ;
 *  - le DONNEUR reçoit la confirmation via `showSocialToast` (événement window).
 * Style calqué sur `BadgeToast`.
 */
export function SocialToaster({ userId }: { userId: string }) {
  const router = useRouter();
  const [toasts, setToasts] = useState<Shown[]>([]);

  const push = (toast: SocialToast) => {
    const id = ++nextId;
    setToasts((list) => [...list.slice(-2), { ...toast, id }]);
    window.setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), DURATION_MS);
  };

  useEffect(() => {
    const onToast = (e: Event) => push((e as CustomEvent<SocialToast>).detail);
    window.addEventListener(SOCIAL_TOAST_EVENT, onToast);
    return () => window.removeEventListener(SOCIAL_TOAST_EVENT, onToast);
  }, []);

  useUserChannel(userId, {
    [SOCIAL_EVENTS.coins]: (payload) => {
      const p = payload as CoinsReceivedPayload;
      push({ kind: "coins-received", player: p.from, amount: p.amount });
      router.refresh(); // solde du header
    },
  });

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed bottom-4 right-4 z-[120] flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className="pointer-events-auto flex items-center gap-3 rounded-xl border border-amber-400/40 bg-void-800/95 px-4 py-3 shadow-2xl animate-float"
        >
          <CoinIcon className="h-8 w-8 shrink-0 text-amber-300" />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-white/45">
              {t.kind === "coins-received" ? "Coins reçus" : "Envoi réalisé"}
            </p>
            <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm text-white/80">
              {t.kind === "coins-sent" && <span>Tu as envoyé</span>}
              <span className="font-display font-black tabular-nums text-amber-300">
                {t.amount.toLocaleString("fr-FR")} coins
              </span>
              <span>{t.kind === "coins-received" ? "de" : "à"}</span>
              <PlayerChip decor={t.player} size={26} showTitle={false} link={false} />
            </div>
          </div>
          <button
            type="button"
            onClick={() => setToasts((list) => list.filter((x) => x.id !== t.id))}
            aria-label="Fermer"
            className="shrink-0 self-start text-white/30 hover:text-white/70"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
