"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type {
  AdminUniverse,
  UnclaimedConfig,
  UniverseContentCounts,
} from "@/lib/admin/universe-store";
import {
  createUniverseAction,
  deleteUniverseAction,
  renameUniverseAction,
} from "./actions";

/**
 * Vue de GESTION DES UNIVERS (`/admin/universes`).
 *
 * Trois opérations : créer, renommer, supprimer — plus, pour chaque univers, le
 * bouton qui ouvre son administration. Ce bouton pointe sur `/admin?universe=`
 * (cf. lib/universes/admin-scope) : c'est la MÊME vue d'admin pour tous les
 * animes, rebranchée sur les données de celui-ci. Il n'existe donc qu'un seul
 * tableau de bord à maintenir, quel que soit le nombre d'univers.
 *
 * Le slug n'est PAS modifiable : il est dans les URLs publiques (`/jjk/games`),
 * dans les clés de config (`u.jjk.*`) et dans les favoris des joueurs. Se
 * tromper de nom se corrige ; se tromper de slug se recrée.
 */

interface UniversesAdminProps {
  universes: AdminUniverse[];
  /** Configs code sans ligne en base : créables en un clic. */
  unclaimed: UnclaimedConfig[];
  /** Univers actuellement ciblé par la session d'admin. */
  currentUniverse: string;
}

/** "Chainsaw Man" → "chainsaw-man" (mêmes règles que la validation serveur). */
function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const COUNT_LABELS: [keyof UniverseContentCounts, string][] = [
  ["characters", "persos"],
  ["draftCharacters", "persos draft"],
  ["categories", "catégories"],
  ["attributes", "attributs"],
  ["rankingConditions", "conditions"],
  ["profiles", "profils joueur"],
];

