import type { Config } from "tailwindcss";

/**
 * Palette du site, PAR UNIVERS (étape 4).
 *
 * Les couleurs pointent vers des VARIABLES CSS dont les valeurs sont injectées
 * par le layout racine depuis l'univers courant (cf. lib/universes/theme.ts) :
 * les classes (`bg-domain`, `bg-void-800/60`…) restent identiques, seule la
 * palette change d'un anime à l'autre. Les valeurs par défaut (JJK) vivent dans
 * app/globals.css, ce qui garantit un rendu correct même hors layout.
 *
 * La forme `rgb(var(--x) / <alpha-value>)` est indispensable : c'est elle qui
 * préserve les modificateurs d'opacité Tailwind (`bg-domain/10`).
 *
 * Les couleurs de GRADE restent en dur : ce sont des rangs de carte (tiers),
 * pas du branding d'univers.
 */
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./data/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Fond profond / surface (par univers)
        void: {
          DEFAULT: "rgb(var(--color-void) / <alpha-value>)",
          900: "rgb(var(--color-void-900) / <alpha-value>)",
          800: "rgb(var(--color-void-800) / <alpha-value>)",
          700: "rgb(var(--color-void-700) / <alpha-value>)",
          600: "rgb(var(--color-void-600) / <alpha-value>)",
        },
        // Accent principal (JJK : violet "Domain Expansion")
        domain: {
          DEFAULT: "rgb(var(--color-domain) / <alpha-value>)",
          light: "rgb(var(--color-domain-light) / <alpha-value>)",
          dark: "rgb(var(--color-domain-dark) / <alpha-value>)",
        },
        // Accent secondaire (JJK : rouge "Cursed")
        cursed: {
          DEFAULT: "rgb(var(--color-cursed) / <alpha-value>)",
          light: "rgb(var(--color-cursed-light) / <alpha-value>)",
          dark: "rgb(var(--color-cursed-dark) / <alpha-value>)",
        },
        // Couleurs de grade (du plus faible au plus fort)
        grade: {
          "4minus": "#6b7280",
          "4": "#9ca3af",
          "3": "#38bdf8",
          "2": "#a78bfa",
          "1": "#f59e0b",
          s: "#f43f5e",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 20px rgb(var(--color-domain) / 0.45)",
        "glow-cursed": "0 0 20px rgb(var(--color-cursed) / 0.45)",
      },
      keyframes: {
        "glow-pulse": {
          "0%, 100%": { opacity: "0.7", filter: "brightness(1)" },
          "50%": { opacity: "1", filter: "brightness(1.35)" },
        },
        glitch: {
          "0%, 100%": { transform: "translate(0)" },
          "20%": { transform: "translate(-2px, 1px)" },
          "40%": { transform: "translate(2px, -1px)" },
          "60%": { transform: "translate(-1px, -2px)" },
          "80%": { transform: "translate(1px, 2px)" },
        },
        shuffle: {
          "0%": { transform: "rotateY(0deg) scale(1)", opacity: "1" },
          "50%": { transform: "rotateY(90deg) scale(0.92)", opacity: "0.25" },
          "100%": { transform: "rotateY(0deg) scale(1)", opacity: "1" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
        // Rotation de teinte des cartes EXOTIC (contour + libellé arc-en-ciel).
        rainbow: {
          "0%": { filter: "hue-rotate(0deg)" },
          "100%": { filter: "hue-rotate(360deg)" },
        },
        // Balayage du dégradé arc-en-ciel sous le texte EXOTIC.
        "rainbow-pan": {
          "0%": { backgroundPosition: "0% 50%" },
          "100%": { backgroundPosition: "200% 50%" },
        },
      },
      animation: {
        "glow-pulse": "glow-pulse 2.4s ease-in-out infinite",
        glitch: "glitch 0.4s steps(2, end) infinite",
        shuffle: "shuffle 0.5s ease-in-out",
        float: "float 6s ease-in-out infinite",
        rainbow: "rainbow 4s linear infinite",
        "rainbow-pan": "rainbow-pan 3s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
