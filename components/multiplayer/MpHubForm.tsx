"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createLobbyAction, joinLobbyAction } from "@/lib/multiplayer/actions";

/**
 * Hub multijoueur : créer un lobby privé ou en rejoindre un via son code.
 * Builder uniquement pour l'instant.
 */
export function MpHubForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function go(action: () => Promise<{ ok: boolean; error?: string; code?: string }>) {
    setError(null);
    startTransition(async () => {
      const res = await action();
      if (!res.ok || !res.code) {
        setError(res.error ?? "Une erreur est survenue.");
        return;
      }
      router.push(`/games/multiplayer/${res.code}`);
    });
  }

  return (
    <div className="mx-auto w-full max-w-md space-y-6">
      <button
        type="button"
        disabled={pending}
        onClick={() => go(() => createLobbyAction())}
        className="w-full rounded-2xl bg-domain px-6 py-4 font-display text-lg font-bold uppercase tracking-wide text-white shadow-glow transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-60"
      >
        Créer un lobby privé
      </button>

      <div className="flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-white/30">
        <span className="h-px flex-1 bg-white/10" />
        ou
        <span className="h-px flex-1 bg-white/10" />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (code.trim()) go(() => joinLobbyAction(code));
        }}
        className="space-y-3"
      >
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="CODE DU LOBBY"
          maxLength={6}
          autoCapitalize="characters"
          className="w-full rounded-xl border border-white/10 bg-void-800 px-4 py-3 text-center font-display text-xl uppercase tracking-[0.4em] text-white placeholder:tracking-[0.2em] placeholder:text-white/25 focus:border-domain-light focus:outline-none"
        />
        <button
          type="submit"
          disabled={pending || !code.trim()}
          className="w-full rounded-xl border border-domain/40 bg-domain/10 px-6 py-3 font-display font-bold uppercase tracking-wide text-domain-light transition-colors hover:bg-domain/20 disabled:opacity-40"
        >
          Rejoindre
        </button>
      </form>

      {error && (
        <p className="rounded-xl border border-cursed/30 bg-cursed/10 px-4 py-3 text-center text-sm text-cursed-light">
          {error}
        </p>
      )}
    </div>
  );
}
