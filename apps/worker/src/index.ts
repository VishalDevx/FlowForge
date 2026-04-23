import { Worker, Job } from 'bullmq';
import { PrismaClient } from '@flowforge/db';
import logger from '@flowforge/logger';
import { executeNode } from '@flowforge/nodes';
import {
  executionQueue,
  retryQueue,
  deadLetterQueue,
  moveToDeadLetter,
  EXECUTION_QUEUE,
} from '@flowforge/queue';
import {
  nodeExecutionDuration,
  nodeExecutionsTotal,
  activeWorkers,
} from '@flowforge/observability';

const prisma = new PrismaClient();
const WORKER_ID = `worker-${process.env.HOSTNAME || process.pid}`;

const processJob = async (job: Job) => {
  const { executionId, nodeId, nodeType, config, input, retryCount, executionContext } = job.data;
  
  logger.info({ executionId, nodeId, nodeType }, 'Processing node execution');
  
  const startTime = Date.now();
  
  try {
    const result = await executeNode(nodeType, config, input);
    
    nodeExecutionDuration.observe({ node_type: nodeType, status: result.success ? 'success' : 'failed' }, (Date.now() - startTime) / 1000);
    nodeExecutionsTotal.inc({ node_type: nodeType, status: result.success ? 'success' : 'failed' });
    
    if (result.success) {
      await prisma.executionNode.update({
        where: { id: `${executionId}-${nodeId}` },
        data: {
          status: 'success',
          output: result.output as any,
          finishedAt: new Date(),
        },
      });
      
      return { success: true, output: result.output };
    }
    
    if (result.retry?.shouldRetry && retryCount < 3) {
      const delay = result.retry.retryDelayMs || 1000;
      await retryQueue.add('retry-node', {
        ...job.data,
        retryCount: retryCount + 1,
      }, { delay });
      
      return { success: false, retry: true };
    }
    
    await prisma.executionNode.update({
      where: { id: `${executionId}-${nodeId}` },
      data: {
        status: 'failed',
        error: result.error,
        finishedAt: new Date(),
      },
    });
    
    if (retryCount >= 3) {
      await moveToDeadLetter(job.data, result.error || 'Max retries exceeded');
    }
    
    return { success: false, error: result.error };
  } catch (error) {
    logger.error({ error, executionId, nodeId }, 'Node execution failed');
    
    nodeExecutionDuration.observe({ node_type: nodeType, status: 'failed' }, (Date.now() - startTime) / 1000);
    nodeExecutionsTotal.inc({ node_type: nodeType, status: 'failed' });
    
    await prisma.executionNode.update({
      where: { id: `${executionId}-${nodeId}` },
      data: {
        status: 'failed',
        error: (error as Error).message,
        finishedAt: new Date(),
      },
    });
    
    throw error;
  }
};

const startWorker = async () => {
  await prisma.$connect();
  
  const worker = new Worker(
    EXECUTION_QUEUE,
    async (job) => processJob(job),
    {
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
      concurrency: parseInt(process.env.WORKER_CONCURRENCY || '5'),
    }
  );
  
  activeWorkers.inc({ worker_id: WORKER_ID });
  
  worker.on('completed', (job) => {
    logger.info({ jobId: job.id, executionId: job.data.executionId }, 'Job completed');
  });
  
  worker.on('failed', (job, error) => {
    logger.error({ jobId: job?.id, error: error.message }, 'Job failed');
  });
  
  worker.on('stalled', (jobId) => {
    logger.warn({ jobId }, 'Job stalled');
  });
  
  logger.info({ workerId: WORKER_ID }, 'Worker started');
  
  const shutdown = async () => {
    logger.info('Shutting down worker...');
    await worker.close();
    await prisma.$disconnect();
    process.exit(0);
  };
  
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
};

startWorker().catch((error) => {
  logger.error(error, 'Failed to start worker');
  process.exit(1);
});