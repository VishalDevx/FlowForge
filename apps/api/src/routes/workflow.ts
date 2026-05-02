import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { prisma, Prisma } from '../db.js';

export const workflowRoutes = async (fastify: FastifyInstance) => {
  fastify.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as { workspaceId?: string; name?: string; description?: string };

    if (!body.workspaceId || !body.name) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'workspaceId and name are required' },
      });
    }

    const member = await prisma.workspaceMember.findFirst({
      where: { workspaceId: body.workspaceId, userId: request.userId as string },
    });

    if (!member) {
      return reply.status(403).send({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You do not have access to this workspace' },
      });
    }

    const workflow = await prisma.workflow.create({
      data: { workspaceId: body.workspaceId, name: body.name, description: body.description },
    });

    await prisma.workflowVersion.create({
      data: { workflowId: workflow.id, version: 1, status: 'draft', nodes: [], edges: [], createdBy: request.userId as string },
    });

    return reply.status(201).send({ success: true, data: { workflow } });
  });

  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const query = request.query as { workspaceId?: string };

    if (!query.workspaceId) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'workspaceId is required' },
      });
    }

    const member = await prisma.workspaceMember.findFirst({
      where: { workspaceId: query.workspaceId, userId: request.userId as string },
    });

    if (!member) {
      return reply.status(403).send({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You do not have access to this workspace' },
      });
    }

    const workflows = await prisma.workflow.findMany({
      where: { workspaceId: query.workspaceId },
      include: { versions: { orderBy: { version: 'desc' }, take: 1 } },
      orderBy: { updatedAt: 'desc' },
    });

    return reply.status(200).send({ success: true, data: { workflows } });
  });

  fastify.get('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const params = request.params as { id: string };

    const workflow = await prisma.workflow.findUnique({
      where: { id: params.id },
      include: {
        versions: { orderBy: { version: 'desc' } },
        triggers: true,
      },
    });

    if (!workflow) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Workflow not found' } });
    }

    return reply.status(200).send({ success: true, data: { workflow } });
  });

  fastify.put('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const params = request.params as { id: string };
    const body = request.body as { name?: string; description?: string };

    const workflow = await prisma.workflow.findUnique({ where: { id: params.id } });

    if (!workflow) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Workflow not found' } });
    }

    const updated = await prisma.workflow.update({
      where: { id: params.id },
      data: {
        ...(body.name && { name: body.name }),
        ...(body.description !== undefined && { description: body.description }),
      },
    });

    return reply.status(200).send({ success: true, data: { workflow: updated } });
  });

  fastify.delete('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const params = request.params as { id: string };

    const workflow = await prisma.workflow.findUnique({ where: { id: params.id } });

    if (!workflow) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Workflow not found' } });
    }

    await prisma.workflow.delete({ where: { id: params.id } });

    return reply.status(200).send({ success: true });
  });

  fastify.put('/:id/version', async (request: FastifyRequest, reply: FastifyReply) => {
    const params = request.params as { id: string };
    const body = request.body as { nodes?: unknown[]; edges?: unknown[]; executionPolicy?: string; retryPolicy?: unknown; timeoutMs?: number };

    const workflow = await prisma.workflow.findUnique({ where: { id: params.id } });

    if (!workflow) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Workflow not found' } });
    }

    const latestVersion = await prisma.workflowVersion.findFirst({
      where: { workflowId: params.id },
      orderBy: { version: 'desc' },
    });

    const newVersion = (latestVersion?.version || 0) + 1;

    const version = await prisma.workflowVersion.create({
      data: {
        workflowId: params.id,
        version: newVersion,
        status: 'draft',
        nodes: (body.nodes || []) as any,
        edges: (body.edges || []) as any,
        executionPolicy: body.executionPolicy || 'stop-on-first-failure',
        retryPolicy: body.retryPolicy as any || Prisma.JsonNull,
        timeoutMs: body.timeoutMs || null,
        createdBy: request.userId as string,
      },
    });

    return reply.status(201).send({ success: true, data: { version } });
  });

  fastify.post('/:id/publish', async (request: FastifyRequest, reply: FastifyReply) => {
    const params = request.params as { id: string };

    const workflow = await prisma.workflow.findUnique({
      where: { id: params.id },
      include: { versions: { orderBy: { version: 'desc' }, take: 1 } },
    });

    if (!workflow) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Workflow not found' } });
    }

    const latestVersion = workflow.versions[0];

    if (!latestVersion) {
      return reply.status(400).send({ success: false, error: { code: 'BAD_REQUEST', message: 'No version to publish' } });
    }

    await prisma.workflowVersion.update({
      where: { id: latestVersion.id },
      data: { status: 'published' },
    });

    const updated = await prisma.workflow.update({
      where: { id: params.id },
      data: { publishedVersionId: latestVersion.id },
    });

    return reply.status(200).send({ success: true, data: { workflow: updated } });
  });
};
