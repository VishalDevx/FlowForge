import { PrismaClient } from '@prisma/client';

// Use the existing db package
try {
  // Try to use the shared db instance
  const { db } = require('@flowforge/db');
  module.exports.db = db;
} catch {
  // Fallback to local instance
  export const db = new PrismaClient();
}
