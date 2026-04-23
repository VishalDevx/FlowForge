import cron from 'node-cron';
import { PrismaClient } from '@flowforge/db';
import logger from '@flowforge/logger';
import { createExecutionJob, createScheduledJob } from '@flowforge/queue';
import { generateIdempotencyKey } from '@flowforge/contracts';

const prisma = new PrismaClient();

const processCronTriggers = async () => {
  logger.info('Processing cron triggers');
  
  const triggers = await prisma.workflowTrigger.findMany({
    where: { type: 'cron', enabled: true },
    include: { workflow: { include: { versions: { where: { status: 'published' }, take: 1 } } } },
  });
  
  for (const trigger of triggers) {
    try {
      const publishedVersion = trigger.workflow.versions[0];
      if (!publishedVersion) continue;
      
      const now = new Date();
      const triggerConfig = trigger.config as { timezone?: string; expression?: string };
      const cronExpression = triggerConfig.expression || '0 * * * *';
      
      if (!cron.validate(cronExpression)) continue;
      
      const lastRun = await prisma.execution.findFirst({
        where: { workflowId: trigger.workflowId, triggerId: trigger.id },
        orderBy: { createdAt: 'desc' },
      });
      
      if (lastRun && now.getTime() - lastRun.createdAt.getTime() < 60000) continue;
      
      const idempotencyKey = `cron-${trigger.id}-${now.getTime()}-${generateIdempotencyKey()}`;
      
      const execution = await prisma.execution.create({
        data: {
          workflowId: trigger.workflowId,
          workflowVersionId: publishedVersion.id,
          triggerType: 'cron',
          triggerId: trigger.id,
          status: 'queued',
          idempotencyKey,
        },
      });
      
      await createExecutionJob({
        executionId: execution.id,
        nodeId: publishedVersion.nodes[0]?.id || '',
        nodeType: publishedVersion.nodes[0]?.type || 'trigger.cron',
        config: publishedVersion.nodes[0]?.config || {},
        input: {},
        retryCount: 0,
        executionContext: {
          workflowId: trigger.workflowId,
          workflowVersionId: publishedVersion.id,
          triggerType: 'cron',
          triggerId: trigger.id,
          idempotencyKey,
        },
      });
      
      logger.info({ triggerId: trigger.id, executionId: execution.id }, 'Cron trigger fired');
    } catch (error) {
      logger.error({ triggerId: trigger.id, error }, 'Failed to process cron trigger');
    }
  }
};

const processScheduledTriggers = async () => {
  logger.info('Processing scheduled triggers');
  
  const triggers = await prisma.workflowTrigger.findMany({
    where: { type: 'scheduled', enabled: true },
    include: { workflow: { include: { versions: { where: { status: 'published' }, take: 1 } } } },
  });
  
  for (const trigger of triggers) {
    try {
      const config = trigger.config as { runAt?: string };
      if (!config.runAt) continue;
      
      const runAt = new Date(config.runAt);
      if (runAt.getTime() <= Date.now()) continue;
      
      const publishedVersion = trigger.workflow.versions[0];
      if (!publishedVersion) continue;
      
      const idempotencyKey = `scheduled-${trigger.id}-${runAt.getTime()}-${generateIdempotencyKey()}`;
      
      await createScheduledJob({
        executionId: trigger.id,
        nodeId: publishedVersion.nodes[0]?.id || '',
        nodeType: publishedVersion.nodes[0]?.type || 'trigger.manual',
        config: publishedVersion.nodes[0]?.config || {},
        input: {},
        retryCount: 0,
        executionContext: {
          workflowId: trigger.workflowId,
          workflowVersionId: publishedVersion.id,
          triggerType: 'scheduled',
          triggerId: trigger.id,
          idempotencyKey,
        },
      }, runAt);
    } catch (error) {
      logger.error({ triggerId: trigger.id, error }, 'Failed to process scheduled trigger');
    }
  }
};

const startScheduler = async () => {
  await prisma.$connect();
  
  cron.schedule('* * * * *', processCronTriggers);
  
  await processScheduledTriggers();
  
  logger.info('Scheduler started');
  
  const shutdown = async () => {
    logger.info('Shutting down scheduler...');
    await prisma.$disconnect();
    process.exit(0);
  };
  
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
};

startScheduler().catch((error) => {
  logger.error(error, 'Failed to start scheduler');
  process.exit(1);
});