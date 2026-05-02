import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import pino from 'pino';
import { prisma } from './db.js';
import { authRoutes } from './controllers/auth.js';
import { workspaceRoutes } from './routes/workspace.js';
import { workflowRoutes } from './routes/workflow.js';
import { executionRoutes } from './routes/execution.js';
import { authenticate } from './middlewares/auth.js';
import { config } from './config/index.js';
import { errorHandler } from './middlewares/error.js';

const start = async () => {
  const logger = pino({
    level: config.logLevel,
    transport:
      process.env.NODE_ENV === 'development'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
  });

  const server = Fastify({
    logger,
    bodyLimit: 10_485_760,
  });

  server.register(cors, {
    origin: config.corsOrigin.split(','),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Idempotency-Key'],
  });

  server.register(rateLimit, {
    max: config.rateLimitMax,
    timeWindow: '1 minute',
  });

  server.setErrorHandler(errorHandler);

  server.get('/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  }));

  server.register(authRoutes, { prefix: '/api/v1/auth' });

  server.register(async (fastify) => {
    fastify.addHook('preHandler', authenticate);
    fastify.register(workspaceRoutes, { prefix: '/workspaces' });
    fastify.register(workflowRoutes, { prefix: '/workflows' });
    fastify.register(executionRoutes, { prefix: '/executions' });
  }, { prefix: '/api/v1' });

  await prisma.$connect();
  logger.info({ database: config.databaseUrl.slice(0, 30) + '...' }, 'Connected to database');

  await server.listen({ port: config.port, host: config.host });
  logger.info({ port: config.port, host: config.host, env: config.nodeEnv }, 'FlowForge API started');
};

start().catch((error) => {
  pino().fatal(error, 'Failed to start API server');
  process.exit(1);
});