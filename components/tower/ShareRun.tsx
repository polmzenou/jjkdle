"use client";

import { useState } from "react";

/**
 * Partage d'une ascension.
 *
 * Le lien porte le RÉSULTAT (`?floor=…&score=…`), que `generateMetadata` de la
 * page transforme en aperçu social chiffré (cf. `app/og/tower`). Un lien nu
 * n'afficherait que la vignette du jeu, qui n'invite personne à jouer.
 *
 * Deux chemins, dans cet ordre : le partage natif du système quand il existe
 * (mobile, où le jeu se joue surtout), le presse-papier sinon. Aucune
 * dépendance, aucune API tierce.
 */
export function ShareRun({
  floor,
  score,
  attempt,
  cleared,
}: {
  floor: number;
  score: number;
  attempt: number;
  cleared: boolean;
}) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  async function share() {
    // Construit depuis l'URL courante : la page vit sous un préfixe d'univers
    // (`/jjk/games/tower`), qu'il ne faut surtout pas perdre.
    const url = new URL(window.location.href);
    url.search = "";
    url.searchParams.set("floor", String(floor));
    url.searchParams.set("score", String(score));
    url.searchParams.set("attempt", String(attempt));

    const text = cleared
      ? `J'ai franchi The Culling Tower${attempt === 1 ? " du premier essai" : ""}.`
      : `J'ai atteint l'étage ${floor} de The Culling Tower.`;

    try {
      if (navigator.share) {
        await navigator.share({ title: "The Culling Tower", text, url: url.toString() });
        return;
      }
      await navigator.clipboard.writeText(`${text} ${url}`);
      setState("copied");
    } catch (error) {
      // Un partage ANNULÉ par l'utilisateur lève, comme un vrai échec : le
      // traiter en erreur afficherait « échec » alors qu'il n'a rien raté.
      if (error instanceof DOMException && error.name === "AbortError") return;
      setState("failed");
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      className="rounded-lg border border-white/15 px-5 py-2.5 font-display text-white/70 transition hover:border-white/35 hover:text-white"
    >
      {state === "copied"
        ? "Lien copié"
        : state === "failed"
          ? "Copie impossible"
          : "Partager"}
    </button>
  );
}
