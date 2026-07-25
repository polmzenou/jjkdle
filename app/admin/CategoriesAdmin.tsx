"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AdminCategory } from "@/lib/admin/category-store";
import { useGameTitle } from "@/components/universe/UniverseProvider";
import {
  saveCategoryAction,
  deleteCategoryAction,
  moveCategoryAction,
} from "./category-actions";

/**
 * CRUD des CATÉGORIES du builder de l'univers courant.
 *
 * Monté à DEUX endroits, sans adaptation : l'onglet « Catégories » de /admin
 * (univers administré) et le panneau admin de la vue du jeu builder (univers de
 * l'URL). Les actions ciblent l'univers courant, donc le même composant écrit au
 * bon endroit dans les deux cas.
 *
 * Pendant de `AttributesAdmin` : les attributs rendent le jeu du jour jouable
 * sans code, les catégories font de même pour le builder.
 */

const inputCls =
  "w-full rounded-md border border-white/10 bg-void-900 px-2.5 py-1.5 text-sm text-white outline-none focus:border-domain";

type Feedback = { ok: boolean; msg: string } | null;

interface CatForm {
  id?: string;
  label: string;
  description: string;
  weight: string;
  drawCount: string;
}

const emptyCat = (): CatForm => ({
  label: "",
  description: "",
  weight: "1",
  drawCount: "4",
});

