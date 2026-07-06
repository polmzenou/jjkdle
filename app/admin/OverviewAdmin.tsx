"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";
import type { OverviewStats } from "@/lib/admin/analytics";

/**
 * Onglet « Vue d'ensemble » : cartes KPI + graphes recharts, themés avec les
 * tokens du projet (domain/void/cursed). Toutes les données sont pré-calculées
 * côté serveur (cf. lib/admin/analytics.ts).
 */

const DOMAIN = "#7c3aed";
const DOMAIN_LIGHT = "#a78bfa";
const VOID_700 = "#1b1b2b";
const ROLE_COLORS: Record<string, string> = {
  PLAYER: "#38bdf8",
  VIP: "#f59e0b",
  ADMIN: "#a78bfa",
};

export function OverviewAdmin({
  stats,
  onGotoContent,
}: {
  stats: OverviewStats;
  onGotoContent: () => void;
}) {
  const { players, gamesPlayed, roles, content, dailyWord } = stats;

  const roleData = [
    { name: "Joueurs", key: "PLAYER", value: roles.PLAYER },
    { name: "VIP", key: "VIP", value: roles.VIP },
    { name: "Admin", key: "ADMIN", value: roles.ADMIN },
  ].filter((r) => r.value > 0);

  const gameData = gamesPlayed.map((g) => ({
    name: g.label,
    value: g.count ?? 0,
    unavailable: g.count === null,
  }));

  return (
    <div className="space-y-6">
      {/* Cartes KPI */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Joueurs"
          glyph="👥"
          value={players.total}
          accent={DOMAIN_LIGHT}
          sub={`+${players.new7d} sur 7j · +${players.new30d} sur 30j`}
        />
        <KpiCard
          title="Parties (tous jeux)"
          glyph="🎮"
          value={gamesPlayed.reduce((s, g) => s + (g.count ?? 0), 0)}
          accent="#38bdf8"
          sub="scores enregistrés"
        />
        <button
          type="button"
          onClick={onGotoContent}
          className="text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-domain rounded-2xl"
          title="Voir la santé du contenu"
        >
          <KpiCard
            title="Persos incomplets"
            glyph="⚠️"
            value={content.incomplete}
            accent={content.incomplete > 0 ? "#f87171" : "#34d399"}
            sub={`sur ${content.total} · exclus du pool JJKdle →`}
          />
        </button>
        <button
          type="button"
          onClick={onGotoContent}
          className="text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-domain rounded-2xl"
          title="Voir la santé du contenu"
        >
          <KpiCard
            title="Persos sans image"
            glyph="🖼️"
            value={content.missingImage}
            accent={content.missingImage > 0 ? "#fbbf24" : "#34d399"}
            sub={`sur ${content.total} →`}
          />
        </button>
      </div>

      {/* Graphes */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Inscriptions 30j */}
        <ChartCard title="Inscriptions (30 jours)">
          {players.new30d === 0 ? (
            <EmptyChart label="Aucune inscription sur la période." />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={players.signups} margin={{ left: -20, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="signups" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={DOMAIN} stopOpacity={0.5} />
                    <stop offset="100%" stopColor={DOMAIN} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff12" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={shortDay}
                  tick={{ fill: "#ffffff55", fontSize: 11 }}
                  interval="preserveStartEnd"
                  minTickGap={28}
                />
                <YAxis allowDecimals={false} tick={{ fill: "#ffffff55", fontSize: 11 }} />
                <Tooltip {...tooltipProps} labelFormatter={(d) => `Le ${frDate(d as string)}`} />
                <Area
                  type="monotone"
                  dataKey="count"
                  name="Inscriptions"
                  stroke={DOMAIN_LIGHT}
                  fill="url(#signups)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Répartition des rôles */}
        <ChartCard title="Répartition des rôles">
          {roleData.length === 0 ? (
            <EmptyChart label="Aucun compte." />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={roleData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={2}
                  stroke="none"
                >
                  {roleData.map((r) => (
                    <Cell key={r.key} fill={ROLE_COLORS[r.key]} />
                  ))}
                </Pie>
                <Tooltip {...tooltipProps} />
              </PieChart>
            </ResponsiveContainer>
          )}
          <div className="mt-2 flex flex-wrap justify-center gap-3 text-xs">
            {roleData.map((r) => (
              <span key={r.key} className="flex items-center gap-1.5 text-white/60">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: ROLE_COLORS[r.key] }}
                />
                {r.name} · <b className="text-white/80">{r.value}</b>
              </span>
            ))}
          </div>
        </ChartCard>

        {/* Parties par jeu */}
        <ChartCard title="Parties par jeu" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={gameData} margin={{ left: -20, right: 8, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff12" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: "#ffffff55", fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fill: "#ffffff55", fontSize: 11 }} />
              <Tooltip {...tooltipProps} cursor={{ fill: "#ffffff08" }} />
              <Bar dataKey="value" name="Parties" radius={[6, 6, 0, 0]}>
                {gameData.map((g) => (
                  <Cell key={g.name} fill={g.unavailable ? VOID_700 : DOMAIN} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="mt-1 text-center text-[11px] text-white/35">
            « Random Battle » ne persiste pas de score (état de partie éphémère).
          </p>
        </ChartCard>
      </div>

      {/* Mot du jour JJKdle */}
      <section className="rounded-2xl border border-white/10 bg-void-800/40 p-5">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <h2 className="font-display text-lg font-bold text-white">
            Mot du jour JJKdle
          </h2>
          {dailyWord.forcedActive && (
            <span className="rounded-full border border-amber-400/40 bg-amber-400/10 px-2.5 py-0.5 text-[11px] font-bold text-amber-300">
              ⚠ Override actif
            </span>
          )}
        </div>
        <p className="text-sm text-white/70">
          Aujourd&apos;hui :{" "}
          <b className="text-domain-light">
            {dailyWord.today.characterName ?? "— (aucun perso éligible)"}
          </b>
        </p>
        <p className="mt-3 mb-1.5 text-[11px] uppercase tracking-wider text-white/40">
          7 derniers jours (tirage déterministe)
        </p>
        <div className="flex flex-wrap gap-2">
          {[...dailyWord.history].reverse().map((h) => (
            <span
              key={h.date}
              className="rounded-lg border border-white/10 bg-void-700/40 px-2.5 py-1 text-xs text-white/65"
            >
              <span className="text-white/40">{shortDay(h.date)}</span>{" "}
              <b className="text-white/85">{h.characterName ?? "—"}</b>
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}

// ── Sous-composants ────────────────────────────────────────────────────────

function KpiCard({
  title,
  glyph,
  value,
  accent,
  sub,
}: {
  title: string;
  glyph: string;
  value: number;
  accent: string;
  sub?: string;
}) {
  return (
    <article className="relative h-full overflow-hidden rounded-2xl border border-white/10 bg-void-800/60 p-5 backdrop-blur">
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }}
      />
      <p className="flex items-center gap-2 font-display font-bold text-white">
        <span aria-hidden>{glyph}</span>
        <span>{title}</span>
      </p>
      <p className="mt-3 font-display text-3xl font-black" style={{ color: accent }}>
        {value.toLocaleString("fr-FR")}
      </p>
      {sub && <p className="mt-1 text-xs text-white/45">{sub}</p>}
    </article>
  );
}

function ChartCard({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-white/10 bg-void-800/40 p-5 ${className}`}
    >
      <h2 className="mb-3 font-display text-sm font-bold uppercase tracking-wide text-white/60">
        {title}
      </h2>
      {children}
    </section>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex h-[220px] items-center justify-center text-sm text-white/30">
      {label}
    </div>
  );
}

const tooltipProps = {
  contentStyle: {
    background: "#12121c",
    border: "1px solid #ffffff1a",
    borderRadius: 12,
    fontSize: 12,
  },
  labelStyle: { color: "#ffffffaa" },
  itemStyle: { color: "#ffffff" },
} as const;

/** "2026-07-06" → "06/07". */
function shortDay(key: string): string {
  const [, m, d] = key.split("-");
  return `${d}/${m}`;
}

/** "2026-07-06" → "06/07/2026". */
function frDate(key: string): string {
  const [y, m, d] = key.split("-");
  return `${d}/${m}/${y}`;
}
