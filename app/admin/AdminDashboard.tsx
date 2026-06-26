"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { CategoryConfig, CategoryId } from "@/data/roster/categories";
import type { Character, CharacterTier } from "@/data/roster/characters";
import { CharacterImage } from "@/components/CharacterImage";
import type { AdminScore } from "@/lib/leaderboard/store";
import type { AdminUser } from "@/lib/admin/users";
import type { DraftCharacter } from "@/lib/games/draft/types";
import { ImageDropzone } from "./ImageDropzone";
import { saveCharacterAction, deleteCharacterAction } from "./actions";
import { logoutAction } from "@/lib/auth/actions";
import { LeaderboardAdmin } from "./LeaderboardAdmin";
import { UserAdmin } from "./UserAdmin";
import { DraftRosterAdmin } from "./DraftRosterAdmin";

const TIERS: CharacterTier[] = ["s", "1", "2", "3", "4", "4minus"];

type CatField = { enabled: boolean; value: string };
interface FormState {
  id: string;
  name: string;
  title: string;
  tier: CharacterTier;
  battleValue: string;
  image: string;
  cats: Record<string, CatField>;
}

interface AdminDashboardProps {
  roster: Character[];
  draftRoster: DraftCharacter[];
  categories: CategoryConfig[];
  scores: AdminScore[];
  users: AdminUser[];
  currentUserId: string;
}

type Tab = "roster" | "draft" | "leaderboard" | "users";

const TAB_LABELS: Record<Tab, string> = {
  roster: "Roster",
  draft: "Jujutsu Draft",
  leaderboard: "Leaderboard",
  users: "Utilisateurs",
};
const TAB_ORDER: Tab[] = ["roster", "draft", "leaderboard", "users"];

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
  draftRoster,
  categories,
  scores,
  users,
  currentUserId,
}: AdminDashboardProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [tab, setTab] = useState<Tab>("roster");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(
    null,
  );
  const [query, setQuery] = useState("");
  const [rosterCat, setRosterCat] = useState<CategoryId | "all">("all");

  // Image : fichier en attente d'upload, ou retrait demandé.
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageRemoved, setImageRemoved] = useState(false);

  const emptyForm = useMemo<FormState>(
    () => ({
      id: "",
      name: "",
      title: "",
      tier: "3",
      battleValue: "",
      image: "",
      cats: Object.fromEntries(
        categories.map((c) => [c.id, { enabled: false, value: "" }]),
      ),
    }),
    [categories],
  );

  const [form, setForm] = useState<FormState>(emptyForm);

  // Aperçu : objectURL du fichier déposé, sinon l'image existante (sauf si retirée).
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

  const stageImage = (file: File) => {
    setImageFile(file);
    setImageRemoved(false);
  };
  const removeImage = () => {
    setImageFile(null);
    setImageRemoved(true);
  };

  const loadCharacter = (c: Character) => {
    setEditingId(c.id);
    setFeedback(null);
    setImageFile(null);
    setImageRemoved(false);
    setForm({
      id: c.id,
      name: c.name,
      title: c.title ?? "",
      tier: c.tier,
      battleValue: c.battleValue?.toString() ?? "",
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
    setImageFile(null);
    setImageRemoved(false);
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
    // Si l'image est retirée, on n'envoie pas de chemin (le DELETE nettoie aussi
    // l'image uploadée). Sinon on préserve l'URL existante ; un éventuel upload
    // écrasera `image` côté serveur après l'enregistrement.
    const image = imageRemoved ? "" : form.image.trim();
    return {
      id: form.id.trim(),
      name: form.name.trim(),
      title: form.title.trim(),
      tier: form.tier,
      ...(form.battleValue.trim() !== ""
        ? { battleValue: Number(form.battleValue) }
        : {}),
      ...(image ? { image } : {}),
      ratings,
    };
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    const char = buildCharacter();
    startTransition(async () => {
      // 1) Enregistre les champs texte/ratings (crée la ligne si nouvelle).
      const res = await saveCharacterAction(char);
      if (!res.ok) {
        setFeedback({ ok: false, msg: res.error ?? "Échec." });
        return;
      }

      // 2) Opérations sur l'image (l'id existe désormais en base).
      try {
        if (imageFile) {
          const fd = new FormData();
          fd.append("file", imageFile);
          const up = await fetch(`/api/characters/${char.id}/image`, {
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
          await fetch(`/api/characters/${char.id}/image`, { method: "DELETE" });
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
      (rosterCat === "all" || c.ratings[rosterCat] !== undefined) &&
      (c.name.toLowerCase().includes(query.toLowerCase()) ||
        c.id.includes(query.toLowerCase())),
  );

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* En-tête */}
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-black uppercase tracking-wider text-white">
            Admin · <span className="text-domain-light">{TAB_LABELS[tab]}</span>
          </h1>
          <p className="text-sm text-white/45">
            {tab === "roster"
              ? `${roster.length} personnages`
              : tab === "draft"
                ? `${draftRoster.length} personnages (draft)`
                : tab === "leaderboard"
                  ? `${scores.length} scores`
                  : `${users.length} utilisateurs`}
          </p>
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

      {/* Onglets */}
      <div className="mb-6 flex w-fit gap-1 rounded-xl border border-white/10 bg-void-800/40 p-1">
        {TAB_ORDER.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-1.5 font-display text-sm font-bold uppercase tracking-wide transition-colors ${
              tab === t ? "bg-domain text-white" : "text-white/55 hover:text-white"
            }`}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {tab === "draft" && <DraftRosterAdmin roster={draftRoster} />}

      {tab === "leaderboard" && <LeaderboardAdmin scores={scores} />}

      {tab === "users" && (
        <UserAdmin users={users} currentUserId={currentUserId} />
      )}

      {tab === "roster" && (
        <>
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

          <Field label="Battle value (combat — 0 à 100)">
            <input
              type="number"
              min={0}
              max={100}
              value={form.battleValue}
              onChange={(e) =>
                setForm((f) => ({ ...f, battleValue: e.target.value }))
              }
              className={inputCls}
              placeholder="ex. 50 (vide = secours 30)"
            />
          </Field>

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
              Tous les personnages
            </h2>
            <span className="rounded-full bg-domain/15 px-2 py-0.5 text-xs font-bold text-domain-light">
              {filtered.length}/{roster.length}
            </span>
            <select
              value={rosterCat}
              onChange={(e) => setRosterCat(e.target.value as CategoryId | "all")}
              className="ml-auto rounded-lg border border-white/10 bg-void-900 px-3 py-1.5 text-sm text-white outline-none focus:border-domain"
            >
              <option value="all">Toutes catégories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.label}
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
                      className="rounded-md border border-cursed/30 px-2 py-1 text-xs text-cursed-light hover:bg-cursed/10"
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
        </>
      )}
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
