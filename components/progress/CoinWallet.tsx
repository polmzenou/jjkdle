/**
 * Monnaie du jeu — icône partagée + portemonnaie du header.
 *
 * Le projet n'embarque aucune librairie d'icônes : le SVG est écrit à la main
 * (même convention que HubLink). Il est extrait ici pour que le header et le
 * bandeau de fin de partie (`ExpReward`) montrent exactement le même jeton.
 */

/** Pièce dorée, dimensionnée par `className` (hérite la couleur du parent). */
export function CoinIcon({ className = "h-[15px] w-[15px]" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className={className} fill="none">
      <circle cx="12" cy="12" r="9" fill="currentColor" opacity="0.22" />
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path
        d="M12 7v10M9.5 9.2c0-1 1.1-1.7 2.5-1.7s2.5.7 2.5 1.7-1 1.5-2.5 1.9-2.5.9-2.5 1.9 1.1 1.7 2.5 1.7 2.5-.7 2.5-1.7"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Pastille « portemonnaie » du header : icône + solde du joueur.
 *
 * Le solde est GLOBAL au compte (cf. `User.coins`), il ne dépend pas de
 * l'univers courant. Rendu côté serveur via le chrome d'univers, donc à jour à
 * chaque navigation (la nav est masquée pendant les parties, cf. SiteNav).
 */
export function CoinWallet({ coins }: { coins: number }) {
  const formatted = coins.toLocaleString("fr-FR");

  return (
    <span
      title={`${formatted} coins`}
      className="flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1.5 text-xs font-black tabular-nums text-amber-300"
    >
      <CoinIcon />
      {formatted}
    </span>
  );
}
