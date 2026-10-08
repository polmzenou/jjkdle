"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  deleteNotificationAction,
  loadInboxAction,
} from "@/app/[universe]/account/social/actions";
import { CloseIcon } from "@/components/cards/CardIcons";
import { CoinIcon } from "@/components/progress/CoinWallet";
import { UniverseLink } from "@/components/universe/UniverseLink";
import { SOCIAL_EVENTS } from "@/lib/social/events";
import type { ConversationView, NotificationView } from "@/lib/social/types";
import { NOTIFICATION_KIND, ago } from "./NotificationsPanel";
import { PlayerChip } from "./PlayerChip";
import { FriendsIcon } from "./SocialLink";
import { useUserChannel } from "./useUserChannel";

type Tab = "messages" | "notifications";

/**
 * Bulle flottante « boîte de réception », empilée au-dessus de la bulle « ? »
 * du tutoriel. Au clic, ouvre une petite boîte en bas à droite listant les
 * notifications du compte et les conversations en cours (celles qui ont au
 * moins un message). Une conversation mène au hub social, fil ouvert.
 *
 * Le contenu est chargé à l'ouverture (server action) puis rechargé en direct
 * via le canal Pusher privé tant que la boîte est ouverte. La pastille compte
 * les messages non lus ; un point signale une notification arrivée depuis la
 * dernière ouverture.
 */
