"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import type { JjkdleAnalytics } from "@/lib/admin/jjkdle-analytics";

/**
 * Onglet « Analytics JJKdle » : stats du jeu de déduction quotidien, calculées
 * sur `JjkdleResult` (parties des utilisateurs connectés). Sélecteur de date pour
 * consulter un jour passé (rechargement via ?jjkdleDate=).
 */
export function JjkdleAnalyticsAdmin({ data }: { data: JjkdleAnalytics }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const setDate = (date: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (date) params.set("jjkdleDate", date);
    else params.delete("jjkdleDate");
    startTransition(() => router.push(`/admin?${params.toString()}`));
  };

  const hasData = data.totalToday > 0;
  const pct = (v: number | null) =>
    v === null ? "—" : `${Math.round(v * 100)}%`;

  return (
    <div className="space-y-6">
      {/* Barre de date + note */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-void-800/40 px-4 py-3">
        <label className="flex items-center gap-2 text-sm text-white/60">
          Jour :
          <input
            type="date"
            value={data.date}
            disabled={pending}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-lg border border-white/10 bg-void-900 px-3 py-1.5 text-sm text-white outline-none focus:border-domain disabled:opacity-50"
          />
        </label>
        <p className="text-xs text-white/40">
          {data.dataSince
            ? `Données depuis le ${frDate(data.dataSince)} · joueurs connectés uniquement`
            : "Aucune donnée enregistrée pour l'instant."}
        </p>
      </div>

      {!hasData ? (
        <p className="rounded-2xl border border-white/10 bg-void-800/40 p-10 text-center text-sm text-white/30">
          Aucune partie enregistrée pour ce jour.
        </p>
      ) : (
        <>
          {/* Cartes taux */}
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              title="Taux de réussite"
              value={pct(data.successRate)}
              accent="#34d399"
              sub={`${data.solvedToday}/${data.totalToday} résolus`}
            />
            <StatCard
              title="Taux d'abandon"
              value={pct(data.abandonRate)}
              accent="#f87171"
              sub={`${data.totalToday - data.solvedToday} non résolus`}
            />
            <StatCard
              title="Parties du jour"
              value={String(data.totalToday)}
              accent="#a78bfa"
              sub="joueurs connectés"
            />
          </div>

          {/* Distribution des essais */}
          <section className="rounded-2xl border border-white/10 bg-void-800/40 p-5">
            <h2 className="mb-3 font-display text-sm font-bold uppercase tracking-wide text-white/60">
              Distribution du nombre d&apos;essais (parties résolues)
            </h2>
            {data.distribution.length === 0 ? (
              <p className="py-8 text-center text-sm text-white/30">
                Aucune partie résolue ce jour.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart
                  data={data.distribution}
                  margin={{ left: -20, right: 8, top: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff12" vertical={false} />
                  <XAxis
                    dataKey="attempts"
                    tick={{ fill: "#ffffff55", fontSize: 11 }}
                    label={{ value: "essais", position: "insideBottom", offset: -2, fill: "#ffffff40", fontSize: 11 }}
                  />
                  <YAxis allowDecimals={false} tick={{ fill: "#ffffff55", fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      background: "#12121c",
                      border: "1px solid #ffffff1a",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                    labelFormatter={(v) => `${v} essai(s)`}
                    itemStyle={{ color: "#fff" }}
                    cursor={{ fill: "#ffffff08" }}
                  />
                  <Bar dataKey="count" name="Joueurs" fill="#7c3aed" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </section>
        </>
      )}

      {/* Perso le plus raté (fenêtre 30j — indépendant du jour sélectionné) */}
      <section className="rounded-2xl border border-white/10 bg-void-800/40 p-5">
        <h2 className="mb-3 font-display text-sm font-bold uppercase tracking-wide text-white/60">
          Personnage le plus raté (30 derniers jours)
        </h2>
        {data.hardestCharacter ? (
          <div className="flex flex-wrap items-center gap-4">
            <span className="font-display text-xl font-black text-white">
              {data.hardestCharacter.characterName}
            </span>
            <span className="rounded-full bg-cursed/15 px-3 py-1 text-sm font-bold text-cursed-light">
              {Math.round(data.hardestCharacter.successRate * 100)}% de réussite
            </span>
            <span className="text-sm text-white/45">
              {data.hardestCharacter.solved}/{data.hardestCharacter.attempts} parties résolues
            </span>
          </div>
        ) : (
          <p className="text-sm text-white/30">Pas encore de données sur la période.</p>
        )}
      </section>
    </div>
  );
}

function StatCard({
  title,
  value,
  accent,
  sub,
}: {
  title: string;
  value: string;
  accent: string;
  sub?: string;
}) {
  return (
    <article className="relative overflow-hidden rounded-2xl border border-white/10 bg-void-800/60 p-5">
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }}
      />
      <p className="font-display font-bold text-white">{title}</p>
      <p className="mt-3 font-display text-3xl font-black" style={{ color: accent }}>
        {value}
      </p>
      {sub && <p className="mt-1 text-xs text-white/45">{sub}</p>}
    </article>
  );
}

/** "2026-07-06" → "06/07/2026". */
function frDate(key: string): string {
  const [y, m, d] = key.split("-");
  return `${d}/${m}/${y}`;
}
