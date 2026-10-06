import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { listFriends, listPendingRequests } from "@/lib/social/friends";
import { listConversations } from "@/lib/social/messages";
import { listTrades } from "@/lib/cards/trade-store";
import { getCurrentUniverse } from "@/lib/universes/current";
import { SocialHub, type SocialTab } from "@/components/social/SocialHub";
import { UniverseLink } from "@/components/universe/UniverseLink";

export const metadata: Metadata = {
  title: "Amis",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const TABS: SocialTab[] = ["friends", "trades", "messages"];

/**
 * Hub SOCIAL du compte : amis, échanges de doublons, messagerie privée.
 *
 * Amis et messages sont globaux (comme le compte) ; une offre d'échange porte
 * sur les cartes d'UN univers — le composeur propose celles de l'univers
 * courant, la liste montre toutes les offres avec leur univers.
 *
 * `?tab=messages&with=<userId>` ouvre directement une conversation.
 */
export default async function SocialPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; with?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [universe, params] = await Promise.all([getCurrentUniverse(), searchParams]);
  const [friends, requests, trades, conversations] = await Promise.all([
    listFriends(user.id),
    listPendingRequests(user.id),
    listTrades(user.id),
    listConversations(user.id),
  ]);

  const tab = TABS.includes(params.tab as SocialTab)
    ? (params.tab as SocialTab)
    : "friends";

  return (
    <main className="mx-auto w-full max-w-[1600px] px-5 py-10 sm:px-6 sm:py-16 lg:w-3/4">
      <UniverseLink
        href="/account"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-white/50 transition-colors hover:text-white"
      >
        ← Mon compte
      </UniverseLink>

      <header className="mb-8">
        <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.3em] text-domain-light/70">
          <span
            aria-hidden
            className="h-px w-6 bg-gradient-to-r from-transparent to-domain-light/60"
          />
          仲間 · Social
        </span>
        <h1 className="mt-4 font-display text-3xl font-black tracking-tight text-white sm:text-4xl">
          Amis &amp; échanges
        </h1>
        <p className="mt-2 text-sm text-white/50">
          Échange tes doublons {universe.config.name} avec tes amis et discute
          avec eux en privé.
        </p>
      </header>

      <SocialHub
        me={{ id: user.id, username: user.username }}
        initialTab={tab}
        initialChatWith={params.with ?? null}
        friends={friends}
        requests={requests}
        trades={trades}
        conversations={conversations}
        universeId={universe.id}
      />
    </main>
  );
}
