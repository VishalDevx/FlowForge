import 'dotenv/config';
import cron from 'node-cron';
import { db } from '@flowforge/db';
import logger from '@flowforge/logger';
import { createExecutionJob } from '@flowforge/queue';

export interface EventPayload {
  topic: string;
  payload: Record<string, unknown>;
  source?: string;
}

class EventBus {
  private static instance: EventBus;
  private subscribers: Map<string, Array<(payload: EventPayload) => void>> = new Map();

  static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  subscribe(topic: string, handler: (payload: EventPayload) => void): () => void {
    if (!this.subscribers.has(topic)) {
      this.subscribers.set(topic, []);
    }
    this.subscribers.get(topic)!.push(handler);

    // Return unsubscribe function
    return () => {
      const handlers = this.subscribers.get(topic);
      if (handlers) {
        const idx = handlers.indexOf(handler);
        if (idx > -1) handlers.splice(idx, 1);
      }
    };
  }

  async publish(topic: string, payload: Record<string, unknown>, source?: string): Promise<void> {
    logger.info({ topic, source }, 'Event published');

    // Store event for replay/debug
    await db.execution.create({
      data: {
        workflowId: '0000000-0000-0000-0000-000000000000', // placeholder
        workflowVersionId: '0000000-0000-0000-0000-000000000000',
        workspaceId: '0000000-0000-0000-0000-000000000000',
        triggerType: 'event',
        input: { topic, payload, source },
        status: 'success', // placeholder
      },
    }).catch(() => {}); // Ignore errors for placeholder

    // Notify subscribers
    const handlers = this.subscribers.get(topic) || [];
    await Promise.allSettled(
      handlers.map(handler => handler({ topic, payload, source }))
    );

    // Trigger workflows listening on this topic
    await this.triggerEventWorkflows(topic, payload);
  }

  private async triggerEventWorkflows(topic: string, payload: Record<string, unknown>): Promise<void> {
    try {
      const triggers = await db.workflowTrigger.findMany({
        where: {
          type: 'event',
          enabled: true,
          config: {
            path: ['topic'],
            equals: topic,
          },
        },
        include: { workflow: true },
      });

      for (const trigger of triggers) {
        try {
          const workflow = trigger.workflow;
          const publishedVersion = await db.workflowVersion.findFirst({
            where: { workflowId: workflow.id, status: 'published' },
          });

          if (!publishedVersion) continue;

          const execution = await db.execution.create({
            data: {
              workflowId: workflow.id,
              workflowVersionId: publishedVersion.id,
              workspaceId: workflow.workspaceId,
              triggerType: 'event',
              triggerId: trigger.id,
              input: { topic, ...payload },
              status: 'queued',
            },
          });

          // Get first node
          const nodes = (publishedVersion.nodes as any[]) || [];
          const firstNode = nodes[0];
          if (firstNode) {
            await createExecutionJob({
              executionId: execution.id,
              nodeId: firstNode.id,
              nodeType: firstNode.type,
              config: firstNode.config || {},
              input: { topic, ...payload },
              retryCount: 0,
              executionContext: {
                workflowId: workflow.id,
                workflowVersionId: publishedVersion.id,
                triggerType: 'event',
                triggerId: trigger.id,
                idempotencyKey: `event-${trigger.id}-${Date.now()}`,
              },
            });
          }

          logger.info({ triggerId: trigger.id, executionId: execution.id }, 'Event trigger fired');
        } catch (error) {
          logger.error({ triggerId: trigger.id, error }, 'Failed to fire event trigger');
        }
      }
    } catch (error) {
      logger.error({ topic, error }, 'Failed to trigger event workflows');
    }
  }
}

export const eventBus = EventBus.getInstance();

// Export function to publish events
export async function publishEvent(
  topic: string,
  payload: Record<string, unknown>,
  source?: string
): Promise<void> {
  return eventBus.publish(topic, payload, source);
}

// Start the scheduler
export async function startScheduler(): Promise<void> {
  await db.$connect();
  
  logger.info('Starting advanced scheduler...');

  // Every minute: process cron and scheduled triggers
  cron.schedule('* * * * *', async () => {
    await processCronTriggers();
    await processScheduledTriggers();
  });

  // Every second: process interval triggers
  cron.schedule('* * * * * *', async () => {
    await processIntervalTriggers();
    await processOneShotTriggers();
    await processBusinessHoursTriggers();
  });

  logger.info('Advanced scheduler started');
}