export function InboxBubble({
  userId,
  unread,
}: {
  userId: string;
  /** Messages non lus (rendu serveur). */
  unread: number;
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>(unread > 0 ? "messages" : "notifications");
  const [count, setCount] = useState(unread);
  const [newNotif, setNewNotif] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{
    notifications: NotificationView[];
    conversations: ConversationView[];
  } | null>(null);

  useEffect(() => setCount(unread), [unread]);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await loadInboxAction();
    setLoading(false);
    if (!res.ok) return;
    const conversations = res.conversations ?? [];
    setData({ notifications: res.notifications ?? [], conversations });
    setCount(conversations.reduce((sum, c) => sum + c.unread, 0));
  }, []);

  const close = useCallback(() => setOpen(false), []);

  const toggle = () => {
    if (open) return close();
    setOpen(true);
    setNewNotif(false);
    void load();
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  useUserChannel(userId, {
    [SOCIAL_EVENTS.message]: () => {
      if (open) void load();
      else setCount((n) => n + 1);
    },
    [SOCIAL_EVENTS.notification]: () => {
      if (open) void load();
      else setNewNotif(true);
    },
    [SOCIAL_EVENTS.coins]: () => {
      if (open) void load();
      else setNewNotif(true);
    },
  });

  const removeNotification = (id: string) => {
    setData((d) =>
      d ? { ...d, notifications: d.notifications.filter((n) => n.id !== id) } : d,
    );
    void deleteNotificationAction(id);
  };

  const tabs: { key: Tab; label: string; badge: number }[] = [
    { key: "messages", label: "Messages", badge: count },
    { key: "notifications", label: "Notifications", badge: data?.notifications.length ?? 0 },
  ];

  return (
    <>
      {/* ── Bulle (au-dessus du « ? » de TutorialButton) ── */}
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls="inbox-box"
        aria-label={count > 0 ? `Boîte de réception (${count} non lus)` : "Boîte de réception"}
        title="Notifications & messages"
        className="fixed bottom-[5.5rem] right-6 z-40 grid h-12 w-12 place-items-center rounded-full border border-white/15 bg-void-800/90 text-white/80 shadow-glow backdrop-blur transition-transform hover:scale-110 hover:text-white active:scale-95 sm:bottom-[5.75rem] sm:right-7"
      >
        <FriendsIcon className="h-[22px] w-[22px]" />
        {count > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-domain px-1 text-[11px] font-black leading-none text-white ring-2 ring-void-900">
            {count > 9 ? "9+" : count}
          </span>
        ) : (
          newNotif && (
            <span
              aria-hidden
              className="absolute right-0 top-0 h-3 w-3 rounded-full bg-domain ring-2 ring-void-900"
            />
          )
        )}
      </button>

      {/* ── Boîte ── */}
      <AnimatePresence>
        {open && (
          <motion.section
            id="inbox-box"
            role="dialog"
            aria-label="Boîte de réception"
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ type: "spring", damping: 28, stiffness: 340 }}
            className="fixed bottom-3 left-3 right-3 z-50 flex max-h-[min(32rem,calc(100vh-1.5rem))] flex-col overflow-hidden rounded-2xl border border-white/10 bg-void-900/95 shadow-[0_24px_80px_-20px_rgb(var(--color-domain)/0.45)] sm:bottom-6 sm:left-auto sm:right-24 sm:w-[22rem]"
          >
            <header className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
              <h2 className="font-display text-sm font-black uppercase tracking-[0.14em] text-white">
                Boîte de réception
              </h2>
              <button
                type="button"
                onClick={close}
                aria-label="Fermer"
                className="grid h-8 w-8 place-items-center rounded-full bg-white/5 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
              >
                <CloseIcon />
              </button>
            </header>

            <div className="flex gap-1 px-3 pt-3" role="tablist">
              {tabs.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.key}
                  onClick={() => setTab(t.key)}
                  className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors ${
                    tab === t.key
                      ? "bg-domain/20 text-white"
                      : "text-white/40 hover:bg-white/5 hover:text-white/70"
                  }`}
                >
                  {t.label}
                  {t.badge > 0 && (
                    <span className="ml-1.5 text-domain-light">{t.badge}</span>
                  )}
                </button>
              ))}
            </div>

            <div className="min-h-[10rem] flex-1 overflow-y-auto p-2">
              {!data ? (
                <p className="py-10 text-center text-sm text-white/40">
                  {loading ? "Chargement…" : "Impossible de charger."}
                </p>
              ) : tab === "messages" ? (
                <ConversationList
                  me={userId}
                  conversations={data.conversations}
                  onOpen={close}
                />
              ) : (
                <NotificationList
                  notifications={data.notifications}
                  onRemove={removeNotification}
                />
              )}
            </div>

            <footer className="border-t border-white/10 px-4 py-2.5 text-right">
              <UniverseLink
                href="/account/social"
                onClick={close}
                className="text-xs font-bold uppercase tracking-wider text-domain-light transition-colors hover:text-white"
              >
                Ouvrir le hub social →
              </UniverseLink>
            </footer>
          </motion.section>
        )}
      </AnimatePresence>
    </>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-10 text-center text-sm text-white/40">{children}</p>;
}

function ConversationList({
  me,
  conversations,
  onOpen,
}: {
  me: string;
  conversations: ConversationView[];
  onOpen: () => void;
}) {
  if (conversations.length === 0) return <Empty>Aucune conversation en cours.</Empty>;
  return (
    <ul className="space-y-1">
      {conversations.map((c) => {
        const last = c.lastMessage!;
        return (
          <li key={c.friendId}>
            <UniverseLink
              href={`/account/social?tab=messages&with=${encodeURIComponent(c.friendId)}`}
              onClick={onOpen}
              className="flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-white/5"
            >
              <div className="min-w-0 flex-1">
                <PlayerChip decor={c.decor} size={32} showTitle={false} link={false} />
                <p
                  className={`mt-1 truncate pl-11 text-xs ${
                    c.unread > 0 ? "font-semibold text-white/85" : "text-white/45"
                  }`}
                >
                  {last.senderId === me && <span className="text-white/35">Toi : </span>}
                  {last.body}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <time
                  dateTime={last.createdAt}
                  suppressHydrationWarning
                  className="text-[10px] text-white/30"
                >
                  {ago(last.createdAt)}
                </time>
                {c.unread > 0 && (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-domain px-1 text-[10px] font-black leading-none text-white">
                    {c.unread > 9 ? "9+" : c.unread}
                  </span>
                )}
              </div>
            </UniverseLink>
          </li>
        );
      })}
    </ul>
  );
}

function NotificationList({
  notifications,
  onRemove,
}: {
  notifications: NotificationView[];
  onRemove: (id: string) => void;
}) {
  if (notifications.length === 0) return <Empty>Aucune notification.</Empty>;
  return (
    <ul className="divide-y divide-white/5">
      {notifications.map((n) => {
        const kind = NOTIFICATION_KIND[n.kind];
        const amount = (n.amount ?? 0).toLocaleString("fr-FR");
        const isCoins = n.kind === "COINS_RECEIVED" || n.kind === "COINS_SENT";
        return (
          <li key={n.id} className="flex items-center gap-2 px-2 py-2">
            <div className="min-w-0 flex-1">
              {n.actor ? (
                <PlayerChip decor={n.actor} size={28} showTitle={false} />
              ) : (
                <span className="text-sm italic text-white/40">Un joueur</span>
              )}
              <p className={`mt-1 flex items-center gap-1 pl-10 text-xs ${kind.accent}`}>
                {isCoins && <CoinIcon className="h-3 w-3" />}
                {kind.text(amount)}
              </p>
            </div>
            <time
              dateTime={n.createdAt}
              suppressHydrationWarning
              className="shrink-0 text-[10px] text-white/30"
            >
              {ago(n.createdAt)}
            </time>
            <button
              type="button"
              onClick={() => onRemove(n.id)}
              aria-label="Supprimer la notification"
              title="Supprimer"
              className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-white/35 transition-colors hover:bg-cursed/15 hover:text-cursed-light"
            >
              <CloseIcon className="h-3 w-3" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
