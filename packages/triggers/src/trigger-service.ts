import { TriggerType } from '@prisma/client';
import { db } from '@flowforge/db';
import { createExecutionJob } from '@flowforge/queue';
import * as crypto from 'crypto';
import { logger } from '@flowforge/logger';

// Re-export types
export type { TriggerType } from '@prisma/client';

export interface TriggerContext {
  workflowId: string;
  triggerId: string;
  payload: Record<string, unknown>;
  headers?: Record<string, string>;
  query?: Record<string, string>;
  remoteAddress?: string;
}

export interface TriggerResult {
  success: boolean;
  executionId?: string;
  error?: string;
}

export class TriggerService {
  /**
   * Handle webhook trigger with all enterprise features
   */
  async handleWebhook(
    webhookKey: string,
    method: string,
    headers: Record<string, string>,
    query: Record<string, string>,
    body: unknown,
    remoteAddress?: string
  ): Promise<TriggerResult> {
    const trigger = await db.workflowTrigger.findUnique({
      where: { webhookKey },
      include: { workflow: true },
    });

    if (!trigger || !trigger.enabled) {
      return { success: false, error: 'Trigger not found or disabled' };
    }

    const config = trigger.config as any;

    // Validate HTTP method
    if (config.method && config.method !== 'ANY' && config.method !== method) {
      return { success: false, error: `Method ${method} not allowed` };
    }

    // IP allowlist check
    if (config.ipAllowlist?.length > 0 && remoteAddress) {
      if (!config.ipAllowlist.includes(remoteAddress)) {
        return { success: false, error: 'IP not allowed' };
      }
    }

    // HMAC signature verification
    if (config.hmacSecret) {
      const signature = headers['x-hmac-signature'] || headers['authorization']?.replace('Bearer ', '');
      if (!signature) {
        return { success: false, error: 'Missing signature' };
      }
      const expected = this.generateHmac(body, config.hmacSecret, config.hmacAlgorithm || 'sha256');
      if (signature !== expected) {
        return { success: false, error: 'Invalid signature' };
      }
    }

    // Timestamp tolerance (replay window)
    if (config.timestampToleranceMs) {
      const timestamp = headers['x-timestamp'] || query?.['timestamp'];
      if (timestamp) {
        const ts = parseInt(timestamp as string);
        if (Date.now() - ts > config.timestampToleranceMs) {
          return { success: false, error: 'Request too old (replay window exceeded)' };
        }
      }
    }

    // Idempotency key deduplication
    if (config.idempotencyKey) {
      const idemKey = headers[config.idempotencyKey.toLowerCase()] || query?.[config.idempotencyKey];
      if (idemKey) {
        const existing = await db.execution.findFirst({
          where: { idempotencyKey: idemKey as string, triggerId: trigger.id },
        });
        if (existing) {
          return { success: true, executionId: existing.id };
        }
      }
    }

    // Build payload with header/query mapping
    const payload: Record<string, unknown> = {};
    
    if (config.mapQueryToInput && query) {
      Object.assign(payload, query);
    }
    
    if (config.mapHeadersToInput && headers) {
      payload.headers = headers;
    }

    if (body && typeof body === 'object') {
      Object.assign(payload, body);
    }

    // Test mode - log only
    if (config.testMode) {
      console.log('[Webhook Test Mode]', { triggerId: trigger.id, payload });
      return { success: true };
    }

    return this.createExecution(trigger.workflowId, trigger.id, 'webhook', payload);
  }

  /**
   * Handle cron trigger with timezone and misfire policy
   */
  async handleCron(triggerId: string): Promise<TriggerResult> {
    const trigger = await db.workflowTrigger.findUnique({
      where: { id: triggerId },
      include: { workflow: true },
    });

    if (!trigger || !trigger.enabled) {
      return { success: false, error: 'Trigger not found or disabled' };
    }

    const config = trigger.config as any;

    // Skip if previous run still active
    if (config.skipIfRunning) {
      const running = await db.execution.findFirst({
        where: {
          triggerId,
          status: { in: ['queued', 'running', 'waiting'] },
        },
      });
      if (running) {
        return { success: false, error: 'Previous execution still active' };
      }
    }

    return this.createExecution(trigger.workflowId, trigger.id, 'cron', {
      scheduledAt: new Date().toISOString(),
      expression: config.expression,
      timezone: config.timezone || 'UTC',
    });
  }

  /**
   * Create execution and queue it
   */
  private async createExecution(
    workflowId: string,
    triggerId: string,
    triggerType: string,
    input: Record<string, unknown>
  ): Promise<TriggerResult> {
    try {
      const workflow = await db.workflow.findUnique({
        where: { id: workflowId },
        include: { versions: { where: { status: 'published' }, take: 1 } },
      });

      if (!workflow?.publishedVersionId) {
        return { success: false, error: 'Workflow not published' };
      }

      const execution = await db.execution.create({
        data: {
          workflowId,
          workflowVersionId: workflow.publishedVersionId,
          workspaceId: workflow.workspaceId,
          triggerType: triggerType as any,
          triggerId,
          input,
          status: 'queued',
        },
      });

      // Queue the start node for execution via BullMQ
      const { executionQueue } = await import('@flowforge/queue');
      await executionQueue.add('execute-workflow', {
        executionId: execution.id,
        workflowId: execution.workflowId,
        workflowVersionId: execution.workflowVersionId,
        nodeId: 'start',
        nodeType: 'trigger',
        config: {},
        input,
        retryCount: 0,
        executionContext: {
          executionId: execution.id,
          idempotencyKey: `${execution.id}-start`,
          triggerType,
          input,
        },
      });

      logger.info({ executionId: execution.id }, 'Execution queued via trigger');

      return { success: true, executionId: execution.id };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private generateHmac(
    body: unknown,
    secret: string,
    algorithm: string = 'sha256'
  ): string {
    const hmac = crypto.createHmac(algorithm === 'sha512' ? 'sha512' : 'sha256', secret);
    hmac.update(typeof body === 'string' ? body : JSON.stringify(body));
    return hmac.digest('hex');
  }
}

export const triggerService = new TriggerService();
