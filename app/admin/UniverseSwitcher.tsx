"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setAdminUniverseAction } from "./actions";

/** Univers proposé au sélecteur (forme sérialisable). */
export interface UniverseOption {
  slug: string;
  name: string;
}

interface UniverseSwitcherProps {
  universes: UniverseOption[];
  /** Slug de l'univers actuellement administré. */
  current: string;
}

/**
 * Sélecteur d'UNIVERS de l'administration (étape 5).
 *
 * Bascule la cible de TOUTES les vues et actions de l'admin (roster, draft,
 * catégories, classements, attributs, config). N'affecte pas le site public :
 * les joueurs continuent de voir l'univers de leur domaine.
 *
 * Masqué tant qu'il n'y a qu'un seul univers — inutile d'encombrer l'interface.
 */
export function UniverseSwitcher({ universes, current }: UniverseSwitcherProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (universes.length < 2) return null;

  const change = (slug: string) => {
    if (slug === current) return;
    setError(null);
    startTransition(async () => {
      const res = await setAdminUniverseAction(slug);
      if (res.ok) router.refresh();
      else setError(res.error ?? "Échec du changement d'univers.");
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label
        htmlFor="admin-universe"
        className="text-[11px] font-bold uppercase tracking-wider text-white/40"
      >
        Univers administré
      </label>
      <select
        id="admin-universe"
        value={current}
        disabled={pending}
        onChange={(e) => change(e.target.value)}
        className="rounded-lg border border-domain/40 bg-void-900 px-3 py-1.5 text-sm font-semibold text-white outline-none focus:border-domain disabled:opacity-50"
      >
        {universes.map((u) => (
          <option key={u.slug} value={u.slug}>
            {u.name}
          </option>
        ))}
      </select>
      {error && <span className="text-xs text-cursed-light">{error}</span>}
    </div>
  );
}
