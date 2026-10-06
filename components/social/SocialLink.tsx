"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { UniverseLink } from "@/components/universe/UniverseLink";
import { SOCIAL_EVENTS } from "@/lib/social/events";
import { useUserChannel } from "./useUserChannel";

/** Deux silhouettes, dimensionnées par `className` (SVG maison, cf. CartIcon). */
function FriendsIcon({ className = "h-[18px] w-[18px]" }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 19.5c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" />
      <path d="M15.5 4.9a3.2 3.2 0 0 1 0 6.2M17.5 14.3c2 .7 3.5 2.6 3.5 5.2" />
    </svg>
  );
}

/**
 * Accès au hub SOCIAL depuis la nav, avec une pastille = demandes d'ami +
 * offres d'échange reçues + messages non lus.
 *
 * Le compteur initial vient du serveur ; il s'incrémente en direct via le
 * canal Pusher privé et se remet à jour (prop) à chaque navigation.
 */
export function SocialLink({ userId, count }: { userId: string; count: number }) {
  const [live, setLive] = useState(count);
  const pathname = usePathname();
  const onSocialPage = pathname?.endsWith("/account/social") ?? false;

  useEffect(() => setLive(count), [count]);

  const bump = () => {
    if (!onSocialPage) setLive((n) => n + 1);
  };
  useUserChannel(onSocialPage ? null : userId, {
    [SOCIAL_EVENTS.message]: bump,
    [SOCIAL_EVENTS.friend]: bump,
    [SOCIAL_EVENTS.trade]: bump,
    [SOCIAL_EVENTS.coins]: bump,
  });

  return (
    <UniverseLink
      href="/account/social"
      aria-label={live > 0 ? `Amis (${live} nouveautés)` : "Amis"}
      title="Amis & échanges"
      className="relative flex items-center rounded-full border border-white/10 bg-white/[0.03] p-2 text-white/70 transition-colors hover:border-domain/50 hover:text-white"
    >
      <FriendsIcon />
      {live > 0 && (
        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-domain px-1 text-[10px] font-black leading-none text-white">
          {live > 9 ? "9+" : live}
        </span>
      )}
    </UniverseLink>
  );
}
