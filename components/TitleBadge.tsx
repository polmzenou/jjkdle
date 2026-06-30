import { getTitle } from "@/lib/titles/definitions";
import { rarityStyle } from "@/lib/profile/rarity";

/**
 * Affiche le TITRE équipé d'un joueur sous (ou à côté de) son pseudo, façon tag
 * VIP, avec une couleur dérivée de la rareté. Composant purement présentationnel
 * (aucun hook) → utilisable en Server ET Client Component. Rend `null` si la clé
 * est absente/inconnue (aucun titre équipé).
 */
export function TitleBadge({
  titleKey,
  className = "",
}: {
  titleKey: string | null | undefined;
  className?: string;
}) {
  const title = titleKey ? getTitle(titleKey) : undefined;
  if (!title) return null;

  const { color } = rarityStyle(title.rarity);

  return (
    <span
      title={title.description}
      className={`inline-flex items-center rounded-full px-1.5 py-0.5 align-middle text-[10px] font-bold uppercase tracking-wide ${className}`}
      style={{ color, background: `${color}1f`, border: `1px solid ${color}55` }}
    >
      {title.name}
    </span>
  );
}