export function UniversesAdmin({
  universes,
  unclaimed,
  currentUniverse,
}: UniversesAdminProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  /** Le slug n'est plus dérivé du nom dès que l'admin l'a édité à la main. */
  const [slugTouched, setSlugTouched] = useState(false);

  const missingConfig = useMemo(
    () => universes.filter((u) => !u.configured),
    [universes],
  );

  const run = (
    fn: () => Promise<{ ok: boolean; error?: string }>,
    onOk?: () => void,
  ) => {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const res = await fn();
      if (res.ok) {
        onOk?.();
        router.refresh();
      } else {
        setError(res.error ?? "Échec de l'opération.");
      }
    });
  };

  const create = (nextName: string, nextSlug: string) => {
    run(
      () => createUniverseAction({ name: nextName, slug: nextSlug }),
      () => {
        setName("");
        setSlug("");
        setSlugTouched(false);
        setNotice(`Univers « ${nextSlug} » créé.`);
      },
    );
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-black uppercase tracking-wider text-white">
            Admin · <span className="text-domain-light">Univers</span>
          </h1>
          <p className="text-sm text-white/45">
            {universes.length} univers · administré : {currentUniverse}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin"
            className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-white/60 hover:text-white"
          >
            ← Admin
          </Link>
          <a
            href="/universes"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-white/60 hover:text-white"
          >
            Hub ↗
          </a>
        </div>
      </header>

      {error && (
        <p className="mb-4 rounded-xl border border-cursed/40 bg-cursed/10 px-4 py-3 text-sm text-cursed-light">
          {error}
        </p>
      )}
      {notice && (
        <p className="mb-4 rounded-xl border border-domain/40 bg-domain/10 px-4 py-3 text-sm text-domain-light">
          {notice}
        </p>
      )}

      {/* ── Création ──────────────────────────────────────────────────── */}
      <section className="mb-8 rounded-2xl border border-white/10 bg-void-800/40 p-5">
        <h2 className="font-display text-lg font-bold uppercase tracking-wide text-white">
          Créer un univers
        </h2>
        <p className="mt-1 text-sm text-white/50">
          Le slug devient le préfixe de toutes ses URLs (
          <span className="text-white/70">/{slug || "csm"}/games</span>) et n&apos;est
          plus modifiable ensuite.
        </p>

        {unclaimed.length > 0 && (
          <div className="mt-4 rounded-xl border border-domain/30 bg-domain/5 p-3">
            <p className="text-xs font-bold uppercase tracking-wider text-domain-light">
              Configs prêtes à créer
            </p>
            <p className="mt-1 text-xs text-white/50">
              Ces univers ont leur config en code mais pas encore de ligne en
              base.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {unclaimed.map((c) => (
                <button
                  key={c.slug}
                  type="button"
                  disabled={pending}
                  onClick={() => create(c.name, c.slug)}
                  className="rounded-lg border border-domain/40 bg-domain/10 px-3 py-1.5 text-sm font-semibold text-domain-light hover:bg-domain/20 disabled:opacity-50"
                >
                  + {c.name}{" "}
                  <span className="font-mono text-xs text-white/40">
                    /{c.slug}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        <form
          className="mt-4 flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            create(name, slug);
          }}
        >
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-white/40">
              Nom affiché
            </span>
            <input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!slugTouched) setSlug(slugify(e.target.value));
              }}
              placeholder="CSM Arcade"
              className="w-56 rounded-lg border border-white/10 bg-void-900 px-3 py-1.5 text-sm text-white outline-none focus:border-domain"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-white/40">
              Slug
            </span>
            <input
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(slugify(e.target.value));
              }}
              placeholder="csm"
              className="w-40 rounded-lg border border-white/10 bg-void-900 px-3 py-1.5 font-mono text-sm text-white outline-none focus:border-domain"
            />
          </label>
          <button
            type="submit"
            disabled={pending || !name.trim() || !slug.trim()}
            className="rounded-lg bg-domain px-4 py-1.5 font-display text-sm font-bold uppercase tracking-wide text-white hover:bg-domain-light disabled:opacity-40"
          >
            Créer
          </button>
        </form>
      </section>

      {/* ── Liste ────────────────────────────────────────────────────── */}
      <ul className="space-y-4">
        {universes.map((u) => (
          <UniverseCard
            key={u.id}
            universe={u}
            isTargeted={u.slug === currentUniverse}
            pending={pending}
            onRename={(newName, done) =>
              run(() => renameUniverseAction(u.id, newName), done)
            }
            onDelete={(confirmSlug, done) =>
              run(() => deleteUniverseAction(u.id, confirmSlug), done)
            }
          />
        ))}
      </ul>

      {missingConfig.length > 0 && (
        <section className="mt-8 rounded-2xl border border-cursed/30 bg-cursed/5 p-5">
          <h2 className="font-display text-sm font-bold uppercase tracking-wide text-cursed-light">
            Config code manquante
          </h2>
          <p className="mt-2 text-sm text-white/60">
            Un univers a besoin d&apos;une ligne en base (créée ici) ET d&apos;un
            fichier de config en code : le middleware tourne sur l&apos;Edge, sans
            accès à la base, donc c&apos;est le registre qui rend un slug routable
            et thémable. Pour{" "}
            {missingConfig.map((u) => `« ${u.slug} »`).join(", ")} :
          </p>
          <ol className="mt-3 space-y-1 text-sm text-white/55">
            <li>
              1. copier{" "}
              <code className="text-white/80">lib/universes/jjk.ts</code> en{" "}
              <code className="text-white/80">
                lib/universes/{missingConfig[0].slug}.ts
              </code>{" "}
              (slug, nom, palette, logo, libellés) ;
            </li>
            <li>
              2. l&apos;ajouter à <code className="text-white/80">UNIVERSES</code>{" "}
              dans <code className="text-white/80">lib/universes/registry.ts</code>{" "}
              ;
            </li>
            <li>
              3. déployer — l&apos;univers devient alors administrable et visible
              sur le hub.
            </li>
          </ol>
        </section>
      )}
    </main>
  );
}

