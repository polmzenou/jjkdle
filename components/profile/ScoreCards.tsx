import { MAX_SCORE, type LeaderboardGame, type UserScore } from "@/lib/leaderboard/store";
import { BOSSES } from "@/lib/games/draft/scoring";
import { getGrade } from "@/lib/scoring/grades";
import { GAMES } from "@/lib/games/registry";

/**
 * Grille des cartes de score d'un joueur (récap perso `/account` et profil
 * public `/u/[username]`). Purement présentationnel : le tri/agrégation est fait
 * en amont. Ne gère pas l'état vide → le caller décide quoi afficher si la liste
 * est vide.
 */
export function ScoreCards({ scores }: { scores: UserScore[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {scores.map((s) => {
        const meta = GAMES.find((g) => g.id === s.gameId);
        const title = meta?.title ?? s.gameId;
        const glyph = meta?.glyph ?? "🎮";
        const accent = meta?.accent ?? "#7c3aed";
        const max =
          s.gameId === "jujutsu-draft"
            ? BOSSES.length // 6 boss → "X / 6 ennemis"
            : MAX_SCORE[s.gameId as LeaderboardGame] ?? null;
        const pct = max ? Math.min(100, Math.round((s.best / max) * 100)) : null;
        const grade = s.gameId === "builder" ? getGrade(s.best) : null;

        return (
          <article
            key={s.gameId}
            className="relative overflow-hidden rounded-2xl border border-white/10 bg-void-800/60 p-5 backdrop-blur"
          >
            <span
              aria-hidden
              className="absolute inset-x-0 top-0 h-px"
              style={{
                background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
              }}
            />
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="flex items-center gap-2 font-display font-bold text-white">
                  <span aria-hidden>{glyph}</span>
                  <span className="truncate">{title}</span>
                </p>
                <p className="mt-1 text-xs uppercase tracking-wider text-white/45">
                  #{s.rank} sur {s.totalPlayers} joueur
                  {s.totalPlayers > 1 ? "s" : ""}
                  {s.gameId === "jjkdle" && " · du jour"}
                </p>
              </div>
              {grade && (
                <span
                  className="shrink-0 rounded-lg border px-2.5 py-1 font-display text-xs font-bold"
                  style={{
                    color: grade.color,
                    borderColor: `${grade.color}55`,
                    background: `${grade.color}14`,
                  }}
                >
                  {grade.label}
                </span>
              )}
            </div>

            <p className="mt-4 font-display text-3xl font-black" style={{ color: accent }}>
              {s.best.toLocaleString("fr-FR")}
              {max && (
                <span className="ml-1 align-middle text-sm font-bold text-white/35">
                  / {max.toLocaleString("fr-FR")}
                </span>
              )}
              {s.gameId === "jjkdle" && (
                <span className="ml-1 align-middle text-sm font-bold text-white/35">
                  essai{s.best > 1 ? "s" : ""}
                </span>
              )}
            </p>

            {pct !== null && (
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${pct}%`, background: accent }}
                />
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
