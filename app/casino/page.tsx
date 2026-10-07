import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { COINFLIP_MULTIPLIER } from "@/lib/casino/coinflip";
import { getCasinoConfig } from "@/lib/casino/config";
import { SLOTS_RTP_PCT } from "@/lib/casino/slots";
import { prisma } from "@/lib/prisma";
import { CasinoHome, type CasinoGameTile } from "@/components/casino/CasinoHome";

/**
 * Accueil du CASINO : le choix du jeu.
 *
 * `force-dynamic` parce que la page dépend de la session (solde) et d'un flag
 * de config qui doit prendre effet immédiatement quand un admin coupe le casino.
 */
export const dynamic = "force-dynamic";

/**
 * Catalogue des jeux. En dur ici et non en base : un registre en base ne se
 * justifiera que le jour où l'admin devra en ajouter sans déploiement.
 */
const GAMES: CasinoGameTile[] = [
  {
    id: "blackjack",
    title: "Blackjack",
    description:
      "Battre le croupier sans dépasser 21. En solo, ou à une table jusqu'à 5 joueurs.",
    icon: "blackjack",
    href: "/casino/blackjack",
    status: "live",
    hint: "Solo ou 5 joueurs",
  },
  {
    id: "roulette",
    title: "Roulette",
    description:
      "Roulette européenne, vrai tapis : plein, cheval, carré, douzaines, rouge ou noir.",
    icon: "roulette",
    href: "/casino/roulette",
    status: "live",
  },
  {
    id: "slots",
    title: "Machine à sous",
    description: "Trois rouleaux, cinq lignes, un levier, et beaucoup d'espoir.",
    icon: "slots",
    href: "/casino/slots",
    status: "live",
  },
  {
    id: "coinflip",
    title: "Pile ou face",
    description:
      "Un camp, une pièce, une seconde. Tu doubles presque, ou tu perds tout.",
    icon: "coinflip",
    href: "/casino/coinflip",
    status: "live",
    hint: "Instantané",
  },
];

export default async function CasinoPage() {
  const [user, config] = await Promise.all([getCurrentUser(), getCasinoConfig()]);

  // Casino fermé : les ADMIN passent quand même, pour pouvoir tester avant de
  // rouvrir. Même règle que le mode maintenance (cf. UniverseChrome).
  if (!config.enabled && user?.role !== "ADMIN") {
    return <ClosedScreen />;
  }

  const profile = user
    ? await prisma.user.findUnique({
        where: { id: user.id },
        select: { coins: true },
      })
    : null;

  // La mise minimale est réglable en admin : les tuiles l'annoncent à jour
  // plutôt que de la répéter en dur dans le catalogue.
  const games = GAMES.map((game) => {
    if (game.id === "blackjack") {
      return { ...game, hint: `Mise min. ${config.minBet} · jusqu'à 5 joueurs` };
    }
    if (game.id === "roulette") {
      return { ...game, hint: `Mise min. ${config.minBet} · plein 35:1` };
    }
    if (game.id === "slots") {
      return {
        ...game,
        hint: `Mise min. ${config.minBet} · retour ${SLOTS_RTP_PCT.toLocaleString("fr-FR")} %`,
      };
    }
    if (game.id === "coinflip") {
      return {
        ...game,
        hint: `Mise min. ${config.minBet} · paie ${COINFLIP_MULTIPLIER.toLocaleString("fr-FR")}×`,
      };
    }
    return game;
  });

  return (
    <>
      {!config.enabled && (
        <div className="sticky top-[57px] z-30 bg-cursed px-4 py-1.5 text-center text-xs font-bold uppercase tracking-wide text-white">
          Casino fermé — visible par les admins uniquement
        </div>
      )}
      <CasinoHome
        games={games}
        coins={profile?.coins ?? 0}
        isLoggedIn={Boolean(user)}
      />
    </>
  );
}

/** Écran servi quand le casino est coupé depuis l'admin. */
function ClosedScreen() {
  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col items-center justify-center gap-5 px-6 text-center">
      <span
        aria-hidden
        className="grid h-16 w-16 place-items-center rounded-2xl border border-cursed/30 bg-cursed/10 text-3xl"
      >
        🚪
      </span>
      <h1 className="font-display text-3xl font-black uppercase tracking-tight text-white">
        Casino fermé
      </h1>
      <p className="leading-relaxed text-white/50">
        Les tables sont closes pour le moment. Reviens plus tard — tes coins
        t&apos;attendent.
      </p>
      <Link
        href="/"
        className="rounded-full border border-white/10 bg-white/[0.03] px-5 py-2.5 font-display text-sm font-bold uppercase tracking-wider text-white/60 transition hover:border-white/25 hover:text-white"
      >
        ← Retour aux univers
      </Link>
    </main>
  );
}
