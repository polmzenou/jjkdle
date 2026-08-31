"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CharacterImage } from "@/components/CharacterImage";
import {
  EFFECT_KINDS,
  EFFECT_SPECS,
  describeEffect,
  type EffectKind,
} from "@/lib/games/tower/effects";
import {
  ITEM_RARITIES,
  MIN_ITEMS,
  itemRarityStyle,
  type ItemRarity,
  type TowerItem,
} from "@/lib/games/tower/items";
import { ImageDropzone } from "./ImageDropzone";
import {
  deleteItemAction,
  moveItemAction,
  saveItemAction,
} from "./item-actions";

/**
 * Onglet « Objets » — CRUD du roster Item, sur le patron de `DraftRosterAdmin`.
 *
 * Le point important est le formulaire d'EFFETS : le `<select>` et les bornes
 * de saisie sont construits depuis `EFFECT_SPECS`, la même table que lit le
 * moteur de combat. Ajouter un effet au catalogue le fait donc apparaître ici
 * sans toucher à ce fichier — et il est impossible de saisir un effet que le
 * moteur ne saurait pas appliquer.
 */

interface FormState {
  id?: string;
  name: string;
  description: string;
  rarity: ItemRarity;
  effectKind: EffectKind;
  effectValue: number;
  effectKind2: "" | EffectKind;
  effectValue2: number;
  enabled: boolean;
}

const EMPTY: FormState = {
  name: "",
  description: "",
  rarity: "COMMON",
  effectKind: "FRAPPE_PCT",
  effectValue: 10,
  effectKind2: "",
  effectValue2: 0,
  enabled: true,
};

export function ItemsAdmin({ items }: { items: TowerItem[] }) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const editing = Boolean(form.id);
  const current = useMemo(
    () => items.find((i) => i.id === form.id),
    [items, form.id],
  );

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  function edit(item: TowerItem) {
    setError(null);
    setForm({
      id: item.id,
      name: item.name,
      description: item.description,
      rarity: item.rarity,
      effectKind: item.effects[0]?.kind ?? "FRAPPE_PCT",
      effectValue: item.effects[0]?.value ?? 0,
      effectKind2: item.effects[1]?.kind ?? "",
      effectValue2: item.effects[1]?.value ?? 0,
      enabled: item.enabled,
    });
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await saveItemAction({
        id: form.id,
        name: form.name,
        description: form.description,
        rarity: form.rarity,
        effectKind: form.effectKind,
        effectValue: form.effectValue,
        effectKind2: form.effectKind2,
        effectValue2: form.effectValue2,
        enabled: form.enabled,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setForm(EMPTY);
      router.refresh();
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      await deleteItemAction(id);
      if (form.id === id) setForm(EMPTY);
      router.refresh();
    });
  }

  function move(id: string, direction: -1 | 1) {
    startTransition(async () => {
      await moveItemAction(id, direction);
      router.refresh();
    });
  }

  async function uploadImage(file: File) {
    if (!form.id) return;
    const body = new FormData();
    body.append("file", file);
    await fetch(`/api/items/${form.id}/image`, { method: "POST", body });
    router.refresh();
  }

  async function removeImage() {
    if (!form.id) return;
    await fetch(`/api/items/${form.id}/image`, { method: "DELETE" });
    router.refresh();
  }

  const active = items.filter((i) => i.enabled).length;

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      {/* ── Liste ── */}
      <section className="min-w-0 flex-1">
        <header className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="font-display text-lg font-bold text-white">
            Objets maudits
          </h2>
          <p
            className={
              active >= MIN_ITEMS
                ? "text-xs text-white/45"
                : "text-xs font-semibold text-amber-400"
            }
          >
            {active} actif(s) sur {items.length}
            {active < MIN_ITEMS &&
              ` — il en faut ${MIN_ITEMS} pour que les récompenses proposent des objets`}
          </p>
        </header>

        <div className="flex flex-col gap-1.5">
          {items.map((item, index) => {
            const style = itemRarityStyle(item.rarity);
            return (
              <div
                key={item.id}
                className={[
                  "flex items-center gap-3 rounded-lg border p-2",
                  form.id === item.id
                    ? "border-domain bg-domain/10"
                    : "border-white/10 bg-void-800/50",
                  item.enabled ? "" : "opacity-45",
                ].join(" ")}
              >
                <div className="h-11 w-11 shrink-0 overflow-hidden rounded">
                  <CharacterImage
                    character={{ name: item.name, image: item.image }}
                  />
                </div>

                <button
                  type="button"
                  onClick={() => edit(item)}
                  className="min-w-0 flex-1 text-left"
                >
                  <p className="truncate font-display text-sm font-bold" style={{ color: style.color }}>
                    {item.name}
                    {!item.enabled && (
                      <span className="ml-2 text-[10px] uppercase text-white/40">
                        inactif
                      </span>
                    )}
                  </p>
                  <p className="truncate text-[11px] text-white/55">
                    {item.effects
                      .map((e) => describeEffect(e.kind, e.value))
                      .join(" · ")}
                  </p>
                </button>

                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => move(item.id, -1)}
                    disabled={pending || index === 0}
                    aria-label="Monter"
                    className="rounded border border-white/10 px-1.5 text-white/50 disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => move(item.id, 1)}
                    disabled={pending || index === items.length - 1}
                    aria-label="Descendre"
                    className="rounded border border-white/10 px-1.5 text-white/50 disabled:opacity-30"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(item.id)}
                    disabled={pending}
                    aria-label={`Supprimer ${item.name}`}
                    className="rounded border border-cursed/40 px-1.5 text-cursed disabled:opacity-30"
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Formulaire ── */}
      <section className="w-full shrink-0 lg:w-[380px]">
        <div className="sticky top-4 flex flex-col gap-3 rounded-xl border border-white/10 bg-void-800/60 p-4">
          <div className="flex items-baseline justify-between">
            <h3 className="font-display text-sm font-bold uppercase tracking-wide text-white">
              {editing ? "Modifier" : "Nouvel objet"}
            </h3>
            {editing && (
              <button
                type="button"
                onClick={() => setForm(EMPTY)}
                className="text-xs text-white/50 hover:text-white"
              >
                Annuler
              </button>
            )}
          </div>

          {editing && (
            <ImageDropzone
              previewUrl={current?.image ?? null}
              name={form.name}
              onFile={uploadImage}
              onRemove={removeImage}
            />
          )}
          {!editing && (
            <p className="rounded-lg border border-white/10 bg-black/20 p-2 text-[11px] text-white/45">
              Enregistre l&apos;objet d&apos;abord : l&apos;image se téléverse
              ensuite, une fois qu&apos;il existe en base.
            </p>
          )}

          <Field label="Nom">
            <input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              className={inputClass}
            />
          </Field>

          <Field label="Description">
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={3}
              className={inputClass}
            />
          </Field>

          <Field label="Rareté">
            <select
              value={form.rarity}
              onChange={(e) => set("rarity", e.target.value as ItemRarity)}
              className={inputClass}
            >
              {ITEM_RARITIES.map((r) => (
                <option key={r} value={r}>
                  {itemRarityStyle(r).label}
                </option>
              ))}
            </select>
          </Field>

          <EffectField
            label="Effet principal"
            kind={form.effectKind}
            value={form.effectValue}
            onKind={(k) => set("effectKind", k as EffectKind)}
            onValue={(v) => set("effectValue", v)}
          />

          <EffectField
            label="Second effet (optionnel)"
            kind={form.effectKind2}
            value={form.effectValue2}
            optional
            onKind={(k) => set("effectKind2", k as "" | EffectKind)}
            onValue={(v) => set("effectValue2", v)}
          />

          <label className="flex items-center gap-2 text-sm text-white/70">
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(e) => set("enabled", e.target.checked)}
            />
            Actif (proposé dans les tirages)
          </label>

          {error && (
            <p className="rounded border border-cursed/40 bg-cursed/10 px-2 py-1.5 text-xs text-cursed-light">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={save}
            disabled={pending}
            className="rounded-lg bg-domain px-4 py-2 font-display font-bold text-white disabled:opacity-40"
          >
            {editing ? "Enregistrer" : "Créer l'objet"}
          </button>
        </div>
      </section>
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-white/10 bg-black/30 px-2.5 py-1.5 text-sm text-white outline-none focus:border-domain";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="font-display text-[10px] font-bold uppercase tracking-[0.14em] text-white/45">
        {label}
      </span>
      {children}
    </label>
  );
}

