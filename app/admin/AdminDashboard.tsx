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
import {
  saveCharacterAction,
  deleteCharacterAction,
  deleteCharactersAction,
  refreshRosterImagesFromApiAction,
  clearImageCacheAction,
} from "./actions";
import { logoutAction } from "@/lib/auth/actions";
import { LeaderboardAdmin } from "./LeaderboardAdmin";
import { UserAdmin } from "./UserAdmin";
import { DraftRosterAdmin } from "./DraftRosterAdmin";
import { OverviewAdmin } from "./OverviewAdmin";
import { ContentHealthAdmin } from "./ContentHealthAdmin";
import { JjkdleAnalyticsAdmin } from "./JjkdleAnalyticsAdmin";
import { ConfigAdmin } from "./ConfigAdmin";
import type { OverviewStats } from "@/lib/admin/analytics";
import type { JjkdleAnalytics } from "@/lib/admin/jjkdle-analytics";
import type { MaintenanceConfig } from "@/lib/config/app-config";
import {
  RACES,
  GENDERS,
  GRADES_ORDER,
  AFFILIATIONS,
  CLANS,
  ARCS_ORDER,
  RACE_LABELS,
  GENDER_LABELS,
  GRADE_LABELS,
  AFFILIATION_LABELS,
  CLAN_LABELS,
  ARC_LABELS,
  isComplete,
  attributeDisplay,
  ATTRIBUTE_COLUMNS,
  ATTRIBUTE_LABELS,
} from "@/lib/games/jjkdle/attributes";

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
  // Attributs JJKdle ("" = non renseigné ; hasDomain : "" | "true" | "false").
  race: string;
  gender: string;
  grade: string;
  affiliation: string;
  clan: string;
  appearanceArc: string;
  hasDomain: string;
  cursedEnergy: string;
}

interface AdminDashboardProps {
  roster: Character[];
  draftRoster: DraftCharacter[];
  categories: CategoryConfig[];
  scores: AdminScore[];
  users: AdminUser[];
  currentUserId: string;
  /** Le viewer est-il le super-admin (droits étendus sur les comptes) ? */
  isSuperAdmin: boolean;
  /** Nombre d'images dans le cache « OUAIS » (conditionne « Vider le cache »). */
  cachedImageCount: number;
  /** Statistiques agrégées de la Vue d'ensemble. */
  overview: OverviewStats;
  /** Analytics JJKdle du jour sélectionné. */
  jjkdleAnalytics: JjkdleAnalytics;
  /** État d'activation de chaque jeu (défaut true). */
  gameFlags: Record<string, boolean>;
  /** Config du mode maintenance. */
  maintenance: MaintenanceConfig;
  /** Perso forcé comme mot du jour JJKdle (ou null). */
  forcedTarget: string | null;
}

type Tab =
  | "overview"
  | "roster"
  | "content"
  | "jjkdle"
  | "draft"
  | "leaderboard"
  | "users"
  | "config";

