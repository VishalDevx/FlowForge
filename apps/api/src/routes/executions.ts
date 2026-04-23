import { FastifyInstance } from 'fastify';
import { prisma } from '../index.js';
import { createExecutionJob } from '@flowforge/queue';
import { ExecutionCreateInput, generateIdempotencyKey } from '@flowforge/contracts';

export const executionRoutes = async (fastify: FastifyInstance) => {
  fastify.post('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { workflowId, triggerType, triggerId, input } = ExecutionCreateInput.parse(request.body);

    const workflow = await prisma.workflow.findUnique({
      where: { id: workflowId },
      include: { versions: { where: { status: 'published' }, orderBy: { version: 'desc' }, take: 1 } },
    });

    if (!workflow || workflow.versions.length === 0) {
      return reply.status(400).send({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'No published version found' },
      });
    }

    const publishedVersion = workflow.versions[0];
    const idempotencyKey = `${workflowId}-${Date.now()}-${generateIdempotencyKey()}`;

    const execution = await prisma.execution.create({
      data: {
        workflowId,
        workflowVersionId: publishedVersion.id,
        triggerType,
        triggerId,
        status: 'queued',
        input,
        idempotencyKey,
        createdBy: request.userId,
      },
    });

    await createExecutionJob({
      executionId: execution.id,
      nodeId: publishedVersion.nodes[0]?.id || '',
      nodeType: publishedVersion.nodes[0]?.type || 'trigger.manual',
      config: publishedVersion.nodes[0]?.config || {},
      input: input || {},
      retryCount: 0,
      executionContext: {
        workflowId,
        workflowVersionId: publishedVersion.id,
        triggerType,
        triggerId,
        idempotencyKey,
      },
    });

    await prisma.auditLog.create({
      data: {
        workspaceId: workflow.workspaceId,
        userId: request.userId,
        action: 'execution.started',
        targetType: 'execution',
        targetId: execution.id,
      },
    });

    return reply.status(201).send({
      success: true,
      data: { execution },
    });
  });

  fastify.get('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { workflowId, page = '1', limit = '20', status } = request.query as Record<string, string>;

    const where: any = workflowId ? { workflowId } : {};
    if (status) where.status = status;

    const [executions, total] = await Promise.all([
      prisma.execution.findMany({
        where,
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: { workflow: { select: { id: true, name: true } } },
      }),
      prisma.execution.count({ where }),
    ]);

    return reply.status(200).send({
      success: true,
      data: { executions },
      meta: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) },
    });
  });

  fastify.get('/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const execution = await prisma.execution.findUnique({
      where: { id: request.params.id },
      include: { workflow: true, nodes: true },
    });

    if (!execution) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Execution not found' },
      });
    }

    return reply.status(200).send({
      success: true,
      data: { execution },
    });
  });

  fastify.post('/:id/cancel', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const execution = await prisma.execution.findUnique({
      where: { id: request.params.id },
    });

    if (!execution) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Execution not found' } });
    }

    if (!['queued', 'running', 'waiting'].includes(execution.status)) {
      return reply.status(400).send({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'Cannot cancel execution in current state' },
      });
    }

    await prisma.execution.update({
      where: { id: request.params.id },
      data: { status: 'cancelled', finishedAt: new Date() },
    });

    await prisma.executionNode.updateMany({
      where: { executionId: request.params.id, status: { in: ['queued', 'running'] } },
      data: { status: 'cancelled', finishedAt: new Date() },
    });

    await prisma.auditLog.create({
      data: {
        workspaceId: execution.workspaceId,
        userId: request.userId,
        action: 'execution.cancelled',
        targetType: 'execution',
        targetId: execution.id,
      },
    });

    return reply.status(200).send({ success: true });
  });

  fastify.post('/:id/retry', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const execution = await prisma.execution.findUnique({
      where: { id: request.params.id },
    });

    if (!execution) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Execution not found' } });
    }

    const idempotencyKey = `${execution.workflowId}-${Date.now()}-retry-${generateIdempotencyKey()}`;

    await prisma.execution.update({
      where: { id: request.params.id },
      data: { status: 'queued', finishedAt: null, error: null },
    });

    await prisma.executionNode.updateMany({
      where: { executionId: request.params.id },
      data: { status: 'pending', startedAt: null, finishedAt: null, error: null, retryCount: 0 },
    });

    const newExecution = await prisma.execution.create({
      data: {
        workflowId: execution.workflowId,
        workflowVersionId: execution.workflowVersionId,
        triggerType: execution.triggerType,
        triggerId: execution.triggerId,
        status: 'queued',
        idempotencyKey,
        createdBy: request.userId,
      },
    });

    await prisma.auditLog.create({
      data: {
        workspaceId: execution.workspaceId,
        userId: request.userId,
        action: 'execution.retried',
        targetType: 'execution',
        targetId: newExecution.id,
      },
    });

    return reply.status(201).send({
      success: true,
      data: { execution: newExecution },
    });
  });

  fastify.get('/:id/logs', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const logs = await prisma.executionLog.findMany({
      where: { executionId: request.params.id },
      orderBy: { createdAt: 'asc' },
    });

    return reply.status(200).send({
      success: true,
      data: { logs },
    });
  });
};