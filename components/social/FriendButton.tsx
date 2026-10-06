"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UniverseLink } from "@/components/universe/UniverseLink";
import {
  respondFriendRequestAction,
  sendFriendRequestAction,
} from "@/app/[universe]/account/social/actions";

export type FriendButtonState =
  | { kind: "none" }
  | { kind: "friends" }
  | { kind: "outgoing"; requestId: string }
  | { kind: "incoming"; requestId: string };

/** Bouton d'amitié du profil public (visiteur connecté, hors propriétaire). */
export function FriendButton({
  username,
  userId,
  state,
}: {
  username: string;
  userId: string;
  state: FriendButtonState;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = (action: () => Promise<{ ok: boolean; error?: string }>) => {
    setError(null);
    startTransition(async () => {
      const res = await action();
      if (!res.ok) setError(res.error ?? "Échec.");
      router.refresh();
    });
  };

  const base =
    "rounded-full px-4 py-2 text-xs font-black uppercase tracking-wider transition-colors disabled:opacity-40";

  return (
    <div className="flex flex-wrap items-center gap-2">
      {state.kind === "none" && (
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => sendFriendRequestAction(username))}
          className={`${base} bg-domain text-white shadow-glow hover:bg-domain/80`}
        >
          + Ajouter en ami
        </button>
      )}
      {state.kind === "outgoing" && (
        <span className={`${base} border border-white/10 text-white/45`}>Demande envoyée</span>
      )}
      {state.kind === "incoming" && (
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => respondFriendRequestAction(state.requestId, true))}
          className={`${base} bg-domain text-white shadow-glow hover:bg-domain/80`}
        >
          Accepter sa demande
        </button>
      )}
      {state.kind === "friends" && (
        <>
          <span className={`${base} border border-emerald-400/30 text-emerald-300`}>✓ Ami</span>
          <UniverseLink
            href={`/account/social?tab=messages&with=${encodeURIComponent(userId)}`}
            className={`${base} border border-white/10 text-white/60 hover:text-white`}
          >
            Message
          </UniverseLink>
        </>
      )}
      {error && <span className="text-xs text-cursed-light">{error}</span>}
    </div>
  );
}