const TAB_LABELS: Record<Tab, string> = {
  overview: "Vue d'ensemble",
  roster: "Roster",
  content: "Santé contenu",
  jjkdle: "Analytics JJKdle",
  draft: "Jujutsu Draft",
  leaderboard: "Leaderboard",
  users: "Utilisateurs",
  config: "Config",
};
const TAB_ORDER: Tab[] = [
  "overview",
  "roster",
  "content",
  "jjkdle",
  "draft",
  "leaderboard",
  "users",
  "config",
];

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
  isSuperAdmin,
  cachedImageCount,
  overview,
  jjkdleAnalytics,
  gameFlags,
  maintenance,
  forcedTarget,
}: AdminDashboardProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [tab, setTab] = useState<Tab>("overview");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(
    null,
  );
  const [query, setQuery] = useState("");
  const [rosterCat, setRosterCat] = useState<CategoryId | "all">("all");
  // Perso affiché en grand dans le modal (clic sur sa vignette).
  const [previewChar, setPreviewChar] = useState<Character | null>(null);
  // Multi-sélection du roster (ids de personnages cochés).
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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
      race: "",
      gender: "",
      grade: "",
      affiliation: "",
      clan: "",
      appearanceArc: "",
      hasDomain: "",
      cursedEnergy: "",
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
      race: c.race ?? "",
      gender: c.gender ?? "",
      grade: c.grade ?? "",
      affiliation: c.affiliation ?? "",
      clan: c.clan ?? "",
      appearanceArc: c.appearanceArc ?? "",
      hasDomain: c.hasDomain == null ? "" : c.hasDomain ? "true" : "false",
      cursedEnergy: c.cursedEnergy?.toString() ?? "",
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
      // Attributs JJKdle (omis si "non renseigné").
      ...(form.race ? { race: form.race as Character["race"] } : {}),
      ...(form.gender ? { gender: form.gender as Character["gender"] } : {}),
      ...(form.grade ? { grade: form.grade as Character["grade"] } : {}),
      ...(form.affiliation
        ? { affiliation: form.affiliation as Character["affiliation"] }
        : {}),
      ...(form.clan ? { clan: form.clan as Character["clan"] } : {}),
      ...(form.appearanceArc
        ? { appearanceArc: form.appearanceArc as Character["appearanceArc"] }
        : {}),
      ...(form.hasDomain !== "" ? { hasDomain: form.hasDomain === "true" } : {}),
      ...(form.cursedEnergy.trim() !== ""
        ? { cursedEnergy: Number(form.cursedEnergy) }
        : {}),
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

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const removeSelected = () => {
    const ids = roster
      .filter((c) => selectedIds.has(c.id))
      .map((c) => c.id);
    if (ids.length === 0) return;
    if (!window.confirm(`Supprimer ${ids.length} personnage(s) sélectionné(s) ?`))
      return;
    startTransition(async () => {
      const res = await deleteCharactersAction(ids);
      if (res.ok) {
        setFeedback({ ok: true, msg: `${res.deleted} personnage(s) supprimé(s).` });
      } else {
        setFeedback({
          ok: false,
          msg: `${res.deleted} supprimé(s), échec sur certains : ${res.error ?? ""}`,
        });
      }
      if (editingId && selectedIds.has(editingId)) resetForm();
      clearSelection();
      router.refresh();
    });
  };

  // Bouton « OUAIS » : récupère une image depuis l'API pour tous les persos.
  const [syncing, setSyncing] = useState(false);
  const syncImages = () => {
    if (
      !window.confirm(
        "Récupérer une image depuis l'API pour les personnages FÉMININS (Genre = Femme) ? Les images actuelles seront remplacées.",
      )
    ) {
      return;
    }
    setFeedback(null);
    setSyncing(true);
    startTransition(async () => {
      const res = await refreshRosterImagesFromApiAction();
      setSyncing(false);
      if (!res.ok) {
        setFeedback({ ok: false, msg: res.error ?? "Échec." });
        return;
      }
      setFeedback({
        ok: true,
        msg: `Images mises à jour : ${res.builderUpdated + res.draftUpdated}/${res.total} · introuvables : ${res.notFound} · échecs API : ${res.failed}.`,
      });
      router.refresh();
    });
  };

  // Bouton « Vider le cache » : efface les images récupérées via « OUAIS ».
  const clearCache = () => {
    if (!window.confirm("Vider le cache d'images récupérées via « OUAIS » ?")) {
      return;
    }
    setFeedback(null);
    startTransition(async () => {
      const res = await clearImageCacheAction();
      if (!res.ok) {
        setFeedback({ ok: false, msg: res.error ?? "Échec." });
        return;
      }
      setFeedback({ ok: true, msg: "Cache d'images vidé." });
      router.refresh();
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

  // Depuis l'onglet « Santé contenu » : ouvre un perso dans l'éditeur roster.
  const editCharacter = (c: Character) => {
    setTab("roster");
    loadCharacter(c);
  };

  const subtitle =
    tab === "overview"
      ? `${overview.players.total} joueurs · ${roster.length} personnages`
      : tab === "roster"
        ? `${roster.length} personnages`
        : tab === "content"
          ? `${overview.content.incomplete} incomplets · ${overview.content.missingImage} sans image`
          : tab === "jjkdle"
            ? `Jour ${jjkdleAnalytics.date}`
            : tab === "draft"
              ? `${draftRoster.length} personnages (draft)`
              : tab === "leaderboard"
                ? `${scores.length} scores`
                : tab === "config"
                  ? "Feature flags & maintenance"
                  : `${users.length} utilisateurs`;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* En-tête */}
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-black uppercase tracking-wider text-white">
            Admin · <span className="text-domain-light">{TAB_LABELS[tab]}</span>
          </h1>
          <p className="text-sm text-white/45">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-white/60 hover:text-white"
          >
            ← Site
          </Link>
          <a
            href="/admin/graph"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-domain/40 bg-domain/10 px-3 py-1.5 text-sm text-domain-light hover:bg-domain/20"
          >
            Graphe ↗
          </a>
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

      {tab === "overview" && (
        <OverviewAdmin stats={overview} onGotoContent={() => setTab("content")} />
      )}

      {tab === "content" && (
        <ContentHealthAdmin roster={roster} onEdit={editCharacter} />
      )}

      {tab === "jjkdle" && <JjkdleAnalyticsAdmin data={jjkdleAnalytics} />}

      {tab === "config" && (
        <ConfigAdmin
          roster={roster}
          gameFlags={gameFlags}
          maintenance={maintenance}
          forcedTarget={forcedTarget}
        />
      )}

      {tab === "draft" && <DraftRosterAdmin roster={draftRoster} />}

      {tab === "leaderboard" && <LeaderboardAdmin scores={scores} />}

      {tab === "users" && (
        <UserAdmin
          users={users}
          currentUserId={currentUserId}
          isSuperAdmin={isSuperAdmin}
        />
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

      {/* Récupération automatique des images via l'API booru. */}
      <div className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-domain/30 bg-domain/5 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white">
            Images automatiques
          </p>
          <p className="text-xs text-white/50">
            Récupère une image depuis l&apos;API pour les personnages féminins
            (Genre = Femme). Remplace les images actuelles.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {cachedImageCount > 0 && (
            <button
              type="button"
              onClick={clearCache}
              disabled={pending}
              title={`${cachedImageCount} image(s) en cache`}
              className="rounded-xl border border-cursed/40 bg-cursed/10 px-4 py-2.5 font-display text-sm font-bold uppercase tracking-wide text-cursed-light transition-colors enabled:hover:bg-cursed/20 disabled:opacity-40"
            >
              Vider le cache ({cachedImageCount})
            </button>
          )}
          <button
            type="button"
            onClick={syncImages}
            disabled={pending}
            className="rounded-xl bg-domain px-6 py-2.5 font-display font-black uppercase tracking-wide text-white shadow-glow transition-transform enabled:hover:scale-[1.03] disabled:opacity-40"
          >
            {syncing ? "Récupération…" : "OUAIS"}
          </button>
        </div>
      </div>

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

          {/* Attributs JJKdle */}
          <div className="rounded-xl border border-domain/30 bg-domain/5 p-3">
            <p className="mb-3 text-xs uppercase tracking-wider text-domain-light">
              Attributs JJKdle{" "}
              <span className="text-white/35">(pool quotidien si tous remplis)</span>
            </p>
            <div className="grid grid-cols-2 gap-3">
              <EnumField
                label="Race"
                value={form.race}
                options={RACES.map((v) => [v, RACE_LABELS[v]])}
                onChange={(v) => setForm((f) => ({ ...f, race: v }))}
              />
              <EnumField
                label="Genre"
                value={form.gender}
                options={GENDERS.map((v) => [v, GENDER_LABELS[v]])}
                onChange={(v) => setForm((f) => ({ ...f, gender: v }))}
              />
              <EnumField
                label="Grade"
                value={form.grade}
                options={GRADES_ORDER.map((v) => [v, GRADE_LABELS[v]])}
                onChange={(v) => setForm((f) => ({ ...f, grade: v }))}
              />
              <EnumField
                label="Affiliation"
                value={form.affiliation}
                options={AFFILIATIONS.map((v) => [v, AFFILIATION_LABELS[v]])}
                onChange={(v) => setForm((f) => ({ ...f, affiliation: v }))}
              />
              <EnumField
                label="Clan"
                value={form.clan}
                options={CLANS.map((v) => [v, CLAN_LABELS[v]])}
                onChange={(v) => setForm((f) => ({ ...f, clan: v }))}
              />
              <EnumField
                label="Arc d'apparition"
                value={form.appearanceArc}
                options={ARCS_ORDER.map((v) => [v, ARC_LABELS[v]])}
                onChange={(v) => setForm((f) => ({ ...f, appearanceArc: v }))}
              />
              <EnumField
                label="Territoire (domaine)"
                value={form.hasDomain}
                options={[
                  ["true", "Oui"],
                  ["false", "Non"],
                ]}
                onChange={(v) => setForm((f) => ({ ...f, hasDomain: v }))}
              />
              <Field label="Énergie occulte (lore)">
                <input
                  type="number"
                  min={0}
                  value={form.cursedEnergy}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, cursedEnergy: e.target.value }))
                  }
                  className={inputCls}
                  placeholder="ex. 120"
                />
              </Field>
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
            <input
              type="checkbox"
              checked={
                filtered.length > 0 &&
                filtered.every((c) => selectedIds.has(c.id))
              }
              ref={(el) => {
                if (el) {
                  const some = filtered.some((c) => selectedIds.has(c.id));
                  const all =
                    filtered.length > 0 &&
                    filtered.every((c) => selectedIds.has(c.id));
                  el.indeterminate = some && !all;
                }
              }}
              onChange={(e) => {
                const check = e.target.checked;
                setSelectedIds((prev) => {
                  const next = new Set(prev);
                  for (const c of filtered) {
                    if (check) next.add(c.id);
                    else next.delete(c.id);
                  }
                  return next;
                });
              }}
              title="Tout sélectionner (résultats filtrés)"
              className="h-4 w-4 accent-cursed"
            />
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

          {/* Barre d'action multi-sélection (visible dès qu'un perso est coché). */}
          {selectedIds.size > 0 && (
            <div className="sticky top-2 z-10 mb-3 flex flex-wrap items-center gap-3 rounded-xl border border-cursed/40 bg-void-800/95 px-4 py-2.5 shadow-lg backdrop-blur">
              <span className="text-sm font-semibold text-white">
                {selectedIds.size} personnage(s) sélectionné(s)
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

          <div className="space-y-2">
            {filtered.map((c) => {
              const cats = Object.entries(c.ratings);
              return (
                <div
                  key={c.id}
                  className={`flex items-center gap-3 rounded-xl border p-2 ${
                    selectedIds.has(c.id)
                      ? "border-cursed/40 bg-cursed/5"
                      : "border-white/5 bg-void-700/30"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(c.id)}
                    onChange={() => toggleSelected(c.id)}
                    className="h-4 w-4 shrink-0 accent-cursed"
                  />
                  <button
                    type="button"
                    onClick={() => setPreviewChar(c)}
                    title="Agrandir l'image et voir les stats"
                    className="h-14 w-11 shrink-0 overflow-hidden rounded-lg border border-white/10 transition-transform hover:scale-105 hover:border-domain focus:outline-none focus-visible:ring-2 focus-visible:ring-domain"
                  >
                    <CharacterImage character={c} />
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">
                      {c.name}{" "}
                      <span className="text-xs font-normal text-white/35">
                        {c.id}
                      </span>
                      {!isComplete(c) && (
                        <span
                          className="ml-1.5 rounded bg-cursed/20 px-1.5 py-0.5 text-[10px] font-bold text-cursed-light"
                          title="Attributs JJKdle manquants — exclu du pool quotidien"
                        >
                          JJKdle incomplet
                        </span>
                      )}
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

      {previewChar && (
        <CharacterPreviewModal
          character={previewChar}
          categories={categories}
          onClose={() => setPreviewChar(null)}
        />
      )}
    </main>
  );
}

/** Modal centré : grande image + toutes les stats du personnage. */
function CharacterPreviewModal({
  character: c,
  categories,
  onClose,
}: {
  character: Character;
  categories: CategoryConfig[];
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const catLabel = (id: string) =>
    categories.find((cat) => cat.id === id)?.label ?? id;
  const ratings = Object.entries(c.ratings);

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-void-900/80 p-4 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex max-h-[90vh] w-full max-w-3xl flex-col gap-5 overflow-hidden rounded-2xl border border-white/10 bg-void-800 p-5 shadow-2xl sm:flex-row sm:p-6"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-void-900/70 text-white/70 transition-colors hover:text-white"
        >
          ✕
        </button>

        {/* Grande image */}
        <div className="mx-auto aspect-[3/4] w-56 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-void-900 sm:mx-0 sm:w-64">
          <CharacterImage character={c} />
        </div>

        {/* Stats */}
        <div className="min-w-0 flex-1 overflow-y-auto pr-1">
          <h3 className="font-display text-xl font-black text-white">{c.name}</h3>
          <p className="text-sm text-white/45">
            {c.title || "—"} · <span className="text-white/35">{c.id}</span>
          </p>

          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-domain/15 px-2.5 py-1 font-bold text-domain-light">
              Tier {c.tier}
            </span>
            {c.battleValue != null && (
              <span className="rounded-full bg-white/5 px-2.5 py-1 text-white/70">
                Battle value : <b className="text-white">{c.battleValue}</b>
              </span>
            )}
          </div>

          {/* Catégories (builder) */}
          <p className="mt-4 mb-1.5 text-[11px] uppercase tracking-wider text-white/40">
            Catégories
          </p>
          {ratings.length === 0 ? (
            <p className="text-xs text-white/30">Aucune catégorie.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {ratings.map(([id, val]) => (
                <span
                  key={id}
                  className="rounded bg-domain/15 px-2 py-0.5 text-[11px] text-domain-light"
                >
                  {catLabel(id)} : <b>{val}</b>
                </span>
              ))}
            </div>
          )}

          {/* Attributs JJKdle */}
          <p className="mt-4 mb-1.5 text-[11px] uppercase tracking-wider text-white/40">
            Attributs JJKdle
          </p>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
            {ATTRIBUTE_COLUMNS.map((key) => (
              <div key={key} className="flex justify-between gap-2">
                <dt className="text-white/45">{ATTRIBUTE_LABELS[key]}</dt>
                <dd className="text-right font-medium text-white/85">
                  {attributeDisplay(key, c)}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
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

/** Select d'enum JJKdle avec option vide « non renseigné ». */
function EnumField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: [string, string][];
  onChange: (v: string) => void;
}) {
  return (
    <Field label={label}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputCls}
      >
        <option value="">— non renseigné</option>
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </Field>
  );
}
