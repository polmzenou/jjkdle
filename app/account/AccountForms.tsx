"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  updateUsernameAction,
  updatePasswordAction,
} from "@/lib/auth/actions";

const inputClass =
  "w-full rounded-xl border border-white/10 bg-void-900/70 px-4 py-3 text-white outline-none focus:border-domain";

/**
 * Formulaires de gestion du compte : changement de pseudo et de mot de passe.
 * Chaque modification exige la confirmation du mot de passe actuel (vérifié
 * côté serveur). L'email n'est pas éditable (affiché par la page).
 */
export function AccountForms({ currentUsername }: { currentUsername: string }) {
  return (
    <div className="grid gap-5">
      <UsernameForm currentUsername={currentUsername} />
      <PasswordForm />
    </div>
  );
}

/** Carte conteneur commune aux deux formulaires. */
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-void-800/60 p-5 backdrop-blur">
      <h3 className="font-display font-bold text-white">{title}</h3>
      {children}
    </div>
  );
}

/** Message de retour (succès vert / erreur rouge). */
function Feedback({ ok, msg }: { ok: boolean; msg: string }) {
  return (
    <p className={`text-sm ${ok ? "text-emerald-400" : "text-cursed-light"}`}>
      {msg}
    </p>
  );
}

function UsernameForm({ currentUsername }: { currentUsername: string }) {
  const router = useRouter();
  const [username, setUsername] = useState(currentUsername);
  const [currentPassword, setCurrentPassword] = useState("");
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(
    null,
  );
  const [pending, startTransition] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    startTransition(async () => {
      const res = await updateUsernameAction({ username, currentPassword });
      if (res.ok) {
        setFeedback({ ok: true, msg: "Pseudo mis à jour." });
        setCurrentPassword("");
        router.refresh();
      } else {
        setFeedback({ ok: false, msg: res.error ?? "Échec de la mise à jour." });
      }
    });
  };

  const unchanged = username.trim() === currentUsername;

  return (
    <Card title="Changer de pseudo">
      <form onSubmit={submit} className="mt-4 space-y-3">
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Nouveau pseudo"
          autoComplete="username"
          className={inputClass}
        />
        <input
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          placeholder="Mot de passe actuel"
          autoComplete="current-password"
          className={inputClass}
        />

        {feedback && <Feedback ok={feedback.ok} msg={feedback.msg} />}

        <button
          type="submit"
          disabled={pending || unchanged || !username.trim() || !currentPassword}
          className="rounded-xl bg-domain px-5 py-2.5 font-display text-sm font-bold uppercase tracking-wide text-white shadow-glow transition-transform enabled:hover:scale-[1.02] disabled:opacity-40"
        >
          {pending ? "Enregistrement…" : "Mettre à jour le pseudo"}
        </button>
      </form>
    </Card>
  );
}

function PasswordForm() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(
    null,
  );
  const [pending, startTransition] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (newPassword !== confirm) {
      setFeedback({ ok: false, msg: "Les deux mots de passe ne correspondent pas." });
      return;
    }

    startTransition(async () => {
      const res = await updatePasswordAction({ currentPassword, newPassword });
      if (res.ok) {
        setFeedback({ ok: true, msg: "Mot de passe mis à jour." });
        setCurrentPassword("");
        setNewPassword("");
        setConfirm("");
        router.refresh();
      } else {
        setFeedback({ ok: false, msg: res.error ?? "Échec de la mise à jour." });
      }
    });
  };

  return (
    <Card title="Changer de mot de passe">
      <form onSubmit={submit} className="mt-4 space-y-3">
        <input
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          placeholder="Mot de passe actuel"
          autoComplete="current-password"
          className={inputClass}
        />
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="Nouveau mot de passe (8 caractères min.)"
          autoComplete="new-password"
          className={inputClass}
        />
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Confirmer le nouveau mot de passe"
          autoComplete="new-password"
          className={inputClass}
        />

        {feedback && <Feedback ok={feedback.ok} msg={feedback.msg} />}

        <button
          type="submit"
          disabled={
            pending || !currentPassword || !newPassword || !confirm
          }
          className="rounded-xl bg-domain px-5 py-2.5 font-display text-sm font-bold uppercase tracking-wide text-white shadow-glow transition-transform enabled:hover:scale-[1.02] disabled:opacity-40"
        >
          {pending ? "Enregistrement…" : "Mettre à jour le mot de passe"}
        </button>
      </form>
    </Card>
  );
}
