import Fastify from 'fastify';
import cors from '@fastify/cors';
import pino from 'pino';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

const PORT = parseInt(process.env.PORT || '3000');
const HOST = process.env.HOST || '0.0.0.0';
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

const hashPassword = async (p: string): Promise<string> => bcrypt.hash(p, 12);
const verifyPassword = async (p: string, h: string): Promise<boolean> => bcrypt.compare(p, h);
const generateToken = (payload: object): string => jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' as const });
const verifyToken = (token: string): JwtPayload => jwt.verify(token, JWT_SECRET) as JwtPayload;

const start = async () => {
  const logger = pino({ level: 'info' });

  const server = Fastify({ logger });
  server.register(cors, { origin: true, credentials: true });

  server.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

  server.post('/api/v1/auth/register', async (req) => {
    const body = req.body as { email?: string; name?: string; password?: string };
    const { email, name, password } = body;
    if (!email || !name || !password) return { success: false, error: { code: 'VALIDATION_ERROR', message: 'Missing fields' } };
    
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return { success: false, error: { code: 'CONFLICT', message: 'Email exists' } };
    
    const user = await prisma.user.create({ data: { email, name, passwordHash: await hashPassword(password) } });
    const token = generateToken({ userId: user.id, email: user.email });
    
    return { success: true, data: { user: { id: user.id, email: user.email, name: user.name }, token } };
  });

  server.post('/api/v1/auth/login', async (req) => {
    const body = req.body as { email?: string; password?: string };
    const { email, password } = body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return { success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid' } };
    if (!await verifyPassword(password as string, user.passwordHash)) return { success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid' } };
    
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
    const body = req.body as { name?: string };
    const { name } = body;
    const payload = verifyToken(auth.substring(7));
    const workspace = await prisma.workspace.create({ data: { name: name || 'My Workspace', slug: (name || '').toLowerCase().replace(/\s+/g, '-') || crypto.randomUUID(), ownerId: payload.userId } });
    await prisma.workspaceMember.create({ data: { userId: payload.userId, workspaceId: workspace.id, role: 'owner' as const } });
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
    const body = req.body as { workspaceId?: string; name?: string; description?: string };
    const { workspaceId, name, description } = body;
    const payload = verifyToken(auth.substring(7));
    const workflow = await prisma.workflow.create({ data: { workspaceId: workspaceId as string, name: name as string, description } });
    await prisma.workflowVersion.create({ data: { workflowId: workflow.id, version: 1, status: 'draft' as const, nodes: [], edges: [], createdBy: payload.userId } });
    return { success: true, data: { workflow } };
  });

  server.get('/api/v1/workflows', async (req) => {
    const query = req.query as { workspaceId?: string };
    const { workspaceId } = query;
    const workflows = await prisma.workflow.findMany({ where: { workspaceId }, orderBy: { updatedAt: 'desc' } });
    return { success: true, data: { workflows } };
  });

  server.post('/api/v1/executions', async (req) => {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) return { success: false, error: { code: 'UNAUTHORIZED' } };
    const body = req.body as { workflowId?: string; input?: Record<string, unknown> };
    const { workflowId, input } = body;
    const idempotencyKey = `${workflowId}-${Date.now()}-${crypto.randomUUID()}`;
    const workflow = await prisma.workflow.findUnique({ where: { id: workflowId } });
    if (!workflow) return { success: false, error: { code: 'NOT_FOUND', message: 'Workflow not found' } };
    const execution = await prisma.execution.create({ 
      data: { 
        workspaceId: workflow.workspaceId,
        workflowId: workflowId as string, 
        workflowVersionId: workflow.publishedVersionId || '',
        triggerType: 'manual' as const, 
        status: 'queued' as const, 
        input: input ? JSON.parse(JSON.stringify(input)) : undefined, 
        idempotencyKey 
      } 
    });
    return { success: true, data: { execution } };
  });

  await prisma.$connect();
  logger.info('Connected to database');

  await server.listen({ port: PORT, host: HOST });
  logger.info(`Server at http://${HOST}:${PORT}`);
};

start();