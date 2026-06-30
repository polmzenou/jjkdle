import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

/**
 * Content-Security-Policy.
 *
 * Appliquée uniquement en production : en dev, Next (HMR / react-refresh) a
 * besoin de `eval` et d'un websocket vers localhost, qu'une CSP stricte
 * casserait. `'unsafe-inline'` reste nécessaire pour le bootstrap inline de Next
 * (App Router) et les styles inline de framer-motion / Tailwind ; tout le reste
 * est verrouillé. `connect-src` autorise les canaux temps réel Pusher.
 */
const cspProd = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.rule34.xxx",
  "media-src 'self' blob: https://*.rule34.xxx",
  "font-src 'self'",
  "connect-src 'self' https://*.pusher.com wss://*.pusher.com",
  "manifest-src 'self'",
  "upgrade-insecure-requests",
].join("; ");

/** En-têtes de sécurité appliqués à toutes les routes. */
const securityHeaders = [
  // Empêche le navigateur de « deviner » un type MIME (anti stored-XSS via upload).
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Anti-clickjacking (doublé par `frame-ancestors` en CSP).
  { key: "X-Frame-Options", value: "DENY" },
  // Ne fuite pas l'URL complète vers les sites tiers.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Coupe les API navigateur dont le site n'a pas besoin.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  // Force HTTPS sur 2 ans (ignoré par les navigateurs en clair → sans danger en dev).
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  ...(isProd ? [{ key: "Content-Security-Policy", value: cspProd }] : []),
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Garde le client Prisma (et son moteur natif) hors du bundle webpack serveur.
  serverExternalPackages: ["@prisma/client"],
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
