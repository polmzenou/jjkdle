"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { AdminUser } from "@/lib/admin/users";
import { BADGES } from "@/lib/badges/definitions";
import { TITLES } from "@/lib/titles/definitions";
import { FRAMES } from "@/lib/frames/definitions";
import { rarityStyle, type Rarity } from "@/lib/profile/rarity";
import {
  setUserRoleAction,
  setUsernameAction,
  deleteUserAction,
  adminSetLevelAction,
  adminSetXpBonusAction,
  adminGrantBadgeAction,
  adminRevokeBadgeAction,
  adminGrantTitleAction,
  adminRevokeTitleAction,
  adminGrantFrameAction,
  adminRevokeFrameAction,
} from "./actions";

interface UserAdminProps {
  users: AdminUser[];
  /** Id de l'admin connecté (pour marquer « vous »). */
  currentUserId: string;
  /** Le viewer est-il le super-admin (droits étendus) ? */
  isSuperAdmin: boolean;
}

type Feedback = { ok: boolean; msg: string } | null;

/**
 * Onglet admin : gestion des comptes.
 * Règle : un administrateur ne peut pas être rétrogradé → pas de bouton de
 * rétrogradation pour les ADMIN (et la server action le refuse aussi).
 */
export function UserAdmin({
  users,
  currentUserId,
  isSuperAdmin,
}: UserAdminProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

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

  const setRole = (u: AdminUser, role: "PLAYER" | "VIP", msg: string) => {
    setFeedback(null);
    startTransition(async () => {
      const res = await setUserRoleAction(u.id, role);
      if (res.ok) {
        setFeedback({ ok: true, msg });
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
            const isVip = u.role === "VIP";
            const isSelf = u.id === currentUserId;
            const protectedAdmin = isAdmin && !(isSuperAdmin && !isSelf);
            const expanded = expandedId === u.id;
            return (
              <div
                key={u.id}
                className="rounded-xl border border-white/5 bg-void-700/30"
              >
                <div className="flex flex-wrap items-center gap-3 px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">
                      <Link
                        href={`/u/${encodeURIComponent(u.username)}`}
                        target="_blank"
                        className="underline-offset-2 hover:underline"
                        title="Voir le profil public"
                      >
                        {u.username}
                        <span aria-hidden className="ml-1 text-white/40">↗</span>
                      </Link>
                      {u.id === currentUserId && (
                        <span className="ml-1.5 text-[11px] font-normal text-white/40">
                          (vous)
                        </span>
                      )}
                      <span className="ml-2 align-middle text-[11px] font-normal text-domain-light">
                        Niv. {u.level}
                      </span>
                    </p>
                    <p className="truncate text-[11px] text-white/35">{u.email}</p>
                  </div>

                  {/* Badge de rôle */}
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${
                      isAdmin
                        ? "bg-domain/20 text-domain-light"
                        : isVip
                          ? "bg-amber-400/15 text-amber-300"
                          : "bg-white/5 text-white/55"
                    }`}
                  >
                    {isAdmin ? "Admin" : isVip ? "VIP" : "Joueur"}
                  </span>

                  {/* Actions */}
                  <div className="flex shrink-0 items-center justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => setExpandedId(expanded ? null : u.id)}
                      className="rounded-md border border-white/15 px-2.5 py-1 text-xs font-bold text-white/70 hover:text-white"
                    >
                      Progression {expanded ? "▲" : "▼"}
                    </button>
                    {protectedAdmin ? (
                      <span
                        className="text-[11px] text-white/30"
                        title="Un administrateur ne peut être ni rétrogradé ni supprimé."
                      >
                        🔒 protégé
                      </span>
                    ) : isAdmin ? (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            setRole(u, "VIP", `« ${u.username} » est désormais VIP.`)
                          }
                          disabled={pending}
                          className="rounded-md border border-amber-400/40 bg-amber-400/10 px-2.5 py-1 text-xs font-bold text-amber-300 hover:bg-amber-400/20 disabled:opacity-40"
                        >
                          Passer VIP
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setRole(u, "PLAYER", `« ${u.username} » est rétrogradé joueur.`)
                          }
                          disabled={pending}
                          className="rounded-md border border-cursed/30 px-2.5 py-1 text-xs font-bold text-cursed-light hover:bg-cursed/10 disabled:opacity-40"
                        >
                          Rétrograder joueur
                        </button>
                      </>
                    ) : (
                      <>
                        {isVip ? (
                          <button
                            type="button"
                            onClick={() =>
                              setRole(u, "PLAYER", `« ${u.username} » n'est plus VIP.`)
                            }
                            disabled={pending}
                            className="rounded-md border border-amber-400/40 bg-amber-400/10 px-2.5 py-1 text-xs font-bold text-amber-300 hover:bg-amber-400/20 disabled:opacity-40"
                          >
                            Retirer VIP
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              setRole(u, "VIP", `« ${u.username} » est désormais VIP.`)
                            }
                            disabled={pending}
                            className="rounded-md border border-amber-400/40 bg-amber-400/10 px-2.5 py-1 text-xs font-bold text-amber-300 hover:bg-amber-400/20 disabled:opacity-40"
                          >
                            Passer VIP
                          </button>
                        )}
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

                {isSuperAdmin && (
                  <RenameField
                    user={u}
                    pending={pending}
                    run={startTransition}
                    onResult={(ok, msg) => {
                      setFeedback({ ok, msg });
                      if (ok) router.refresh();
                    }}
                  />
                )}

                {expanded && (
                  <ProgressionPanel
                    user={u}
                    pending={pending}
                    onResult={(ok, msg) => {
                      setFeedback({ ok, msg });
                      if (ok) router.refresh();
                    }}
                    run={startTransition}
                  />
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

/** Champ inline de renommage d'un joueur (super-admin uniquement). */
function RenameField({
  user,
  pending,
  onResult,
  run,
}: {
  user: AdminUser;
  pending: boolean;
  onResult: (ok: boolean, msg: string) => void;
  run: (cb: () => void) => void;
}) {
  const [value, setValue] = useState(user.username);

  const submit = () => {
    const next = value.trim();
    if (next === user.username) return;
    run(async () => {
      const res = await setUsernameAction(user.id, next);
      onResult(
        res.ok,
        res.ok
          ? `« ${user.username} » renommé « ${next} ».`
          : res.error ?? "Échec.",
      );
    });
  };

  return (
    <div className="flex items-center gap-2 border-t border-white/5 px-3 py-2">
      <span className="text-[11px] uppercase tracking-wider text-white/45">
        Pseudo
      </span>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-44 rounded-md border border-white/10 bg-void-900 px-2 py-1 text-sm text-white outline-none focus:border-domain"
      />
      <button
        type="button"
        onClick={submit}
        disabled={pending || value.trim() === user.username}
        className="rounded-md border border-domain/40 bg-domain/10 px-2.5 py-1 text-xs font-bold text-domain-light hover:bg-domain/20 disabled:opacity-40"
      >
        Renommer
      </button>
    </div>
  );
}

/** Panneau dépliable d'édition de la progression d'un joueur (XP, niveau, badges). */
function ProgressionPanel({
  user,
  pending,
  onResult,
  run,
}: {
  user: AdminUser;
  pending: boolean;
  onResult: (ok: boolean, msg: string) => void;
  run: (cb: () => void) => void;
}) {
  const [level, setLevel] = useState(String(user.level));
  const [xpBonus, setXpBonus] = useState(String(user.xpBonus));
  const owned = new Set(user.badgeKeys);

  const applyLevel = () =>
    run(async () => {
      const res = await adminSetLevelAction(user.id, Number(level));
      onResult(res.ok, res.ok ? `Niveau de « ${user.username} » fixé à ${level}.` : res.error ?? "Échec.");
    });

  const applyXp = () =>
    run(async () => {
      const res = await adminSetXpBonusAction(user.id, Number(xpBonus));
      onResult(res.ok, res.ok ? `Bonus d'XP de « ${user.username} » mis à jour.` : res.error ?? "Échec.");
    });

  const toggleBadge = (key: string, has: boolean) =>
    run(async () => {
      const res = has
        ? await adminRevokeBadgeAction(user.id, key)
        : await adminGrantBadgeAction(user.id, key);
      onResult(
        res.ok,
        res.ok
          ? `Badge « ${key} » ${has ? "retiré à" : "accordé à"} ${user.username}.`
          : res.error ?? "Échec.",
      );
    });

  // ── Titres & cadres : octroi/retrait manuel (couche « grant »). ──
  const autoTitles = new Set(user.autoTitleKeys);
  const grantedTitles = new Set(user.titleGrantKeys);
  const autoFrames = new Set(user.autoFrameKeys);
  const grantedFrames = new Set(user.frameGrantKeys);

  const grantTitle = (key: string) =>
    run(async () => {
      const res = await adminGrantTitleAction(user.id, key);
      onResult(res.ok, res.ok ? `Titre « ${key} » octroyé à ${user.username}.` : res.error ?? "Échec.");
    });
  const revokeTitle = (key: string) =>
    run(async () => {
      const res = await adminRevokeTitleAction(user.id, key);
      onResult(res.ok, res.ok ? `Octroi du titre « ${key} » retiré.` : res.error ?? "Échec.");
    });
  const grantFrame = (key: string) =>
    run(async () => {
      const res = await adminGrantFrameAction(user.id, key);
      onResult(res.ok, res.ok ? `Cadre « ${key} » octroyé à ${user.username}.` : res.error ?? "Échec.");
    });
  const revokeFrame = (key: string) =>
    run(async () => {
      const res = await adminRevokeFrameAction(user.id, key);
      onResult(res.ok, res.ok ? `Octroi du cadre « ${key} » retiré.` : res.error ?? "Échec.");
    });

  const fieldCls =
    "w-24 rounded-md border border-white/10 bg-void-900 px-2 py-1 text-sm text-white outline-none focus:border-domain";
  const btnCls =
    "rounded-md border border-domain/40 bg-domain/10 px-2.5 py-1 text-xs font-bold text-domain-light hover:bg-domain/20 disabled:opacity-40";

  return (
    <div className="space-y-4 border-t border-white/5 px-3 py-3">
      {/* XP totale + niveau actuel */}
      <p className="text-[11px] text-white/40">
        XP totale : <b className="text-white/70">{user.totalXp.toLocaleString("fr-FR")}</b>{" "}
        · niveau actuel : <b className="text-white/70">{user.level}</b>
      </p>

      <div className="flex flex-wrap items-end gap-4">
        <label className="block">
          <span className="mb-1 block text-[11px] uppercase tracking-wider text-white/45">
            Fixer le niveau
          </span>
          <div className="flex gap-2">
            <input
              type="number"
              min={1}
              max={999}
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className={fieldCls}
            />
            <button type="button" onClick={applyLevel} disabled={pending} className={btnCls}>
              Appliquer
            </button>
          </div>
        </label>

        <label className="block">
          <span className="mb-1 block text-[11px] uppercase tracking-wider text-white/45">
            Bonus d&apos;XP (± additif)
          </span>
          <div className="flex gap-2">
            <input
              type="number"
              value={xpBonus}
              onChange={(e) => setXpBonus(e.target.value)}
              className={fieldCls}
            />
            <button type="button" onClick={applyXp} disabled={pending} className={btnCls}>
              Appliquer
            </button>
          </div>
        </label>
      </div>

      {/* Badges */}
      <div>
        <p className="mb-2 text-[11px] uppercase tracking-wider text-white/45">
          Badges
        </p>
        <div className="flex flex-wrap gap-2">
          {BADGES.map((b) => {
            const has = owned.has(b.key);
            return (
              <button
                key={b.key}
                type="button"
                disabled={pending}
                onClick={() => toggleBadge(b.key, has)}
                title={b.description}
                className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors disabled:opacity-40 ${
                  has
                    ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300"
                    : "border-white/10 text-white/45 hover:text-white"
                }`}
              >
                <span aria-hidden>{b.iconKey}</span>
                {b.name}
                <span className="text-[10px]">{has ? "✓" : "+"}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Titres */}
      <CosmeticManager
        label="Titres"
        items={TITLES}
        autoKeys={autoTitles}
        grantedKeys={grantedTitles}
        equippedKey={user.equippedTitleKey}
        pending={pending}
        onGrant={grantTitle}
        onRevoke={revokeTitle}
      />

      {/* Cadres */}
      <CosmeticManager
        label="Cadres"
        items={FRAMES}
        autoKeys={autoFrames}
        grantedKeys={grantedFrames}
        equippedKey={user.equippedFrameKey}
        pending={pending}
        onGrant={grantFrame}
        onRevoke={revokeFrame}
      />
    </div>
  );
}

/**
 * Gestion admin d'une catégorie cosmétique (titres ou cadres) pour un joueur.
 * Pour chaque item : état (auto / octroyé / verrouillé) + bouton Octroyer ou
 * Retirer. « Retirer » est désactivé si le déblocage est AUTO (le retrait du
 * grant n'aurait aucun effet) — cf. spec §5.
 */
function CosmeticManager({
  label,
  items,
  autoKeys,
  grantedKeys,
  equippedKey,
  pending,
  onGrant,
  onRevoke,
}: {
  label: string;
  items: ReadonlyArray<{ key: string; name: string; rarity: Rarity }>;
  autoKeys: Set<string>;
  grantedKeys: Set<string>;
  equippedKey: string | null;
  pending: boolean;
  onGrant: (key: string) => void;
  onRevoke: (key: string) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-[11px] uppercase tracking-wider text-white/45">{label}</p>
      <div className="space-y-1.5">
        {items.map((it) => {
          const auto = autoKeys.has(it.key);
          const granted = grantedKeys.has(it.key);
          const unlocked = auto || granted;
          const { color } = rarityStyle(it.rarity);
          const status = auto ? "débloqué (auto)" : granted ? "octroyé (admin)" : "verrouillé";
          return (
            <div
              key={it.key}
              className="flex items-center gap-2 rounded-lg bg-void-700/40 px-2.5 py-1.5"
            >
              <span className="text-sm font-semibold" style={{ color: unlocked ? color : "#ffffff70" }}>
                {it.name}
              </span>
              {equippedKey === it.key && (
                <span className="text-[10px] font-bold text-domain-light">★ équipé</span>
              )}
              <span className="ml-auto text-[10px] text-white/40">{status}</span>
              {granted ? (
                <button
                  type="button"
                  disabled={pending || auto}
                  onClick={() => onRevoke(it.key)}
                  title={
                    auto
                      ? "Déblocage automatique : le retrait du grant n'aurait aucun effet."
                      : undefined
                  }
                  className="rounded-md border border-cursed/30 px-2 py-0.5 text-[11px] font-bold text-cursed-light hover:bg-cursed/10 disabled:opacity-30"
                >
                  Retirer
                </button>
              ) : (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => onGrant(it.key)}
                  className="rounded-md border border-domain/40 bg-domain/10 px-2 py-0.5 text-[11px] font-bold text-domain-light hover:bg-domain/20 disabled:opacity-40"
                >
                  Octroyer
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
