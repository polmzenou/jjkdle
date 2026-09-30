"use client";

import { Analytics } from "@vercel/analytics/next";
import { readConsent } from "@/lib/consent";

/**
 * Mesure d'audience Vercel, coupée si le joueur a REFUSÉ (bandeau cookies).
 * Le choix est relu à chaque événement : refuser prend effet immédiatement,
 * sans rechargement. `beforeSend` est une fonction, d'où ce wrapper client.
 */
export function AnalyticsGate() {
  return (
    <Analytics beforeSend={(event) => (readConsent() === "refused" ? null : event)} />
  );
}
