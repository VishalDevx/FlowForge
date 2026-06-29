import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '@flowforge/db';
import * as crypto from 'crypto';

interface CreateTriggerBody {
  workflowId: string;
  type: string;
  config: Record<string, unknown>;
}

interface UpdateTriggerBody {
  config?: Record<string, unknown>;
  enabled?: boolean;
}

export async function triggerRoutes(fastify: FastifyInstance) {
  // List triggers
  fastify.get('/api/v1/workflows/:workflowId/triggers', async (
    request: FastifyRequest<{ Params: { workflowId: string } }>,
    reply: FastifyReply
  ) => {
    const { workflowId } = request.params;

    const triggers = await db.workflowTrigger.findMany({
      where: { workflowId },
      orderBy: { createdAt: 'desc' },
    });

    return { success: true, triggers };
  });

  // Get single trigger
  fastify.get('/api/v1/triggers/:id', async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) => {
    const { id } = request.params;

    const trigger = await db.workflowTrigger.findUnique({
      where: { id },
      include: { workflow: true },
    });

    if (!trigger) {
      return reply.code(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Trigger not found' },
      });
    }

    return { success: true, trigger };
  });

  // Create trigger
  fastify.post('/api/v1/workflows/:workflowId/triggers', async (
    request: FastifyRequest<{
      Params: { workflowId: string };
      Body: CreateTriggerBody;
    }>,
    reply: FastifyReply
  ) => {
    const { workflowId } = request.params;
    const { type, config } = request.body;

    // Validate workflow exists
    const workflow = await db.workflow.findUnique({
      where: { id: workflowId },
    });

    if (!workflow) {
      return reply.code(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Workflow not found' },
      });
    }

    // Generate webhook key for webhook triggers
    let webhookKey: string | undefined;
    if (type.startsWith('webhook')) {
      webhookKey = crypto.randomBytes(32).toString('hex');
    }

    const trigger = await db.workflowTrigger.create({
      data: {
        workflowId,
        type: type as any,
        config,
        webhookKey,
        enabled: true,
      },
    });

    const response: any = { success: true, trigger };
    if (webhookKey) {
      response.webhookUrl = `/api/webhooks/${webhookKey}`;
    }

    return reply.code(201).send(response);
  });

  // Update trigger
  fastify.put('/api/v1/triggers/:id', async (
    request: FastifyRequest<{
      Params: { id: string };
      Body: UpdateTriggerBody;
    }>,
    reply: FastifyReply
  ) => {
    const { id } = request.params;
    const { config, enabled } = request.body;

    const trigger = await db.workflowTrigger.findUnique({
      where: { id },
    });

    if (!trigger) {
      return reply.code(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Trigger not found' },
      });
    }

    const updated = await db.workflowTrigger.update({
      where: { id },
      data: {
        ...(config && { config }),
        ...(enabled !== undefined && { enabled }),
      },
    });

    return { success: true, trigger: updated };
  });

  // Delete trigger
  fastify.delete('/api/v1/triggers/:id', async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) => {
    const { id } = request.params;

    await db.workflowTrigger.delete({
      where: { id },
    });

    return { success: true, message: 'Trigger deleted' };
  });

  // Toggle trigger (enable/disable)
  fastify.patch('/api/v1/triggers/:id/toggle', async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) => {
    const { id } = request.params;

    const trigger = await db.workflowTrigger.findUnique({
      where: { id },
    });

    if (!trigger) {
      return reply.code(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Trigger not found' },
      });
    }

    const updated = await db.workflowTrigger.update({
      where: { id },
      data: { enabled: !trigger.enabled },
    });

    return {
      success: true,
      enabled: updated.enabled,
      message: updated.enabled ? 'Trigger enabled' : 'Trigger disabled',
    };
  });

  // Test trigger (dry run)
  fastify.post('/api/v1/triggers/:id/test', async (
    request: FastifyRequest<{
      Params: { id: string };
      Body: { payload?: Record<string, unknown> };
    }>,
    reply: FastifyReply
  ) => {
    const { id } = request.params;
    const { payload = {} } = request.body;

    const trigger = await db.workflowTrigger.findUnique({
      where: { id },
      include: { workflow: true },
    });

    if (!trigger) {
      return reply.code(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Trigger not found' },
      });
    }

    // Log test run
    console.log('[Trigger Test]', {
      triggerId: id,
      type: trigger.type,
      payload,
    });

    return {
      success: true,
      message: 'Test successful (dry run, no execution created)',
      payload,
    };
  });

  // Get webhook URL for a trigger
  fastify.get('/api/v1/triggers/:id/webhook-url', async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) => {
    const { id } = request.params;

    const trigger = await db.workflowTrigger.findUnique({
      where: { id },
    });

    if (!trigger || !trigger.webhookKey) {
      return reply.code(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Webhook trigger not found' },
      });
    }

    const baseUrl = process.env.API_BASE_URL || 'http://localhost:3000';
    const webhookUrl = `${baseUrl}/api/webhooks/${trigger.webhookKey}`;

    return {
      success: true,
      webhookUrl,
      webhookKey: trigger.webhookKey,
    };
  });

  // Rotate webhook URL/secret
  fastify.post('/api/v1/triggers/:id/rotate', async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) => {
    const { id } = request.params;

    const trigger = await db.workflowTrigger.findUnique({
      where: { id },
    });

    if (!trigger) {
      return reply.code(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Trigger not found' },
      });
    }

    const newWebhookKey = crypto.randomBytes(32).toString('hex');
    const newSecret = crypto.randomBytes(32).toString('hex');

    const updated = await db.workflowTrigger.update({
      where: { id },
      data: {
        webhookKey: newWebhookKey,
        config: {
          ...(trigger.config as any),
          hmacSecret: newSecret,
        },
      },
    });

    const baseUrl = process.env.API_BASE_URL || 'http://localhost:3000';

    return {
      success: true,
      webhookUrl: `${baseUrl}/api/webhooks/${newWebhookKey}`,
      secret: newSecret,
      message: 'Webhook URL and secret rotated',
    };
  });
}