export function CategoriesAdmin({
  categories,
  universeName,
}: {
  categories: AdminCategory[];
  /** Nom de l'univers ciblé (rappel explicite : on édite SES catégories). */
  universeName: string;
}) {
  const router = useRouter();
  const builderTitle = useGameTitle("builder");
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [form, setForm] = useState<CatForm>(emptyCat());

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

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const isEdit = Boolean(form.id);
    run(
      () =>
        saveCategoryAction({
          ...(form.id ? { id: form.id } : {}),
          label: form.label,
          description: form.description,
          weight: Number(form.weight),
          drawCount: Number(form.drawCount),
        }),
      isEdit ? "Catégorie mise à jour." : "Catégorie créée.",
    );
    if (!isEdit) setForm(emptyCat());
  };

  const edit = (c: AdminCategory) => {
    setFeedback(null);
    setForm({
      id: c.id,
      label: c.label,
      description: c.description,
      weight: String(c.weight),
      drawCount: String(c.drawCount),
    });
  };

  const remove = (c: AdminCategory) => {
    const warn =
      c.usageCount > 0
        ? `\n\n⚠️ ${c.usageCount} personnage(s) sont notés sur cette catégorie : leurs notes seront PERDUES.`
        : "";
    if (!window.confirm(`Supprimer la catégorie « ${c.label} » ?${warn}`)) return;
    run(() => deleteCategoryAction(c.id), "Catégorie supprimée.");
    if (form.id === c.id) setForm(emptyCat());
  };

  return (
    <section className="space-y-5">
      <div className="rounded-2xl border border-domain/30 bg-domain/5 p-4">
        <p className="text-sm text-white/70">
          Catégories de{" "}
          <span className="font-bold text-domain-light">{universeName}</span> — ce
          sont les lignes de {builderTitle}. Un personnage n&apos;est tiré dans une
          catégorie que s&apos;il y a une note (onglet Roster).
        </p>
        {categories.length === 0 && (
          <p className="mt-2 text-sm text-cursed-light">
            Aucune catégorie : le builder de cet univers est injouable. Créez-en au
            moins trois ci-dessous.
          </p>
        )}
      </div>

      {feedback && (
        <p
          className={`text-sm ${feedback.ok ? "text-emerald-400" : "text-cursed-light"}`}
        >
          {feedback.msg}
        </p>
      )}

      {/* ── Formulaire ── */}
      <form
        onSubmit={submit}
        className="grid gap-3 rounded-2xl border border-white/10 bg-void-800/40 p-4 sm:grid-cols-2"
      >
        <p className="text-xs uppercase tracking-wider text-white/40 sm:col-span-2">
          {form.id ? `Modifier « ${form.label} »` : "Nouvelle catégorie"}
        </p>

        <label className="text-sm text-white/60">
          Libellé affiché
          <input
            value={form.label}
            onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
            placeholder="ex. Contrat démoniaque"
            className={`${inputCls} mt-1`}
          />
          <span className="mt-1 block text-[11px] text-white/35">
            {form.id
              ? "L'identifiant technique reste celui de la création (les notes déjà saisies y font référence)."
              : "L'identifiant technique en est dérivé, et sera immuable ensuite."}
          </span>
        </label>

        <label className="text-sm text-white/60">
          Description
          <input
            value={form.description}
            onChange={(e) =>
              setForm((f) => ({ ...f, description: e.target.value }))
            }
            placeholder="Affichée sous le libellé, en jeu."
            className={`${inputCls} mt-1`}
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm text-white/60">
            Poids
            <input
              type="number"
              min={0.1}
              max={10}
              step={0.1}
              value={form.weight}
              onChange={(e) => setForm((f) => ({ ...f, weight: e.target.value }))}
              className={`${inputCls} mt-1`}
            />
            <span className="mt-1 block text-[11px] text-white/35">
              Importance dans le score final.
            </span>
          </label>
          <label className="text-sm text-white/60">
            Cartes tirées
            <input
              type="number"
              min={1}
              max={12}
              value={form.drawCount}
              onChange={(e) =>
                setForm((f) => ({ ...f, drawCount: e.target.value }))
              }
              className={`${inputCls} mt-1`}
            />
            <span className="mt-1 block text-[11px] text-white/35">
              Plafond : le tirage prend min(ce nombre, éligibles).
            </span>
          </label>
        </div>

        <div className="flex items-end gap-2">
          <button
            type="submit"
            disabled={pending}
            className="rounded-xl bg-domain px-4 py-2 font-display text-sm font-bold uppercase tracking-wide text-white disabled:opacity-40"
          >
            {form.id ? "Mettre à jour" : "Ajouter"}
          </button>
          {form.id && (
            <button
              type="button"
              onClick={() => setForm(emptyCat())}
              className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white/60 hover:text-white"
            >
              Annuler
            </button>
          )}
        </div>
      </form>

      {/* ── Liste ordonnée ── */}
      <ul className="space-y-2">
        {categories.map((c, i) => (
          <li
            key={c.id}
            className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-void-800/40 px-3 py-2.5"
          >
            <span className="w-6 text-center text-xs font-bold text-white/30">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-white">{c.label}</p>
              <p className="truncate text-xs text-white/40">
                {c.description || <em>sans description</em>}
              </p>
            </div>
            <span className="rounded-full bg-white/5 px-2.5 py-1 text-[11px] text-white/60">
              poids {c.weight}
            </span>
            <span className="rounded-full bg-white/5 px-2.5 py-1 text-[11px] text-white/60">
              {c.drawCount} cartes
            </span>
            <span
              className={`rounded-full px-2.5 py-1 text-[11px] ${
                c.usageCount > 0
                  ? "bg-domain/15 text-domain-light"
                  : "bg-cursed/15 text-cursed-light"
              }`}
              title="Personnages notés sur cette catégorie"
            >
              {c.usageCount} perso{c.usageCount > 1 ? "s" : ""}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={pending || i === 0}
                onClick={() => run(() => moveCategoryAction(c.id, "up"), "Ordre mis à jour.")}
                className="rounded-md border border-white/10 px-2 py-1 text-xs text-white/60 hover:text-white disabled:opacity-20"
                aria-label={`Monter ${c.label}`}
              >
                ↑
              </button>
              <button
                type="button"
                disabled={pending || i === categories.length - 1}
                onClick={() =>
                  run(() => moveCategoryAction(c.id, "down"), "Ordre mis à jour.")
                }
                className="rounded-md border border-white/10 px-2 py-1 text-xs text-white/60 hover:text-white disabled:opacity-20"
                aria-label={`Descendre ${c.label}`}
              >
                ↓
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => edit(c)}
                className="rounded-md border border-white/10 px-2 py-1 text-xs text-white/70 hover:text-white disabled:opacity-40"
              >
                Modifier
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => remove(c)}
                className="rounded-md border border-cursed/40 px-2 py-1 text-xs text-cursed-light hover:bg-cursed/10 disabled:opacity-40"
              >
                Supprimer
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