async function processCronTriggers(): Promise<void> {
  const triggers = await db.workflowTrigger.findMany({
    where: { type: 'cron', enabled: true },
    include: { workflow: true },
  });

  for (const trigger of triggers) {
    try {
      const config = trigger.config as any;
      if (!cron.validate(config.expression)) continue;

      // Check misfire policy
      if (config.misfirePolicy === 'skip') {
        const recent = await db.execution.findFirst({
          where: {
            triggerId: trigger.id,
            createdAt: { gte: new Date(Date.now() - 60000) },
          },
        });
        if (recent) continue;
      }

      // Check if previous still running
      if (config.skipIfRunning) {
        const running = await db.execution.findFirst({
          where: {
            triggerId: trigger.id,
            status: { in: ['queued', 'running', 'waiting'] },
          },
        });
        if (running) continue;
      }

      const workflow = trigger.workflow;
      const publishedVersion = await db.workflowVersion.findFirst({
        where: { workflowId: workflow.id, status: 'published' },
      });

      if (!publishedVersion) continue;

      const execution = await db.execution.create({
        data: {
          workflowId: workflow.id,
          workflowVersionId: publishedVersion.id,
          workspaceId: workflow.workspaceId,
          triggerType: 'cron',
          triggerId: trigger.id,
          input: { expression: config.expression, timezone: config.timezone },
          status: 'queued',
        },
      });

      const nodes = (publishedVersion.nodes as any[]) || [];
      const firstNode = nodes[0];
      if (firstNode) {
        await createExecutionJob({
          executionId: execution.id,
          nodeId: firstNode.id,
          nodeType: firstNode.type,
          config: firstNode.config || {},
          input: {},
          retryCount: 0,
          executionContext: {
            workflowId: workflow.id,
            workflowVersionId: publishedVersion.id,
            triggerType: 'cron',
            triggerId: trigger.id,
            idempotencyKey: `cron-${trigger.id}-${Date.now()}`,
          },
        });
      }

      logger.info({ triggerId: trigger.id, executionId: execution.id }, 'Cron trigger fired');
    } catch (error) {
      logger.error({ triggerId: trigger.id, error }, 'Failed to process cron trigger');
    }
  }
}

async function processScheduledTriggers(): Promise<void> {
  const now = new Date();
  
  const triggers = await db.workflowTrigger.findMany({
    where: {
      type: 'scheduled',
      enabled: true,
      config: {
        path: ['at'],
        lte: now.toISOString(),
      },
    },
  });

  for (const trigger of triggers) {
    try {
      const workflow = await db.workflow.findUnique({
        where: { id: trigger.workflowId },
      });
      if (!workflow) continue;

      const publishedVersion = await db.workflowVersion.findFirst({
        where: { workflowId: workflow.id, status: 'published' },
      });
      if (!publishedVersion) continue;

      const execution = await db.execution.create({
        data: {
          workflowId: workflow.id,
          workflowVersionId: publishedVersion.id,
          workspaceId: workflow.workspaceId,
          triggerType: 'scheduled',
          triggerId: trigger.id,
          input: { scheduledAt: now.toISOString() },
          status: 'queued',
        },
      });

      // Disable after firing
      await db.workflowTrigger.update({
        where: { id: trigger.id },
        data: { enabled: false },
      });

      logger.info({ triggerId: trigger.id }, 'Scheduled trigger fired and disabled');
    } catch (error) {
      logger.error({ triggerId: trigger.id, error }, 'Failed to process scheduled trigger');
    }
  }
}

