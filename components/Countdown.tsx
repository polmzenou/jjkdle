"use client";

import { useEffect, useState } from "react";

/**
 * Compte à rebours HH:MM:SS vers la prochaine rotation quotidienne (minuit
 * Europe/Paris). Partagé par le daily JJKdle et l'étal exotic de la boutique —
 * les deux tournent sur le même fuseau, cf. `lib/rotation.ts`.
 *
 * Le délai initial est CALCULÉ CÔTÉ SERVEUR (`msUntilMidnight`) et passé en
 * prop : l'horloge du visiteur, elle, peut être décalée ou dans un autre fuseau.
 * Seul l'écoulement est mesuré côté client.
 */
export function Countdown({
  ms,
  label,
  className = "mt-5 text-sm text-white/45",
  valueClassName = "font-mono font-bold text-domain-light",
}: {
  ms: number;
  /** Texte précédant l'horloge (ex. « Prochain personnage dans »). */
  label: string;
  className?: string;
  valueClassName?: string;
}) {
  const [remaining, setRemaining] = useState(ms);

  useEffect(() => {
    const end = Date.now() + ms;
    const t = setInterval(() => {
      setRemaining(Math.max(0, end - Date.now()));
    }, 1000);
    return () => clearInterval(t);
  }, [ms]);

  const h = Math.floor(remaining / 3_600_000);
  const m = Math.floor((remaining % 3_600_000) / 60_000);
  const s = Math.floor((remaining % 60_000) / 1000);
  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <p className={className}>
      {label}{" "}
      <span className={valueClassName}>
        {pad(h)}:{pad(m)}:{pad(s)}
      </span>
    </p>
  );
}
