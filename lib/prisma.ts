import { PrismaClient } from "@prisma/client";

/**
 * Singleton du client Prisma — évite d'épuiser les connexions en dev (le
 * hot-reload de Next recharge les modules à chaque sauvegarde).
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
