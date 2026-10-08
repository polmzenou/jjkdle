"use client";

import { useEffect, useState } from "react";
import {
  clearNotificationsAction,
  deleteNotificationAction,
} from "@/app/[universe]/account/social/actions";
import { CoinIcon } from "@/components/progress/CoinWallet";
import type { NotificationKindView, NotificationView } from "@/lib/social/types";
import { PlayerChip } from "./PlayerChip";

/** Texte et couleur de chaque type de notification (aussi utilisé par `InboxBubble`). */
export const NOTIFICATION_KIND: Record<
  NotificationKindView,
  { text: (amount: string) => string; accent: string }
> = {
  COINS_RECEIVED: { text: (a) => `t'a envoyé ${a} coins`, accent: "text-amber-300" },
  COINS_SENT: { text: (a) => `a reçu tes ${a} coins`, accent: "text-amber-300/80" },
  FRIEND_ACCEPTED: { text: () => "a accepté ta demande d'ami", accent: "text-emerald-300" },
  TRADE_RECEIVED: { text: () => "te propose un échange", accent: "text-domain-light" },
  TRADE_ACCEPTED: { text: () => "a accepté ton échange", accent: "text-emerald-300" },
  TRADE_DECLINED: { text: () => "a refusé ton échange", accent: "text-white/50" },
};

const rtf = new Intl.RelativeTimeFormat("fr-FR", { numeric: "auto" });

/** « il y a 5 min », « hier »… */
export function ago(iso: string): string {
  const s = Math.round((new Date(iso).getTime() - Date.now()) / 1000);
  const abs = Math.abs(s);
  if (abs < 60) return "à l'instant";
  if (abs < 3600) return rtf.format(Math.round(s / 60), "minute");
  if (abs < 86_400) return rtf.format(Math.round(s / 3600), "hour");
  return rtf.format(Math.round(s / 86_400), "day");
}

/**
 * Bloc NOTIFICATIONS du hub social : coins reçus/envoyés, ami accepté, offres
 * d'échange. Chaque notification se supprime à la croix (optimiste, puis
 * server action). Le bloc n'est pas rendu quand il est vide.
 */
export function NotificationsPanel({
  notifications,
}: {
  notifications: NotificationView[];
}) {
  const [items, setItems] = useState(notifications);
  useEffect(() => setItems(notifications), [notifications]);

  if (items.length === 0) return null;

  const remove = (id: string) => {
    setItems((list) => list.filter((n) => n.id !== id));
    void deleteNotificationAction(id);
  };
  const clear = () => {
    setItems([]);
    void clearNotificationsAction();
  };

  return (
    <section aria-label="Notifications">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-xs font-bold uppercase tracking-[0.25em] text-white/45">
          Notifications <span className="text-white/25">· {items.length}</span>
        </h2>
        {items.length > 1 && (
          <button
            type="button"
            onClick={clear}
            className="text-[11px] font-bold uppercase tracking-wider text-white/35 transition-colors hover:text-cursed-light"
          >
            Tout effacer
          </button>
        )}
      </div>
      <ul className="max-h-80 divide-y divide-white/5 overflow-y-auto rounded-2xl border border-white/10 bg-void-800/60 backdrop-blur">
        {items.map((n) => {
          const kind = NOTIFICATION_KIND[n.kind];
          const amount = (n.amount ?? 0).toLocaleString("fr-FR");
          const isCoins = n.kind === "COINS_RECEIVED" || n.kind === "COINS_SENT";
          return (
            <li key={n.id} className="flex items-center gap-3 px-4 py-2.5">
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
                {n.actor ? (
                  <PlayerChip decor={n.actor} size={30} showTitle={false} />
                ) : (
                  <span className="text-sm italic text-white/40">Un joueur</span>
                )}
                <span className={`inline-flex items-center gap-1 text-sm ${kind.accent}`}>
                  {isCoins && <CoinIcon className="h-3.5 w-3.5" />}
                  {kind.text(amount)}
                </span>
              </div>
              <time dateTime={n.createdAt} suppressHydrationWarning className="shrink-0 text-[11px] text-white/30">
                {ago(n.createdAt)}
              </time>
              <button
                type="button"
                onClick={() => remove(n.id)}
                aria-label="Supprimer la notification"
                title="Supprimer"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white/35 transition-colors hover:bg-cursed/15 hover:text-cursed-light"
              >
                <svg aria-hidden viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
