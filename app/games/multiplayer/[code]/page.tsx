import { notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { isPusherConfigured } from "@/lib/pusher/server";
import { loadLobbyView } from "@/lib/multiplayer/load";
import { MultiplayerLobby } from "@/components/multiplayer/MultiplayerLobby";

interface PageProps {
  params: Promise<{ code: string }>;
}

export default async function LobbyPage({ params }: PageProps) {
  const { code } = await params;
  const view = await loadLobbyView(code.toUpperCase());
  if (!view) notFound();

  const user = await getCurrentUser();
  if (!user) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
        <p className="text-white/70">Connecte-toi pour rejoindre ce lobby.</p>
        <Link
          href="/login"
          className="mt-5 rounded-xl bg-domain px-6 py-3 font-display font-bold uppercase tracking-wide text-white shadow-glow transition-transform hover:scale-105 active:scale-95"
        >
          Se connecter
        </Link>
      </main>
    );
  }

  return (
    <MultiplayerLobby
      initialLobby={view.lobby}
      categories={view.categories}
      roster={view.roster}
      currentUserId={user.id}
      pusherReady={isPusherConfigured()}
    />
  );
}
