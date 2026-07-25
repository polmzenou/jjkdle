"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AttributeKind } from "@prisma/client";
import type { AdminAttribute } from "@/lib/admin/attribute-store";
import { useGameTitle } from "@/components/universe/UniverseProvider";
import {
  saveAttributeAction,
  deleteAttributeAction,
  saveAttributeOptionAction,
  deleteAttributeOptionAction,
} from "./actions";

/**
 * Onglet « Attributs » : CRUD des attributs de personnage de l'univers
 * administré (étape 5).
 *
 * C'est l'écran qui rend un nouvel anime jouable SANS CODE : on y déclare ses
 * colonnes JJKdle (race, grade… ou tout autre axe propre à l'œuvre) et leurs
 * valeurs possibles. Le jeu, la grille d'indices, l'éligibilité au tirage du
 * jour et le formulaire du roster en découlent automatiquement.
 */

const KIND_LABELS: Record<AttributeKind, string> = {
  CATEGORICAL: "Liste (non ordonnée)",
  ORDINAL: "Liste ordonnée (↑/↓)",
  BOOLEAN: "Oui / Non",
  NUMERIC: "Nombre (↑/↓)",
};

const KIND_HELP: Record<AttributeKind, string> = {
  CATEGORICAL: "Égalité stricte : vert si identique, rouge sinon. Aucune flèche.",
  ORDINAL:
    "L'ordre des valeurs donne l'indice ↑/↓. Une valeur sans rang ne se compare à rien.",
  BOOLEAN: "Deux valeurs à créer : « true » et « false ».",
  NUMERIC: "Saisie libre d'un entier. La tolérance déclenche l'indice orange.",
};

const inputCls =
  "w-full rounded-md border border-white/10 bg-void-900 px-2.5 py-1.5 text-sm text-white outline-none focus:border-domain";

type Feedback = { ok: boolean; msg: string } | null;

interface AttrForm {
  id?: string;
  key: string;
  label: string;
  kind: AttributeKind;
  position: string;
  comparable: boolean;
  tolerance: string;
}

const emptyAttr = (position: number): AttrForm => ({
  key: "",
  label: "",
  kind: "CATEGORICAL",
  position: String(position),
  comparable: false,
  tolerance: "",
});

