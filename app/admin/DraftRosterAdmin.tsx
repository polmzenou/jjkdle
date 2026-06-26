"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CharacterImage } from "@/components/CharacterImage";
import { DRAFT_CATEGORIES, DRAFT_CATEGORY_BY_ID } from "@/lib/games/draft/categories";
import { MIN_DRAFT_ROSTER } from "@/lib/games/draft/queries";
import type {
  DraftCharacter,
  DraftCategoryId,
  DraftTier,
} from "@/lib/games/draft/types";
import { ImageDropzone } from "./ImageDropzone";
import {
  saveDraftCharacterAction,
  deleteDraftCharacterAction,
} from "./actions";

const DRAFT_TIERS: DraftTier[] = ["S", "A", "B", "C"];

const TIER_COLOR: Record<DraftTier, string> = {
  S: "#f43f5e",
  A: "#f59e0b",
  B: "#a78bfa",
  C: "#6b7280",
};

interface DraftRosterAdminProps {
  roster: DraftCharacter[];
}

interface FormState {
  id: string;
  name: string;
  image: string;
  excellenceCategory: DraftCategoryId;
  tier: DraftTier;
  cost: string;
  statValue: string;
}

const EMPTY_FORM: FormState = {
  id: "",
  name: "",
  image: "",
  excellenceCategory: DRAFT_CATEGORIES[0].id,
  tier: "B",
  cost: "10",
  statValue: "12",
};

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const inputCls =
  "w-full rounded-lg border border-white/10 bg-void-900 px-3 py-2 text-sm text-white outline-none focus:border-domain";

