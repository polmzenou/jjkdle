import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { isPusherConfigured } from "@/lib/pusher/server";
import { MpHubForm } from "@/components/multiplayer/MpHubForm";
import {
  createBattleLobbyAction,
  joinBattleLobbyAction,
} from "@/lib/games/battle/actions";

export const metadata: Metadata = {
  title: "JJK Random Battle — JJK Arcade",
  description:
    "Affronte un ami en 1v1 : drafte une équipe de 5 à tour de rôle, puis laisse parler le combat.",
};

export default async function BattleHubPage() {
  const user = await getCurrentUser();
  const pusherReady = isPusherConfigured();

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col px-6 py-14 sm:py-20">
      <header className="mx-auto max-w-2xl text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-1.5 text-xs font-medium uppercase tracking-[0.25em] text-cursed-light backdrop-blur">
          <span className="h-1.5 w-1.5 animate-glow-pulse rounded-full bg-cursed-light" />
          Multijoueur · 1v1
        </span>
        <h1 className="mt-5 font-display text-4xl font-bold tracking-tight text-white sm:text-5xl">
          JJK Random Battle
        </h1>
        <p className="mx-auto mt-4 max-w-md text-balance text-white/55">
          Lobby privé en 1v1, en temps réel. Drafte une carte tirée au hasard à
          tour de rôle, compose ton équipe de 5, puis affronte ton adversaire.
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
          <MpHubForm
            createAction={createBattleLobbyAction}
            joinAction={joinBattleLobbyAction}
            basePath="/games/battle"
          />
        )}
      </section>

      <footer className="mt-auto pt-16 text-center text-xs text-white/30">
        <Link href="/games" className="transition-colors hover:text-cursed-light">
          ← Retour aux jeux
        </Link>
      </footer>
    </main>
  );
}
