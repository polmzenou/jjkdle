"use client";

import { useEffect, useState } from "react";

/**
 * Décompte de la phase courante.
 *
 * ⚠️ Le temps restant est calculé à partir d'un DELTA entre l'échéance et
 * l'horloge SERVEUR (`serverNowMs`), jamais entre l'échéance et `Date.now()` du
 * navigateur : une horloge locale décalée de quelques minutes — c'est courant —
 * afficherait un décompte absurde et ferait ticker en avance. Même contrat que
 * components/Countdown.tsx.
 *
 * `onExpire` est appelé UNE FOIS par échéance. C'est ce qui déclenche le tick
 * côté client ; le serveur revérifie de toute façon l'échéance et n'en laisse
 * passer qu'un (cf. lib/casino/engine.ts).
 */
export function usePhaseCountdown(
  deadlineMs: number | null,
  serverNowMs: number,
  onExpire?: () => void,
): number | null {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (deadlineMs === null) {
      setRemaining(null);
      return;
    }
    // Écart entre l'horloge du navigateur et celle du serveur, mesuré à la
    // réception du snapshot : tout le décompte s'y réfère ensuite.
    const skew = Date.now() - serverNowMs;
    let fired = false;

    const compute = () => {
      const left = deadlineMs - (Date.now() - skew);
      setRemaining(Math.max(0, left));
      if (left <= 0 && !fired) {
        fired = true;
        onExpire?.();
      }
    };

    compute();
    const id = setInterval(compute, 250);
    return () => clearInterval(id);
    // `onExpire` est volontairement hors dépendances : la recréer à chaque
    // rendu relancerait le décompte en boucle. L'échéance suffit à l'identifier.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deadlineMs, serverNowMs]);

  return remaining;
}

/** Barre de décompte + secondes restantes. */
export function PhaseTimer({
  remainingMs,
  totalMs,
  label,
}: {
  remainingMs: number | null;
  totalMs: number;
  label: string;
}) {
  if (remainingMs === null) {
    return (
      <span className="text-xs font-semibold uppercase tracking-wider text-white/40">
        {label}
      </span>
    );
  }

  const seconds = Math.ceil(remainingMs / 1000);
  const ratio = totalMs > 0 ? Math.min(1, Math.max(0, remainingMs / totalMs)) : 0;
  const urgent = seconds <= 5;

  return (
    <span className="flex items-center gap-2.5">
      <span
        className={`text-xs font-semibold uppercase tracking-wider ${
          urgent ? "text-cursed-light" : "text-white/50"
        }`}
      >
        {label}
      </span>
      <span
        aria-hidden
        className="relative h-1.5 w-24 overflow-hidden rounded-full bg-white/10"
      >
        <span
          className={`absolute inset-y-0 left-0 rounded-full transition-[width] duration-200 ease-linear ${
            urgent ? "bg-cursed" : "bg-domain-light"
          }`}
          style={{ width: `${ratio * 100}%` }}
        />
      </span>
      <span
        className={`w-6 text-right text-sm font-black tabular-nums ${
          urgent ? "text-cursed-light" : "text-white/70"
        }`}
      >
        {seconds}
      </span>
    </span>
  );
}
