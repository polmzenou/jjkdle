/**
 * Validation du formulaire de contact. Module PUR partagé par la modale (retour
 * immédiat) et la Server Action (seule source de vérité).
 */

export const CONTACT_KINDS = ["GENERAL", "BUG", "IDEA"] as const;
export type ContactKindInput = (typeof CONTACT_KINDS)[number];

export const CONTACT_LIMITS = {
  nameMax: 60,
  emailMax: 120,
  messageMin: 20,
  messageMax: 3000,
  locationMax: 200,
  stepsMax: 2000,
  /** Messages autorisés par compte (ou par IP) sur une heure glissante. */
  perHour: 3,
} as const;

export interface ContactInput {
  kind: string;
  name: string;
  email: string;
  message: string;
  bugLocation?: string;
  bugSteps?: string;
  creditOk?: boolean;
  /** Pot de miel : invisible pour un humain, rempli par les robots. */
  website?: string;
}

export interface CleanContact {
  kind: ContactKindInput;
  name: string;
  email: string;
  message: string;
  bugLocation: string | null;
  bugSteps: string | null;
  creditOk: boolean;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateContact(
  input: ContactInput,
): { ok: true; value: CleanContact } | { ok: false; error: string } {
  const kind = String(input.kind ?? "") as ContactKindInput;
  if (!CONTACT_KINDS.includes(kind)) {
    return { ok: false, error: "Choisis un type de message." };
  }
  const name = String(input.name ?? "").trim();
  if (!name || name.length > CONTACT_LIMITS.nameMax) {
    return { ok: false, error: "Indique ton nom ou ton pseudo." };
  }
  const email = String(input.email ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > CONTACT_LIMITS.emailMax) {
    return { ok: false, error: "Email invalide." };
  }
  const message = String(input.message ?? "").trim();
  if (message.length < CONTACT_LIMITS.messageMin) {
    return {
      ok: false,
      error: `Message trop court (${CONTACT_LIMITS.messageMin} caractères minimum).`,
    };
  }
  if (message.length > CONTACT_LIMITS.messageMax) {
    return {
      ok: false,
      error: `Message trop long (${CONTACT_LIMITS.messageMax} caractères maximum).`,
    };
  }
  const bugLocation =
    kind === "BUG"
      ? String(input.bugLocation ?? "").trim().slice(0, CONTACT_LIMITS.locationMax) || null
      : null;
  const bugSteps =
    kind === "BUG"
      ? String(input.bugSteps ?? "").trim().slice(0, CONTACT_LIMITS.stepsMax) || null
      : null;

  return {
    ok: true,
    value: {
      kind,
      name,
      email,
      message,
      bugLocation,
      bugSteps,
      creditOk: kind === "IDEA" && Boolean(input.creditOk),
    },
  };
}
