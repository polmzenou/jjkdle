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
  const [copied, setCopied] = useState(false);
  /** Lien affiché en clair quand ni le partage natif ni la copie n'aboutissent. */
  const [fallback, setFallback] = useState<string | null>(null);

  function link() {
    // Construit depuis l'URL courante : la page vit sous un préfixe d'univers
    // (`/jjk/games/tower`), qu'il ne faut surtout pas perdre.
    const url = new URL(window.location.href);
    url.search = "";
    url.searchParams.set("floor", String(floor));
    url.searchParams.set("score", String(score));
    url.searchParams.set("attempt", String(attempt));
    return url.toString();
  }

  async function share() {
    const url = link();
    const text = cleared
      ? `J'ai franchi The Culling Tower${attempt === 1 ? " du premier essai" : ""}.`
      : `J'ai atteint l'étage ${floor} de The Culling Tower.`;

    try {
      if (navigator.share) {
        await navigator.share({ title: "The Culling Tower", text, url });
        return;
      }
      await navigator.clipboard.writeText(`${text} ${url}`);
      setCopied(true);
      return;
    } catch (error) {
      // Un partage ANNULÉ par l'utilisateur lève, comme un vrai échec :
      // afficher un repli alors qu'il n'a rien raté serait absurde.
      if (error instanceof DOMException && error.name === "AbortError") return;
    }

    // Le presse-papier est refusé dans plus de contextes qu'on ne croit
    // (permission, navigateur embarqué, absence de geste reconnu). Plutôt que
    // d'annoncer un échec sans recours, on montre le lien : le joueur le
    // sélectionne et le copie lui-même.
    setFallback(url);
  }

  if (fallback) {
    return (
      <input
        readOnly
        value={fallback}
        aria-label="Lien de ton ascension — sélectionne-le pour le copier"
        onFocus={(e) => e.currentTarget.select()}
        // Sélectionné d'emblée : le repli ne doit pas coûter plus d'un Ctrl+C.
        ref={(el) => el?.select()}
        className="w-64 rounded-lg border border-white/15 bg-void-900 px-3 py-2.5 text-center text-xs text-white/80"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={share}
      className="rounded-lg border border-white/15 px-5 py-2.5 font-display text-white/70 transition hover:border-white/35 hover:text-white"
    >
      {copied ? "Lien copié" : "Partager"}
    </button>
  );
}
