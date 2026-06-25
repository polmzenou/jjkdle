"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AdminUser } from "@/lib/auth/users";
import { setUserRoleAction, deleteUserAction } from "./actions";

interface UsersAdminProps {
  users: AdminUser[];
  /** Id de l'admin connecté — on désactive les actions sur soi-même. */
  currentUserId: string;
}

type Feedback = { ok: boolean; msg: string } | null;

/** Onglet admin : gestion des comptes (rôle, suppression). */
export function UsersAdmin({ users, currentUserId }: UsersAdminProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.username.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q),
    );
  }, [users, query]);

  const toggleRole = (u: AdminUser) => {
    const next = u.role === "ADMIN" ? "PLAYER" : "ADMIN";
    startTransition(async () => {
      const res = await setUserRoleAction(u.id, next);
      if (res.ok) {
        setFeedback({
          ok: true,
          msg: `« ${u.username} » est maintenant ${next === "ADMIN" ? "administrateur" : "joueur"}.`,
        });
        router.refresh();
      } else {
        setFeedback({ ok: false, msg: res.error ?? "Échec." });
      }
    });
  };

  const remove = (u: AdminUser) => {
    if (
      !window.confirm(
        `Supprimer « ${u.username} » ? Ses scores et sessions seront effacés.`,
      )
    )
      return;
    startTransition(async () => {
      const res = await deleteUserAction(u.id);
      if (res.ok) {
        setFeedback({ ok: true, msg: `« ${u.username} » supprimé.` });
        router.refresh();
      } else {
        setFeedback({ ok: false, msg: res.error ?? "Échec." });
      }
    });
  };

  return (
    <section className="rounded-2xl border border-white/10 bg-void-800/40 p-5">
      <div className="mb-4 flex items-center gap-3">
        <h2 className="font-display text-lg font-bold text-white">
          Comptes utilisateurs
        </h2>
        <span className="rounded-full bg-domain/15 px-2 py-0.5 text-xs font-bold text-domain-light">
          {users.length}
        </span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher…"
          className="ml-auto w-48 rounded-lg border border-white/10 bg-void-900 px-3 py-1.5 text-sm text-white outline-none focus:border-domain"
        />
      </div>

      {feedback && (
        <div
          className={`mb-4 rounded-xl px-4 py-3 text-sm ${
            feedback.ok
              ? "border border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
              : "border border-cursed/40 bg-cursed/10 text-cursed-light"
          }`}
        >
          {feedback.msg}
        </div>
      )}

      <div className="space-y-2">
        {filtered.map((u) => {
          const isSelf = u.id === currentUserId;
          const isAdmin = u.role === "ADMIN";
          return (
            <div
              key={u.id}
              className="flex items-center gap-3 rounded-xl border border-white/5 bg-void-700/30 px-3 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">
                  {u.username}
                  {isSelf && (
                    <span className="ml-1.5 text-[11px] font-normal text-domain-light">
                      (toi)
                    </span>
                  )}
                </p>
                <p className="truncate text-[11px] text-white/35">
                  {u.email} · {u.scoreCount} score{u.scoreCount > 1 ? "s" : ""} ·{" "}
                  {new Date(u.createdAt).toLocaleDateString("fr-FR")}
                </p>
              </div>

              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${
                  isAdmin
                    ? "bg-domain/20 text-domain-light"
                    : "bg-white/5 text-white/50"
                }`}
              >
                {isAdmin ? "Admin" : "Joueur"}
              </span>

              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  onClick={() => toggleRole(u)}
                  disabled={pending || isSelf}
                  title={
                    isSelf
                      ? "Tu ne peux pas changer ton propre rôle"
                      : undefined
                  }
                  className="rounded-md border border-white/10 px-2.5 py-1 text-xs text-white/70 hover:text-white disabled:opacity-30"
                >
                  {isAdmin ? "↓ Joueur" : "↑ Admin"}
                </button>
                <button
                  type="button"
                  onClick={() => remove(u)}
                  disabled={pending || isSelf}
                  title={
                    isSelf ? "Tu ne peux pas supprimer ton compte" : undefined
                  }
                  className="rounded-md border border-cursed/30 px-2.5 py-1 text-xs text-cursed-light hover:bg-cursed/10 disabled:opacity-30"
                >
                  Suppr.
                </button>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <p className="py-8 text-center text-sm text-white/30">
            Aucun utilisateur.
          </p>
        )}
      </div>
    </section>
  );
}
