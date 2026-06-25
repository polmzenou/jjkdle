import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Garde le client Prisma (et son moteur natif) hors du bundle webpack serveur.
  serverExternalPackages: ["@prisma/client"],
};

export default nextConfig;
