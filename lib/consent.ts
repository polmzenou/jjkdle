/**
 * Consentement aux cookies, mémorisé dans le cookie `cookie_consent` (6 mois,
 * durée recommandée par la CNIL). Module client (lit `document.cookie`).
 */

export type Consent = "accepted" | "refused";

export const CONSENT_COOKIE = "cookie_consent";
const MAX_AGE = 60 * 60 * 24 * 182; // ≈ 6 mois

/** Événement qui réaffiche le bandeau (bouton « Gérer les cookies »). */
export const CONSENT_REOPEN_EVENT = "cookie-consent:open";

export function readConsent(): Consent | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)cookie_consent=(accepted|refused)/);
  return (match?.[1] as Consent | undefined) ?? null;
}

export function writeConsent(consent: Consent): void {
  document.cookie = `${CONSENT_COOKIE}=${consent}; max-age=${MAX_AGE}; path=/; SameSite=Lax`;
}
