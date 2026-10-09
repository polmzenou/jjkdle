"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

/**
 * Cinématique d'ULTIME — le seul moment spectaculaire du jeu.
 *
 * Pourquoi elle existe : l'ultime est le retournement de situation de la Tour.
 * Sa jauge se remplit avec les dégâts SUBIS, il n'arrive donc que quand tout va
 * mal, une ou deux fois par run si le joueur va loin. Avant, il se résolvait
 * comme une frappe ordinaire — quelques nombres rouges, et c'était passé. Le
 * moment le plus rare du jeu était le moins visible.
 *
 * Elle SUSPEND l'horloge de lecture pendant sa durée (cf. `TowerCombat`). Ce
 * n'est pas un effet de bord à corriger mais le but : la simulation est déjà
 * entièrement résolue, la pause ne change donc rien à l'issue, et le joueur ne
 * perd aucune fenêtre — le moteur lui-même interdit aux ennemis de charger
 * pendant les cinq secondes qui suivent (`ULTIMATE.suppressTicks`).
 *
 * Aucun asset : l'animation est composée de dégradés et de traits, pour rester
 * juste dans les cinq univers et ne rien coûter au chargement.
 *
 * Elle couvre l'ÉCRAN ENTIER, pas seulement le cadre du combat : rendue dans
 * `<body>` (portail) en `position: fixed`, au-dessus de la nav et des bulles.
 * Le portail évite qu'un ancêtre animé en `transform` ne recale le `fixed` sur
 * lui. Aucun `backdrop-blur` (cf. règles anti-flash des overlays).
 */

/** Durée totale, en millisecondes. Doit rester lisible sans devenir pénible. */
export const CINEMATIC_MS = 1900;

export function DomainCinematic({
  caster,
  ultimateName,
  onDone,
}: {
  /** Nom du personnage qui déclenche. `null` = rien à l'écran. */
  caster: string | null;
  /** Nom de l'ultime dans l'univers courant. */
  ultimateName: string;
  onDone: () => void;
}) {
  // Une cinématique plein écran avec expansion et flash est exactement ce que
  // `prefers-reduced-motion` désigne. On garde le texte et la coupure — donc
  // l'information — en retirant le mouvement.
  const still = useReducedMotion();

  // Le portail a besoin de `document` : jamais au rendu serveur.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return createPortal(
    <AnimatePresence onExitComplete={onDone}>
      {caster && (
        <motion.div
          key="domain"
          className="pointer-events-none fixed inset-0 z-[140] flex items-center justify-center overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          // La cinématique se regarde, elle ne s'annonce pas : un lecteur
          // d'écran doit l'entendre une fois, pas suivre chaque image.
          role="status"
          aria-live="polite"
        >
          {/* Le territoire qui s'ouvre : un disque qui avale l'écran. Taillé en
              `vmax` pour couvrir aussi bien un écran large qu'un téléphone. */}
          <motion.div
            className="absolute left-1/2 top-1/2 aspect-square w-[20vmax] rounded-full bg-[radial-gradient(circle,var(--tw-gradient-stops))] from-cursed/90 via-domain/80 to-void-900"
            // Centrage via framer (`x`/`y`) et non `-translate-*` : framer
            // réécrit tout le `transform` en animant `scale`, ce qui annulait la
            // translation Tailwind et décentrait le disque.
            style={{ x: "-50%", y: "-50%" }}
            initial={still ? { scale: 12, opacity: 0.96 } : { scale: 0, opacity: 0.9 }}
            animate={{ scale: 12, opacity: 0.96 }}
            transition={{ duration: still ? 0 : 0.55, ease: "easeOut" }}
          />

          {/* Deux traits qui balaient : ils donnent l'échelle du disque, qui
              sinon grandirait sans qu'on voie à quelle vitesse. */}
          {!still && (
            <>
              <motion.div
                className="absolute h-px w-full bg-white/70"
                initial={{ scaleX: 0, opacity: 0 }}
                animate={{ scaleX: 1, opacity: [0, 1, 0] }}
                transition={{ duration: 0.7, delay: 0.15 }}
              />
              <motion.div
                className="absolute h-px w-full bg-cursed-light/80"
                initial={{ scaleX: 0, opacity: 0 }}
                animate={{ scaleX: 1, opacity: [0, 1, 0] }}
                transition={{ duration: 0.7, delay: 0.35 }}
              />
            </>
          )}

          <div className="relative flex flex-col items-center gap-2 px-6 text-center">
            <motion.p
              className="font-display text-sm font-bold uppercase tracking-[0.35em] text-white/70 sm:text-base"
              initial={still ? { opacity: 1 } : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: still ? 0 : 0.4, duration: 0.3 }}
            >
              {caster}
            </motion.p>

            <motion.p
              className="font-display text-4xl font-bold leading-tight text-white drop-shadow-[0_0_24px_rgba(255,255,255,0.45)] sm:text-6xl"
              initial={still ? { opacity: 1 } : { opacity: 0, scale: 1.35 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: still ? 0 : 0.5, duration: 0.35, ease: "easeOut" }}
            >
              {ultimateName}
            </motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
