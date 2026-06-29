import { CharacterImage } from "./CharacterImage";
import { frameRing, DEFAULT_FRAME_KEY } from "@/lib/frames/definitions";

interface UserAvatarProps {
  /** Pseudo (sert au fallback initiales). */
  username: string;
  /** URL de l'image du personnage choisi comme avatar (ou null = initiales). */
  image?: string | null;
  /** Niveau à afficher en pastille (optionnel). */
  level?: number;
  /** Clé du cadre équipé (ou null = cadre par défaut, simple bordure). */
  frameKey?: string | null;
  /** Diamètre en px (défaut 40). */
  size?: number;
  className?: string;
}

/**
 * Avatar de profil rond : réutilise `CharacterImage` (image du roster choisie
 * par l'utilisateur) avec repli initiales. Pastille de niveau optionnelle.
 * Aucun upload — l'image provient toujours d'un personnage existant.
 *
 * Le cadre (`frameKey`) est rendu en SURCOUCHE (bordure + glow CSS, zéro asset)
 * pour ne pas faire « pulser » l'image elle-même. Repli sur une simple bordure.
 */
export function UserAvatar({
  username,
  image,
  level,
  frameKey,
  size = 40,
  className = "",
}: UserAvatarProps) {
  const hasFrame = Boolean(frameKey) && frameKey !== DEFAULT_FRAME_KEY;

  return (
    <div className={`relative shrink-0 ${className}`} style={{ width: size, height: size }}>
      <div className="h-full w-full overflow-hidden rounded-full border border-white/15 bg-void-700">
        <CharacterImage character={{ name: username, image: image ?? undefined }} />
      </div>
      {hasFrame && (
        <span
          aria-hidden
          className={`pointer-events-none absolute inset-0 rounded-full ${frameRing(frameKey)}`}
        />
      )}
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