/**
 * Un couple (effet, valeur).
 *
 * Le libellé, l'unité et les bornes viennent de `EFFECT_SPECS` : l'admin ne peut
 * pas saisir une valeur que le moteur refuserait, et l'aperçu affiche la phrase
 * exacte que le joueur lira sur la carte.
 */
function EffectField({
  label,
  kind,
  value,
  optional = false,
  onKind,
  onValue,
}: {
  label: string;
  kind: "" | EffectKind;
  value: number;
  optional?: boolean;
  onKind: (kind: string) => void;
  onValue: (value: number) => void;
}) {
  const spec = kind ? EFFECT_SPECS[kind] : null;

  return (
    <div className="flex flex-col gap-1">
      <span className="font-display text-[10px] font-bold uppercase tracking-[0.14em] text-white/45">
        {label}
      </span>
      <div className="flex gap-2">
        <select
          value={kind}
          onChange={(e) => onKind(e.target.value)}
          className={`${inputClass} flex-1`}
        >
          {optional && <option value="">— aucun —</option>}
          {EFFECT_KINDS.map((k) => (
            <option key={k} value={k}>
              {EFFECT_SPECS[k].label}
            </option>
          ))}
        </select>
        <input
          type="number"
          value={value}
          disabled={!spec}
          min={spec?.min}
          max={spec?.max}
          onChange={(e) => onValue(Number.parseInt(e.target.value, 10) || 0)}
          className={`${inputClass} w-24 tabular-nums disabled:opacity-30`}
        />
      </div>
      {spec && (
        <p className="text-[11px] text-white/40">
          {spec.unit} · de {spec.min} à {spec.max}
          {spec.cap !== null && ` · cumul plafonné à ${spec.cap}`}
          <span className="ml-1 text-domain-light">
            → « {describeEffect(kind as EffectKind, value)} »
          </span>
        </p>
      )}
    </div>
  );
}
