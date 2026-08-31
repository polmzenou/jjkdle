"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  useGameTitle,
  useUniverseHref,
} from "@/components/universe/UniverseProvider";
import type { CategoryConfig, CategoryId } from "@/data/roster/categories";
import {
  normalizeTier,
  type Character,
  type CharacterTier,
} from "@/data/roster/characters";
import { CharacterImage } from "@/components/CharacterImage";
import type { AdminScore } from "@/lib/leaderboard/store";
import type { AdminUser } from "@/lib/admin/users";
import type { DraftCharacter } from "@/lib/games/draft/types";
import { ImageDropzone } from "./ImageDropzone";
import {
  saveCharacterAction,
  deleteCharacterAction,
  deleteCharactersAction,
  removeCharacterRatingAction,
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
import {
  UniverseSwitcher,
  type UniverseOption,
} from "./UniverseSwitcher";
import { AttributesAdmin } from "./AttributesAdmin";
import { CategoriesAdmin } from "./CategoriesAdmin";
import { PyramidAdmin } from "./PyramidAdmin";
import { CardsAdmin } from "./CardsAdmin";
import { ItemsAdmin } from "./ItemsAdmin";
import { CasinoAdmin } from "./CasinoAdmin";
import type { CollectionCard } from "@/lib/cards/types";
import type { TowerItem } from "@/lib/games/tower/items";
import type { AdminAttribute } from "@/lib/admin/attribute-store";
import type { AdminCategory } from "@/lib/admin/category-store";
import type { AdminRankingCondition } from "@/lib/admin/ranking-store";
import type { CasinoAdminData } from "@/lib/admin/casino";
import type { OverviewStats } from "@/lib/admin/analytics";
import type { JjkdleAnalytics } from "@/lib/admin/jjkdle-analytics";
import type { MaintenanceConfig } from "@/lib/config/app-config";
import { UniverseLink } from "@/components/universe/UniverseLink";
import {
  attributeDisplayFor,
  buildAttributeSchema,
  isCompleteFor,
  type AttributeSchema,
  type AttributeSpec,
} from "@/lib/games/jjkdle/attribute-schema";

const TIERS: CharacterTier[] = ["s", "1", "2", "3", "4", "4minus"];

/**
 * Valeur sentinelle des filtres d'attributs du roster : « attribut non
 * renseigné ». Préfixée pour ne jamais entrer en collision avec une vraie
 * valeur d'option (qui est un slug type "GRADE_1").
 */
const ATTR_MISSING = "__missing__";

/**
 * Tris disponibles sur la liste du roster. Les tris « note » portent sur la
 * catégorie sélectionnée dans le filtre ; sur « Toutes catégories » il n'y a pas
 * de note unique à comparer, on classe alors sur le NOMBRE de catégories notées
 * (ce que le tag « n perso » de l'onglet Catégories mesure dans l'autre sens).
 */
const ROSTER_SORTS = {
  default: "Tri : ordre du roster",
  "cat-desc": "Note ↓ (décroissant)",
  "cat-asc": "Note ↑ (croissant)",
  "name-asc": "Nom A → Z",
  "name-desc": "Nom Z → A",
} as const;

type RosterSort = keyof typeof ROSTER_SORTS;

type CatField = { enabled: boolean; value: string };
interface FormState {
  id: string;
  name: string;
  title: string;
  tier: CharacterTier;
  battleValue: string;
  image: string;
  cats: Record<string, CatField>;
  /**
   * Attributs data-driven : `clé d'attribut → valeur saisie` (toujours des
   * chaînes dans le formulaire ; "" = non renseigné). Les clés viennent du
   * schéma de l'univers courant, il n'y a plus de champ codé en dur.
   */
  attrs: Record<string, string>;
}

interface AdminDashboardProps {
  roster: Character[];
  draftRoster: DraftCharacter[];
  /** Roster des objets maudits de l'univers administre (onglet Objets). */
  towerItems: TowerItem[];
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
  /** Attributs (colonnes) de l'univers courant — pilotent le formulaire roster. */
  attributeColumns: AttributeSpec[];
  /** Univers administrables (sélecteur). */
  universes: UniverseOption[];
  /** Slug de l'univers actuellement administré. */
  currentUniverse: string;
  /** Nom affichable de l'univers administré. */
  universeName: string;
  /** Attributs de l'univers administré (onglet Attributs). */
  attributes: AdminAttribute[];
  /** Catégories du builder de l'univers administré (onglet Catégories). */
  adminCategories: AdminCategory[];
  /** Consignes du Pyramid de l'univers administré (onglet Pyramid). */
  rankingConditions: AdminRankingCondition[];
  /** Roster de l'univers en cartes, marqué possédé/non par l'ADMIN connecté. */
  cardCollection: CollectionCard[];
  /** Réglages et tables du casino. HORS UNIVERS : le casino est unique. */
  casino: CasinoAdminData;
}

type Tab =
  | "overview"
  | "roster"
  | "content"
  | "jjkdle"
  | "attributes"
  | "categories"
  | "pyramid"
  | "draft"
  | "leaderboard"
  | "users"
  | "cards"
  | "casino"
  | "items"
  | "config";

/**
 * Libellés des onglets. Deux d'entre eux nomment un JEU : leur libellé dépend de
 * l'univers administré (« Analytics JJKdle » / « Analytics CSMdle ») — d'où le
 * `useTabLabels()` plus bas plutôt qu'une constante figée.
 */
const TAB_LABELS: Record<Tab, string> = {
  overview: "Vue d'ensemble",
  roster: "Roster",
  content: "Santé contenu",
  jjkdle: "Analytics JJKdle",
  attributes: "Attributs",
  categories: "Catégories",
  pyramid: "Pyramid",
  draft: "Jujutsu Draft",
  items: "Objets",
  leaderboard: "Leaderboard",
  users: "Utilisateurs",
  cards: "Booster Pack",
  casino: "Casino",
  config: "Config",
};

/** `TAB_LABELS` avec les noms de jeux de l'univers administré. */
function useTabLabels(): Record<Tab, string> {
  const dailyTitle = useGameTitle("jjkdle");
  const draftTitle = useGameTitle("jujutsu-draft");
  const rankingTitle = useGameTitle("ranking");
  return useMemo(
    () => ({
      ...TAB_LABELS,
      jjkdle: `Analytics ${dailyTitle}`,
      draft: draftTitle,
      pyramid: rankingTitle,
    }),
    [dailyTitle, draftTitle, rankingTitle],
  );
}
/**
 * Onglets regroupés par NATURE, et non plus alignés sur une seule rangée : à 11
 * onglets la barre débordait de l'écran à droite. Deux familles, qui ne se
 * consultent pas dans les mêmes moments — on écrit du contenu de jeu, ou on
 * regarde tourner la plateforme.
 */
const TAB_GROUPS: { label: string; tabs: Tab[] }[] = [
  {
    label: "Contenu des jeux",
    tabs: ["roster", "categories", "pyramid", "draft", "attributes"],
  },
  {
    label: "Pilotage",
    tabs: [
      "overview",
      "content",
      "jjkdle",
      "leaderboard",
      "users",
      "cards",
      "casino",
      "config",
    ],
  },
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
  towerItems,
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
  attributeColumns,
  universes,
  currentUniverse,
  universeName,
  attributes,
  adminCategories,
  rankingConditions,
  cardCollection,
  casino,
}: AdminDashboardProps) {
  const router = useRouter();
  // Les appels d'API doivent porter l'univers ADMINISTRÉ (cf. admin/layout.tsx),
  // sinon le middleware les résout sur le dernier univers VISITÉ.
  const withUniverse = useUniverseHref();
  const tabLabels = useTabLabels();
  // Nom du jeu du jour dans l'univers administré (libellés du formulaire roster).
  const dailyTitle = useGameTitle("jjkdle");
  const [pending, startTransition] = useTransition();
  const [tab, setTab] = useState<Tab>("overview");
  /** Menu de navigation déplié (mobile/tablette uniquement — toujours ouvert ≥ lg). */
  const [navOpen, setNavOpen] = useState(false);
  // Schéma d'attributs de l'univers courant : complétude, libellés, options.
  const attributeSchema = useMemo(
    () => buildAttributeSchema(attributeColumns),
    [attributeColumns],
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(
    null,
  );
  const [query, setQuery] = useState("");
  const [rosterCat, setRosterCat] = useState<CategoryId | "all">("all");
  // Tri de la liste du roster (cf. ROSTER_SORTS) — indépendant du filtre.
  const [rosterSort, setRosterSort] = useState<RosterSort>("default");
  // Filtres par attribut : `clé d'attribut → valeur retenue`. "" = pas de filtre,
  // ATTR_MISSING = ne garder que les persos dont l'attribut n'est pas renseigné.
  const [attrFilters, setAttrFilters] = useState<Record<string, string>>({});
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
      attrs: Object.fromEntries(attributeColumns.map((a) => [a.key, ""])),
    }),
    [categories, attributeColumns],
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
      // Normalisé : une valeur hors liste (« S » majuscule d'un import) ne
      // correspondrait à aucune option, le <select> afficherait la première tout
      // en gardant l'ancienne valeur dans l'état — et l'enregistrement serait
      // refusé sur une fiche d'apparence correcte.
      tier: normalizeTier(c.tier) ?? "3",
      battleValue: c.battleValue?.toString() ?? "",
      image: c.image ?? "",
      cats: Object.fromEntries(
        categories.map((cat) => {
          const v = c.ratings[cat.id];
          return [cat.id, { enabled: v !== undefined, value: v?.toString() ?? "" }];
        }),
      ),
      // Valeur existante de chaque attribut de l'univers ("" si non renseignée).
      attrs: Object.fromEntries(
        attributeColumns.map((a) => [a.key, String(c.attributes?.[a.key] ?? "")]),
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
    // Attributs : NUMERIC en nombre, listes fermées en valeur d'option.
    const attributes: Record<string, string | number> = {};
    for (const col of attributeColumns) {
      const raw = (form.attrs[col.key] ?? "").trim();
      if (raw === "") continue;
      attributes[col.key] = col.kind === "NUMERIC" ? Number(raw) : raw;
    }
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
      // Attributs data-driven (une clé absente = « non renseigné »).
      attributes,
    };
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    const char = buildCharacter();
    startTransition(async () => {
      // 1) Enregistre les champs texte/ratings (crée la ligne si nouvelle).
      // L'univers administré est envoyé : le serveur refuse si le sien diffère,
      // plutôt que de créer le personnage dans le roster du mauvais anime.
      const res = await saveCharacterAction(char, currentUniverse);
      if (!res.ok) {
        setFeedback({ ok: false, msg: res.error ?? "Échec." });
        return;
      }

      // 2) Opérations sur l'image (l'id existe désormais en base).
      try {
        if (imageFile) {
          const fd = new FormData();
          fd.append("file", imageFile);
          const up = await fetch(withUniverse(`/api/characters/${char.id}/image`), {
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
          await fetch(withUniverse(`/api/characters/${char.id}/image`), { method: "DELETE" });
        }
      } catch {
        setFeedback({
          ok: false,
          msg: "Personnage enregistré, mais l'upload de l'image a échoué.",
        });
        router.refresh();
        return;
      }

      setFeedback({
        ok: true,
        msg: `« ${char.name} » enregistré dans ${universeName}.`,
      });
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

  /**
   * Croix au survol d'un tag de catégorie : retire le personnage de CETTE
   * catégorie sans passer par le formulaire. Pas de `confirm()` — le geste est
   * précis, et la note se remet en deux clics dans l'éditeur.
   */
  const removeFromCategory = (c: Character, catId: CategoryId) => {
    startTransition(async () => {
      const res = await removeCharacterRatingAction(c.id, catId);
      if (!res.ok) {
        setFeedback({ ok: false, msg: res.error ?? "Échec." });
        return;
      }
      const label = categories.find((cat) => cat.id === catId)?.label ?? catId;
      setFeedback({ ok: true, msg: `« ${c.name} » retiré de « ${label} ».` });
      // La fiche ouverte dans le formulaire doit refléter le retrait, sinon un
      // « Mettre à jour » réécrirait la note qu'on vient d'enlever.
      if (editingId === c.id) {
        setForm((f) => ({
          ...f,
          cats: { ...f.cats, [catId]: { enabled: false, value: "" } },
        }));
      }
      router.refresh();
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

  /**
   * Valeurs proposées par le filtre de chaque attribut. Listes fermées : les
   * options du schéma. NUMERIC (pas d'options) : les valeurs présentes dans le
   * roster, triées, pour rester utilisable sans champ de saisie.
   */
  const attrFilterOptions = useMemo(
    () =>
      attributeColumns.map((col) => {
        if (col.options.length > 0) {
          return {
            col,
            options: col.options.map((o) => [o.value, o.label] as const),
          };
        }
        const seen = new Set<string>();
        for (const c of roster) {
          const v = c.attributes?.[col.key];
          if (v != null) seen.add(String(v));
        }
        return {
          col,
          options: [...seen]
            .sort((a, b) => Number(a) - Number(b))
            .map((v) => [v, v] as const),
        };
      }),
    [attributeColumns, roster],
  );

  // Filtres d'attributs réellement actifs (les autres sont sur « tous »).
  const activeAttrFilters = useMemo(
    () => Object.entries(attrFilters).filter(([, v]) => v !== ""),
    [attrFilters],
  );

  const matchesAttrFilters = (c: Character) =>
    activeAttrFilters.every(([key, wanted]) => {
      const value = c.attributes?.[key];
      return wanted === ATTR_MISSING
        ? value == null
        : value != null && String(value) === wanted;
    });

  /**
   * Grandeur comparée par les tris « note » : la note dans la catégorie
   * filtrée, ou le nombre de catégories notées quand aucune n'est choisie.
   */
  const sortValue = (c: Character) =>
    rosterCat === "all"
      ? Object.keys(c.ratings).length
      : (c.ratings[rosterCat] ?? -1);

  const filtered = roster
    .filter(
      (c) =>
        (rosterCat === "all" || c.ratings[rosterCat] !== undefined) &&
        matchesAttrFilters(c) &&
        (c.name.toLowerCase().includes(query.toLowerCase()) ||
          c.id.includes(query.toLowerCase())),
    )
    // `filter` renvoie déjà une copie : trier ici ne touche pas `roster`.
    .sort((a, b) => {
      switch (rosterSort) {
        case "cat-asc":
          return sortValue(a) - sortValue(b);
        case "cat-desc":
          return sortValue(b) - sortValue(a);
        case "name-asc":
          return a.name.localeCompare(b.name, "fr");
        case "name-desc":
          return b.name.localeCompare(a.name, "fr");
        default:
          return 0;
      }
    });

  // Depuis l'onglet « Santé contenu » : ouvre un perso dans l'éditeur roster.
  const editCharacter = (c: Character) => {
    setTab("roster");
    loadCharacter(c);
  };

  /** Sous-titre de l'en-tête, propre à l'onglet affiché. */
  const SUBTITLES: Record<Tab, string> = {
    overview: `${overview.players.total} joueurs · ${roster.length} personnages`,
    roster: `${roster.length} personnages · ${universeName}`,
    content: `${overview.content.incomplete} incomplets · ${overview.content.missingImage} sans image`,
    jjkdle: `Jour ${jjkdleAnalytics.date}`,
    attributes: `${attributes.length} attribut(s) · ${universeName}`,
    categories: `${adminCategories.length} catégorie(s) · ${universeName}`,
    pyramid: `${rankingConditions.length} consigne(s) · ${universeName}`,
    draft: `${draftRoster.length} personnages (draft)`,
    items: `${towerItems.filter((i) => i.enabled).length} / ${towerItems.length} objets actifs · ${universeName}`,
    leaderboard: `${scores.length} scores`,
    config: "Feature flags & maintenance",
    users: `${users.length} utilisateurs`,
    cards: `${cardCollection.filter((c) => c.owned).length} / ${cardCollection.length} cartes · ${universeName}`,
    casino: `Blackjack · ${casino.tables.length} table(s) · réglages globaux`,
  };
  const subtitle = SUBTITLES[tab];

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* En-tête */}
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-black uppercase tracking-wider text-white">
            Admin · <span className="text-domain-light">{tabLabels[tab]}</span>
          </h1>
          <p className="text-sm text-white/45">{subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <UniverseSwitcher universes={universes} current={currentUniverse} />
          {/* Gestion des univers eux-mêmes (créer/renommer/supprimer). */}
          <a
            href="/admin/universes"
            className="rounded-lg border border-domain/40 bg-domain/10 px-3 py-1.5 text-sm font-semibold text-domain-light hover:bg-domain/20"
          >
            Univers
          </a>
          <UniverseLink
            href="/"
            className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-white/60 hover:text-white"
          >
            ← Site
          </UniverseLink>
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

      <div className="lg:grid lg:grid-cols-[210px_minmax(0,1fr)] lg:gap-8">
        {/* ── Navigation : colonne collante ≥ lg, menu dépliant en dessous ── */}
        <nav className="mb-6 lg:mb-0">
          {/* Mobile / tablette : un seul bouton, qui déplie le même arbre. */}
          <button
            type="button"
            onClick={() => setNavOpen((o) => !o)}
            aria-expanded={navOpen}
            className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-void-800/40 px-4 py-2.5 lg:hidden"
          >
            <span className="font-display text-sm font-bold uppercase tracking-wide text-white">
              {tabLabels[tab]}
            </span>
            <span className="text-white/40">{navOpen ? "▲" : "▼"}</span>
          </button>

          <div
            className={`${navOpen ? "mt-2" : "hidden"} space-y-4 rounded-xl border border-white/10 bg-void-800/40 p-2 lg:sticky lg:top-6 lg:mt-0 lg:block`}
          >
            {TAB_GROUPS.map((group) => (
              <div key={group.label}>
                <p className="px-2 pb-1 pt-1 text-[10px] font-bold uppercase tracking-wider text-white/30">
                  {group.label}
                </p>
                <div className="space-y-0.5">
                  {group.tabs.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        setTab(t);
                        setNavOpen(false); // referme le menu mobile
                      }}
                      className={`block w-full truncate rounded-lg px-3 py-1.5 text-left font-display text-sm font-bold uppercase tracking-wide transition-colors ${
                        tab === t
                          ? "bg-domain text-white"
                          : "text-white/55 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      {tabLabels[t]}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </nav>

        <div className="min-w-0">
      {tab === "overview" && (
        <OverviewAdmin stats={overview} onGotoContent={() => setTab("content")} />
      )}

      {tab === "content" && (
        <ContentHealthAdmin
          roster={roster}
          attributeColumns={attributeColumns}
          onEdit={editCharacter}
        />
      )}

      {tab === "jjkdle" && <JjkdleAnalyticsAdmin data={jjkdleAnalytics} />}

      {tab === "attributes" && (
        <AttributesAdmin attributes={attributes} universeName={universeName} />
      )}

      {tab === "categories" && (
        <CategoriesAdmin
          categories={adminCategories}
          universeName={universeName}
        />
      )}

      {tab === "pyramid" && (
        <PyramidAdmin
          conditions={rankingConditions}
          roster={roster}
          universeName={universeName}
        />
      )}

      {tab === "config" && (
        <ConfigAdmin
          roster={roster}
          gameFlags={gameFlags}
          maintenance={maintenance}
          forcedTarget={forcedTarget}
          attributeColumns={attributeColumns}
        />
      )}

      {tab === "draft" && <DraftRosterAdmin roster={draftRoster} />}

      {tab === "items" && <ItemsAdmin items={towerItems} />}

      {tab === "leaderboard" && <LeaderboardAdmin scores={scores} />}

      {tab === "users" && (
        <UserAdmin
          users={users}
          currentUserId={currentUserId}
          isSuperAdmin={isSuperAdmin}
          cardRoster={cardCollection}
        />
      )}

      {tab === "cards" && (
        <CardsAdmin collection={cardCollection} universeName={universeName} />
      )}

      {tab === "casino" && <CasinoAdmin casino={casino} />}

      {tab === "roster" && (
        <>
      {/* Univers ciblé, rappelé en permanence : un nouveau personnage part dans
          CE roster, et le sélecteur d'univers vit tout en haut de la page. */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-void-800/40 px-4 py-3">
        <p className="text-sm text-white/60">
          Roster édité :{" "}
          <span className="font-bold text-domain-light">{universeName}</span>
        </p>
        {categories.length === 0 ? (
          <button
            type="button"
            onClick={() => setTab("categories")}
            className="text-xs font-semibold text-cursed-light underline decoration-dotted"
          >
            Aucune catégorie dans cet univers — en créer
          </button>
        ) : (
          <span className="text-xs text-white/35">
            {categories.length} catégorie(s) notables ci-dessous
          </span>
        )}
      </div>

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

          {/* Attributs du personnage (définis par univers) */}
          <div className="rounded-xl border border-domain/30 bg-domain/5 p-3">
            <p className="mb-3 text-xs uppercase tracking-wider text-domain-light">
              Attributs {dailyTitle}{" "}
              <span className="text-white/35">(pool quotidien si tous remplis)</span>
            </p>
            <div className="grid grid-cols-2 gap-3">
              {attributeColumns.map((col) => {
                const value = form.attrs[col.key] ?? "";
                const setValue = (v: string) =>
                  setForm((f) => ({ ...f, attrs: { ...f.attrs, [col.key]: v } }));
                // NUMERIC : saisie libre entière. Sinon : liste fermée d'options.
                return col.kind === "NUMERIC" ? (
                  <Field key={col.key} label={col.label}>
                    <input
                      type="number"
                      min={0}
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                      className={inputCls}
                      placeholder="ex. 120"
                    />
                  </Field>
                ) : (
                  <EnumField
                    key={col.key}
                    label={col.label}
                    value={value}
                    options={col.options.map((o) => [o.value, o.label])}
                    onChange={setValue}
                  />
                );
              })}
              {attributeColumns.length === 0 && (
                <p className="col-span-2 text-xs text-white/40">
                  Aucun attribut défini pour cet univers.
                </p>
              )}
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
            {/* Tri : sur la note de la catégorie filtrée, sinon sur le nombre
                de catégories notées (cf. ROSTER_SORTS). */}
            <select
              value={rosterSort}
              onChange={(e) => setRosterSort(e.target.value as RosterSort)}
              title={
                rosterCat === "all"
                  ? "Les tris « Note » classent sur le nombre de catégories notées tant qu'aucune catégorie n'est filtrée."
                  : `Les tris « Note » classent sur la note dans « ${
                      categories.find((cat) => cat.id === rosterCat)?.label ??
                      rosterCat
                    } ».`
              }
              className={`rounded-lg border bg-void-900 px-3 py-1.5 text-sm outline-none focus:border-domain ${
                rosterSort === "default"
                  ? "border-white/10 text-white/70"
                  : "border-domain/60 text-domain-light"
              }`}
            >
              {Object.entries(ROSTER_SORTS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            {/* Recherche : la croix vide le champ en un clic (elle n'occupe la
                place du texte que lorsqu'il y en a). */}
            <div className="relative w-40">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher…"
                className={`w-full rounded-lg border border-white/10 bg-void-900 py-1.5 pl-3 text-sm text-white outline-none focus:border-domain ${
                  query ? "pr-8" : "pr-3"
                }`}
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Effacer la recherche"
                  title="Effacer la recherche"
                  className="absolute right-1 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-white/40 transition-colors hover:bg-white/10 hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Filtres par attribut (un select par attribut de l'univers). */}
          {attributeColumns.length > 0 && (
            <div className="mb-4 flex flex-wrap items-center gap-2">
              {attrFilterOptions.map(({ col, options }) => (
                <select
                  key={col.key}
                  value={attrFilters[col.key] ?? ""}
                  onChange={(e) =>
                    setAttrFilters((prev) => ({
                      ...prev,
                      [col.key]: e.target.value,
                    }))
                  }
                  title={col.label}
                  className={`rounded-lg border bg-void-900 px-3 py-1.5 text-sm outline-none focus:border-domain ${
                    attrFilters[col.key]
                      ? "border-domain/60 text-domain-light"
                      : "border-white/10 text-white/70"
                  }`}
                >
                  <option value="">{col.label} : tous</option>
                  {options.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                  <option value={ATTR_MISSING}>— non renseigné —</option>
                </select>
              ))}
              {activeAttrFilters.length > 0 && (
                <button
                  type="button"
                  onClick={() => setAttrFilters({})}
                  className="text-xs text-white/50 hover:text-white"
                >
                  Réinitialiser les attributs
                </button>
              )}
            </div>
          )}

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
                      {!isCompleteFor(attributeSchema, c) && (
                        <span
                          className="ml-1.5 rounded bg-cursed/20 px-1.5 py-0.5 text-[10px] font-bold text-cursed-light"
                          title={`Attributs ${dailyTitle} manquants — exclu du pool quotidien`}
                        >
                          {dailyTitle} incomplet
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
                          // `group` : la croix de retrait n'apparaît qu'au
                          // survol du tag, pour ne pas alourdir la liste. Elle
                          // est masquée en OPACITÉ et non en `display` — elle
                          // reste ainsi focusable au clavier, et le tag ne
                          // change pas de largeur au survol.
                          <span
                            key={catId}
                            className="group inline-flex items-center gap-1 rounded bg-domain/15 py-0.5 pl-1.5 pr-1.5 text-[10px] text-domain-light transition-colors hover:bg-domain/25"
                            title={catId}
                          >
                            <span>
                              {catId}: <b>{val}</b>
                            </span>
                            <button
                              type="button"
                              disabled={pending}
                              onClick={() => removeFromCategory(c, catId)}
                              aria-label={`Retirer ${c.name} de la catégorie ${catId}`}
                              title={`Retirer de « ${
                                categories.find((cat) => cat.id === catId)
                                  ?.label ?? catId
                              } »`}
                              className="-mr-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-cursed/30 text-[9px] leading-none text-cursed-light opacity-0 transition-opacity hover:bg-cursed/60 hover:text-white focus-visible:opacity-100 group-hover:opacity-100"
                            >
                              ✕
                            </button>
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
        </div>
      </div>

      {previewChar && (
        <CharacterPreviewModal
          character={previewChar}
          categories={categories}
          schema={attributeSchema}
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
  schema,
  onClose,
}: {
  character: Character;
  categories: CategoryConfig[];
  /** Schéma d'attributs de l'univers (libellés + valeurs affichables). */
  schema: AttributeSchema;
  onClose: () => void;
}) {
  const dailyTitle = useGameTitle("jjkdle");
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

          {/* Attributs du jeu du jour */}
          <p className="mt-4 mb-1.5 text-[11px] uppercase tracking-wider text-white/40">
            Attributs {dailyTitle}
          </p>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
            {schema.columns.map((col) => (
              <div key={col.key} className="flex justify-between gap-2">
                <dt className="text-white/45">{col.label}</dt>
                <dd className="text-right font-medium text-white/85">
                  {attributeDisplayFor(schema, c, col.key)}
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
