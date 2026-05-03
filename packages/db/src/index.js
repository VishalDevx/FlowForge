import { PrismaClient, Prisma } from "@prisma/client";
const globalForPrisma = globalThis;
export const db = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== "production")
    globalForPrisma.prisma = db;
// Re-export Prisma types
export { Prisma };
//# sourceMappingURL=index.js.map