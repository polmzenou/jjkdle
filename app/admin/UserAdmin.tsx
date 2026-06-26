"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AdminUser } from "@/lib/admin/users";
import { setUserRoleAction, deleteUserAction } from "./actions";

interface UserAdminProps {
  users: AdminUser[];
  /** Id de l'admin connecté (pour marquer « vous »). */
  currentUserId: string;
}

type Feedback = { ok: boolean; msg: string } | null;

/**
 * Onglet admin : gestion des comptes.
 * Règle : un administrateur ne peut pas être rétrogradé → pas de bouton de
 * rétrogradation pour les ADMIN (et la server action le refuse aussi).
 */
export function UserAdmin({ users, currentUserId }: UserAdminProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<Feedback>(null);

  const promote = (u: AdminUser) => {
    if (!window.confirm(`Promouvoir « ${u.username} » administrateur ?`)) return;
    setFeedback(null);
    startTransition(async () => {
      const res = await setUserRoleAction(u.id, "ADMIN");
      if (res.ok) {
        setFeedback({ ok: true, msg: `« ${u.username} » est désormais admin.` });
        router.refresh();
      } else {
        setFeedback({ ok: false, msg: res.error ?? "Échec." });
      }
    });
  };

  const remove = (u: AdminUser) => {
    if (
      !window.confirm(
        `Supprimer définitivement le compte « ${u.username} » ? (scores et sessions inclus)`,
      )
    )
      return;
    setFeedback(null);
    startTransition(async () => {
      const res = await deleteUserAction(u.id);
      if (res.ok) {
        setFeedback({ ok: true, msg: `Compte « ${u.username} » supprimé.` });
        router.refresh();
      } else {
        setFeedback({ ok: false, msg: res.error ?? "Échec." });
      }
    });
  };

  if (users.length === 0) {
    return (
      <p className="rounded-2xl border border-white/10 bg-void-800/40 p-8 text-center text-sm text-white/40">
        Aucun utilisateur inscrit.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {feedback && (
        <div
          className={`rounded-xl px-4 py-3 text-sm ${
            feedback.ok
              ? "border border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
              : "border border-cursed/40 bg-cursed/10 text-cursed-light"
          }`}
        >
          {feedback.msg}
        </div>
      )}

      <section className="rounded-2xl border border-white/10 bg-void-800/40 p-5">
        <div className="mb-4 flex items-center gap-3">
          <h2 className="font-display text-lg font-bold text-white">
            Utilisateurs
          </h2>
          <span className="rounded-full bg-domain/15 px-2 py-0.5 text-xs font-bold text-domain-light">
            {users.length}
          </span>
        </div>

        <div className="space-y-2">
          {users.map((u) => {
            const isAdmin = u.role === "ADMIN";
            return (
              <div
                key={u.id}
                className="flex items-center gap-3 rounded-xl border border-white/5 bg-void-700/30 px-3 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">
                    {u.username}
                    {u.id === currentUserId && (
                      <span className="ml-1.5 text-[11px] font-normal text-white/40">
                        (vous)
                      </span>
                    )}
                  </p>
                  <p className="truncate text-[11px] text-white/35">{u.email}</p>
                </div>

                {/* Badge de rôle */}
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${
                    isAdmin
                      ? "bg-domain/20 text-domain-light"
                      : "bg-white/5 text-white/55"
                  }`}
                >
                  {isAdmin ? "Admin" : "Joueur"}
                </span>

                {/* Actions */}
                <div className="flex shrink-0 items-center justify-end gap-1.5">
                  {isAdmin ? (
                    <span
                      className="text-[11px] text-white/30"
                      title="Un administrateur ne peut être ni rétrogradé ni supprimé."
                    >
                      🔒 protégé
                    </span>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => promote(u)}
                        disabled={pending}
                        className="rounded-md border border-domain/40 bg-domain/10 px-2.5 py-1 text-xs font-bold text-domain-light hover:bg-domain/20 disabled:opacity-40"
                      >
                        Promouvoir admin
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(u)}
                        disabled={pending}
                        className="rounded-md border border-cursed/30 px-2.5 py-1 text-xs text-cursed-light hover:bg-cursed/10 disabled:opacity-40"
                      >
                        Suppr.
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
