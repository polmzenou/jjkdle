/**
 * Petit tag « VIP » affiché à côté du pseudo d'un membre VIP, partout sur le
 * site (leaderboards, admin, compte, barre de navigation). Composant purement
 * présentationnel (aucun hook) → utilisable en Server ET Client Component.
 */
export function VipBadge({ className = "" }: { className?: string }) {
  return (
    <span
      title="Membre VIP"
      className={`inline-flex items-center rounded-full bg-amber-400/15 px-1.5 py-0.5 align-middle text-[10px] font-bold uppercase tracking-wide text-amber-300 ${className}`}
    >
      VIP
    </span>
  );
}
