"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loginAction } from "@/lib/auth/actions";

/** Formulaire de connexion (email ou pseudo + mot de passe). */
export function LoginForm() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await loginAction({ identifier, password });
      if (res.ok) {
        router.push("/games");
        router.refresh();
      } else {
        setError(res.error ?? "Échec de la connexion.");
      }
    });
  };

  return (
    <form onSubmit={submit} className="mt-8 space-y-4">
      <input
        type="text"
        value={identifier}
        onChange={(e) => setIdentifier(e.target.value)}
        placeholder="Email ou pseudo"
        autoFocus
        autoComplete="username"
        className="w-full rounded-xl border border-white/10 bg-void-800/70 px-4 py-3 text-white outline-none focus:border-domain"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Mot de passe"
        autoComplete="current-password"
        className="w-full rounded-xl border border-white/10 bg-void-800/70 px-4 py-3 text-white outline-none focus:border-domain"
      />

      {error && <p className="text-sm text-cursed-light">{error}</p>}

      <button
        type="submit"
        disabled={pending || !identifier || !password}
        className="w-full rounded-xl bg-domain px-4 py-3 font-display font-bold uppercase tracking-wide text-white shadow-glow transition-transform enabled:hover:scale-[1.02] disabled:opacity-40"
      >
        {pending ? "Connexion…" : "Se connecter"}
      </button>

      <p className="text-center text-sm text-white/50">
        Pas encore de compte&nbsp;?{" "}
        <Link
          href="/register"
          className="font-semibold text-domain-light hover:underline"
        >
          Créer un compte
        </Link>
      </p>
    </form>
  );
}
