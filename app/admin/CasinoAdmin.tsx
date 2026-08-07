"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { CasinoAdminData } from "@/lib/admin/casino";
import {
  closeCasinoTableAction,
  resetCasinoStatsAction,
  setCasinoCardBackAction,
  setCasinoEnabledAction,
  setCasinoMinBetAction,
} from "./actions";

/**
 * Onglet CASINO de l'administration.
 *
 * ⚠️ Contrairement aux autres onglets, ces réglages ne sont PAS scopés à
 * l'univers sélectionné dans le sélecteur du haut : il n'y a qu'un casino sur la
 * plateforme (il mise des coins globaux). Couper le casino le coupe pour tout
 * le monde, sur tous les animes — c'est dit explicitement dans l'interface pour
 * qu'aucun admin ne s'y trompe.
 */
export function CasinoAdmin({ casino }: { casino: CasinoAdminData }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(
    null,
  );
  const [minBet, setMinBet] = useState(String(casino.config.minBet));

  const run = (
    action: () => Promise<{ ok: boolean; error?: string }>,
    okMsg: string,
  ) => {
    if (pending) return;
    setFeedback(null);
    startTransition(async () => {
      const result = await action();
      setFeedback(
        result.ok
          ? { ok: true, msg: okMsg }
          : { ok: false, msg: result.error ?? "Échec." },
      );
      if (result.ok) router.refresh();
    });
  };

  const { config, stats, tables, cardBacks } = casino;

  return (
    <div className="space-y-8">
      <p className="rounded-xl border border-amber-400/25 bg-amber-400/[0.07] px-4 py-3 text-sm text-amber-200/85">
        Ces réglages sont <strong>globaux</strong> : le casino ne dépend
        d&apos;aucun univers, il mise les coins du compte. Le sélecteur
        d&apos;univers en haut de page n&apos;a aucun effet ici.
      </p>

      {feedback && (
        <p
          className={`rounded-xl border px-4 py-3 text-sm ${
            feedback.ok
              ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
              : "border-cursed/40 bg-cursed/10 text-cursed-light"
          }`}
        >
          {feedback.msg}
        </p>
      )}

      {/* ── Ouverture ── */}
      <Section title="Ouverture">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-white">
              Casino {config.enabled ? "ouvert" : "fermé"}
            </p>
            <p className="mt-1 text-xs text-white/45">
              Fermé, les joueurs voient un écran « casino fermé » ; les admins
              continuent d&apos;accéder aux tables pour tester.
            </p>
          </div>
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              run(
                () => setCasinoEnabledAction(!config.enabled),
                config.enabled ? "Casino fermé." : "Casino ouvert.",
              )
            }
            className={`rounded-xl px-5 py-2.5 font-display text-sm font-black uppercase tracking-wider text-white transition disabled:opacity-40 ${
              config.enabled
                ? "bg-cursed hover:bg-cursed-light"
                : "bg-emerald-600 hover:bg-emerald-500"
            }`}
          >
            {config.enabled ? "Fermer" : "Ouvrir"}
          </button>
        </div>
      </Section>

      {/* ── Mise minimale ── */}
      <Section title="Mise minimale">
        <p className="mb-3 text-xs text-white/45">
          Il n&apos;y a volontairement <strong>aucun plafond</strong> : un joueur
          peut miser tout son solde. Seul le plancher se règle.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="number"
            min={1}
            step={1}
            value={minBet}
            onChange={(e) => setMinBet(e.target.value)}
            className="w-36 rounded-lg border border-white/12 bg-void-900 px-3 py-2 text-sm font-black tabular-nums text-white outline-none focus:border-domain"
          />
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              run(
                () => setCasinoMinBetAction(Number(minBet)),
                `Mise minimale : ${minBet} coins.`,
              )
            }
            className="rounded-lg bg-domain px-4 py-2 text-sm font-bold text-white transition hover:bg-domain-light disabled:opacity-40"
          >
            Appliquer
          </button>
          <span className="text-xs text-white/35">
            actuellement {config.minBet.toLocaleString("fr-FR")} coins
          </span>
        </div>
      </Section>

      {/* ── Dos de carte ── */}
      <Section title="Dos de carte">
        <p className="mb-3 text-xs text-white/45">
          S&apos;applique immédiatement, y compris aux tables déjà ouvertes.
        </p>
        <div className="grid gap-2.5 sm:grid-cols-3">
          {cardBacks.map((back) => (
            <button
              key={back.id}
              type="button"
              disabled={pending}
              onClick={() =>
                run(
                  () => setCasinoCardBackAction(back.id),
                  `Dos « ${back.label} » appliqué.`,
                )
              }
              className={`rounded-xl border p-3 text-left transition disabled:opacity-40 ${
                config.cardBack === back.id
                  ? "border-cursed/60 bg-cursed/10"
                  : "border-white/10 bg-white/[0.02] hover:border-white/30"
              }`}
            >
              <span className="block text-sm font-bold text-white">
                {back.label}
                {config.cardBack === back.id && (
                  <span className="ml-2 text-xs text-cursed-light">actif</span>
                )}
              </span>
              <span className="mt-1 block text-xs text-white/45">
                {back.description}
              </span>
            </button>
          ))}
        </div>
      </Section>

      {/* ── Marge de la maison ── */}
      <Section title="Marge de la maison">
        <p className="mb-3 text-xs text-white/45">
          Compteurs agrégés <strong>tous jeux confondus</strong> (une main de
          blackjack comme un lancer de pièce), pas un registre : ils mesurent
          l&apos;équilibre du casino, ils ne permettent pas d&apos;auditer un
          mouvement précis.
        </p>
        <div className="grid gap-3 sm:grid-cols-4">
          <Stat label="Mains jouées" value={stats.handsPlayed} />
          <Stat label="Total misé" value={stats.wagered} />
          <Stat label="Total payé" value={stats.paidOut} />
          <Stat
            label="Net maison"
            value={stats.houseNet}
            tone={stats.houseNet >= 0 ? "good" : "bad"}
          />
        </div>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (!window.confirm("Remettre les compteurs du casino à zéro ?")) return;
            run(resetCasinoStatsAction, "Compteurs remis à zéro.");
          }}
          className="mt-4 rounded-lg border border-white/12 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white/55 transition hover:border-cursed/40 hover:text-cursed-light disabled:opacity-40"
        >
          Réinitialiser
        </button>
      </Section>

      {/* ── Tables en cours ── */}
      <Section title={`Tables en cours (${tables.length})`}>
        {tables.length === 0 ? (
          <p className="text-sm text-white/40">Aucune table ouverte.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[42rem] text-left text-sm">
              <thead className="text-xs uppercase tracking-wider text-white/40">
                <tr>
                  <th className="pb-2 pr-3">Code</th>
                  <th className="pb-2 pr-3">Mode</th>
                  <th className="pb-2 pr-3">Phase</th>
                  <th className="pb-2 pr-3">Main</th>
                  <th className="pb-2 pr-3">Joueurs</th>
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody className="text-white/70">
                {tables.map((t) => (
                  <tr key={t.code} className="border-t border-white/[0.06]">
                    <td className="py-2.5 pr-3 font-black text-white">
                      {t.code}
                      {t.open && (
                        <span className="ml-2 rounded-full bg-emerald-400/15 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-300">
                          ouverte
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 pr-3 text-xs">{t.mode}</td>
                    <td className="py-2.5 pr-3 text-xs">{t.phase}</td>
                    <td className="py-2.5 pr-3 tabular-nums">#{t.handNumber + 1}</td>
                    <td className="py-2.5 pr-3 text-xs">
                      {t.seatCount}/{t.maxSeats}
                      {t.players.length > 0 && (
                        <span className="ml-2 text-white/40">
                          {t.players
                            .map((p) => `${p.username}${p.bet > 0 ? ` (${p.bet})` : ""}`)
                            .join(", ")}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 text-right">
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => {
                          if (
                            !window.confirm(
                              `Fermer la table ${t.code} ? Les mises engagées seront perdues, sans remboursement.`,
                            )
                          ) {
                            return;
                          }
                          run(
                            () => closeCasinoTableAction(t.code),
                            `Table ${t.code} fermée.`,
                          );
                        }}
                        className="rounded-lg border border-cursed/30 px-3 py-1.5 text-xs font-bold text-cursed-light transition hover:bg-cursed/15 disabled:opacity-40"
                      >
                        Fermer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
      <h3 className="mb-4 font-display text-sm font-black uppercase tracking-wider text-white/70">
        {title}
      </h3>
      {children}
    </section>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "good" | "bad";
}) {
  const color =
    tone === "good"
      ? "text-emerald-300"
      : tone === "bad"
        ? "text-cursed-light"
        : "text-white";
  return (
    <div className="rounded-xl border border-white/[0.08] bg-void-900/60 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-white/40">
        {label}
      </p>
      <p className={`mt-1 font-display text-xl font-black tabular-nums ${color}`}>
        {value > 0 && tone ? "+" : ""}
        {value.toLocaleString("fr-FR")}
      </p>
    </div>
  );
}
