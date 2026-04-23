import { FastifyInstance } from 'fastify';
import { prisma } from '../index.js';

export const healthRoutes = async (fastify: FastifyInstance) => {
  fastify.get('/health', async (request, reply) => {
    const start = Date.now();
    
    try {
      await prisma.$queryRaw`SELECT 1`;
      
      return reply.status(200).send({
        success: true,
        data: {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          database: { latencyMs: Date.now() - start },
        },
      });
    } catch (error) {
      return reply.status(503).send({
        success: false,
        error: { code: 'UNHEALTHY', message: 'Database unavailable' },
      });
    }
  });
};