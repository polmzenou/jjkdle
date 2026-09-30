"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CONSENT_REOPEN_EVENT,
  readConsent,
  writeConsent,
  type Consent,
} from "@/lib/consent";

/**
 * Bandeau de consentement aux cookies. Affiché tant qu'aucun choix n'est
 * mémorisé (cookie `cookie_consent`, 6 mois) — donc UNE fois, puis plus jamais
 * sauf si le joueur vide ses cookies ou clique « Gérer les cookies » (footer).
 *
 * Accepter et Refuser ont le même poids visuel (recommandation CNIL). Refuser
 * coupe la mesure d'audience Vercel (cf. AnalyticsGate) ; les cookies
 * essentiels (session, univers, admin) restent, ils ne sont pas soumis au choix.
 */
export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (readConsent() === null) setVisible(true);
    const reopen = () => setVisible(true);
    window.addEventListener(CONSENT_REOPEN_EVENT, reopen);
    return () => window.removeEventListener(CONSENT_REOPEN_EVENT, reopen);
  }, []);

  function choose(consent: Consent) {
    writeConsent(consent);
    setVisible(false);
  }

  const button =
    "flex-1 rounded-full border px-5 py-2.5 font-display text-xs font-black uppercase tracking-[0.2em] transition-colors sm:flex-none";

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          role="dialog"
          aria-live="polite"
          aria-label="Consentement aux cookies"
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", damping: 26, stiffness: 300 }}
          className="fixed inset-x-4 bottom-4 z-[130] mx-auto max-w-3xl rounded-2xl border border-white/10 bg-void-900/95 p-4 shadow-[0_24px_60px_-20px_rgb(0_0_0/0.8)] backdrop-blur-md sm:p-5"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex-1 text-sm text-white/70">
              <p className="font-display font-bold text-white">🍪 Cookies</p>
              <p className="mt-1 leading-snug">
                On utilise uniquement des cookies essentiels (connexion, univers
                choisi) et une mesure d&apos;audience anonyme, sans publicité ni
                traçage. Tu peux refuser la mesure d&apos;audience.
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={() => choose("refused")}
                className={`${button} border-white/15 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white`}
              >
                Refuser
              </button>
              <button
                type="button"
                onClick={() => choose("accepted")}
                className={`${button} border-domain bg-domain text-white hover:bg-domain-light`}
              >
                Accepter
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Bouton « Gérer les cookies » du footer : réaffiche le bandeau. */
export function CookieSettingsButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(CONSENT_REOPEN_EVENT))}
      className={className}
    >
      Gérer les cookies
    </button>
  );
}
