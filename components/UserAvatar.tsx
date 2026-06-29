import { CharacterImage } from "./CharacterImage";

interface UserAvatarProps {
  /** Pseudo (sert au fallback initiales). */
  username: string;
  /** URL de l'image du personnage choisi comme avatar (ou null = initiales). */
  image?: string | null;
  /** Niveau à afficher en pastille (optionnel). */
  level?: number;
  /** Diamètre en px (défaut 40). */
  size?: number;
  className?: string;
}

/**
 * Avatar de profil rond : réutilise `CharacterImage` (image du roster choisie
 * par l'utilisateur) avec repli initiales. Pastille de niveau optionnelle.
 * Aucun upload — l'image provient toujours d'un personnage existant.
 */
export function UserAvatar({
  username,
  image,
  level,
  size = 40,
  className = "",
}: UserAvatarProps) {
  return (
    <div className={`relative shrink-0 ${className}`} style={{ width: size, height: size }}>
      <div className="h-full w-full overflow-hidden rounded-full border border-white/15 bg-void-700">
        <CharacterImage character={{ name: username, image: image ?? undefined }} />
      </div>
      {level != null && (
        <span
          className="absolute -bottom-1 -right-1 flex min-w-[18px] items-center justify-center rounded-full border border-void-900 bg-domain px-1 text-[10px] font-black leading-tight text-white shadow-glow"
          title={`Niveau ${level}`}
        >
          {level}
        </span>
      )}
    </div>
  );
}