/** Carte d'un univers : identité, contenu, et les 3 opérations possibles. */
function UniverseCard({
  universe,
  isTargeted,
  pending,
  onRename,
  onDelete,
}: {
  universe: AdminUniverse;
  /** Univers actuellement ciblé par la session d'admin. */
  isTargeted: boolean;
  pending: boolean;
  onRename: (name: string, done: () => void) => void;
  onDelete: (confirmSlug: string, done: () => void) => void;
}) {
  const [renaming, setRenaming] = useState(false);
  const [draftName, setDraftName] = useState(universe.name);
  const [confirming, setConfirming] = useState(false);
  const [confirmSlug, setConfirmSlug] = useState("");

  const content = COUNT_LABELS.filter(
    ([key]) => universe.counts[key] > 0,
  ).map(([key, label]) => `${universe.counts[key]} ${label}`);

  return (
    <li className="rounded-2xl border border-white/10 bg-void-800/40 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {renaming ? (
              <input
                autoFocus
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    onRename(draftName, () => setRenaming(false));
                  }
                  if (e.key === "Escape") {
                    setDraftName(universe.name);
                    setRenaming(false);
                  }
                }}
                className="w-56 rounded-lg border border-domain/40 bg-void-900 px-3 py-1 font-display text-lg font-bold text-white outline-none focus:border-domain"
              />
            ) : (
              <h3 className="font-display text-lg font-black text-white">
                {universe.name}
              </h3>
            )}
            <span className="rounded-md border border-white/10 px-2 py-0.5 font-mono text-xs text-white/50">
              /{universe.slug}
            </span>
            {universe.isDefault && (
              <span className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white/50">
                Défaut
              </span>
            )}
            {isTargeted && (
              <span className="rounded-md border border-domain/40 bg-domain/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-domain-light">
                Administré
              </span>
            )}
            {!universe.configured && (
              <span className="rounded-md border border-cursed/40 bg-cursed/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-cursed-light">
                Config manquante
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-white/45">
            {universe.sourceWork ?? "Œuvre non renseignée (config absente)"} ·{" "}
            {content.length > 0 ? content.join(" · ") : "aucun contenu"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {renaming ? (
            <>
              <button
                type="button"
                disabled={pending || !draftName.trim()}
                onClick={() => onRename(draftName, () => setRenaming(false))}
                className="rounded-lg bg-domain px-3 py-1.5 text-sm font-semibold text-white hover:bg-domain-light disabled:opacity-40"
              >
                Enregistrer
              </button>
              <button
                type="button"
                onClick={() => {
                  setDraftName(universe.name);
                  setRenaming(false);
                }}
                className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-white/60 hover:text-white"
              >
                Annuler
              </button>
            </>
          ) : (
            <>
              {universe.configured ? (
                /* Navigation PLEINE PAGE volontaire : le middleware pose la
                   nouvelle cible d'admin (cookie + header) sur cette requête,
                   et tout le tableau de bord se re-rend sur cet univers. */
                <a
                  href={`/admin?universe=${universe.slug}`}
                  className="rounded-lg border border-domain/40 bg-domain/10 px-3 py-1.5 text-sm font-semibold text-domain-light hover:bg-domain/20"
                >
                  Ouvrir l&apos;admin →
                </a>
              ) : (
                <span
                  title="Config code absente : cet univers n'est pas encore routable."
                  className="cursor-not-allowed rounded-lg border border-white/10 px-3 py-1.5 text-sm text-white/25"
                >
                  Ouvrir l&apos;admin →
                </span>
              )}
              {universe.configured && (
                <a
                  href={`/${universe.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-white/60 hover:text-white"
                >
                  Site ↗
                </a>
              )}
              <button
                type="button"
                onClick={() => setRenaming(true)}
                className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-white/60 hover:text-white"
              >
                Renommer
              </button>
              {!universe.isDefault && (
                <button
                  type="button"
                  onClick={() => {
                    setConfirmSlug("");
                    setConfirming((v) => !v);
                  }}
                  className="rounded-lg border border-cursed/30 px-3 py-1.5 text-sm text-cursed-light hover:bg-cursed/10"
                >
                  Supprimer
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {confirming && (
        <div className="mt-4 rounded-xl border border-cursed/30 bg-cursed/5 p-4">
          {universe.attachedRows > 0 ? (
            <p className="text-sm text-white/60">
              Cet univers porte encore du contenu (
              {content.join(", ")}) : la suppression est refusée pour ne pas
              effacer un roster ou la progression de joueurs. Vide-le depuis son
              admin d&apos;abord.
            </p>
          ) : (
            <>
              <p className="text-sm text-white/60">
                Suppression définitive de{" "}
                <span className="text-white/85">{universe.name}</span> et de sa
                config (flags de jeux, maintenance). Saisis{" "}
                <span className="font-mono text-white/85">{universe.slug}</span>{" "}
                pour confirmer.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <input
                  value={confirmSlug}
                  onChange={(e) => setConfirmSlug(e.target.value)}
                  placeholder={universe.slug}
                  className="w-40 rounded-lg border border-cursed/40 bg-void-900 px-3 py-1.5 font-mono text-sm text-white outline-none focus:border-cursed"
                />
                <button
                  type="button"
                  disabled={
                    pending || confirmSlug.trim().toLowerCase() !== universe.slug
                  }
                  onClick={() =>
                    onDelete(confirmSlug, () => {
                      setConfirming(false);
                      setConfirmSlug("");
                    })
                  }
                  className="rounded-lg bg-cursed px-4 py-1.5 font-display text-sm font-bold uppercase tracking-wide text-white hover:bg-cursed-light disabled:opacity-40"
                >
                  Supprimer
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-white/60 hover:text-white"
                >
                  Annuler
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </li>
  );
}
