import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '../db.js';

export const executionRoutes = async (fastify: FastifyInstance) => {
  fastify.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as { workflowId?: string; input?: Record<string, unknown> };

    if (!body.workflowId) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'workflowId is required' },
      });
    }

    const workflow = await prisma.workflow.findUnique({ where: { id: body.workflowId } });

    if (!workflow) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Workflow not found' } });
    }

    const member = await prisma.workspaceMember.findFirst({
      where: { workspaceId: workflow.workspaceId, userId: request.userId as string },
    });

    if (!member) {
      return reply.status(403).send({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You do not have access to this workflow' },
      });
    }

    if (!workflow.publishedVersionId) {
      return reply.status(400).send({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'Workflow has not been published yet' },
      });
    }

    const execution = await prisma.execution.create({
      data: {
        workspaceId: workflow.workspaceId,
        workflowId: body.workflowId,
        workflowVersionId: workflow.publishedVersionId,
        triggerType: 'manual',
        status: 'queued',
        input: (body.input ? JSON.parse(JSON.stringify(body.input)) : undefined) as any,
        createdBy: request.userId as string,
      },
    });

    return reply.status(201).send({ success: true, data: { execution } });
  });

  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const query = request.query as { workflowId?: string; workspaceId?: string };

    const where: any = {};

    if (query.workflowId) where.workflowId = query.workflowId;
    if (query.workspaceId) where.workspaceId = query.workspaceId;

    const executions = await prisma.execution.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return reply.status(200).send({ success: true, data: { executions } });
  });

  fastify.get('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const params = request.params as { id: string };

    const execution = await prisma.execution.findUnique({
      where: { id: params.id },
      include: {
        nodes: true,
        logs: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!execution) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Execution not found' } });
    }

    return reply.status(200).send({ success: true, data: { execution } });
  });

  fastify.post('/:id/cancel', async (request: FastifyRequest, reply: FastifyReply) => {
    const params = request.params as { id: string };

    const execution = await prisma.execution.findUnique({ where: { id: params.id } });

    if (!execution) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Execution not found' } });
    }

    if (!['queued', 'running', 'paused', 'waiting'].includes(execution.status)) {
      return reply.status(400).send({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'Execution cannot be cancelled in current state' },
      });
    }

    const updated = await prisma.execution.update({
      where: { id: params.id },
      data: { status: 'cancelled', finishedAt: new Date() },
    });

    return reply.status(200).send({ success: true, data: { execution: updated } });
  });

  fastify.post('/:id/retry', async (request: FastifyRequest, reply: FastifyReply) => {
    const params = request.params as { id: string };

    const execution = await prisma.execution.findUnique({
      where: { id: params.id },
      include: { nodes: { where: { status: 'failed' }, take: 1 } },
    });

    if (!execution) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Execution not found' } });
    }

    if (execution.status !== 'failed') {
      return reply.status(400).send({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'Only failed executions can be retried' },
      });
    }

    const retried = await prisma.execution.update({
      where: { id: params.id },
      data: { status: 'queued', error: null, startedAt: null, finishedAt: null },
    });

    return reply.status(200).send({ success: true, data: { execution: retried } });
  });
};
