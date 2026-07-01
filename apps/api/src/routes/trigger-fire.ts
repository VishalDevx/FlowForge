import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '@flowforge/db';
import { triggerEngine } from '@flowforge/triggers';

/**
 * Universal trigger endpoint
 * POST /api/v1/triggers/:id/fire
 * Body: TriggerContext (varies by trigger type)
 */
export async function triggerFireRoutes(fastify: FastifyInstance) {
  // Universal trigger handler (single server action)
  fastify.post('/api/v1/triggers/:id/fire', async (
    request: FastifyRequest<{
      Params: { id: string };
      Body: Record<string, unknown>;
    }>,
    reply: FastifyReply
  ) => {
    const { id } = request.params;
    const body = request.body;

    // Build TriggerContext from request
    const ctx: Record<string, unknown> = {
      ...body,
      method: request.method,
      headers: request.headers,
      query: request.query,
      remoteAddress: request.ip || request.socket.remoteAddress,
      webhookKey: id,
    };

    const result = await triggerEngine.handle(id, ctx as any);

    if (!result.success) {
      return reply.code(400).send({
        success: false,
        error: { code: 'TRIGGER_ERROR', message: result.error, reason: result.reason },
      });
    }

    if (result.skipped) {
      return reply.code(200).send({
        success: true,
        skipped: true,
        reason: result.reason,
      });
    }

    return {
      success: true,
      executionId: result.executionId,
      message: 'Trigger fired successfully',
    };
  });

  // Webhook receiver (calls TriggerEngine internally)
  fastify.all('/api/webhooks/:key', async (
    request: FastifyRequest<{ Params: { key: string } }>,
    reply: FastifyReply
  ) => {
    const { key } = request.params;

    // Find trigger by webhook key
    const trigger = await db.workflowTrigger.findUnique({
      where: { webhookKey: key },
    });

    if (!trigger) {
      return reply.code(404).send({ success: false, error: 'Webhook not found' });
    }

    const ctx: Record<string, unknown> = {
      method: request.method,
      headers: request.headers,
      query: request.query,
      body: request.body,
      remoteAddress: request.ip || request.socket.remoteAddress,
      webhookKey: key,
    };

    const result = await triggerEngine.handle(trigger.id, ctx as any);

    if (!result.success) {
      return reply.code(400).send({
        success: false,
        error: result.error,
        reason: result.reason,
      });
    }

    return {
      success: true,
      executionId: result.executionId,
      message: 'Webhook received',
    };
  });

  // Test trigger (dry run, no execution)
  fastify.post('/api/v1/triggers/:id/test', async (
    request: FastifyRequest<{
      Params: { id: string };
      Body: { payload?: Record<string, unknown> };
    }>,
    reply: FastifyReply
  ) => {
    const { id } = request.params;
    const { payload = {} } = request.body;

    const ctx: Record<string, unknown> = {
      ...payload,
      testMode: true,
    };

    const result = await triggerEngine.handle(id, ctx as any);

    return {
      success: true,
      message: 'Test successful (dry run)',
      result,
    };
  });
}
