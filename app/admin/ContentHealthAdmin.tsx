"use client";

import { useMemo, useState } from "react";
import type { Character } from "@/data/roster/characters";
import {
  isComplete,
  ATTRIBUTE_COLUMNS,
  ATTRIBUTE_LABELS,
} from "@/lib/games/jjkdle/attributes";

/**
 * Onglet « Santé du contenu » : checklist de complétion du roster. Regroupe ce
 * que signale déjà le badge « JJKdle incomplet » de l'onglet Roster, avec des
 * filtres rapides et un compteur par catégorie. Réutilise `isComplete` (pas de
 * duplication de logique).
 */

type Filter = "all" | "incomplete" | "no-image" | "no-battle";

interface Row {
  character: Character;
  incomplete: boolean;
  noImage: boolean;
  noBattle: boolean;
  missingAttrs: string[];
}

function missingAttributes(c: Character): string[] {
  return ATTRIBUTE_COLUMNS.filter((k) => c[k] == null).map(
    (k) => ATTRIBUTE_LABELS[k],
  );
}

export function ContentHealthAdmin({
  roster,
  onEdit,
}: {
  roster: Character[];
  /** Ouvre le perso dans l'onglet Roster pour édition. */
  onEdit: (c: Character) => void;
}) {
  const [filter, setFilter] = useState<Filter>("incomplete");
  const [query, setQuery] = useState("");

  const rows = useMemo<Row[]>(
    () =>
      roster.map((c) => ({
        character: c,
        incomplete: !isComplete(c),
        noImage: !c.image,
        noBattle: c.battleValue == null,
        missingAttrs: missingAttributes(c),
      })),
    [roster],
  );

  const counts = useMemo(
    () => ({
      all: rows.length,
      incomplete: rows.filter((r) => r.incomplete).length,
      noImage: rows.filter((r) => r.noImage).length,
      noBattle: rows.filter((r) => r.noBattle).length,
    }),
    [rows],
  );

  const filtered = rows.filter((r) => {
    if (filter === "incomplete" && !r.incomplete) return false;
    if (filter === "no-image" && !r.noImage) return false;
    if (filter === "no-battle" && !r.noBattle) return false;
    const q = query.toLowerCase();
    return (
      r.character.name.toLowerCase().includes(q) || r.character.id.includes(q)
    );
  });

  const tabs: { key: Filter; label: string; count: number; accent?: boolean }[] = [
    { key: "incomplete", label: "Incomplets", count: counts.incomplete, accent: true },
    { key: "no-image", label: "Sans image", count: counts.noImage },
    { key: "no-battle", label: "Sans battleValue", count: counts.noBattle },
    { key: "all", label: "Tout", count: counts.all },
  ];

  return (
    <section className="rounded-2xl border border-white/10 bg-void-800/40 p-5">
      {/* Compteurs / filtres */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setFilter(t.key)}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-bold transition-colors ${
              filter === t.key
                ? "bg-domain text-white"
                : "border border-white/10 text-white/55 hover:text-white"
            }`}
          >
            {t.label}
            <span
              className={`rounded-full px-1.5 py-0.5 text-[11px] ${
                t.accent && t.count > 0 && filter !== t.key
                  ? "bg-cursed/20 text-cursed-light"
                  : "bg-white/10 text-white/70"
              }`}
            >
              {t.count}
            </span>
          </button>
        ))}
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher…"
          className="ml-auto w-40 rounded-lg border border-white/10 bg-void-900 px-3 py-1.5 text-sm text-white outline-none focus:border-domain"
        />
      </div>

      {/* Tableau */}
      {filtered.length === 0 ? (
        <p className="py-10 text-center text-sm text-white/30">
          Aucun personnage dans ce filtre. 🎉
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-white/40">
                <th className="px-2 py-2">Personnage</th>
                <th className="px-2 py-2 text-center">Complet</th>
                <th className="px-2 py-2 text-center">Image</th>
                <th className="px-2 py-2 text-center">Battle</th>
                <th className="px-2 py-2">Attributs manquants</th>
                <th className="px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr
                  key={r.character.id}
                  className="border-t border-white/5 hover:bg-void-700/30"
                >
                  <td className="px-2 py-2">
                    <span className="font-semibold text-white">
                      {r.character.name}
                    </span>{" "}
                    <span className="text-xs text-white/35">{r.character.id}</span>
                  </td>
                  <td className="px-2 py-2 text-center">
                    <StatusDot ok={!r.incomplete} />
                  </td>
                  <td className="px-2 py-2 text-center">
                    <StatusDot ok={!r.noImage} />
                  </td>
                  <td className="px-2 py-2 text-center">
                    <StatusDot ok={!r.noBattle} />
                  </td>
                  <td className="px-2 py-2">
                    {r.missingAttrs.length === 0 ? (
                      <span className="text-xs text-white/30">—</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {r.missingAttrs.map((a) => (
                          <span
                            key={a}
                            className="rounded bg-cursed/15 px-1.5 py-0.5 text-[10px] text-cursed-light"
                          >
                            {a}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-2 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => onEdit(r.character)}
                      className="rounded-md border border-white/10 px-2.5 py-1 text-xs text-white/70 hover:text-white"
                    >
                      Éditer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span
      title={ok ? "OK" : "Manquant"}
      className={`inline-block h-2.5 w-2.5 rounded-full ${
        ok ? "bg-emerald-400" : "bg-cursed"
      }`}
    />
  );
}
