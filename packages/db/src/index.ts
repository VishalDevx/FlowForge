import { PrismaClient, Prisma } from "@prisma/client";
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
export const db = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

// Re-export Prisma types
export { Prisma };
export type { Role, TriggerType, ExecutionStatus, AuditAction } from "@prisma/client";
