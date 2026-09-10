"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CharacterImage } from "@/components/CharacterImage";
import type { Character } from "@/data/roster/characters";
import type { AdminDraftBoss } from "@/lib/admin/draft-store";
import {
  saveDraftBossAction,
  deleteDraftBossAction,
  moveDraftBossAction,
} from "./draft-actions";

/**
 * Section « Boss » de l'onglet Draft : les adversaires affrontés après le
 * draft, dans l'ordre, et leurs PV.
 *
 * Les « PV » sont le SEUIL de score caché à dépasser pour vaincre le boss :
 * c'est le seul nombre qui décide de l'issue du duel (les barres de vie de
 * l'animation, elles, sont cosmétiques). D'où l'avertissement sur les PV non
 * croissants — le combat s'arrête au premier boss non vaincu, un boss plus
 * faible placé après un plus fort tombe donc d'office.
 */

interface DraftBossAdminProps {
  bosses: AdminDraftBoss[];
  /** Roster du builder, pour rattacher un boss à un personnage (nom + image). */
  roster: Character[];
}

interface Row {
  id: string | null;
  slug: string;
  name: string;
  /** Saisie libre : validée à l'enregistrement, pas à la frappe. */
  threshold: string;
  characterId: string;
  image: string;
}

const inputCls =
  "w-full rounded-lg border border-white/10 bg-void-900 px-3 py-2 text-sm text-white outline-none focus:border-domain";

function toRow(b: AdminDraftBoss): Row {
  return {
    id: b.id,
    slug: b.slug,
    name: b.name,
    threshold: String(b.threshold),
    characterId: b.characterId ?? "",
    image: b.image ?? "",
  };
}

const NEW_ROW: Row = {
  id: null,
  slug: "",
  name: "",
  threshold: "200",
  characterId: "",
  image: "",
};

