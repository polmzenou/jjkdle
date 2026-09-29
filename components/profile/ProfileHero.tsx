import type { ReactNode } from "react";
import { UserAvatar } from "@/components/UserAvatar";
import { VipBadge } from "@/components/VipBadge";
import { TitleBadge } from "@/components/TitleBadge";
import { XpStrip } from "@/components/LevelBar";
import { xpToLevel } from "@/lib/progress/xp";

interface ProfileHeroProps {
  username: string;
  role?: string;
  avatarImage?: string | null;
  /** Cadre à dessiner (null = aucun, ex. masqué par le joueur sur son profil public). */
  frameKey?: string | null;
  /** Titre à afficher sous le pseudo (null = aucun). */
  titleKey?: string | null;
  totalXp: number;
  /** Dégradé CSS de la bannière équipée (`bannerStyle(key).gradient`). */
  bannerGradient: string;
  /** Actions sous l'avatar (EDIT + lien profil public) — absent sur le profil public. */
  actions?: ReactNode;
  /** Cartes de statistiques, à droite des actions. */
  stats?: ReactNode;
}

/**
 * En-tête de profil partagé par `/account` et `/u/[username]` :
 * bannière → avatar à cheval sur le bas de la bannière, pseudo + niveau posés
 * sur la bannière, XP à droite, barre d'XP bord à bord juste dessous. Sous le
 * hero : les actions (colonne de l'avatar) et les stats.
 *
 * Purement présentationnel, sans hook : rendu serveur des deux côtés. Toutes les
 * couleurs passent par les tokens d'univers (`domain`, `void`).
 */
export function ProfileHero({
  username,
  role,
  avatarImage,
  frameKey,
  titleKey,
  totalXp,
  bannerGradient,
  actions,
  stats,
}: ProfileHeroProps) {
  const { level, current, needed } = xpToLevel(totalXp);

  return (
    <section className="relative">
      <div className="overflow-hidden rounded-3xl border border-white/10 bg-void-800/40 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.6)] backdrop-blur">
        {/* Bannière + identité posée dessus */}
        <div
          className="relative h-36 sm:h-44"
          style={{ background: bannerGradient }}
        >
          <span
            aria-hidden
            className="absolute inset-0 bg-gradient-to-t from-void-900/85 via-void-900/20 to-transparent"
          />
          <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-x-4 gap-y-1 pb-3 pl-[9.5rem] pr-4 sm:pl-[10.5rem] sm:pr-6">
            <div className="min-w-0">
              <h1 className="flex flex-wrap items-center gap-x-2 font-display text-2xl font-black tracking-tight text-white drop-shadow sm:text-3xl">
                <span className="truncate">{username}</span>
                {role === "VIP" && <VipBadge className="text-sm" />}
              </h1>
              <p className="mt-0.5 flex flex-wrap items-center gap-2 font-display text-sm font-black uppercase tracking-wide text-white/85">
                Niveau <span className="text-domain-light">{level}</span>
                {titleKey && <TitleBadge titleKey={titleKey} className="text-xs" />}
              </p>
            </div>
            <p className="text-xs font-bold tabular-nums text-white/70">
              {current.toLocaleString("fr-FR")} / {needed.toLocaleString("fr-FR")} XP
            </p>
          </div>
        </div>

        <XpStrip totalXp={totalXp} />

        {/* Sous le hero : actions (colonne de l'avatar) + stats */}
        <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[auto_1fr] lg:items-start lg:gap-8">
          {actions ? (
            <div className="flex min-w-[120px] flex-wrap items-center gap-3 pt-14 lg:pt-12">
              {actions}
            </div>
          ) : (
            // Sans actions (profil public) : juste de quoi dégager le bas de l'avatar.
            <div aria-hidden className="h-8 lg:w-[120px]" />
          )}
          {stats && <div className="min-w-0">{stats}</div>}
        </div>
      </div>

      {/* Avatar à cheval sur le bas de la bannière et la barre d'XP */}
      <div className="absolute left-5 top-[84px] sm:left-8 sm:top-[116px]">
        <UserAvatar
          username={username}
          image={avatarImage}
          frameKey={frameKey}
          size={120}
          className="rounded-full ring-4 ring-void-900"
        />
      </div>
    </section>
  );
}
