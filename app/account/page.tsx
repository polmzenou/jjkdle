import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import {
  getUserScores,
  MAX_SCORE,
  type LeaderboardGame,
} from "@/lib/leaderboard/store";
import { getUserDraftScore } from "@/lib/games/draft/store";
import { BOSSES } from "@/lib/games/draft/scoring";
import { getGrade } from "@/lib/scoring/grades";
import { GAMES } from "@/lib/games/registry";
import { AccountForms } from "./AccountForms";

export const metadata: Metadata = {
  title: "Mon compte — JJK Arcade",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Scores classiques (table Score) + score Draft (table dédiée).
  const [classicScores, draftScore] = await Promise.all([
    getUserScores(user.id),
    getUserDraftScore(user.id),
  ]);
  const scores = draftScore ? [...classicScores, draftScore] : classicScores;

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12 sm:py-16">
      <header className="mb-10">
        <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.3em] text-domain-light/70">
          <span aria-hidden className="h-px w-6 bg-gradient-to-r from-transparent to-domain-light/60" />
          管理 · Mon compte
        </span>
        <h1 className="mt-3 font-display text-3xl font-black tracking-tight text-white sm:text-4xl">
          Salut, {user.username}
        </h1>
        <p className="mt-2 text-white/55">
          Retrouve ici tes scores et gère les infos de ton compte.
        </p>
      </header>

      {/* ── Récap des scores ── */}
      <section className="mb-12">
        <h2 className="mb-4 font-display text-lg font-bold uppercase tracking-wider text-white/80">
          🏆 Mes scores
        </h2>

        {scores.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-void-800/60 px-6 py-10 text-center backdrop-blur">
            <p className="text-white/55">
              Tu n'as pas encore de score enregistré.
            </p>
            <Link
              href="/games"
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-domain px-6 py-2.5 font-display text-sm font-bold uppercase tracking-wider text-white shadow-glow transition-transform hover:scale-105"
            >
              Jouer maintenant
              <span aria-hidden>→</span>
            </Link>
          </div>
        ) : (
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
        )}
      </section>

      {/* ── Infos & édition ── */}
      <section>
        <h2 className="mb-4 font-display text-lg font-bold uppercase tracking-wider text-white/80">
          ⚙️ Mon compte
        </h2>

        <div className="mb-5 rounded-2xl border border-white/10 bg-void-800/60 p-5 backdrop-blur">
          <p className="text-xs uppercase tracking-wider text-white/45">
            Adresse email
          </p>
          <p className="mt-1 font-medium text-white">{user.email}</p>
          <p className="mt-1 text-xs text-white/35">
            L'email n'est pas modifiable.
          </p>
        </div>

        <AccountForms currentUsername={user.username} />
      </section>
    </main>
  );
}
