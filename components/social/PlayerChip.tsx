import { UniverseLink } from "@/components/universe/UniverseLink";
import { UserAvatar } from "@/components/UserAvatar";
import { PlayerName } from "@/components/PlayerName";
import { VipBadge } from "@/components/VipBadge";
import { TitleBadge } from "@/components/TitleBadge";
import type { PlayerDecorView } from "@/lib/social/types";

/**
 * Un joueur affiché comme au LEADERBOARD : avatar + cadre + niveau, pseudo
 * teinté de sa couleur, tag VIP et titre équipé. Lien vers son profil public.
 * Purement présentationnel → Server ET Client Component.
 */
export function PlayerChip({
  decor,
  size = 36,
  muted = false,
  showTitle = true,
  link = true,
  className = "",
}: {
  decor: PlayerDecorView;
  /** Diamètre de l'avatar (px). */
  size?: number;
  muted?: boolean;
  showTitle?: boolean;
  /** `false` quand le chip est déjà dans un bouton (ex. liste de conversations). */
  link?: boolean;
  className?: string;
}) {
  const name = (
    <PlayerName
      name={decor.pseudo}
      nameColorKey={decor.nameColorKey}
      className={link ? "underline-offset-2 group-hover:underline" : ""}
    />
  );

  return (
    <span className={`flex min-w-0 items-center gap-3 ${className}`}>
      <UserAvatar
        username={decor.pseudo}
        image={decor.avatarImage}
        level={decor.level}
        frameKey={decor.frameKey}
        size={size}
      />
      <span
        className={`min-w-0 truncate font-display font-bold ${
          muted ? "text-white/50" : "text-white/90"
        }`}
      >
        {link ? (
          <UniverseLink href={`/u/${encodeURIComponent(decor.pseudo)}`} className="group">
            {name}
          </UniverseLink>
        ) : (
          name
        )}
        {decor.role === "VIP" && <VipBadge className="ml-1.5" />}
        {showTitle && decor.titleKey && (
          <TitleBadge titleKey={decor.titleKey} className="ml-1.5" />
        )}
      </span>
    </span>
  );
}
