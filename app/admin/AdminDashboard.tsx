"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { CategoryConfig } from "@/data/roster/categories";
import type { Character, CharacterTier } from "@/data/roster/characters";
import { CharacterImage } from "@/components/CharacterImage";
import {
  saveCharacterAction,
  deleteCharacterAction,
  logoutAction,
} from "./actions";

const TIERS: CharacterTier[] = ["s", "1", "2", "3", "4", "4minus"];

type CatField = { enabled: boolean; value: string };
interface FormState {
  id: string;
  name: string;
  title: string;
  tier: CharacterTier;
  image: string;
  cats: Record<string, CatField>;
}

interface AdminDashboardProps {
  roster: Character[];
  categories: CategoryConfig[];
  canWrite: boolean;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function AdminDashboard({
  roster,
  categories,
  canWrite,
}: AdminDashboardProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(
    null,
  );
  const [query, setQuery] = useState("");

  const emptyForm = useMemo<FormState>(
    () => ({
      id: "",
      name: "",
      title: "",
      tier: "3",
      image: "",
      cats: Object.fromEntries(
        categories.map((c) => [c.id, { enabled: false, value: "" }]),
      ),
    }),
    [categories],
  );

  const [form, setForm] = useState<FormState>(emptyForm);

  const loadCharacter = (c: Character) => {
    setEditingId(c.id);
    setFeedback(null);
    setForm({
      id: c.id,
      name: c.name,
      title: c.title ?? "",
      tier: c.tier,
      image: c.image ?? "",
      cats: Object.fromEntries(
        categories.map((cat) => {
          const v = c.ratings[cat.id];
          return [cat.id, { enabled: v !== undefined, value: v?.toString() ?? "" }];
        }),
      ),
    });
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const resetForm = () => {
    setEditingId(null);
    setFeedback(null);
    setForm(emptyForm);
  };

  const buildCharacter = (): Character => {
    const ratings: Character["ratings"] = {};
    for (const cat of categories) {
      const f = form.cats[cat.id];
      if (f?.enabled && f.value !== "") {
        ratings[cat.id] = Number(f.value);
      }
    }
    const image = form.image.trim();
    return {
      id: form.id.trim(),
      name: form.name.trim(),
      title: form.title.trim(),
      tier: form.tier,
      ...(image ? { image } : {}),
      ratings,
    };
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    const char = buildCharacter();
    startTransition(async () => {
      const res = await saveCharacterAction(char);
      if (res.ok) {
        setFeedback({ ok: true, msg: `« ${char.name} » enregistré.` });
        resetForm();
        router.refresh();
      } else {
        setFeedback({ ok: false, msg: res.error ?? "Échec." });
      }
    });
  };

  const remove = (c: Character) => {
    if (!window.confirm(`Supprimer « ${c.name} » ?`)) return;
    startTransition(async () => {
      const res = await deleteCharacterAction(c.id);
      if (res.ok) {
        setFeedback({ ok: true, msg: `« ${c.name} » supprimé.` });
        if (editingId === c.id) resetForm();
        router.refresh();
      } else {
        setFeedback({ ok: false, msg: res.error ?? "Échec." });
      }
    });
  };

  const logout = () => startTransition(async () => {
    await logoutAction();
    router.refresh();
  });

  const filtered = roster.filter(
    (c) =>
      c.name.toLowerCase().includes(query.toLowerCase()) ||
      c.id.includes(query.toLowerCase()),
  );

  const previewChar: Character = {
    id: form.id || "preview",
    name: form.name || "—",
    title: form.title,
    tier: form.tier,
    image: form.image || undefined,
    ratings: {},
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* En-tête */}
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-black uppercase tracking-wider text-white">
            Admin · <span className="text-domain-light">Roster</span>
          </h1>
          <p className="text-sm text-white/45">{roster.length} personnages</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-white/60 hover:text-white"
          >
            ← Site
          </Link>
          <button
            type="button"
            onClick={logout}
            className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-white/60 hover:text-cursed-light"
          >
            Déconnexion
          </button>
        </div>
      </header>

      {!canWrite && (
        <div className="mb-5 rounded-xl border border-cursed/40 bg-cursed/10 px-4 py-3 text-sm text-cursed-light">
          ⚠️ Édition désactivée : le filesystem est en lecture seule (Vercel). La
          modification des personnages ne fonctionne qu&apos;en local
          (<code>npm run dev</code>), puis commit &amp; redeploy.
        </div>
      )}

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
            <div className="h-24 w-[72px] shrink-0 overflow-hidden rounded-xl border border-white/10">
              <CharacterImage character={previewChar} />
            </div>
            <div className="flex-1 space-y-3">
              <Field label="Nom">
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
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
                  onChange={(e) =>
                    setForm((f) => ({ ...f, id: slugify(e.target.value) }))
                  }
                  className={`${inputCls} disabled:opacity-50`}
                  placeholder="gojo"
                />
              </Field>
            </div>
          </div>

          <Field label="Titre / flavor">
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className={inputCls}
              placeholder="Special Grade"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Tier (visuel)">
              <select
                value={form.tier}
                onChange={(e) =>
                  setForm((f) => ({ ...f, tier: e.target.value as CharacterTier }))
                }
                className={inputCls}
              >
                {TIERS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Image (chemin public/)">
              <input
                value={form.image}
                onChange={(e) => setForm((f) => ({ ...f, image: e.target.value }))}
                className={inputCls}
                placeholder="/assets/characters/x.webp"
              />
            </Field>
          </div>

          {/* Catégories */}
          <div>
            <p className="mb-2 text-xs uppercase tracking-wider text-white/45">
              Catégories &amp; points (0–100)
            </p>
            <div className="space-y-1.5">
              {categories.map((cat) => {
                const f = form.cats[cat.id];
                return (
                  <div
                    key={cat.id}
                    className="flex items-center gap-2 rounded-lg bg-void-700/40 px-2.5 py-1.5"
                  >
                    <input
                      type="checkbox"
                      checked={f.enabled}
                      onChange={(e) =>
                        setForm((s) => ({
                          ...s,
                          cats: {
                            ...s.cats,
                            [cat.id]: { ...f, enabled: e.target.checked },
                          },
                        }))
                      }
                      className="h-4 w-4 accent-domain"
                    />
                    <span className="flex-1 text-sm text-white/75">
                      {cat.label}
                    </span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={f.value}
                      disabled={!f.enabled}
                      onChange={(e) =>
                        setForm((s) => ({
                          ...s,
                          cats: {
                            ...s.cats,
                            [cat.id]: { enabled: true, value: e.target.value },
                          },
                        }))
                      }
                      className="w-16 rounded-md border border-white/10 bg-void-900 px-2 py-1 text-right text-sm text-white outline-none focus:border-domain disabled:opacity-30"
                      placeholder="—"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <button
            type="submit"
            disabled={pending || !canWrite}
            className="w-full rounded-xl bg-domain px-4 py-3 font-display font-bold uppercase tracking-wide text-white shadow-glow transition-transform enabled:hover:scale-[1.02] disabled:opacity-40"
          >
            {pending ? "Enregistrement…" : editingId ? "Mettre à jour" : "Ajouter"}
          </button>
        </form>

        {/* ── Listing ── */}
        <section className="rounded-2xl border border-white/10 bg-void-800/40 p-5">
          <div className="mb-4 flex items-center gap-3">
            <h2 className="font-display text-lg font-bold text-white">
              Tous les personnages
            </h2>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher…"
              className="ml-auto w-40 rounded-lg border border-white/10 bg-void-900 px-3 py-1.5 text-sm text-white outline-none focus:border-domain"
            />
          </div>

          <div className="space-y-2">
            {filtered.map((c) => {
              const cats = Object.entries(c.ratings);
              return (
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
                    <div className="mt-1 flex flex-wrap gap-1">
                      {cats.length === 0 ? (
                        <span className="text-[10px] text-white/30">
                          aucune catégorie
                        </span>
                      ) : (
                        cats.map(([catId, val]) => (
                          <span
                            key={catId}
                            className="rounded bg-domain/15 px-1.5 py-0.5 text-[10px] text-domain-light"
                            title={catId}
                          >
                            {catId}: <b>{val}</b>
                          </span>
                        ))
                      )}
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
                      disabled={!canWrite}
                      className="rounded-md border border-cursed/30 px-2 py-1 text-xs text-cursed-light hover:bg-cursed/10 disabled:opacity-30"
                    >
                      Suppr.
                    </button>
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <p className="py-8 text-center text-sm text-white/30">
                Aucun personnage.
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

const inputCls =
  "w-full rounded-lg border border-white/10 bg-void-900 px-3 py-2 text-sm text-white outline-none focus:border-domain";

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