export function DraftBossAdmin({ bosses, roster }: DraftBossAdminProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [rows, setRows] = useState<Row[]>(() => bosses.map(toRow));
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(
    null,
  );

  // Un import ou un déplacement recharge la page : l'état local doit suivre la
  // base, sinon l'admin continuerait de voir l'ordre d'avant.
  useEffect(() => {
    setRows(bosses.map(toRow));
  }, [bosses]);

  const characterById = useMemo(
    () => Object.fromEntries(roster.map((c) => [c.id, c])),
    [roster],
  );

  const set = (index: number, patch: Partial<Row>) =>
    setRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, ...patch } : r)),
    );

  const run = (
    fn: () => Promise<{ ok: boolean; error?: string }>,
    okMsg: string,
  ) =>
    startTransition(async () => {
      const res = await fn();
      setFeedback(
        res.ok
          ? { ok: true, msg: okMsg }
          : { ok: false, msg: res.error ?? "Échec." },
      );
      if (res.ok) router.refresh();
    });

  const save = (row: Row) =>
    run(
      () =>
        saveDraftBossAction({
          ...(row.id ? { id: row.id } : {}),
          slug: row.slug || row.characterId || row.name,
          name: row.name,
          threshold: Number(row.threshold),
          characterId: row.characterId || null,
          image: row.image || null,
        }),
      `« ${row.name || "Boss"} » enregistré.`,
    );

  const remove = (row: Row, index: number) => {
    // Ligne jamais enregistrée : rien à supprimer en base.
    if (!row.id) {
      setRows((prev) => prev.filter((_, i) => i !== index));
      return;
    }
    if (!window.confirm(`Supprimer le boss « ${row.name} » ?`)) return;
    run(() => deleteDraftBossAction(row.id as string), "Boss supprimé.");
  };

  const move = (row: Row, direction: "up" | "down") => {
    if (!row.id) return;
    run(
      () => moveDraftBossAction(row.id as string, direction),
      "Ordre mis à jour.",
    );
  };

  const saved = rows.filter((r) => r.id);
  const notAscending = saved.some(
    (r, i) => i > 0 && Number(r.threshold) <= Number(saved[i - 1].threshold),
  );

  return (
    <section className="rounded-2xl border border-white/10 bg-void-800/40 p-5">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <h2 className="font-display text-lg font-bold text-white">Boss</h2>
        <span className="rounded-full bg-domain/15 px-2 py-0.5 text-xs font-bold text-domain-light">
          {saved.length}
        </span>
        <button
          type="button"
          onClick={() => setRows((prev) => [...prev, { ...NEW_ROW }])}
          className="ml-auto rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/70 hover:text-white"
        >
          + Ajouter un boss
        </button>
      </div>

      <p className="mb-4 text-xs text-white/45">
        Affrontés dans cet ordre après le draft. Les <b>PV</b> sont le score que
        l&apos;équipe du joueur doit atteindre pour vaincre le boss ; le combat
        s&apos;arrête au premier échec, ils doivent donc aller en croissant.
      </p>

      {bosses.length === 0 && (
        <div className="mb-4 rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
          ⚠️ Aucun boss en base : le jeu utilise la liste par défaut de
          l&apos;univers. « Tout importer » la recopie ici pour la rendre
          éditable.
        </div>
      )}

      {notAscending && (
        <div className="mb-4 rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
          ⚠️ Les PV ne sont pas strictement croissants : un boss moins résistant
          que le précédent est vaincu d&apos;office.
        </div>
      )}

      {feedback && (
        <p
          className={`mb-3 text-sm ${
            feedback.ok ? "text-emerald-400" : "text-cursed-light"
          }`}
        >
          {feedback.msg}
        </p>
      )}

      <div className="space-y-2">
        {rows.map((row, index) => {
          const character = characterById[row.characterId];
          const image = row.image || character?.image;
          const preview = {
            name: row.name || character?.name || "?",
            ...(image ? { image } : {}),
          };
          return (
            <div
              key={row.id ?? `new-${index}`}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-white/5 bg-void-700/30 p-2"
            >
              <span className="w-5 shrink-0 text-center text-xs font-bold text-white/30">
                {index + 1}
              </span>
              <div className="h-14 w-11 shrink-0 overflow-hidden rounded-lg border border-white/10">
                <CharacterImage character={preview} />
              </div>

              <label className="min-w-[8rem] flex-1 text-[11px] uppercase tracking-wider text-white/40">
                Nom
                <input
                  value={row.name}
                  onChange={(e) => set(index, { name: e.target.value })}
                  className={inputCls}
                  placeholder="Makima"
                />
              </label>

              <label className="w-24 text-[11px] uppercase tracking-wider text-white/40">
                PV
                <input
                  type="number"
                  min={1}
                  max={999}
                  value={row.threshold}
                  onChange={(e) => set(index, { threshold: e.target.value })}
                  className={inputCls}
                />
              </label>

              <label className="min-w-[10rem] flex-1 text-[11px] uppercase tracking-wider text-white/40">
                Personnage (nom + image)
                <select
                  value={row.characterId}
                  onChange={(e) => {
                    const id = e.target.value;
                    const picked = characterById[id];
                    // Un boss vierge prend le nom du personnage choisi — le cas
                    // courant — sans jamais écraser un nom déjà saisi.
                    set(index, {
                      characterId: id,
                      ...(row.name.trim() === "" && picked
                        ? { name: picked.name }
                        : {}),
                      ...(row.slug === "" ? { slug: id } : {}),
                    });
                  }}
                  className={inputCls}
                >
                  <option value="">— aucun —</option>
                  {roster.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>

              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  disabled={pending || index === 0 || !row.id}
                  onClick={() => move(row, "up")}
                  className="rounded-md border border-white/10 px-2 py-1 text-xs text-white/70 hover:text-white disabled:opacity-30"
                  aria-label="Monter"
                >
                  ↑
                </button>
                <button
                  type="button"
                  disabled={pending || index === rows.length - 1 || !row.id}
                  onClick={() => move(row, "down")}
                  className="rounded-md border border-white/10 px-2 py-1 text-xs text-white/70 hover:text-white disabled:opacity-30"
                  aria-label="Descendre"
                >
                  ↓
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => save(row)}
                  className="rounded-md bg-domain px-3 py-1 text-xs font-bold text-white disabled:opacity-40"
                >
                  Enregistrer
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => remove(row, index)}
                  className="rounded-md border border-cursed/30 px-2 py-1 text-xs text-cursed-light hover:bg-cursed/10 disabled:opacity-40"
                >
                  Suppr.
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