async function processIntervalTriggers(): Promise<void> {
  const now = Date.now();
  
  const triggers = await db.workflowTrigger.findMany({
    where: { type: 'interval', enabled: true },
  });

  for (const trigger of triggers) {
    try {
      const config = trigger.config as any;
      const lastRunKey = `interval-lastrun-${trigger.id}`;
      
      // In production, use Redis for this
      const lastRun = (global as any)[lastRunKey] || 0;
      
      if (now - lastRun >= config.everyMs) {
        (global as any)[lastRunKey] = now;

        const workflow = await db.workflow.findUnique({
          where: { id: trigger.workflowId },
        });
        if (!workflow) continue;

        const publishedVersion = await db.workflowVersion.findFirst({
          where: { workflowId: workflow.id, status: 'published' },
        });
        if (!publishedVersion) continue;

        await db.execution.create({
          data: {
            workflowId: workflow.id,
            workflowVersionId: publishedVersion.id,
            workspaceId: workflow.workspaceId,
            triggerType: 'interval',
            triggerId: trigger.id,
            input: { intervalMs: config.everyMs },
            status: 'queued',
          },
        });

        logger.info({ triggerId: trigger.id }, 'Interval trigger fired');
      }
    } catch (error) {
      logger.error({ triggerId: trigger.id, error }, 'Failed to process interval trigger');
    }
  }
}

async function processOneShotTriggers(): Promise<void> {
  const now = new Date();
  
  const triggers = await db.workflowTrigger.findMany({
    where: {
      type: 'one_shot',
      enabled: true,
      config: {
        path: ['at'],
        lte: now.toISOString(),
      },
    },
  });

  for (const trigger of triggers) {
    try {
      const workflow = await db.workflow.findUnique({
        where: { id: trigger.workflowId },
      });
      if (!workflow) continue;

      const publishedVersion = await db.workflowVersion.findFirst({
        where: { workflowId: workflow.id, status: 'published' },
      });
      if (!publishedVersion) continue;

      await db.execution.create({
        data: {
          workflowId: workflow.id,
          workflowVersionId: publishedVersion.id,
          workspaceId: workflow.workspaceId,
          triggerType: 'one_shot',
          triggerId: trigger.id,
          input: { firedAt: now.toISOString() },
          status: 'queued',
        },
      });

      await db.workflowTrigger.update({
        where: { id: trigger.id },
        data: { enabled: false },
      });

      logger.info({ triggerId: trigger.id }, 'One-shot trigger fired and disabled');
    } catch (error) {
      logger.error({ triggerId: trigger.id, error }, 'Failed to process one-shot trigger');
    }
  }
}

async function processBusinessHoursTriggers(): Promise<void> {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const timeString = now.toTimeString().slice(0, 5);
  
  const triggers = await db.workflowTrigger.findMany({
    where: { type: 'business_hours', enabled: true },
  });

  for (const trigger of triggers) {
    try {
      const config = trigger.config as any;
      
      // Check work days
      if (!config.workDays?.includes(dayOfWeek)) continue;
      
      // Check work hours
      if (timeString < config.workHoursStart || timeString > config.workHoursEnd) continue;
      
      // Check excluded dates
      if (config.excludeDates) {
        const todayStr = now.toISOString().slice(0, 10);
        if (config.excludeDates.includes(todayStr)) continue;
      }
      
      // Check if already fired today
      const todayStart = new Date(now.toISOString().slice(0, 10));
      const existing = await db.execution.findFirst({
        where: {
          triggerId: trigger.id,
          createdAt: { gte: todayStart },
        },
      });
      
      if (existing) continue;

      const workflow = await db.workflow.findUnique({
        where: { id: trigger.workflowId },
      });
      if (!workflow) continue;

      const publishedVersion = await db.workflowVersion.findFirst({
        where: { workflowId: workflow.id, status: 'published' },
      });
      if (!publishedVersion) continue;

      await db.execution.create({
        data: {
          workflowId: workflow.id,
          workflowVersionId: publishedVersion.id,
          workspaceId: workflow.workspaceId,
          triggerType: 'business_hours',
          triggerId: trigger.id,
          input: { firedAt: now.toISOString() },
          status: 'queued',
        },
      });

      logger.info({ triggerId: trigger.id }, 'Business hours trigger fired');
    } catch (error) {
      logger.error({ triggerId: trigger.id, error }, 'Failed to process business hours trigger');
    }
  }
}

// Start if this is the main module
if (require.main === module) {
  startScheduler().catch((error) => {
    logger.error(error, 'Failed to start scheduler');
    process.exit(1);
  });

  const shutdown = async () => {
    logger.info('Shutting down scheduler...');
    await db.$disconnect();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}
