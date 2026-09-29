"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

/**
 * Écran d'ERREUR partagé (404, 403, 405).
 *
 * Deux sorties : « Retour » (page précédente) et « Accueil ». Sans action du
 * joueur, le retour se déclenche seul au bout de `REDIRECT_SECONDS` — annulable
 * par « Rester ici ».
 *
 * « Page précédente » n'a de sens que si elle est sur CE site : un lien externe
 * vers une URL morte ne doit pas renvoyer le visiteur chez le site d'origine, et
 * un onglet ouvert directement sur la 404 n'a pas d'historique. Dans ces deux
 * cas, on va à l'accueil.
 *
 * `homeHref` est calculé par l'appelant : l'accueil de l'univers courant
 * (`/jjk`) dans un anime, le hub (`/`) ailleurs.
 */

const REDIRECT_SECONDS = 10;

interface ErrorScreenProps {
  code: 403 | 404 | 405;
  title: string;
  message: string;
  homeHref: string;
  homeLabel?: string;
}

export function ErrorScreen({
  code,
  title,
  message,
  homeHref,
  homeLabel = "Accueil",
}: ErrorScreenProps) {
  const router = useRouter();
  const [seconds, setSeconds] = useState(REDIRECT_SECONDS);
  const [cancelled, setCancelled] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);

  useEffect(() => {
    let sameOrigin = false;
    try {
      sameOrigin =
        document.referrer !== "" &&
        new URL(document.referrer).origin === window.location.origin &&
        document.referrer !== window.location.href;
    } catch {
      sameOrigin = false;
    }
    setCanGoBack(sameOrigin && window.history.length > 1);
  }, []);

  const goBack = useCallback(() => {
    if (canGoBack) router.back();
    else router.push(homeHref);
  }, [canGoBack, homeHref, router]);

  useEffect(() => {
    if (cancelled) return;
    if (seconds <= 0) {
      goBack();
      return;
    }
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds, cancelled, goBack]);

  return (
    <main className="relative mx-auto flex min-h-[70vh] w-full max-w-2xl flex-col items-center justify-center px-6 py-20 text-center">
      <span
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-40 blur-3xl"
        style={{ background: "radial-gradient(circle, rgb(var(--color-domain) / 0.6), transparent 70%)" }}
      />

      <p className="relative font-display text-[7rem] font-black leading-none tracking-tighter text-transparent sm:text-[9rem]">
        <span
          className="bg-clip-text"
          style={{
            backgroundImage:
              "linear-gradient(180deg, rgb(var(--color-domain-light)), rgb(var(--color-domain)) 55%, rgb(var(--color-cursed)))",
          }}
        >
          {code}
        </span>
      </p>
      <h1 className="relative mt-4 font-display text-2xl font-black text-white sm:text-3xl">{title}</h1>
      <p className="relative mt-3 max-w-md text-sm leading-relaxed text-white/55">{message}</p>

      <div className="relative mt-8 flex flex-col items-center gap-3 sm:flex-row">
        <button
          type="button"
          onClick={goBack}
          className="rounded-full bg-domain px-7 py-3 font-display text-sm font-bold uppercase tracking-wider text-white shadow-glow transition-transform hover:scale-105"
        >
          ← {canGoBack ? "Page précédente" : homeLabel}
        </button>
        {canGoBack && (
          <Link
            href={homeHref}
            className="rounded-full border border-white/15 px-7 py-3 font-display text-sm font-bold uppercase tracking-wider text-white/75 transition-colors hover:border-domain-light/60 hover:text-white"
          >
            {homeLabel}
          </Link>
        )}
      </div>

      <p className="relative mt-6 text-xs text-white/40" aria-live="polite">
        {cancelled ? (
          "Redirection annulée."
        ) : (
          <>
            Redirection {canGoBack ? "vers la page précédente" : "vers l'accueil"} dans{" "}
            <span className="font-mono font-bold text-domain-light">{seconds}</span> s ·{" "}
            <button
              type="button"
              onClick={() => setCancelled(true)}
              className="font-bold text-white/60 underline-offset-4 hover:text-white hover:underline"
            >
              Rester ici
            </button>
          </>
        )}
      </p>
    </main>
  );
}
