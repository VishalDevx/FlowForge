import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '../db.js';
import crypto from 'crypto';

export const workspaceRoutes = async (fastify: FastifyInstance) => {
  fastify.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as { name?: string };
    const name = body?.name || 'My Workspace';
    const slug = (name || '').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || crypto.randomUUID();

    const workspace = await prisma.workspace.create({
      data: { name, slug, ownerId: request.userId as string },
    });

    await prisma.workspaceMember.create({
      data: { userId: request.userId as string, workspaceId: workspace.id, role: 'owner' },
    });

    return reply.status(201).send({ success: true, data: { workspace } });
  });

  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const members = await prisma.workspaceMember.findMany({
      where: { userId: request.userId as string },
      include: { workspace: true },
    });

    return reply.status(200).send({ success: true, data: { workspaces: members.map((m: any) => m.workspace) } });
  });

  fastify.get('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const params = request.params as { id: string };
    const workspace = await prisma.workspace.findUnique({
      where: { id: params.id },
      include: { members: { include: { user: { select: { id: true, name: true, email: true } } } } },
    });

    if (!workspace) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Workspace not found' } });
    }

    return reply.status(200).send({ success: true, data: { workspace } });
  });

  fastify.put('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const params = request.params as { id: string };
    const body = request.body as { name?: string };

    const workspace = await prisma.workspace.findUnique({
      where: { id: params.id },
    });

    if (!workspace) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Workspace not found' } });
    }

    if (workspace.ownerId !== request.userId) {
      return reply.status(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'Only the owner can update this workspace' } });
    }

    const updated = await prisma.workspace.update({
      where: { id: params.id },
      data: { name: body.name || workspace.name },
    });

    return reply.status(200).send({ success: true, data: { workspace: updated } });
  });

  fastify.delete('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const params = request.params as { id: string };

    const workspace = await prisma.workspace.findUnique({
      where: { id: params.id },
    });

    if (!workspace) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Workspace not found' } });
    }

    if (workspace.ownerId !== request.userId) {
      return reply.status(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'Only the owner can delete this workspace' } });
    }

    await prisma.workspace.delete({ where: { id: params.id } });

    return reply.status(200).send({ success: true });
  });
};
