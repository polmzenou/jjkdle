/**
 * Validation du montant d'un envoi de coins entre amis. Pur (aucune dépendance
 * server-only) : partagé par le formulaire client et la server action.
 *
 * Pas de plafond : un joueur peut donner tout son solde. Seuls les entiers
 * strictement positifs passent (la base n'écrit que des entiers, cf. lib/coins.ts).
 */
export function parseCoinAmount(raw: unknown): number | null {
  const n = typeof raw === "string" ? Number(raw.trim()) : raw;
  if (typeof n !== "number" || !Number.isSafeInteger(n) || n <= 0) return null;
  return n;
}
