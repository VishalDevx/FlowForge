import { FastifyInstance } from 'fastify';
import * as crypto from 'crypto';
import { db } from '@flowforge/db';
import { TriggerService } from './trigger-service';

export async function webhookRoutes(fastify: FastifyInstance) {
  // Main webhook endpoint - handles all webhook types
  fastify.all('/api/webhooks/:key', async (request, reply) => {
    const { key } = request.params as { key: string };
    const method = request.method;
    const headers = request.headers as Record<string, string>;
    const query = request.query as Record<string, string>;
    const body = request.body;
    const remoteAddress = request.ip || request.socket.remoteAddress;

    const triggerService = new TriggerService();
    const result = await triggerService.handleWebhook(
      key,
      method,
      headers,
      query,
      body,
      remoteAddress
    );

    if (!result.success) {
      return reply.code(400).send({
        success: false,
        error: { code: 'WEBHOOK_ERROR', message: result.error },
      });
    }

    return {
      success: true,
      executionId: result.executionId,
      message: 'Webhook received',
    };
  });

  // Multiple URL webhook endpoint
  fastify.post('/api/webhooks/multi/:key', async (request, reply) => {
    const { key } = request.params as { key: string };
    const trigger = await db.workflowTrigger.findUnique({
      where: { webhookKey: key, enabled: true },
    });

    if (!trigger) {
      return reply.code(404).send({ success: false, error: 'Trigger not found' });
    }

    const config = trigger.config as any;
    const urls = config.urls || [];
    const strategy = config.strategy || 'all';

    const results = await Promise.allSettled(
      urls.map((url: string) =>
        fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request.body),
        })
      )
    );

    if (strategy === 'first-success') {
      const firstSuccess = results.find(r => r.status === 'fulfilled');
      if (!firstSuccess) {
        return reply.code(502).send({ success: false, error: 'All URLs failed' });
      }
    } else if (strategy === 'all') {
      const failures = results.filter(r => r.status === 'rejected');
      if (failures.length > 0) {
        return reply.code(502).send({ success: false, error: 'Some URLs failed' });
      }
    }

    return { success: true, results: results.length };
  });

  // Webhook with custom path
  fastify.all('/api/webhooks/custom/*', async (request, reply) => {
    const url = request.url;
    const pathMatch = url.match(/\/api\/webhooks\/custom\/(.+)/);
    if (!pathMatch) {
      return reply.code(400).send({ success: false, error: 'Invalid path' });
    }

    const customPath = '/' + pathMatch[1];
    const trigger = await db.workflowTrigger.findFirst({
      where: {
        type: 'webhook_custom_path',
        enabled: true,
        config: { path: ['path'], equals: customPath },
      },
    });

    if (!trigger) {
      return reply.code(404).send({ success: false, error: 'Trigger not found' });
    }

    // Process as regular webhook
    const triggerService = new TriggerService();
    const result = await triggerService.handleWebhook(
      trigger.webhookKey!,
      request.method,
      request.headers as Record<string, string>,
      request.query as Record<string, string>,
      request.body,
      request.ip || request.socket.remoteAddress
    );

    return result;
  });
}
