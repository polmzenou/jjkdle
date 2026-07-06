"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AdminScore } from "@/lib/leaderboard/store";
import { getGame } from "@/lib/games/registry";
import { VipBadge } from "@/components/VipBadge";
import {
  updateScoreAction,
  deleteScoreAction,
  deleteScoresAction,
} from "./actions";

interface LeaderboardAdminProps {
  scores: AdminScore[];
}

type Feedback = { ok: boolean; msg: string } | null;

/** Onglet admin : tous les leaderboards (par jeu) avec édition/suppression. */
export function LeaderboardAdmin({ scores }: LeaderboardAdminProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  // Multi-sélection : ids de scores cochés (uniques tous jeux confondus).
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Regroupe les scores par jeu, en conservant l'ordre (déjà trié côté serveur).
  const groups = useMemo(() => {
    const map = new Map<string, AdminScore[]>();
    for (const s of scores) {
      const arr = map.get(s.game) ?? [];
      arr.push(s);
      map.set(s.game, arr);
    }
    return Array.from(map.entries());
  }, [scores]);

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Coche/décoche tout un groupe (jeu). Décoche si déjà tout coché.
  const toggleGroup = (entries: AdminScore[]) => {
    setSelected((prev) => {
      const next = new Set(prev);
      const allSelected = entries.every((s) => next.has(s.id));
      for (const s of entries) {
        if (allSelected) next.delete(s.id);
        else next.add(s.id);
      }
      return next;
    });
  };

  const clearSelection = () => setSelected(new Set());

  const removeSelected = () => {
    const items = scores.filter((s) => selected.has(s.id));
    if (items.length === 0) return;
    if (!window.confirm(`Supprimer ${items.length} score(s) sélectionné(s) ?`))
      return;
    startTransition(async () => {
      const res = await deleteScoresAction(
        items.map((s) => ({ id: s.id, game: s.game })),
      );
      if (res.ok) {
        setFeedback({ ok: true, msg: `${res.deleted} score(s) supprimé(s).` });
      } else {
        setFeedback({
          ok: false,
          msg: `${res.deleted} supprimé(s), échec sur certains : ${res.error ?? ""}`,
        });
      }
      clearSelection();
      router.refresh();
    });
  };

  const startEdit = (s: AdminScore) => {
    setFeedback(null);
    setEditingId(s.id);
    setEditValue(String(s.score));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValue("");
  };

  const save = (s: AdminScore) => {
    const value = Number(editValue);
    startTransition(async () => {
      const res = await updateScoreAction(s.id, s.game, value);
      if (res.ok) {
        setFeedback({ ok: true, msg: `Score de « ${s.pseudo} » mis à jour.` });
        cancelEdit();
        router.refresh();
      } else {
        setFeedback({ ok: false, msg: res.error ?? "Échec." });
      }
    });
  };

  const remove = (s: AdminScore) => {
    if (!window.confirm(`Supprimer le score de « ${s.pseudo} » ?`)) return;
    startTransition(async () => {
      const res = await deleteScoreAction(s.id, s.game);
      if (res.ok) {
        setFeedback({ ok: true, msg: `Score de « ${s.pseudo} » supprimé.` });
        if (editingId === s.id) cancelEdit();
        router.refresh();
      } else {
        setFeedback({ ok: false, msg: res.error ?? "Échec." });
      }
    });
  };

  if (scores.length === 0) {
    return (
      <p className="rounded-2xl border border-white/10 bg-void-800/40 p-8 text-center text-sm text-white/40">
        Aucun score enregistré pour le moment.
      </p>
    );
  }

  return (
    <div className="space-y-8">
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

      {/* Barre d'action multi-sélection (visible dès qu'un score est coché). */}
      {selected.size > 0 && (
        <div className="sticky top-2 z-10 flex flex-wrap items-center gap-3 rounded-xl border border-cursed/40 bg-void-800/95 px-4 py-3 shadow-lg backdrop-blur">
          <span className="text-sm font-semibold text-white">
            {selected.size} score(s) sélectionné(s)
          </span>
          <button
            type="button"
            onClick={clearSelection}
            className="text-xs text-white/50 hover:text-white"
          >
            Tout décocher
          </button>
          <button
            type="button"
            onClick={removeSelected}
            disabled={pending}
            className="ml-auto rounded-lg border border-cursed/40 bg-cursed/10 px-4 py-1.5 text-sm font-bold text-cursed-light transition-colors enabled:hover:bg-cursed/20 disabled:opacity-40"
          >
            Supprimer la sélection
          </button>
        </div>
      )}

      {groups.map(([game, entries]) => {
        const title = getGame(game)?.title ?? game;
        return (
          <section
            key={game}
            className="rounded-2xl border border-white/10 bg-void-800/40 p-5"
          >
            <div className="mb-4 flex items-center gap-3">
              <input
                type="checkbox"
                checked={entries.every((s) => selected.has(s.id))}
                ref={(el) => {
                  if (el) {
                    const some = entries.some((s) => selected.has(s.id));
                    const all = entries.every((s) => selected.has(s.id));
                    el.indeterminate = some && !all;
                  }
                }}
                onChange={() => toggleGroup(entries)}
                title="Tout sélectionner dans ce jeu"
                className="h-4 w-4 accent-cursed"
              />
              <h2 className="font-display text-lg font-bold text-white">
                {title}
              </h2>
              <span className="rounded-full bg-domain/15 px-2 py-0.5 text-xs font-bold text-domain-light">
                {entries.length}
              </span>
              <span className="ml-auto text-xs text-white/35">{game}</span>
            </div>

            <div className="space-y-2">
              {entries.map((s, i) => {
                const isEditing = editingId === s.id;
                return (
                  <div
                    key={s.id}
                    className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${
                      selected.has(s.id)
                        ? "border-cursed/40 bg-cursed/5"
                        : "border-white/5 bg-void-700/30"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(s.id)}
                      onChange={() => toggleOne(s.id)}
                      className="h-4 w-4 shrink-0 accent-cursed"
                    />
                    <span className="w-6 shrink-0 text-center font-display text-sm font-black text-white/40">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white">
                        {s.pseudo}
                        {s.role === "VIP" && <VipBadge className="ml-1.5" />}
                      </p>
                      <p className="text-[11px] text-white/30">
                        {new Date(s.date).toLocaleDateString("fr-FR")}
                      </p>
                    </div>

                    {isEditing ? (
                      <input
                        type="number"
                        min={0}
                        value={editValue}
                        autoFocus
                        onChange={(e) => setEditValue(e.target.value)}
                        className="w-24 rounded-md border border-domain/50 bg-void-900 px-2 py-1 text-right text-sm text-white outline-none focus:border-domain"
                      />
                    ) : (
                      <span className="font-display text-lg font-bold tabular-nums text-white">
                        {s.score.toLocaleString("fr-FR")}
                      </span>
                    )}

                    <div className="flex shrink-0 gap-1">
                      {isEditing ? (
                        <>
                          <button
                            type="button"
                            onClick={() => save(s)}
                            disabled={pending}
                            className="rounded-md bg-domain px-2.5 py-1 text-xs font-bold text-white disabled:opacity-40"
                          >
                            OK
                          </button>
                          <button
                            type="button"
                            onClick={cancelEdit}
                            disabled={pending}
                            className="rounded-md border border-white/10 px-2.5 py-1 text-xs text-white/60 hover:text-white"
                          >
                            Annuler
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => startEdit(s)}
                            className="rounded-md border border-white/10 px-2.5 py-1 text-xs text-white/70 hover:text-white"
                          >
                            Éditer
                          </button>
                          <button
                            type="button"
                            onClick={() => remove(s)}
                            disabled={pending}
                            className="rounded-md border border-cursed/30 px-2.5 py-1 text-xs text-cursed-light hover:bg-cursed/10 disabled:opacity-30"
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
        );
      })}
    </div>
  );
}
