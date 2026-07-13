import { PrismaClient } from "@prisma/client";

// WHY: Next.js dev mode hot-reloads modules on every change, which would
// otherwise spawn a new PrismaClient per reload and exhaust DB connections.
// Caching a single instance on globalThis keeps exactly one client alive.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
