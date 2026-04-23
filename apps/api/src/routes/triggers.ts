import { FastifyInstance } from 'fastify';
import { prisma } from '../index.js';
import { TriggerCreateInput, generateIdempotencyKey } from '@flowforge/contracts';
import { generateSlug } from '@flowforge/utils';

export const triggerRoutes = async (fastify: FastifyInstance) => {
  fastify.post('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { workflowId, type, config } = TriggerCreateInput.parse(request.body);

    let webhookKey: string | undefined;
    if (type === 'webhook') {
      webhookKey = generateSlug(`${workflowId}-${generateIdempotencyKey()}`);
    }

    const trigger = await prisma.workflowTrigger.create({
      data: {
        workflowId,
        type,
        config: config as any,
        enabled: true,
        webhookKey,
      },
    });

    return reply.status(201).send({
      success: true,
      data: { trigger },
    });
  });

  fastify.patch('/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { enabled, config } = request.body as Record<string, unknown>;

    const trigger = await prisma.workflowTrigger.update({
      where: { id: request.params.id },
      data: { enabled: enabled as boolean, config: config as any },
    });

    return reply.status(200).send({
      success: true,
      data: { trigger },
    });
  });

  fastify.delete('/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    await prisma.workflowTrigger.delete({
      where: { id: request.params.id },
    });

    return reply.status(200).send({ success: true });
  });

  fastify.post('/:id/test', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const trigger = await prisma.workflowTrigger.findUnique({
      where: { id: request.params.id },
      include: { workflow: true },
    });

    if (!trigger) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Trigger not found' },
      });
    }

    return reply.status(200).send({
      success: true,
      data: { tested: true, triggerId: trigger.id },
    });
  });

  fastify.get('/webhook/:webhookKey', async (request, reply) => {
    const { webhookKey } = request.params as { webhookKey: string };

    const trigger = await prisma.workflowTrigger.findFirst({
      where: { webhookKey, enabled: true },
      include: { workflow: { include: { versions: { where: { status: 'published' }, take: 1 } } } },
    });

    if (!trigger) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Webhook not found' },
      });
    }

    const publishedVersion = trigger.workflow.versions[0];
    if (!publishedVersion) {
      return reply.status(400).send({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'No published version' },
      });
    }

    const input = request.body as Record<string, unknown>;
    const idempotencyKey = `webhook-${webhookKey}-${Date.now()}-${generateIdempotencyKey()}`;

    const execution = await prisma.execution.create({
      data: {
        workflowId: trigger.workflowId,
        workflowVersionId: publishedVersion.id,
        triggerType: 'webhook',
        triggerId: trigger.id,
        status: 'queued',
        input,
        idempotencyKey,
      },
    });

    return reply.status(202).send({
      success: true,
      data: { executionId: execution.id },
    });
  });
};