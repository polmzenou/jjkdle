"use client";

interface CodenamesPassButtonProps {
  /** Nombre d'agents ayant déjà passé / total d'agents de l'équipe. */
  passedCount: number;
  totalAgents: number;
  /** Vrai si le joueur courant a déjà passé. */
  alreadyPassed: boolean;
  pending: boolean;
  onPass: () => void;
}

/**
 * Bouton « Passer », visible uniquement par les agents de l'équipe active. Le
 * tour ne bascule que lorsque TOUS les agents ont passé.
 */
export function CodenamesPassButton({
  passedCount,
  totalAgents,
  alreadyPassed,
  pending,
  onPass,
}: CodenamesPassButtonProps) {
  return (
    <button
      type="button"
      onClick={onPass}
      disabled={alreadyPassed || pending}
      className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-bold uppercase tracking-wide text-white/80 transition-colors hover:bg-white/10 disabled:opacity-40"
    >
      {alreadyPassed ? "Tu as passé" : "Passer"}
      <span className="ml-2 text-xs text-white/40">
        {passedCount}/{totalAgents}
      </span>
    </button>
  );
}
