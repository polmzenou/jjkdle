"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FriendsPanel } from "@/components/social/FriendsPanel";
import { TradesPanel } from "@/components/social/TradesPanel";
import { MessagesPanel } from "@/components/social/MessagesPanel";
import { NotificationsPanel } from "@/components/social/NotificationsPanel";
import { showSocialToast } from "@/components/social/SocialToaster";
import { useUserChannel } from "@/components/social/useUserChannel";
import { SOCIAL_EVENTS } from "@/lib/social/events";
import type {
  ConversationView,
  FriendRequestView,
  FriendView,
  NotificationView,
  TradeView,
} from "@/lib/social/types";

export type SocialTab = "friends" | "trades" | "messages";

/** Résultat commun des server actions sociales. */
export type SocialRun = (
  action: () => Promise<{ ok: boolean; error?: string; message?: string }>,
  onSuccess?: () => void,
) => void;

interface SocialHubProps {
  me: { id: string; username: string };
  initialTab: SocialTab;
  initialChatWith: string | null;
  friends: FriendView[];
  requests: { received: FriendRequestView[]; sent: FriendRequestView[] };
  trades: TradeView[];
  conversations: ConversationView[];
  notifications: NotificationView[];
  /** Solde de coins du joueur (pour l'envoi de coins). */
  coins: number;
  universeId: string;
}

/**
 * Hub social : bloc Notifications (masqué s'il est vide) puis onglets
 * Amis / Échanges / Messages.
 *
 * Même motif de mutation que `DeckManager` (useTransition + server action +
 * `router.refresh()` + bandeau de feedback). Le canal Pusher privé rafraîchit
 * la page quand une demande d'ami ou une offre arrive ; les messages, eux,
 * sont gérés en direct par `MessagesPanel`.
 */
export function SocialHub({
  me,
  initialTab,
  initialChatWith,
  friends,
  requests,
  trades,
  conversations,
  notifications,
  coins,
  universeId,
}: SocialHubProps) {
  const router = useRouter();
  const [tab, setTab] = useState<SocialTab>(initialTab);
  const [chatWith, setChatWith] = useState<string | null>(initialChatWith);
  const [tradeWith, setTradeWith] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  // Liens `?tab=…&with=…` suivis alors qu'on est déjà sur la page (ex. depuis
  // la bulle « boîte de réception ») : le state initial ne se relit pas seul.
  useEffect(() => {
    setTab(initialTab);
    if (initialChatWith) setChatWith(initialChatWith);
  }, [initialTab, initialChatWith]);

  const run: SocialRun = (action, onSuccess) => {
    setFeedback(null);
    startTransition(async () => {
      const res = await action();
      if (res.ok) {
        if (res.message) setFeedback({ ok: true, msg: res.message });
        onSuccess?.();
      } else {
        setFeedback({ ok: false, msg: res.error ?? "Échec." });
      }
      router.refresh();
    });
  };

  useUserChannel(
    me.id,
    {
      [SOCIAL_EVENTS.friend]: () => router.refresh(),
      [SOCIAL_EVENTS.trade]: () => router.refresh(),
      [SOCIAL_EVENTS.coins]: () => router.refresh(),
      [SOCIAL_EVENTS.notification]: () => router.refresh(),
    },
    { ms: 20_000, poll: () => router.refresh() },
  );

  const incomingTrades = trades.filter((t) => !t.outgoing && t.status === "PENDING").length;
  const unread = conversations.reduce((sum, c) => sum + c.unread, 0);

  const tabs: { key: SocialTab; label: string; badge: number }[] = [
    { key: "friends", label: "Amis", badge: requests.received.length },
    { key: "trades", label: "Échanges", badge: incomingTrades },
    { key: "messages", label: "Messages", badge: unread },
  ];

  return (
    <div className="space-y-8">
      <NotificationsPanel notifications={notifications} />

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`border-b-2 pb-1 font-display text-xl font-bold uppercase tracking-wider transition-colors ${
              tab === t.key
                ? "border-domain text-white/90"
                : "border-transparent text-white/35 hover:text-white/65"
            }`}
          >
            {t.label}
            {t.badge > 0 && (
              <span className="ml-2 rounded-full bg-domain/20 px-2.5 py-0.5 align-middle text-sm text-domain-light">
                {t.badge}
              </span>
            )}
          </button>
        ))}
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

      {tab === "friends" && (
        <FriendsPanel
          friends={friends}
          requests={requests}
          coins={coins}
          pending={pending}
          run={run}
          onCoinsSent={(player, amount) =>
            showSocialToast({ kind: "coins-sent", player, amount })
          }
          onTrade={(id) => {
            setTradeWith(id);
            setTab("trades");
          }}
          onMessage={(id) => {
            setChatWith(id);
            setTab("messages");
          }}
        />
      )}
      {tab === "trades" && (
        <TradesPanel
          friends={friends}
          trades={trades}
          universeId={universeId}
          composeWith={tradeWith}
          onComposeChange={setTradeWith}
          pending={pending}
          run={run}
        />
      )}
      {tab === "messages" && (
        <MessagesPanel
          me={me}
          conversations={conversations}
          active={chatWith}
          onSelect={setChatWith}
        />
      )}
    </div>
  );
}