/** Onglet admin : roster du jeu « Jujutsu Draft » (catégorie, tier, coût, stat, image). */
export function DraftRosterAdmin({ roster }: DraftRosterAdminProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [query, setQuery] = useState("");
  const [catFilter, setCatFilter] = useState<DraftCategoryId | "all">("all");
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(
    null,
  );

  // Image : fichier en attente d'upload, ou retrait demandé (comme le Roster).
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageRemoved, setImageRemoved] = useState(false);

  const objectUrl = useMemo(
    () => (imageFile ? URL.createObjectURL(imageFile) : null),
    [imageFile],
  );
  useEffect(
    () => () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    },
    [objectUrl],
  );
  const previewUrl = imageFile
    ? objectUrl
    : imageRemoved
      ? null
      : form.image || null;

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const stageImage = (file: File) => {
    setImageFile(file);
    setImageRemoved(false);
  };
  const removeImage = () => {
    setImageFile(null);
    setImageRemoved(true);
  };

  const loadCharacter = (c: DraftCharacter) => {
    setEditingId(c.id);
    setFeedback(null);
    setImageFile(null);
    setImageRemoved(false);
    setForm({
      id: c.id,
      name: c.name,
      image: c.image ?? "",
      excellenceCategory: c.excellenceCategory,
      tier: c.tier,
      cost: String(c.cost),
      statValue: String(c.statValue),
    });
    if (typeof window !== "undefined")
      window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const resetForm = () => {
    setEditingId(null);
    setFeedback(null);
    setImageFile(null);
    setImageRemoved(false);
    setForm(EMPTY_FORM);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    const image = imageRemoved ? "" : form.image.trim();
    const char: DraftCharacter = {
      id: form.id.trim(),
      name: form.name.trim(),
      excellenceCategory: form.excellenceCategory,
      tier: form.tier,
      cost: Number(form.cost),
      statValue: Number(form.statValue),
      ...(image ? { image } : {}),
    };
    startTransition(async () => {
      // 1) Enregistre les champs (crée la ligne si nouvelle → l'id existe ensuite).
      const res = await saveDraftCharacterAction(char);
      if (!res.ok) {
        setFeedback({ ok: false, msg: res.error ?? "Échec." });
        return;
      }

      // 2) Opérations sur l'image (upload binaire en base, ou retrait).
      try {
        if (imageFile) {
          const fd = new FormData();
          fd.append("file", imageFile);
          const up = await fetch(`/api/draft-characters/${char.id}/image`, {
            method: "POST",
            body: fd,
          });
          if (!up.ok) {
            const j = await up.json().catch(() => ({}));
            setFeedback({
              ok: false,
              msg: j.error ?? "Personnage enregistré, mais image refusée.",
            });
            router.refresh();
            return;
          }
        } else if (imageRemoved) {
          await fetch(`/api/draft-characters/${char.id}/image`, {
            method: "DELETE",
          });
        }
      } catch {
        setFeedback({
          ok: false,
          msg: "Personnage enregistré, mais l'upload de l'image a échoué.",
        });
        router.refresh();
        return;
      }

      setFeedback({ ok: true, msg: `« ${char.name} » enregistré.` });
      resetForm();
      router.refresh();
    });
  };

  const remove = (c: DraftCharacter) => {
    if (!window.confirm(`Supprimer « ${c.name} » du roster draft ?`)) return;
    startTransition(async () => {
      const res = await deleteDraftCharacterAction(c.id);
      if (res.ok) {
        setFeedback({ ok: true, msg: `« ${c.name} » supprimé.` });
        if (editingId === c.id) resetForm();
        router.refresh();
      } else {
        setFeedback({ ok: false, msg: res.error ?? "Échec." });
      }
    });
  };

  const filtered = useMemo(
    () =>
      roster.filter(
        (c) =>
          (catFilter === "all" || c.excellenceCategory === catFilter) &&
          (c.name.toLowerCase().includes(query.toLowerCase()) ||
            c.id.includes(query.toLowerCase())),
      ),
    [roster, query, catFilter],
  );

  const tooFew = roster.length < MIN_DRAFT_ROSTER;

  return (
    <div>
      {feedback && (
        <div
          className={`mb-5 rounded-xl px-4 py-3 text-sm ${
            feedback.ok
              ? "border border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
              : "border border-cursed/40 bg-cursed/10 text-cursed-light"
          }`}
        >
          {feedback.msg}
        </div>
      )}

      {tooFew && (
        <div className="mb-5 rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
          ⚠️ Roster trop réduit ({roster.length}/{MIN_DRAFT_ROSTER}). En dessous
          de {MIN_DRAFT_ROSTER} persos (dont 8 Tier C), le jeu repasse
          temporairement sur le roster par défaut pour rester jouable.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_1fr]">
        {/* ── Formulaire ── */}
        <form
          onSubmit={submit}
          className="h-fit space-y-4 rounded-2xl border border-white/10 bg-void-800/50 p-5"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-white">
              {editingId ? `Éditer : ${editingId}` : "Nouveau personnage"}
            </h2>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="text-xs text-white/50 hover:text-white"
              >
                + Nouveau
              </button>
            )}
          </div>

          <div className="flex gap-4">
            <ImageDropzone
              previewUrl={previewUrl}
              name={form.name}
              onFile={stageImage}
              onRemove={removeImage}
            />
            <div className="flex-1 space-y-3">
              <Field label="Nom">
                <input
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  onBlur={() =>
                    setForm((f) =>
                      f.id || !f.name ? f : { ...f, id: slugify(f.name) },
                    )
                  }
                  className={inputCls}
                  placeholder="Satoru Gojo"
                />
              </Field>
              <Field label="Identifiant (slug)">
                <input
                  value={form.id}
                  disabled={!!editingId}
                  onChange={(e) => set("id", slugify(e.target.value))}
                  className={`${inputCls} disabled:opacity-50`}
                  placeholder="gojo"
                />
              </Field>
            </div>
          </div>

          <Field label="Catégorie d'excellence">
            <select
              value={form.excellenceCategory}
              onChange={(e) =>
                set("excellenceCategory", e.target.value as DraftCategoryId)
              }
              className={inputCls}
            >
              {DRAFT_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Tier">
              <select
                value={form.tier}
                onChange={(e) => set("tier", e.target.value as DraftTier)}
                className={inputCls}
              >
                {DRAFT_TIERS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Coût">
              <input
                type="number"
                min={0}
                max={99}
                value={form.cost}
                onChange={(e) => set("cost", e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="StatValue">
              <input
                type="number"
                min={0}
                max={99}
                value={form.statValue}
                onChange={(e) => set("statValue", e.target.value)}
                className={inputCls}
              />
            </Field>
          </div>

          <Field label="Image (chemin /assets/… — optionnel si tu téléverses)">
            <input
              value={form.image}
              onChange={(e) => set("image", e.target.value)}
              className={inputCls}
              placeholder="/assets/characters/Satoru_Portrait_Anime.webp"
            />
          </Field>

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-xl bg-domain px-4 py-3 font-display font-bold uppercase tracking-wide text-white shadow-glow transition-transform enabled:hover:scale-[1.02] disabled:opacity-40"
          >
            {pending ? "Enregistrement…" : editingId ? "Mettre à jour" : "Ajouter"}
          </button>
        </form>

        {/* ── Listing ── */}
        <section className="rounded-2xl border border-white/10 bg-void-800/40 p-5">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <h2 className="font-display text-lg font-bold text-white">
              Roster draft
            </h2>
            <span className="rounded-full bg-domain/15 px-2 py-0.5 text-xs font-bold text-domain-light">
              {filtered.length}/{roster.length}
            </span>
            <select
              value={catFilter}
              onChange={(e) =>
                setCatFilter(e.target.value as DraftCategoryId | "all")
              }
              className="ml-auto rounded-lg border border-white/10 bg-void-900 px-3 py-1.5 text-sm text-white outline-none focus:border-domain"
            >
              <option value="all">Toutes catégories</option>
              {DRAFT_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher…"
              className="w-40 rounded-lg border border-white/10 bg-void-900 px-3 py-1.5 text-sm text-white outline-none focus:border-domain"
            />
          </div>

          <div className="space-y-2">
            {filtered.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-3 rounded-xl border border-white/5 bg-void-700/30 p-2"
              >
                <div className="h-14 w-11 shrink-0 overflow-hidden rounded-lg border border-white/10">
                  <CharacterImage character={c} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">
                    {c.name}{" "}
                    <span className="text-xs font-normal text-white/35">
                      {c.id}
                    </span>
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <span
                      className="rounded px-1.5 py-0.5 text-[10px] font-black text-void-900"
                      style={{ background: TIER_COLOR[c.tier] }}
                    >
                      {c.tier}
                    </span>
                    <span className="rounded bg-domain/15 px-1.5 py-0.5 text-[10px] text-domain-light">
                      {DRAFT_CATEGORY_BY_ID[c.excellenceCategory]?.label ??
                        c.excellenceCategory}
                    </span>
                    <span className="rounded bg-amber-300/15 px-1.5 py-0.5 text-[10px] text-amber-200">
                      coût {c.cost}
                    </span>
                    <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-white/60">
                      stat {c.statValue}
                    </span>
                  </div>
                </div>
                <div className="flex shrink-0 flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => loadCharacter(c)}
                    className="rounded-md border border-white/10 px-2 py-1 text-xs text-white/70 hover:text-white"
                  >
                    Éditer
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(c)}
                    className="rounded-md border border-cursed/30 px-2 py-1 text-xs text-cursed-light hover:bg-cursed/10"
                  >
                    Suppr.
                  </button>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <p className="py-8 text-center text-sm text-white/30">
                Aucun personnage.
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs uppercase tracking-wider text-white/45">
        {label}
      </span>
      {children}
    </label>
  );
}
