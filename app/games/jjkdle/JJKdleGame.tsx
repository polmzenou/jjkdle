"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { CharacterImage } from "@/components/CharacterImage";
import {
  VIP_MAX_REPLAYS,
  type GameMode,
  type GameStatus,
  type GuessRow as GuessRowData,
} from "@/lib/games/jjkdle/types";
import { guessAction, newAdminGameAction, newVipGameAction } from "./actions";
import { CharacterSearch } from "./CharacterSearch";
import { GuessHeader, GuessRow } from "./GuessRow";
import { SubmitJjkdleScore } from "./SubmitJjkdleScore";

/** Forme minimale d'un perso transmise au client (aucune donnée secrète). */
export interface PublicCharacter {
  id: string;
  name: string;
  image?: string;
}

type Revealed = { id: string; name: string; title: string; image?: string } | null;

interface JJKdleGameProps {
  roster: PublicCharacter[];
  eligibleCount: number;
  initialRows: GuessRowData[];
  initialStatus: GameStatus;
  mode: GameMode;
  isAdmin: boolean;
  isVip: boolean;
  isAuthed: boolean;
  vipReplaysUsed: number;
  msUntilMidnight: number;
  initialRevealed: Revealed;
}

export function JJKdleGame({
  roster,
  eligibleCount,
  initialRows,
  initialStatus,
  mode,
  isAdmin,
  isVip,
  isAuthed,
  vipReplaysUsed,
  msUntilMidnight,
  initialRevealed,
}: JJKdleGameProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [rows, setRows] = useState<GuessRowData[]>(initialRows);
  const [status, setStatus] = useState<GameStatus>(initialStatus);
  const [revealed, setRevealed] = useState<Revealed>(initialRevealed);
  const [error, setError] = useState<string | null>(null);
  const [lastGuessId, setLastGuessId] = useState<string | null>(null);
  const [vipUsed, setVipUsed] = useState(vipReplaysUsed);

  const guessedIds = useMemo(
    () => new Set(rows.map((r) => r.characterId)),
    [rows],
  );

  // En mode daily, une fois gagné, on bloque les propositions. En mode bonus
  // (admin / VIP), gagné aussi → on attend une nouvelle partie.
  const locked = status === "won";
  const poolEmpty = eligibleCount === 0;

  // Capacité à relancer : admin = illimité ; VIP = plafonné à VIP_MAX_REPLAYS/jour.
  const isPrivileged = isAdmin || isVip;
  const canReplay = isAdmin || (isVip && vipUsed < VIP_MAX_REPLAYS);
  const replayLabel = isAdmin
    ? "🔄 Nouvelle partie (admin)"
    : `🔄 Partie bonus VIP (${vipUsed}/${VIP_MAX_REPLAYS})`;

  const handlePick = useCallback(
    (id: string) => {
      setError(null);
      startTransition(async () => {
        const res = await guessAction(id);
        if (!res.ok || !res.row) {
          setError(res.error ?? "Échec de la proposition.");
          return;
        }
        setRows((prev) => [...prev, res.row!]);
        setLastGuessId(id);
        if (res.status) setStatus(res.status);
        if (res.revealed !== undefined) setRevealed(res.revealed);
      });
    },
    [],
  );

  const handleReplay = useCallback(() => {
    setError(null);
    startTransition(async () => {
      const res = isAdmin ? await newAdminGameAction() : await newVipGameAction();
      if (!res.ok) {
        setError(res.error ?? "Échec.");
        return;
      }
      if (!isAdmin) setVipUsed((n) => n + 1);
      setRows([]);
      setStatus("playing");
      setRevealed(null);
      setLastGuessId(null);
      router.refresh();
    });
  }, [router, isAdmin]);

  // Affichage : proposition la plus récente en haut.
  const displayRows = useMemo(() => [...rows].reverse(), [rows]);

  return (
    <div className="pt-8">
      <Header attempts={rows.length} mode={mode} />

      {poolEmpty ? (
        <div className="mt-8 rounded-2xl border border-cursed/30 bg-cursed/10 p-6 text-center text-cursed-light">
          Aucun personnage n'a encore tous ses attributs JJKdle renseignés. Un
          administrateur doit les compléter dans le dashboard.
        </div>
      ) : (
        <>
          {/* Zone de saisie / victoire */}
          {status === "won" ? (
            <VictoryPanel
              revealed={revealed}
              attempts={rows.length}
              rows={rows}
              mode={mode}
              isAuthed={isAuthed}
              showReplay={isPrivileged}
              replayLabel={replayLabel}
              replayDisabled={pending || !canReplay}
              onReplay={handleReplay}
              msUntilMidnight={msUntilMidnight}
            />
          ) : (
            <div className="mt-6">
              <CharacterSearch
                roster={roster}
                guessedIds={guessedIds}
                disabled={pending || locked}
                onPick={handlePick}
              />
              {error && (
                <p className="mt-2 text-sm text-cursed-light">{error}</p>
              )}
            </div>
          )}

          {/* Partie bonus en cours (admin / VIP) : relancer sans attendre la victoire */}
          {isPrivileged && status !== "won" && rows.length > 0 && (
            <button
              type="button"
              onClick={handleReplay}
              disabled={pending || !canReplay}
              className="mt-3 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/60 hover:text-white disabled:opacity-40"
            >
              {replayLabel}
            </button>
          )}

          {/* Grille d'indices */}
          {rows.length > 0 && (
            <div className="mt-8 space-y-2 overflow-x-auto">
              <GuessHeader />
              {displayRows.map((row) => (
                <GuessRow
                  key={row.characterId}
                  row={row}
                  animate={row.characterId === lastGuessId}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Header({ attempts, mode }: { attempts: number; mode: GameMode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <Link
          href="/games"
          className="text-xs text-white/40 hover:text-white/70"
        >
          ← Tous les jeux
        </Link>
        <h1 className="mt-1 font-display text-3xl font-black uppercase tracking-wider text-white">
          JJK<span className="text-domain-light">dle</span>
        </h1>
        <p className="text-sm text-white/45">
          {mode === "admin"
            ? "Mode admin illimité — perso aléatoire."
            : mode === "vip"
              ? "Partie bonus VIP — perso aléatoire."
              : "Devine le personnage mystère du jour."}
        </p>
      </div>
      <div className="rounded-xl border border-white/10 bg-void-800/50 px-4 py-2 text-center">
        <p className="font-display text-2xl font-black text-domain-light">
          {attempts}
        </p>
        <p className="text-[10px] uppercase tracking-wider text-white/40">
          essai{attempts > 1 ? "s" : ""}
        </p>
      </div>
    </header>
  );
}

function VictoryPanel({
  revealed,
  attempts,
  rows,
  mode,
  isAuthed,
  showReplay,
  replayLabel,
  replayDisabled,
  onReplay,
  msUntilMidnight,
}: {
  revealed: Revealed;
  attempts: number;
  rows: GuessRowData[];
  mode: GameMode;
  isAuthed: boolean;
  showReplay: boolean;
  replayLabel: string;
  replayDisabled: boolean;
  onReplay: () => void;
  msUntilMidnight: number;
}) {
  const [copied, setCopied] = useState(false);

  const share = useCallback(() => {
    const text = buildShareText(rows, attempts);
    navigator.clipboard?.writeText(text).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      },
      () => setCopied(false),
    );
  }, [rows, attempts]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-6 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-6 text-center shadow-glow"
    >
      <p className="font-display text-sm uppercase tracking-widest text-emerald-300">
        Trouvé en {attempts} essai{attempts > 1 ? "s" : ""} !
      </p>
      {revealed && (
        <div className="mt-4 flex flex-col items-center gap-2">
          <div className="h-28 w-20 overflow-hidden rounded-xl border border-white/15">
            <CharacterImage character={{ name: revealed.name, image: revealed.image }} />
          </div>
          <p className="font-display text-2xl font-black text-white">
            {revealed.name}
          </p>
          {revealed.title && (
            <p className="text-sm text-white/50">{revealed.title}</p>
          )}
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={share}
          className="rounded-xl bg-domain px-4 py-2.5 font-display font-bold uppercase tracking-wide text-white shadow-glow transition-transform hover:scale-[1.03]"
        >
          {copied ? "Copié ✓" : "Partager"}
        </button>
        {showReplay && (
          <button
            type="button"
            onClick={onReplay}
            disabled={replayDisabled}
            className="rounded-xl border border-white/15 px-4 py-2.5 font-display font-bold uppercase tracking-wide text-white/80 hover:text-white disabled:opacity-40"
          >
            {replayLabel}
          </button>
        )}
      </div>

      {/* Enregistrement au classement : uniquement pour la partie quotidienne. */}
      {mode === "daily" && <SubmitJjkdleScore isAuthed={isAuthed} />}

      {mode === "daily" && <Countdown ms={msUntilMidnight} />}
    </motion.div>
  );
}

/** Compte à rebours jusqu'au prochain perso (minuit). */
function Countdown({ ms }: { ms: number }) {
  const [remaining, setRemaining] = useState(ms);
  useEffect(() => {
    const end = Date.now() + ms;
    const t = setInterval(() => {
      setRemaining(Math.max(0, end - Date.now()));
    }, 1000);
    return () => clearInterval(t);
  }, [ms]);

  const h = Math.floor(remaining / 3_600_000);
  const m = Math.floor((remaining % 3_600_000) / 60_000);
  const s = Math.floor((remaining % 60_000) / 1000);
  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <p className="mt-5 text-sm text-white/45">
      Prochain personnage dans{" "}
      <span className="font-mono font-bold text-domain-light">
        {pad(h)}:{pad(m)}:{pad(s)}
      </span>
    </p>
  );
}

/** Grille d'émojis façon Wordle (sans spoiler du nom). */
function buildShareText(rows: GuessRowData[], attempts: number): string {
  const emoji: Record<string, string> = {
    correct: "🟩",
    close: "🟧",
    wrong: "🟥",
  };
  const grid = rows
    .map((r) => r.hints.map((h) => emoji[h.status] ?? "⬜").join(""))
    .join("\n");
  return `JJKdle — ${attempts} essai${attempts > 1 ? "s" : ""}\n${grid}`;
}
