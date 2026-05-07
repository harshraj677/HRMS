import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var _prisma: PrismaClient | undefined;
}

const isDev = process.env.NODE_ENV === "development";

export const prisma: PrismaClient =
  globalThis._prisma ??
  (globalThis._prisma = new PrismaClient({
    log: isDev ? ["error", "warn"] : ["error"],
  }));
