/**
 * Écran affiché aux joueurs non-admin quand le mode maintenance est actif
 * (cf. `site.maintenance` dans AppConfig, gating dans app/layout.tsx).
 */
export function MaintenanceScreen({ message }: { message?: string }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-6 text-center">
      <span className="inline-flex items-center gap-2 rounded-full border border-domain/30 bg-domain/10 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.25em] text-domain-light">
        <span className="h-1.5 w-1.5 animate-glow-pulse rounded-full bg-domain-light" />
        Maintenance
      </span>
      <h1 className="mt-6 font-display text-4xl font-black tracking-tight text-white">
        Extension de Territoire en cours
      </h1>
      <p className="mt-4 text-balance text-white/60">
        {message?.trim()
          ? message
          : "JJK Arcade est momentanément indisponible. Reviens dans quelques instants."}
      </p>
    </main>
  );
}
