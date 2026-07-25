"use client";

import { useState } from "react";
import type { AdminCategory } from "@/lib/admin/category-store";
import { useUniverse } from "@/components/universe/UniverseProvider";
import { CategoriesAdmin } from "@/app/admin/CategoriesAdmin";

/**
 * Panneau ADMIN replié, posé sous le jeu builder : créer/éditer/supprimer les
 * catégories de l'univers SANS quitter la partie.
 *
 * Raison d'être : les catégories sont ce qui donne son identité au builder d'un
 * anime, et on ne juge de leur pertinence qu'en jouant. Faire l'aller-retour vers
 * /admin (qui cible un univers via un cookie, pas via l'URL) était le meilleur
 * moyen d'éditer par erreur l'univers d'à côté — ici l'univers vient de l'URL,
 * l'ambiguïté n'existe pas.
 *
 * Le rendu conditionnel côté serveur n'est qu'un confort d'affichage : le
 * contrôle qui compte est le `getAdminUser()` de chaque server action.
 */
export function CategoryAdminPanel({
  categories,
}: {
  categories: AdminCategory[];
}) {
  const { name } = useUniverse();
  const [open, setOpen] = useState(false);

  return (
    <section className="mt-10 rounded-2xl border border-dashed border-domain/40 bg-void-900/60">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span className="flex items-center gap-2">
          <span className="rounded-full bg-domain/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-domain-light">
            Admin
          </span>
          <span className="text-sm font-bold text-white">
            Catégories du builder
          </span>
          <span className="text-xs text-white/40">
            {categories.length} dans {name}
          </span>
        </span>
        <span className="text-white/40">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="border-t border-white/10 p-4">
          <CategoriesAdmin categories={categories} universeName={name} />
        </div>
      )}
    </section>
  );
}
