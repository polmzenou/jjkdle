"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { loginAction } from "./actions";

/** Écran de connexion admin (mot de passe). */
export function AdminLogin() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await loginAction(password);
      if (res.ok) router.refresh();
      else setError(res.error ?? "Échec.");
    });
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <h1 className="text-center font-display text-3xl font-black uppercase tracking-wider text-white">
        Admin <span className="text-glow text-domain-light">JJK</span>
      </h1>
      <p className="mt-2 text-center text-sm text-white/45">
        Accès restreint — mot de passe requis.
      </p>

      <form onSubmit={submit} className="mt-8 space-y-4">
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mot de passe"
          autoFocus
          className="w-full rounded-xl border border-white/10 bg-void-800/70 px-4 py-3 text-white outline-none focus:border-domain"
        />
        {error && <p className="text-sm text-cursed-light">{error}</p>}
        <button
          type="submit"
          disabled={pending || !password}
          className="w-full rounded-xl bg-domain px-4 py-3 font-display font-bold uppercase tracking-wide text-white shadow-glow transition-transform enabled:hover:scale-[1.02] disabled:opacity-40"
        >
          {pending ? "Connexion…" : "Entrer"}
        </button>
      </form>
    </main>
  );
}
