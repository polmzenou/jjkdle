"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { CoinIcon } from "@/components/progress/CoinWallet";
import {
  COINFLIP_MULTIPLIER,
  type CoinSide,
  type CoinflipResult,
} from "@/lib/casino/coinflip";
import { flipCoinAction } from "@/lib/casino/coinflip-actions";
import { BetPad } from "./BetPad";

/**
 * PILE OU FACE.
 *
 * Le serveur est autoritaire, exactement comme à la table de blackjack : ce
 * composant n'a AUCUN générateur aléatoire. La pièce qui tourne à l'écran est
 * jouée pendant l'attente de la réponse, et ne s'immobilise que sur le camp
 * renvoyé par `flipCoinAction` — jamais l'inverse. Un joueur qui inspecterait le
 * JavaScript de la page n'y trouverait pas le résultat, parce qu'il n'y est pas.
 *
 * ── Le temps de vol ──────────────────────────────────────────────────────
 * L'action et l'animation partent ENSEMBLE et sont attendues ensemble
 * (`Promise.all`). L'aller-retour serveur dure entre 50 ms et 2 s selon le
 * réseau ; sans plancher, un lancer rapide afficherait le résultat avant que la
 * pièce ait fait un tour, et le jeu perdrait tout son suspense. Le plancher ne
 * ralentit donc que les réponses rapides : sur un réseau lent, c'est la réponse
 * qui commande, et la pièce tourne simplement plus longtemps.
 */

/** Durée minimale du vol de la pièce, avant révélation. */
const SPIN_MS = 900;
/** Tours effectués pendant le vol (rotations complètes). */
const SPIN_TURNS = 6;
/** Lancers conservés dans la frise d'historique. */
const HISTORY_MAX = 14;

const SIDE_LABEL: Record<CoinSide, string> = { PILE: "Pile", FACE: "Face" };
const SIDE_SYMBOL: Record<CoinSide, string> = { PILE: "♠", FACE: "♥" };

interface SessionStats {
  flips: number;
  wins: number;
  streak: number;
  bestStreak: number;
  net: number;
}

