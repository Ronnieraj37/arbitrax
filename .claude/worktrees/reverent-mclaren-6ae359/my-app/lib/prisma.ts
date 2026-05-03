import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  try {
    return new PrismaClient();
  } catch {
    // During build time, PrismaClient may fail to initialize
    // Return a proxy that throws on actual usage
    return new Proxy({} as PrismaClient, {
      get(_target, prop) {
        if (prop === "then") return undefined;
        throw new Error(
          `PrismaClient not available. Ensure DATABASE_URL is set and the database is running.`,
        );
      },
    });
  }
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
