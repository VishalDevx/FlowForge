"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Prisma = exports.db = void 0;
const client_1 = require("@prisma/client");
Object.defineProperty(exports, "Prisma", { enumerable: true, get: function () { return client_1.Prisma; } });
const globalForPrisma = globalThis;
exports.db = globalForPrisma.prisma || new client_1.PrismaClient();
if (process.env.NODE_ENV !== "production")
    globalForPrisma.prisma = exports.db;