const EMPTY_STATS: SessionStats = {
  flips: 0,
  wins: 0,
  streak: 0,
  bestStreak: 0,
  net: 0,
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Angle de repos de la pièce pour un camp donné, atteint en continuant le
 * mouvement (jamais en revenant en arrière : une pièce ne se dévisse pas).
 * `PILE` regarde le joueur à 0°, `FACE` à 180° — d'où le modulo.
 */
function restingRotation(from: number, side: CoinSide): number {
  const want = side === "FACE" ? 180 : 0;
  const target = from + 360; // un tour de plus pour finir le geste
  return target + (((want - (target % 360)) % 360) + 360) % 360;
}

export function CoinflipGame({
  initialCoins,
  minBet,
}: {
  initialCoins: number;
  minBet: number;
}) {
  const router = useRouter();

  const [coins, setCoins] = useState(initialCoins);
  const [side, setSide] = useState<CoinSide>("PILE");
  const [amount, setAmount] = useState(() =>
    Math.min(Math.max(minBet, 100), Math.max(initialCoins, minBet)),
  );

  const [flipping, setFlipping] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<CoinflipResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<CoinflipResult[]>([]);
  const [stats, setStats] = useState<SessionStats>(EMPTY_STATS);

  // Le solde de la nav (rendu côté serveur dans le layout) ne bouge pas pendant
  // la session de jeu : on le remet d'aplomb en partant, plutôt qu'à chaque
  // lancer. Un `router.refresh()` par manche referait tout l'arbre RSC pour un
  // seul nombre, sur un jeu où l'on enchaîne un lancer toutes les trois secondes.
  useEffect(() => () => router.refresh(), [router]);

  // `flipping` est lu dans le callback asynchrone : un ref évite de recréer le
  // callback (et donc de le voir capturer un état périmé) à chaque lancer.
  const busy = useRef(false);

  const flip = useCallback(
    (bet: number) => {
      if (busy.current) return;
      busy.current = true;

      setError(null);
      setResult(null);
      setFlipping(true);

      const spinTarget = rotation + 360 * SPIN_TURNS;
      setRotation(spinTarget);

      void (async () => {
        const [response] = await Promise.all([
          flipCoinAction(bet, side),
          wait(SPIN_MS),
        ]);

        setFlipping(false);
        busy.current = false;

        if (!response.ok) {
          // Rien n'a été joué : la pièce se repose à plat sur le camp choisi.
          setRotation(restingRotation(spinTarget, side));
          setError(response.error);
          return;
        }

        const { flip: outcome, coins: balance } = response;
        setRotation(restingRotation(spinTarget, outcome.landed));
        setResult(outcome);
        setCoins(balance);
        setHistory((past) => [outcome, ...past].slice(0, HISTORY_MAX));
        setStats((past) => {
          const streak = outcome.won ? past.streak + 1 : 0;
          return {
            flips: past.flips + 1,
            wins: past.wins + (outcome.won ? 1 : 0),
            streak,
            bestStreak: Math.max(past.bestStreak, streak),
            net: past.net + outcome.net,
          };
        });
      })();
    },
    [rotation, side],
  );

  const needsAuth = error !== null && error.startsWith("Connecte-toi");

  return (
    <main className="mx-auto w-full max-w-3xl px-6 pb-24 pt-6 sm:pt-10">
      {/* Sortie de table, au même endroit qu'au blackjack : en haut à droite. */}
      <div className="mb-4 flex justify-end">
        <Link
          href="/casino"
          className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-white/55 transition hover:border-cursed/40 hover:text-cursed-light"
        >
          Quitter la table
        </Link>
      </div>

      <motion.header
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="text-center"
      >
        <h1 className="font-display text-4xl font-black uppercase tracking-tight text-white sm:text-5xl">
          Pile ou face
        </h1>
        <p className="mx-auto mt-3 max-w-md text-balance leading-relaxed text-white/55">
          Un camp, une pièce, une seconde. Tu doubles presque, ou tu perds tout.
        </p>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-[11px] font-semibold uppercase tracking-wider">
          <Rule>Un gain paie {COINFLIP_MULTIPLIER.toLocaleString("fr-FR")}×</Rule>
          <Rule>Pièce équilibrée 50 / 50</Rule>
          <Rule>Mise min. {minBet.toLocaleString("fr-FR")}</Rule>
        </div>

        <p className="mt-5 flex items-center justify-center gap-2 text-sm text-white/45">
          En poche
          <motion.span
            key={coins}
            initial={{ scale: 1.18 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="flex items-center gap-1.5 font-black tabular-nums text-amber-300"
          >
            <CoinIcon className="h-4 w-4" />
            {coins.toLocaleString("fr-FR")}
          </motion.span>
        </p>
      </motion.header>

      {/* ── La pièce ── */}
      <section className="mt-10 flex flex-col items-center">
        <Coin rotation={rotation} flipping={flipping} />

        <div className="mt-6 h-24 w-full max-w-lg">
          <AnimatePresence mode="wait">
            {flipping ? (
              <motion.p
                key="flying"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center font-display text-sm font-bold uppercase tracking-[0.25em] text-white/40"
              >
                La pièce est en l&apos;air…
              </motion.p>
            ) : result ? (
              <ResultBanner
                key={`r-${stats.flips}`}
                result={result}
                streak={stats.streak}
                canReplay={result.payout > 0 && result.payout <= coins}
                onDismiss={() => setResult(null)}
                onReplayWithWinnings={() => {
                  setAmount(result.payout);
                  setResult(null);
                }}
              />
            ) : (
              <motion.p
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center text-sm text-white/40"
              >
                Choisis ton camp, pose ta mise.
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* ── Choix du camp ── */}
      <div className="mt-2 grid grid-cols-2 gap-3 sm:mx-auto sm:max-w-lg">
        {(["PILE", "FACE"] as const).map((option) => (
          <SideButton
            key={option}
            side={option}
            selected={side === option}
            disabled={flipping}
            onSelect={() => setSide(option)}
          />
        ))}
      </div>

      {/* ── Mise ── */}
      <div className="mt-6 flex flex-col items-center">
        <BetPad
          coins={coins}
          minBet={minBet}
          disabled={flipping}
          pending={flipping}
          cta="Lancer"
          amount={amount}
          onAmountChange={setAmount}
          onBet={flip}
        />
      </div>

      {error && (
        <p className="mx-auto mt-5 max-w-lg rounded-xl border border-cursed/40 bg-cursed/10 px-4 py-3 text-center text-sm text-cursed-light">
          {error}
          {needsAuth && (
            <>
              {" "}
              <Link href="/login" className="font-bold underline">
                Se reconnecter
              </Link>
            </>
          )}
        </p>
      )}

      {/* ── Frise des derniers lancers ── */}
      {history.length > 0 && (
        <section className="mt-12">
          <h2 className="text-center font-display text-xs font-black uppercase tracking-[0.25em] text-white/35">
            Derniers lancers
          </h2>
          <ul className="mt-4 flex flex-wrap items-center justify-center gap-2">
            {history.map((past, index) => (
              <motion.li
                key={`${stats.flips - index}`}
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                title={`${SIDE_LABEL[past.landed]} — ${past.net >= 0 ? "+" : ""}${past.net.toLocaleString("fr-FR")}`}
                className={`grid h-9 w-9 place-items-center rounded-full border text-sm font-black ${
                  past.won
                    ? "border-emerald-400/50 bg-emerald-400/15 text-emerald-300"
                    : "border-white/10 bg-white/[0.03] text-white/30"
                }`}
              >
                {SIDE_SYMBOL[past.landed]}
              </motion.li>
            ))}
          </ul>

          <div className="mx-auto mt-6 grid max-w-lg grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Lancers" value={stats.flips.toLocaleString("fr-FR")} />
            <Stat label="Gagnés" value={stats.wins.toLocaleString("fr-FR")} />
            <Stat
              label="Meilleure série"
              value={stats.bestStreak.toLocaleString("fr-FR")}
            />
            <Stat
              label="Bilan"
              value={`${stats.net > 0 ? "+" : ""}${stats.net.toLocaleString("fr-FR")}`}
              tone={stats.net >= 0 ? "good" : "bad"}
            />
          </div>
          <p className="mt-3 text-center text-[11px] text-white/25">
            Compteurs de cette session seulement — ils repartent de zéro au
            rechargement. Les coins, eux, sont bien réels.
          </p>
        </section>
      )}

      <p className="mt-12 text-center text-xs text-white/30">
        Chaque lancer est indépendant : la pièce n&apos;a aucune mémoire des
        précédents.
      </p>
    </main>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Pièce
// ──────────────────────────────────────────────────────────────────────────

/**
 * La pièce, en volume et 100 % CSS (aucune image, comme les cartes).
 *
 * Les deux faces sont superposées dans un conteneur `preserve-3d`, l'une
 * retournée de 180°, chacune en `backface-visibility: hidden` : c'est la
 * rotation du conteneur qui décide de celle qu'on voit, donc l'affichage ne peut
 * pas contredire l'angle de repos calculé à partir de la réponse serveur.
 */
function Coin({ rotation, flipping }: { rotation: number; flipping: boolean }) {
  return (
    <div
      className="h-40 w-40 sm:h-48 sm:w-48"
      style={{ perspective: 1100 }}
      aria-hidden
    >
      <motion.div
        className="relative h-full w-full"
        style={{ transformStyle: "preserve-3d" }}
        animate={{
          rotateY: rotation,
          y: flipping ? [0, -34, 0] : 0,
          scale: flipping ? [1, 1.06, 1] : 1,
        }}
        transition={{
          rotateY: flipping
            ? { duration: SPIN_MS / 1000, ease: "linear" }
            : { duration: 0.62, ease: [0.16, 1, 0.3, 1] },
          y: { duration: SPIN_MS / 1000, ease: "easeInOut" },
          scale: { duration: SPIN_MS / 1000, ease: "easeInOut" },
        }}
      >
        <CoinFace side="PILE" />
        <CoinFace side="FACE" flipped />
      </motion.div>
    </div>
  );
}

/** Rendu d'une face. `flipped` = la face du dessous, tournée de 180°. */
function CoinFace({ side, flipped = false }: { side: CoinSide; flipped?: boolean }) {
  const gold = side === "PILE";

  return (
    <div
      className="absolute inset-0 grid place-items-center rounded-full"
      style={{
        backfaceVisibility: "hidden",
        WebkitBackfaceVisibility: "hidden",
        transform: flipped ? "rotateY(180deg)" : undefined,
        background: gold
          ? "radial-gradient(circle at 32% 26%, #fef3c7 0%, #fbbf24 38%, #b45309 72%, #78350f 100%)"
          : "radial-gradient(circle at 32% 26%, #d1fae5 0%, #34d399 38%, #0f766e 72%, #064e3b 100%)",
        boxShadow:
          "inset 0 -8px 18px rgb(0 0 0 / 0.45), inset 0 8px 16px rgb(255 255 255 / 0.35), 0 24px 45px -20px rgb(0 0 0 / 0.9)",
      }}
    >
      {/* Moletage de la tranche : un peigne conique masqué en anneau. */}
      <span
        className="absolute inset-0 rounded-full opacity-45"
        style={{
          background:
            "repeating-conic-gradient(from 0deg, rgb(0 0 0 / 0.5) 0deg 2deg, transparent 2deg 5deg)",
          maskImage: "radial-gradient(circle, transparent 84%, #000 86%)",
          WebkitMaskImage: "radial-gradient(circle, transparent 84%, #000 86%)",
        }}
      />
      {/* Champ frappé */}
      <span className="absolute inset-[13%] rounded-full border border-black/20 shadow-[inset_0_2px_6px_rgb(0_0_0/0.35)]" />

      <span
        className={`relative flex flex-col items-center leading-none ${
          gold ? "text-amber-950/80" : "text-emerald-950/80"
        }`}
      >
        <span className="text-5xl sm:text-6xl">{SIDE_SYMBOL[side]}</span>
        <span className="mt-1.5 font-display text-xs font-black uppercase tracking-[0.3em]">
          {SIDE_LABEL[side]}
        </span>
      </span>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Sous-composants d'interface
// ──────────────────────────────────────────────────────────────────────────

function SideButton({
  side,
  selected,
  disabled,
  onSelect,
}: {
  side: CoinSide;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={selected}
      className={`flex items-center justify-center gap-3 rounded-2xl border px-5 py-4 transition disabled:cursor-not-allowed disabled:opacity-40 ${
        selected
          ? "border-cursed/70 bg-cursed/15 shadow-[0_0_25px_-8px_rgb(var(--color-cursed))]"
          : "border-white/10 bg-white/[0.02] hover:border-white/30"
      }`}
    >
      <span
        aria-hidden
        className={`grid h-9 w-9 place-items-center rounded-full text-lg ${
          side === "PILE"
            ? "bg-gradient-to-br from-amber-200 to-amber-700 text-amber-950"
            : "bg-gradient-to-br from-emerald-200 to-emerald-800 text-emerald-950"
        } ${selected ? "" : "opacity-60"}`}
      >
        {SIDE_SYMBOL[side]}
      </span>
      <span
        className={`font-display text-lg font-black uppercase tracking-wider ${
          selected ? "text-white" : "text-white/50"
        }`}
      >
        {SIDE_LABEL[side]}
      </span>
    </button>
  );
}

/**
 * L'annonce de fin de manche. Elle est OPAQUE et se pose par-dessus le reste de
 * la table : c'est le seul moment où l'on veut que le joueur regarde un seul
 * endroit. Elle se retire à la croix, en remisant ses gains, ou toute seule au
 * lancer suivant — jamais sur un minuteur, pour ne pas escamoter un résultat que
 * le joueur n'aurait pas encore lu.
 */
function ResultBanner({
  result,
  streak,
  canReplay,
  onDismiss,
  onReplayWithWinnings,
}: {
  result: CoinflipResult;
  streak: number;
  /** Le montant gagné est remisable en l'état (il vient d'être crédité). */
  canReplay: boolean;
  onDismiss: () => void;
  onReplayWithWinnings: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      role="status"
      className={`relative flex flex-col items-center gap-2 rounded-2xl border bg-void-900 px-5 py-4 pt-5 text-center shadow-[0_30px_70px_-25px_rgb(0_0_0/0.95)] ${
        result.won
          ? "border-emerald-400/45 shadow-emerald-400/5"
          : "border-cursed/40"
      }`}
    >
      {/* Teinte du résultat, posée SUR le fond opaque (et non à sa place) : le
          panneau garde sa couleur sans laisser voir la table au travers. */}
      <span
        aria-hidden
        className={`pointer-events-none absolute inset-0 rounded-2xl ${
          result.won ? "bg-emerald-400/10" : "bg-cursed/[0.07]"
        }`}
      />

      <button
        type="button"
        onClick={onDismiss}
        aria-label="Fermer"
        className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full text-lg leading-none text-white/35 transition hover:bg-white/10 hover:text-white"
      >
        ×
      </button>

      <p
        className={`relative font-display text-xl font-black uppercase tracking-wider ${
          result.won ? "text-emerald-300" : "text-white/70"
        }`}
      >
        {SIDE_LABEL[result.landed]} !{" "}
        <span className="text-white/45">
          {result.won ? "Bien vu." : `Tu avais dit ${SIDE_LABEL[result.side].toLowerCase()}.`}
        </span>
      </p>

      <p
        className={`relative flex items-center gap-1.5 font-display text-2xl font-black tabular-nums ${
          result.won ? "text-amber-300" : "text-cursed-light"
        }`}
      >
        <CoinIcon className="h-5 w-5" />
        {result.net > 0 ? "+" : ""}
        {result.net.toLocaleString("fr-FR")}
      </p>

      {result.won && streak >= 2 && (
        <p className="relative text-xs font-bold uppercase tracking-wider text-amber-300/80">
          🔥 Série de {streak}
        </p>
      )}

      {result.won && canReplay && (
        <button
          type="button"
          onClick={onReplayWithWinnings}
          className="relative mt-1 rounded-full border border-amber-400/40 bg-amber-400/10 px-4 py-1.5 text-[11px] font-black uppercase tracking-wider text-amber-300 transition hover:bg-amber-400/20"
        >
          Remiser les {result.payout.toLocaleString("fr-FR")} gagnés
        </button>
      )}
    </motion.div>
  );
}

function Rule({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-white/45">
      {children}
    </span>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "good" | "bad";
}) {
  const color =
    tone === "good"
      ? "text-emerald-300"
      : tone === "bad"
        ? "text-cursed-light"
        : "text-white";
  return (
    <div className="rounded-xl border border-white/[0.08] bg-void-900/50 px-3 py-2.5 text-center">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
        {label}
      </p>
      <p className={`mt-1 font-display text-lg font-black tabular-nums ${color}`}>
        {value}
      </p>
    </div>
  );
}
