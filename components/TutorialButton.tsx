"use client";

import { useState, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { GAMES } from "@/lib/games/registry";

/** Une étape du tutoriel : titre, kanji décoratif et contenu. */
type Step = {
  /** Petit label en capitales au-dessus du titre. */
  eyebrow: string;
  /** Kanji affiché en filigrane derrière le contenu. */
  kanji: string;
  title: string;
  /** Couleur d'accent de l'étape (hex). */
  accent: string;
  /** Contenu riche de l'étape. */
  body: React.ReactNode;
};

const STEPS: Step[] = [
  {
    eyebrow: "呪 · Bienvenue",
    kanji: "呪",
    title: "Bienvenue dans l'arcade Jujutsu Kaisen",
    accent: "#7c3aed",
    body: (
      <p className="text-white/70">
        JJK Arcade est une salle de mini-jeux dédiée à l'univers{" "}
        <span className="text-white">Jujutsu Kaisen</span>. Enchaîne les jeux,
        grimpe les classements, gagne de l'expérience et débloque des
        cosmétiques. Ce petit guide te montre comment tout fonctionne — clique
        sur <span className="text-domain-light">Suivant</span> pour continuer.
      </p>
    ),
  },
  {
    eyebrow: "遊技 · Les jeux",
    kanji: "技",
    title: "Les jeux de l'arcade",
    accent: "#a78bfa",
    body: (
      <ul className="space-y-3">
        {GAMES.filter((g) => g.status !== "coming-soon").map((g) => (
          <li
            key={g.id}
            className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3"
          >
            <span
              aria-hidden
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-lg"
              style={{ background: `${g.accent ?? "#7c3aed"}22` }}
            >
              {g.glyph}
            </span>
            <div className="min-w-0">
              <p className="font-display text-sm font-bold text-white">
                {g.title}
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-white/55">
                {g.description}
              </p>
            </div>
          </li>
        ))}
      </ul>
    ),
  },
  {
    eyebrow: "経験 · Expérience",
    kanji: "経",
    title: "Gagner de l'expérience (XP)",
    accent: "#38bdf8",
    body: (
      <div className="space-y-3 text-white/70">
        <p>
          Chaque partie te rapporte de l'<span className="text-white">XP</span>.
          Plus tu joues — et plus ton score est élevé — plus tu en gagnes.
        </p>
        <ul className="space-y-2">
          <li className="flex items-center gap-2">
            <span aria-hidden>🎮</span> Terminer une partie rapporte de l'XP de
            base.
          </li>
          <li className="flex items-center gap-2">
            <span aria-hidden>🏆</span> Battre ton record ou viser un grade élevé
            donne un bonus.
          </li>
          <li className="flex items-center gap-2">
            <span aria-hidden>📅</span> Les défis quotidiens (comme JJKdle)
            offrent un gain supplémentaire chaque jour.
          </li>
        </ul>
      </div>
    ),
  },
  {
    eyebrow: "等級 · Niveaux",
    kanji: "級",
    title: "Monter en niveau",
    accent: "#f59e0b",
    body: (
      <div className="space-y-3 text-white/70">
        <p>
          L'XP accumulée fait grimper ton <span className="text-white">niveau</span>,
          calqué sur les grades des exorcistes : du{" "}
          <span className="text-grade-4minus">Grade 4−</span> jusqu'au{" "}
          <span className="font-bold text-grade-s">Grade S</span>.
        </p>
        <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
          {[
            ["Grade 4−", "#6b7280"],
            ["Grade 3", "#38bdf8"],
            ["Grade 2", "#a78bfa"],
            ["Grade 1", "#f59e0b"],
            ["Grade S", "#f43f5e"],
          ].map(([label, color]) => (
            <span
              key={label}
              className="rounded-md border px-2 py-1"
              style={{ color, borderColor: `${color}55`, background: `${color}14` }}
            >
              {label}
            </span>
          ))}
        </div>
        <p>
          Chaque niveau franchi renforce ton statut dans l'arcade et débloque de
          nouvelles récompenses.
        </p>
      </div>
    ),
  },
  {
    eyebrow: "装飾 · Cosmétiques",
    kanji: "飾",
    title: "Débloquer des cosmétiques",
    accent: "#f43f5e",
    body: (
      <div className="space-y-3 text-white/70">
        <p>
          En montant de niveau, tu débloques des{" "}
          <span className="text-white">cosmétiques</span> pour personnaliser ton
          profil :
        </p>
        <ul className="space-y-2">
          <li className="flex items-center gap-2">
            <span aria-hidden>🎴</span> Bordures et thèmes de carte de joueur.
          </li>
          <li className="flex items-center gap-2">
            <span aria-hidden>🏷️</span> Badges et titres affichés à côté de ton
            pseudo.
          </li>
          <li className="flex items-center gap-2">
            <span aria-hidden>✨</span> Effets visuels exclusifs aux grades les
            plus élevés.
          </li>
        </ul>
        <p>
          Purement esthétique : aucun avantage en jeu, juste de quoi frimer dans
          les classements. À toi de jouer !
        </p>
      </div>
    ),
  },
];

/**
 * Bouton flottant circulaire (bas-droite) ouvrant un tutoriel pas-à-pas.
 *
 * Monté dans le layout racine ; client-only. Le tutoriel se parcourt avec
 * Suivant / Précédent, se ferme avec la croix, l'arrière-plan ou Échap.
 */
export function TutorialButton() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  const close = useCallback(() => setOpen(false), []);
  const next = useCallback(
    () => setStep((s) => Math.min(s + 1, STEPS.length - 1)),
    [],
  );
  const prev = useCallback(() => setStep((s) => Math.max(s - 1, 0)), []);

  // Repart de la première étape à chaque ouverture.
  const openTuto = () => {
    setStep(0);
    setOpen(true);
  };

  // Raccourcis clavier + verrou du scroll quand le modal est ouvert.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, close, next, prev]);

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <>
      {/* ── Bouton flottant ── */}
      <button
        type="button"
        onClick={openTuto}
        aria-label="Ouvrir le tutoriel"
        title="Comment ça marche ?"
        className="fixed bottom-5 right-5 z-40 grid h-14 w-14 place-items-center rounded-full bg-domain font-display text-2xl font-black text-white shadow-glow ring-1 ring-white/20 transition-transform hover:scale-110 active:scale-95 sm:bottom-6 sm:right-6"
      >
        <span aria-hidden className="animate-glow-pulse">
          ?
        </span>
      </button>

      {/* ── Modals tutoriel ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="tuto-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
            className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-void-900/80 p-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-label="Tutoriel JJK Arcade"
          >
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -16, scale: 0.97 }}
              transition={{ duration: 0.28 }}
              onClick={(e) => e.stopPropagation()}
              className="relative my-auto w-full max-w-lg overflow-hidden rounded-3xl border border-white/10 bg-void-800/95 p-7 backdrop-blur sm:p-8"
            >
              {/* Liseré d'accent */}
              <span
                aria-hidden
                className="absolute inset-x-0 top-0 h-px"
                style={{
                  background: `linear-gradient(90deg, transparent, ${current.accent}, transparent)`,
                }}
              />
              {/* Kanji filigrane */}
              <span
                aria-hidden
                className="pointer-events-none absolute -right-3 -top-6 select-none font-display font-black leading-none text-white/[0.04]"
                style={{ fontSize: "clamp(7rem, 18vw, 11rem)" }}
              >
                {current.kanji}
              </span>

              {/* Bouton fermer */}
              <button
                type="button"
                onClick={close}
                aria-label="Fermer le tutoriel"
                className="absolute right-4 top-4 z-10 grid h-8 w-8 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-white/60 transition-colors hover:text-white"
              >
                ✕
              </button>

              {/* En-tête */}
              <p
                className="relative text-xs font-bold uppercase tracking-[0.3em]"
                style={{ color: current.accent }}
              >
                {current.eyebrow}
              </p>
              <h2 className="relative mt-2 font-display text-2xl font-black tracking-tight text-white sm:text-3xl">
                {current.title}
              </h2>

              {/* Contenu */}
              <div className="relative mt-5 text-sm leading-relaxed">
                {current.body}
              </div>

              {/* Indicateurs de progression */}
              <div className="relative mt-7 flex items-center justify-center gap-2">
                {STEPS.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setStep(i)}
                    aria-label={`Aller à l'étape ${i + 1}`}
                    className="h-1.5 rounded-full transition-all"
                    style={{
                      width: i === step ? 24 : 8,
                      background:
                        i === step ? current.accent : "rgba(255,255,255,0.2)",
                    }}
                  />
                ))}
              </div>

              {/* Navigation */}
              <div className="relative mt-6 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={prev}
                  disabled={step === 0}
                  className="rounded-full border border-white/15 bg-white/[0.03] px-5 py-2.5 text-sm font-medium text-white/70 transition-colors enabled:hover:text-white disabled:opacity-30"
                >
                  Précédent
                </button>
                {isLast ? (
                  <button
                    type="button"
                    onClick={close}
                    className="rounded-full bg-domain px-6 py-2.5 font-display text-sm font-bold uppercase tracking-wider text-white shadow-glow transition-transform hover:scale-105 active:scale-95"
                  >
                    C'est parti !
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={next}
                    className="inline-flex items-center gap-2 rounded-full bg-domain px-6 py-2.5 font-display text-sm font-bold uppercase tracking-wider text-white shadow-glow transition-transform hover:scale-105 active:scale-95"
                  >
                    Suivant
                    <span aria-hidden>→</span>
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