export function AttributesAdmin({
  attributes,
  universeName,
}: {
  attributes: AdminAttribute[];
  /** Nom de l'univers administré (rappel explicite : on édite SES attributs). */
  universeName: string;
}) {
  const router = useRouter();
  // Les attributs sont les colonnes du jeu du jour : son nom dépend de l'univers.
  const dailyTitle = useGameTitle("jjkdle");
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [form, setForm] = useState<AttrForm>(emptyAttr(attributes.length));
  /** Attribut dont les valeurs sont dépliées. */
  const [openId, setOpenId] = useState<string | null>(null);

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, okMsg: string) =>
    startTransition(async () => {
      const res = await fn();
      setFeedback(
        res.ok ? { ok: true, msg: okMsg } : { ok: false, msg: res.error ?? "Échec." },
      );
      if (res.ok) router.refresh();
    });

  const submitAttr = (e: React.FormEvent) => {
    e.preventDefault();
    const isEdit = Boolean(form.id);
    run(
      () =>
        saveAttributeAction({
          ...(form.id ? { id: form.id } : {}),
          key: form.key,
          label: form.label,
          kind: form.kind,
          position: Number(form.position) || 0,
          comparable: form.comparable,
          tolerance: form.tolerance.trim() === "" ? null : Number(form.tolerance),
        }),
      isEdit ? "Attribut mis à jour." : "Attribut créé.",
    );
    if (!isEdit) setForm(emptyAttr(attributes.length + 1));
  };

  const editAttr = (a: AdminAttribute) => {
    setFeedback(null);
    setForm({
      id: a.id,
      key: a.key,
      label: a.label,
      kind: a.kind,
      position: String(a.position),
      comparable: a.comparable,
      tolerance: a.tolerance == null ? "" : String(a.tolerance),
    });
  };

  const removeAttr = (a: AdminAttribute) => {
    const warn =
      a.usageCount > 0
        ? `\n\n⚠️ ${a.usageCount} personnage(s) ont une valeur pour cet attribut : elle sera PERDUE, et ces persos deviendront incomplets (donc exclus du tirage quotidien).`
        : "";
    if (!window.confirm(`Supprimer l'attribut « ${a.label} » ?${warn}`)) return;
    run(() => deleteAttributeAction(a.id), "Attribut supprimé.");
    if (form.id === a.id) setForm(emptyAttr(attributes.length));
  };

  return (
    <section className="space-y-5">
      <div className="rounded-2xl border border-domain/30 bg-domain/5 p-4">
        <p className="text-sm text-white/70">
          Attributs de <span className="font-bold text-domain-light">{universeName}</span>{" "}
          — ce sont les colonnes de la grille {dailyTitle}. Un personnage
          n&apos;entre dans
          le tirage quotidien que si <em>tous</em> sont renseignés.
        </p>
      </div>

      {feedback && (
        <p
          className={`text-sm ${feedback.ok ? "text-emerald-400" : "text-cursed-light"}`}
        >
          {feedback.msg}
        </p>
      )}

      {/* ── Formulaire attribut ── */}
      <form
        onSubmit={submitAttr}
        className="grid gap-3 rounded-2xl border border-white/10 bg-void-800/40 p-4 sm:grid-cols-2"
      >
        <p className="sm:col-span-2 text-xs uppercase tracking-wider text-white/40">
          {form.id ? `Modifier « ${form.label || form.key} »` : "Nouvel attribut"}
        </p>

        <label className="text-sm text-white/60">
          Clé technique
          <input
            value={form.key}
            onChange={(e) => setForm((f) => ({ ...f, key: e.target.value }))}
            disabled={Boolean(form.id)}
            placeholder="ex. appearanceArc"
            className={`${inputCls} mt-1 disabled:opacity-40`}
          />
          <span className="mt-1 block text-[11px] text-white/35">
            {form.id
              ? "Immuable : d'autres données y font référence."
              : "Minuscule au début, lettres/chiffres ensuite."}
          </span>
        </label>

        <label className="text-sm text-white/60">
          Libellé affiché
          <input
            value={form.label}
            onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
            placeholder="ex. Arc d'apparition"
            className={`${inputCls} mt-1`}
          />
        </label>

        <label className="text-sm text-white/60">
          Type
          <select
            value={form.kind}
            onChange={(e) =>
              setForm((f) => ({ ...f, kind: e.target.value as AttributeKind }))
            }
            className={`${inputCls} mt-1`}
          >
            {(Object.keys(KIND_LABELS) as AttributeKind[]).map((k) => (
              <option key={k} value={k}>
                {KIND_LABELS[k]}
              </option>
            ))}
          </select>
          <span className="mt-1 block text-[11px] text-white/35">
            {KIND_HELP[form.kind]}
          </span>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm text-white/60">
            Position
            <input
              type="number"
              min={0}
              value={form.position}
              onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))}
              className={`${inputCls} mt-1`}
            />
          </label>
          <label className="text-sm text-white/60">
            Tolérance
            <input
              type="number"
              min={0}
              value={form.tolerance}
              onChange={(e) => setForm((f) => ({ ...f, tolerance: e.target.value }))}
              disabled={form.kind !== "NUMERIC"}
              placeholder={form.kind === "NUMERIC" ? "ex. 20" : "—"}
              className={`${inputCls} mt-1 disabled:opacity-30`}
            />
          </label>
        </div>

        <label className="flex items-center gap-2 text-sm text-white/60 sm:col-span-2">
          <input
            type="checkbox"
            checked={form.comparable}
            onChange={(e) =>
              setForm((f) => ({ ...f, comparable: e.target.checked }))
            }
            className="h-4 w-4 accent-domain"
          />
          Afficher une flèche ↑/↓ (listes ordonnées et nombres)
        </label>

        <div className="flex gap-2 sm:col-span-2">
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
              onClick={() => setForm(emptyAttr(attributes.length))}
              className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white/60 hover:text-white"
            >
              Annuler
            </button>
          )}
        </div>
      </form>

      {/* ── Liste ── */}
      {attributes.length === 0 ? (
        <p className="rounded-xl border border-cursed/40 bg-cursed/10 px-4 py-3 text-sm text-cursed-light">
          Aucun attribut : {dailyTitle} ne peut pas fonctionner pour cet univers.
          Crée au
          moins un attribut ci-dessus.
        </p>
      ) : (
        <ul className="space-y-3">
          {attributes.map((a) => (
            <li
              key={a.id}
              className="rounded-2xl border border-white/10 bg-void-800/40 p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-display text-sm font-bold text-white">
                    <span className="mr-2 text-white/35">#{a.position}</span>
                    {a.label}{" "}
                    <span className="font-mono text-xs font-normal text-white/35">
                      {a.key}
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs text-white/45">
                    {KIND_LABELS[a.kind]}
                    {a.comparable && " · flèche ↑/↓"}
                    {a.tolerance != null && ` · tolérance ${a.tolerance}`}
                    {` · ${a.usageCount} perso(s) renseigné(s)`}
                  </p>
                </div>
                <div className="flex gap-2">
                  {a.kind !== "NUMERIC" && (
                    <button
                      type="button"
                      onClick={() => setOpenId(openId === a.id ? null : a.id)}
                      className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/70 hover:text-white"
                    >
                      {a.options.length} valeur(s) {openId === a.id ? "▲" : "▼"}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => editAttr(a)}
                    className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/70 hover:text-white"
                  >
                    Éditer
                  </button>
                  <button
                    type="button"
                    onClick={() => removeAttr(a)}
                    disabled={pending}
                    className="rounded-lg border border-cursed/40 px-3 py-1.5 text-xs text-cursed-light hover:bg-cursed/10 disabled:opacity-40"
                  >
                    Supprimer
                  </button>
                </div>
              </div>

              {openId === a.id && a.kind !== "NUMERIC" && (
                <OptionEditor
                  attribute={a}
                  pending={pending}
                  onRun={run}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Valeurs possibles d'un attribut à liste fermée. */
function OptionEditor({
  attribute,
  pending,
  onRun,
}: {
  attribute: AdminAttribute;
  pending: boolean;
  onRun: (
    fn: () => Promise<{ ok: boolean; error?: string }>,
    okMsg: string,
  ) => void;
}) {
  const [value, setValue] = useState("");
  const [label, setLabel] = useState("");
  const [order, setOrder] = useState("");
  const ordered = attribute.kind === "ORDINAL";

  const add = () => {
    onRun(
      () =>
        saveAttributeOptionAction({
          attributeId: attribute.id,
          value,
          label,
          order: order.trim() === "" ? null : Number(order),
        }),
      "Valeur ajoutée.",
    );
    setValue("");
    setLabel("");
    setOrder("");
  };

  const remove = (id: string, optLabel: string, usage: number) => {
    const warn =
      usage > 0
        ? `\n\n⚠️ ${usage} personnage(s) portent cette valeur : ils perdront cet attribut.`
        : "";
    if (!window.confirm(`Supprimer la valeur « ${optLabel} » ?${warn}`)) return;
    onRun(() => deleteAttributeOptionAction(id), "Valeur supprimée.");
  };

  return (
    <div className="mt-4 border-t border-white/10 pt-4">
      {attribute.options.length > 0 && (
        <ul className="mb-3 space-y-1.5">
          {attribute.options.map((o) => (
            <li
              key={o.id}
              className="flex items-center justify-between gap-3 rounded-lg bg-void-900/50 px-3 py-1.5 text-sm"
            >
              <span className="min-w-0 truncate text-white/80">
                {ordered && (
                  <span className="mr-2 font-mono text-xs text-white/35">
                    {o.order == null ? "—" : o.order}
                  </span>
                )}
                {o.label}{" "}
                <span className="font-mono text-xs text-white/35">{o.value}</span>
                {o.usageCount > 0 && (
                  <span className="ml-2 text-xs text-white/30">
                    {o.usageCount} perso(s)
                  </span>
                )}
              </span>
              <button
                type="button"
                onClick={() => remove(o.id, o.label, o.usageCount)}
                disabled={pending}
                className="shrink-0 text-xs text-white/40 hover:text-cursed-light disabled:opacity-40"
              >
                Supprimer
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-end gap-2">
        <label className="text-xs text-white/50">
          Valeur
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="SHIBUYA_INCIDENT"
            className={`${inputCls} mt-1 w-44`}
          />
        </label>
        <label className="text-xs text-white/50">
          Libellé
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Incident de Shibuya"
            className={`${inputCls} mt-1 w-52`}
          />
        </label>
        {ordered && (
          <label className="text-xs text-white/50">
            Rang
            <input
              type="number"
              min={0}
              value={order}
              onChange={(e) => setOrder(e.target.value)}
              placeholder="vide = non ordonné"
              className={`${inputCls} mt-1 w-36`}
            />
          </label>
        )}
        <button
          type="button"
          onClick={add}
          disabled={pending || !value.trim() || !label.trim()}
          className="rounded-lg bg-domain/80 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-white disabled:opacity-40"
        >
          Ajouter
        </button>
      </div>
      {ordered && (
        <p className="mt-2 text-[11px] text-white/35">
          Le rang donne l&apos;indice ↑/↓ (0 = premier). Laisser vide pour une valeur
          qui ne se compare à rien (ex. « pas de grade »).
        </p>
      )}
    </div>
  );
}
