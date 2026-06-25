/**
 * Fond "cursed energy" léger et perf-friendly (pur CSS, pas de JS d'animation
 * coûteux). Posé en `fixed` derrière le contenu. Décoratif → aria-hidden.
 */
export function CursedBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Dégradé de base */}
      <div className="absolute inset-0 bg-void-900" />

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
