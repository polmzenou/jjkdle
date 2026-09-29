import { getNameColor } from "@/lib/profile/name-colors";

/**
 * Pseudo d'un joueur, teinté de sa COULEUR DE PSEUDO équipée (gras brillant,
 * cf. `.name-color-*` dans app/globals.css). Sans couleur (clé nulle/inconnue),
 * rend le texte tel quel : la couleur héritée du parent s'applique. Purement
 * présentationnel → utilisable en Server ET Client Component.
 */
export function PlayerName({
  name,
  nameColorKey,
  className = "",
}: {
  name: string;
  nameColorKey: string | null | undefined;
  className?: string;
}) {
  const color = getNameColor(nameColorKey);
  if (!color) return className ? <span className={className}>{name}</span> : <>{name}</>;
  return (
    <span className={`name-color name-color-${color.key} ${className}`}>{name}</span>
  );
}
