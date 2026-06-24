/**
 * Fond "cursed energy" léger et perf-friendly (pur CSS, pas de JS d'animation
 * coûteux). Posé en `fixed` derrière le contenu. Décoratif → aria-hidden.
 */
export function CursedBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Dégradé de base */}
      <div className="absolute inset-0 bg-void-900" />

      {/* Halos violet/rouge en glow lent */}
      <div className="absolute -left-32 top-1/4 h-96 w-96 rounded-full bg-domain/20 blur-3xl animate-glow-pulse" />
      <div
        className="absolute -right-24 top-2/3 h-80 w-80 rounded-full bg-cursed/15 blur-3xl animate-glow-pulse"
        style={{ animationDelay: "1.2s" }}
      />
      <div
        className="absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-domain-dark/20 blur-3xl animate-glow-pulse"
        style={{ animationDelay: "0.6s" }}
      />

      {/* Grille subtile */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
    </div>
  );
}
