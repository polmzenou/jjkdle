import { BADGES } from "@/lib/badges/definitions";

interface BadgeShelfProps {
  /** Clés des badges débloqués par l'utilisateur. */
  unlockedKeys: string[];
}

/**
 * Vitrine des badges sur la page profil : débloqués en couleur, verrouillés
 * grisés avec leur description (objectif à atteindre). Itère sur le catalogue
 * `BADGES` (source de vérité = code).
 */
export function BadgeShelf({ unlockedKeys }: BadgeShelfProps) {
  const unlocked = new Set(unlockedKeys);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {BADGES.map((b) => {
        const has = unlocked.has(b.key);
        return (
          <div
            key={b.key}
            className={`flex items-start gap-3 rounded-xl border p-3 transition-colors ${
              has
                ? "border-white/15 bg-void-800/60"
                : "border-white/5 bg-void-900/40 opacity-60"
            }`}
            style={has ? { borderColor: `${b.color}55` } : undefined}
          >
            <span
              className={`text-2xl ${has ? "" : "grayscale"}`}
              aria-hidden
              style={has ? { filter: `drop-shadow(0 0 6px ${b.color}88)` } : undefined}
            >
              {b.iconKey}
            </span>
            <div className="min-w-0">
              <p
                className="truncate text-sm font-bold"
                style={{ color: has ? b.color : "#ffffff80" }}
              >
                {b.name}
              </p>
              <p className="mt-0.5 text-[11px] leading-snug text-white/45">
                {b.description}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
