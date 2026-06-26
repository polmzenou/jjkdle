import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { isPusherConfigured } from "@/lib/pusher/server";
import { MpHubForm } from "@/components/multiplayer/MpHubForm";

export const metadata: Metadata = {
  title: "Multijoueur — JJK Arcade",
  description:
    "Affronte tes amis en temps réel sur Build the Perfect Sorcerer : lobbys privés, jusqu'à 3 joueurs.",
};

export default async function MultiplayerHubPage() {
  const user = await getCurrentUser();
  const pusherReady = isPusherConfigured();

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col px-6 py-14 sm:py-20">
      <header className="mx-auto max-w-2xl text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-1.5 text-xs font-medium uppercase tracking-[0.25em] text-domain-light backdrop-blur">
          <span className="h-1.5 w-1.5 animate-glow-pulse rounded-full bg-domain-light" />
          Multijoueur · Builder
        </span>
        <h1 className="mt-5 font-display text-4xl font-bold tracking-tight text-white sm:text-5xl">
          Affronte tes amis
        </h1>
        <p className="mx-auto mt-4 max-w-md text-balance text-white/55">
          Lobby privé, jusqu'à 3 joueurs, en temps réel. Chacun compose son sorcier
          manche après manche — le meilleur build l'emporte.
        </p>
      </header>

      <section className="mt-12">
        {!pusherReady ? (
          <p className="mx-auto max-w-md rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-center text-sm text-amber-200">
            Le mode multijoueur n'est pas encore configuré sur ce serveur.
          </p>
        ) : !user ? (
          <div className="mx-auto max-w-md rounded-2xl border border-white/10 bg-void-800/60 p-8 text-center">
            <p className="text-white/70">
              Connecte-toi pour créer ou rejoindre un lobby.
            </p>
            <Link
              href="/login"
              className="mt-5 inline-block rounded-xl bg-domain px-6 py-3 font-display font-bold uppercase tracking-wide text-white shadow-glow transition-transform hover:scale-105 active:scale-95"
            >
              Se connecter
            </Link>
          </div>
        ) : (
          <MpHubForm />
        )}
      </section>

      <footer className="mt-auto pt-16 text-center text-xs text-white/30">
        <Link href="/games" className="transition-colors hover:text-domain-light">
          ← Retour aux jeux
        </Link>
      </footer>
    </main>
  );
}
