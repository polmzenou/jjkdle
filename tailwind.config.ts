import type { Config } from "tailwindcss";

/**
 * Thème "Cursed Energy" — palette sombre + accents néon Jujutsu Kaisen.
 * Les couleurs de grade sont réutilisées pour les bordures animées des cartes.
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
        // Fond profond / surface
        void: {
          DEFAULT: "#0a0a0f",
          900: "#0a0a0f",
          800: "#12121c",
          700: "#1b1b2b",
          600: "#26263a",
        },
        // Violet "Domain Expansion"
        domain: {
          DEFAULT: "#7c3aed",
          light: "#a78bfa",
          dark: "#5b21b6",
        },
        // Rouge "Cursed"
        cursed: {
          DEFAULT: "#dc2626",
          light: "#f87171",
          dark: "#991b1b",
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
        glow: "0 0 20px rgba(124, 58, 237, 0.45)",
        "glow-cursed": "0 0 20px rgba(220, 38, 38, 0.45)",
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
      },
      animation: {
        "glow-pulse": "glow-pulse 2.4s ease-in-out infinite",
        glitch: "glitch 0.4s steps(2, end) infinite",
        shuffle: "shuffle 0.5s ease-in-out",
        float: "float 6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
