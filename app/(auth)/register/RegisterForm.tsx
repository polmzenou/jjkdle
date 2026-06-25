"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { registerAction } from "@/lib/auth/actions";

/** Formulaire d'inscription (pseudo + email + mot de passe). */
export function RegisterForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await registerAction({ username, email, password });
      if (res.ok) {
        router.push("/games");
        router.refresh();
      } else {
        setError(res.error ?? "Échec de l'inscription.");
      }
    });
  };

  return (
    <form onSubmit={submit} className="mt-8 space-y-4">
      <input
        type="text"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="Pseudo (3-24 caractères)"
        autoFocus
        autoComplete="username"
        className="w-full rounded-xl border border-white/10 bg-void-800/70 px-4 py-3 text-white outline-none focus:border-domain"
      />
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        autoComplete="email"
        className="w-full rounded-xl border border-white/10 bg-void-800/70 px-4 py-3 text-white outline-none focus:border-domain"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Mot de passe (8 caractères min.)"
        autoComplete="new-password"
        className="w-full rounded-xl border border-white/10 bg-void-800/70 px-4 py-3 text-white outline-none focus:border-domain"
      />

      {error && <p className="text-sm text-cursed-light">{error}</p>}

      <button
        type="submit"
        disabled={pending || !username || !email || !password}
        className="w-full rounded-xl bg-domain px-4 py-3 font-display font-bold uppercase tracking-wide text-white shadow-glow transition-transform enabled:hover:scale-[1.02] disabled:opacity-40"
      >
        {pending ? "Création…" : "Créer mon compte"}
      </button>

      <p className="text-center text-sm text-white/50">
        Déjà un compte&nbsp;?{" "}
        <Link
          href="/login"
          className="font-semibold text-domain-light hover:underline"
        >
          Se connecter
        </Link>
      </p>
    </form>
  );
}
