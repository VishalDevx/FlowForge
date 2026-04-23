import Fastify from 'fastify';
import cors from '@fastify/cors';
import pino from 'pino';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

const PORT = parseInt(process.env.PORT || '3000');
const HOST = process.env.HOST || '0.0.0.0';
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

const start = async () => {
  const logger = pino({ level: 'info' });
  const prisma = new PrismaClient();

  const hashPassword = (p) => bcrypt.hash(p, 12);
  const verifyPassword = (p, h) => bcrypt.compare(p, h);
  const generateToken = (payload) => jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });
  const verifyToken = (token) => jwt.verify(token, JWT_SECRET);

  const server = Fastify({ logger });
  server.register(cors, { origin: true, credentials: true });

  server.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

  server.post('/api/v1/auth/register', async (req) => {
    const { email, name, password } = req.body;
    if (!email || !name || !password) return { success: false, error: { code: 'VALIDATION_ERROR', message: 'Missing fields' } };
    
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return { success: false, error: { code: 'CONFLICT', message: 'Email exists' } };
    
    const user = await prisma.user.create({ data: { email, name, passwordHash: await hashPassword(password) } });
    const token = generateToken({ userId: user.id, email: user.email });
    
    return { success: true, data: { user: { id: user.id, email: user.email, name: user.name }, token } };
  });

  server.post('/api/v1/auth/login', async (req) => {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return { success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid' } };
    if (!await verifyPassword(password, user.passwordHash)) return { success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid' } };
    
    const token = generateToken({ userId: user.id, email: user.email });
    return { success: true, data: { user: { id: user.id, email: user.email, name: user.name }, token } };
  });

  server.get('/api/v1/auth/me', async (req) => {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) return { success: false, error: { code: 'UNAUTHORIZED' } };
    try {
      const payload = verifyToken(auth.substring(7));
      const user = await prisma.user.findUnique({ where: { id: payload.userId } });
      return user ? { success: true, data: { user: { id: user.id, email: user.email, name: user.name } } } : { success: false, error: { code: 'NOT_FOUND' } };
    } catch { return { success: false, error: { code: 'UNAUTHORIZED' } }; }
  });

  server.post('/api/v1/workspaces', async (req) => {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) return { success: false, error: { code: 'UNAUTHORIZED' } };
    const { name } = req.body;
    const payload = verifyToken(auth.substring(7));
    const workspace = await prisma.workspace.create({ data: { name, slug: name?.toLowerCase().replace(/\s+/g, '-') || crypto.randomUUID(), ownerId: payload.userId } });
    await prisma.workspaceMember.create({ data: { userId: payload.userId, workspaceId: workspace.id, role: 'owner' } });
    return { success: true, data: { workspace } };
  });

  server.get('/api/v1/workspaces', async (req) => {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) return { success: false, error: { code: 'UNAUTHORIZED' } };
    const payload = verifyToken(auth.substring(7));
    const members = await prisma.workspaceMember.findMany({ where: { userId: payload.userId }, include: { workspace: true } });
    return { success: true, data: { workspaces: members.map(m => m.workspace) } };
  });

server.post('/api/v1/workflows', async (req) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return { success: false, error: { code: 'UNAUTHORIZED' } };
  const { workspaceId, name, description } = req.body;
  const payload = verifyToken(auth.substring(7));
  const workflow = await prisma.workflow.create({ data: { workspaceId, name, description } });
  await prisma.workflowVersion.create({ data: { workflowId: workflow.id, version: 1, status: 'draft', nodes: [], edges: [], createdBy: payload.userId } });
  return { success: true, data: { workflow } };
});

  server.get('/api/v1/workflows', async (req) => {
    const { workspaceId } = req.query;
    const workflows = await prisma.workflow.findMany({ where: { workspaceId }, orderBy: { updatedAt: 'desc' } });
    return { success: true, data: { workflows } };
  });

  server.post('/api/v1/executions', async (req) => {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) return { success: false, error: { code: 'UNAUTHORIZED' } };
    const { workflowId, input } = req.body;
    const idempotencyKey = `${workflowId}-${Date.now()}-${crypto.randomUUID()}`;
    const execution = await prisma.execution.create({ 
      data: { workflowId, triggerType: 'manual', status: 'queued', input: input || {}, idempotencyKey } 
    });
    return { success: true, data: { execution } };
  });

  await prisma.$connect();
  logger.info('Connected to database');

  await server.listen({ port: PORT, host: HOST });
  logger.info(`Server at http://${HOST}:${PORT}`);
};

start();