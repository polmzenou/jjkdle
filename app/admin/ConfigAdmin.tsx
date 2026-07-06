"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Character } from "@/data/roster/characters";
import { isComplete } from "@/lib/games/jjkdle/attributes";
import { GAMES } from "@/lib/games/registry";
import type { MaintenanceConfig } from "@/lib/config/app-config";
import {
  setGameEnabledAction,
  setMaintenanceAction,
  setForcedTargetAction,
} from "./actions";

type Feedback = { ok: boolean; msg: string } | null;

/**
 * Onglet « Config » : feature flags par jeu, mode maintenance et override du mot
 * du jour JJKdle. Mutations via Server Actions (pattern grant/revoke), avec
 * confirmation et feedback cohérents avec le reste de l'admin.
 */
export function ConfigAdmin({
  roster,
  gameFlags,
  maintenance,
  forcedTarget,
}: {
  roster: Character[];
  gameFlags: Record<string, boolean>;
  maintenance: MaintenanceConfig;
  forcedTarget: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<Feedback>(null);

  const [maintMsg, setMaintMsg] = useState(maintenance.message ?? "");
  const [targetId, setTargetId] = useState(forcedTarget ?? "");

  const eligible = useMemo(
    () =>
      roster
        .filter(isComplete)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [roster],
  );
  const forcedName =
    eligible.find((c) => c.id === forcedTarget)?.name ?? forcedTarget;

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, okMsg: string) =>
    startTransition(async () => {
      const res = await fn();
      setFeedback(
        res.ok ? { ok: true, msg: okMsg } : { ok: false, msg: res.error ?? "Échec." },
      );
      if (res.ok) router.refresh();
    });

  const toggleGame = (id: string, label: string, enabled: boolean) => {
    if (!enabled && !window.confirm(`Désactiver « ${label} » ? Le jeu sera masqué et inaccessible.`))
      return;
    run(
      () => setGameEnabledAction(id, enabled),
      `« ${label} » ${enabled ? "activé" : "désactivé"}.`,
    );
  };

  const saveMaintenance = (enabled: boolean) => {
    if (enabled && !window.confirm("Activer le mode maintenance ? Les joueurs non-admin ne pourront plus accéder au site."))
      return;
    run(
      () => setMaintenanceAction(enabled, maintMsg),
      `Maintenance ${enabled ? "activée" : "désactivée"}.`,
    );
  };

  const applyForced = () => {
    run(
      () => setForcedTargetAction(targetId || null),
      targetId ? "Mot du jour forcé." : "Override réinitialisé.",
    );
  };

  const resetForced = () => {
    setTargetId("");
    run(() => setForcedTargetAction(null), "Override réinitialisé.");
  };

  return (
    <div className="space-y-6">
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

      {/* Activation des jeux */}
      <section className="rounded-2xl border border-white/10 bg-void-800/40 p-5">
        <h2 className="mb-1 font-display text-lg font-bold text-white">
          Activation des jeux
        </h2>
        <p className="mb-4 text-xs text-white/45">
          Un jeu désactivé est grisé sur le hub et sa route redirige vers /games.
        </p>
        <div className="space-y-2">
          {GAMES.map((g) => {
            const enabled = gameFlags[g.id] !== false;
            return (
              <div
                key={g.id}
                className="flex items-center gap-3 rounded-xl bg-void-700/40 px-3 py-2.5"
              >
                <span aria-hidden className="text-lg">{g.glyph ?? "🎮"}</span>
                <span className="flex-1 text-sm font-semibold text-white">
                  {g.title}
                </span>
                <span
                  className={`text-xs font-bold ${enabled ? "text-emerald-300" : "text-white/40"}`}
                >
                  {enabled ? "Activé" : "Désactivé"}
                </span>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => toggleGame(g.id, g.title, !enabled)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors disabled:opacity-40 ${
                    enabled
                      ? "border border-cursed/40 bg-cursed/10 text-cursed-light hover:bg-cursed/20"
                      : "border border-emerald-400/40 bg-emerald-400/10 text-emerald-300 hover:bg-emerald-400/20"
                  }`}
                >
                  {enabled ? "Désactiver" : "Activer"}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Mode maintenance */}
      <section className="rounded-2xl border border-white/10 bg-void-800/40 p-5">
        <div className="mb-3 flex items-center gap-3">
          <h2 className="font-display text-lg font-bold text-white">
            Mode maintenance
          </h2>
          <span
            className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
              maintenance.enabled
                ? "bg-cursed/20 text-cursed-light"
                : "bg-white/5 text-white/50"
            }`}
          >
            {maintenance.enabled ? "ACTIF" : "Inactif"}
          </span>
        </div>
        <label className="mb-1 block text-xs uppercase tracking-wider text-white/45">
          Message affiché aux joueurs (optionnel)
        </label>
        <textarea
          value={maintMsg}
          onChange={(e) => setMaintMsg(e.target.value)}
          rows={2}
          maxLength={500}
          placeholder="Reviens dans quelques instants…"
          className="w-full rounded-lg border border-white/10 bg-void-900 px-3 py-2 text-sm text-white outline-none focus:border-domain"
        />
        <div className="mt-3 flex gap-2">
          {maintenance.enabled ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => saveMaintenance(false)}
              className="rounded-lg border border-emerald-400/40 bg-emerald-400/10 px-4 py-2 text-sm font-bold text-emerald-300 hover:bg-emerald-400/20 disabled:opacity-40"
            >
              Désactiver la maintenance
            </button>
          ) : (
            <button
              type="button"
              disabled={pending}
              onClick={() => saveMaintenance(true)}
              className="rounded-lg border border-cursed/40 bg-cursed/10 px-4 py-2 text-sm font-bold text-cursed-light hover:bg-cursed/20 disabled:opacity-40"
            >
              Activer la maintenance
            </button>
          )}
          {maintenance.enabled && (
            <button
              type="button"
              disabled={pending}
              onClick={() => saveMaintenance(true)}
              className="rounded-lg border border-white/10 px-4 py-2 text-sm font-bold text-white/70 hover:text-white disabled:opacity-40"
            >
              Enregistrer le message
            </button>
          )}
        </div>
      </section>

      {/* Forcer le mot du jour JJKdle */}
      <section className="rounded-2xl border border-white/10 bg-void-800/40 p-5">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <h2 className="font-display text-lg font-bold text-white">
            Mot du jour JJKdle (test)
          </h2>
          {forcedTarget && (
            <span className="rounded-full border border-amber-400/40 bg-amber-400/10 px-2.5 py-0.5 text-[11px] font-bold text-amber-300">
              ⚠ Override actif : {forcedName}
            </span>
          )}
        </div>
        <p className="mb-3 text-xs text-white/45">
          Force le personnage cible du JJKdle du jour (tous les joueurs). Pour tests
          uniquement — laisse « aucun » pour le tirage déterministe normal.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
            className="rounded-lg border border-white/10 bg-void-900 px-3 py-2 text-sm text-white outline-none focus:border-domain"
          >
            <option value="">— Aucun (tirage normal)</option>
            {eligible.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={pending}
            onClick={applyForced}
            className="rounded-lg bg-domain px-4 py-2 text-sm font-bold text-white shadow-glow transition-transform enabled:hover:scale-[1.02] disabled:opacity-40"
          >
            Appliquer
          </button>
          {forcedTarget && (
            <button
              type="button"
              disabled={pending}
              onClick={resetForced}
              className="rounded-lg border border-white/10 px-4 py-2 text-sm font-bold text-white/70 hover:text-white disabled:opacity-40"
            >
              Reset
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
