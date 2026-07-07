import Link from "next/link";
import { Logo } from "@/components/Logo";
import { GameShowcase } from "@/components/landing/GameShowcase";
import { MangaDecor } from "@/components/landing/MangaDecor";
import { GAMES } from "@/lib/games/registry";

const liveCount = GAMES.filter((g) => g.status !== "coming-soon").length;

const STATS = [
  { value: String(liveCount), label: "jeux jouables" },
  { value: "0", label: "compte requis" },
  { value: "S", label: "grade max à atteindre" },
];

/** Landing : présente le site, puis met en scène les jeux (showcase). */
export default function HomePage() {
  return (
    <main className="flex flex-col">
      {/* Couche décorative manga / JJK (kanji, ofuda, lignes de concentration) */}
      <MangaDecor />

      {/* ── Hero ── */}
      <section className="relative mx-auto flex w-full max-w-5xl flex-col items-center px-6 pb-24 pt-16 text-center sm:pt-24">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-1.5 text-xs font-medium uppercase tracking-[0.25em] text-domain-light backdrop-blur">
          <span className="h-1.5 w-1.5 animate-glow-pulse rounded-full bg-domain-light" />
          Jujutsu Kaisen · Fan Arcade
          <span aria-hidden className="font-display text-sm leading-none text-domain-light/70">
            呪
          </span>
        </span>

        <h1 className="mt-8 flex justify-center">
          {/* Texte lu par les moteurs/lecteurs d'écran ; le logo reste le visuel. */}
          <span className="sr-only">
            JJK Arcade — mini-jeux Jujutsu Kaisen gratuits
          </span>
          <Logo className="h-44 w-auto sm:h-60" glow />
        </h1>

        <p className="mx-auto mt-6 max-w-xl text-balance text-lg leading-relaxed text-white/60">
          La salle d'arcade maudite dédiée à{" "}
          <span className="text-white/80">Jujutsu Kaisen</span>. Une collection
          de mini-jeux nerveux pour tester ta connaissance de l'univers et
          libérer ton énergie maudite.
        </p>

        <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row">
          <Link
            href="/games"
            className="inline-flex items-center gap-2 rounded-full bg-domain px-7 py-3 font-display text-sm font-bold uppercase tracking-wider text-white shadow-glow transition-transform hover:scale-105"
          >
            Voir les jeux
            <span aria-hidden>→</span>
          </Link>
          <Link
            href="/games/builder"
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.03] px-7 py-3 font-display text-sm font-bold uppercase tracking-wider text-white/80 backdrop-blur transition-colors hover:border-white/30 hover:text-white"
          >
            Build the Perfect Sorcerer
          </Link>
        </div>

        {/* Bandeau de stats */}
        <div className="mt-16 grid w-full max-w-lg grid-cols-3 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/5">
          {STATS.map((stat) => (
            <div
              key={stat.label}
              className="flex flex-col items-center bg-void-900/60 px-3 py-5 backdrop-blur"
            >
              <span className="font-display text-3xl font-black text-domain-light">
                {stat.value}
              </span>
              <span className="mt-1 text-[11px] uppercase tracking-wider text-white/45">
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Showcase des jeux ── */}
      <section className="mx-auto w-full max-w-5xl px-6 py-16 sm:py-24">
        <div className="mb-14 text-center">
          <span className="mb-3 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.3em] text-domain-light/70">
            <span aria-hidden className="h-px w-6 bg-gradient-to-r from-transparent to-domain-light/60" />
            遊技 · Arcade
            <span aria-hidden className="h-px w-6 bg-gradient-to-l from-transparent to-domain-light/60" />
          </span>
          <h2 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Liste des jeux
          </h2>
          <p className="mx-auto mt-3 max-w-md text-white/55">
            Un aperçu de ce qui t'attend dans l'arcade.
          </p>
        </div>

        <GameShowcase />
      </section>

      {/* ── CTA final ── */}
      <section className="mx-auto w-full max-w-5xl px-6 pb-24">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-domain-dark/30 via-void-800/60 to-cursed-dark/20 px-8 py-14 text-center backdrop-blur">
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-50"
            style={{
              background:
                "radial-gradient(120% 100% at 50% 0%, rgba(124,58,237,0.45) 0%, transparent 60%)",
            }}
          />
          {/* Kanji filigrane "戦" (combat) */}
          <span
            aria-hidden
            className="pointer-events-none absolute -right-4 -top-10 select-none font-display font-black leading-none text-white/[0.04] sm:-right-2"
            style={{ fontSize: "clamp(9rem, 22vw, 18rem)" }}
          >
            戦
          </span>
          <h2 className="relative font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Prêt à libérer ton énergie maudite ?
          </h2>
          <p className="relative mx-auto mt-3 max-w-md text-white/60">
            Choisis ton jeu et lance-toi. Aucun compte, juste ton score à
            battre.
          </p>
          <Link
            href="/games"
            className="relative mt-8 inline-flex items-center gap-2 rounded-full bg-domain px-8 py-3.5 font-display text-sm font-bold uppercase tracking-wider text-white shadow-glow transition-transform hover:scale-105"
          >
            Entrer dans l'arcade
            <span aria-hidden>→</span>
          </Link>
        </div>
      </section>

      <footer className="border-t border-white/5 py-8 text-center text-xs text-white/30">
        Fan-projet non officiel · aucun asset copyrighté.
      </footer>
    </main>
  );
}
