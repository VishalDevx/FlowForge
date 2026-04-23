import { Queue, Worker, FlowProducer } from 'bullmq';
import redis from '@flowforge/redis';
import { JobDataSchema, type JobData } from '@flowforge/contracts';

export const EXECUTION_QUEUE = 'execution';
export const RETRY_QUEUE = 'retry';
export const SCHEDULED_QUEUE = 'scheduled';
export const DEAD_LETTER_QUEUE = 'dead-letter';

export const executionQueue = new Queue(EXECUTION_QUEUE, {
  connection: redis,
  defaultJobOptions: {
    attempts: 1,
    removeOnComplete: 1000,
    removeOnFail: 1000,
  },
});

export const retryQueue = new Queue(RETRY_QUEUE, {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
    removeOnComplete: 1000,
    removeOnFail: 1000,
  },
});

export const scheduledQueue = new Queue(SCHEDULED_QUEUE, {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: 1000,
    removeOnFail: 1000,
  },
});

export const deadLetterQueue = new Queue(DEAD_LETTER_QUEUE, {
  connection: redis,
  defaultJobOptions: {
    removeOnFail: 10000,
  },
});

export const createExecutionJob = async (jobData: JobData) => {
  return executionQueue.add('execute-node', jobData, {
    jobId: jobData.executionContext.idempotencyKey,
  });
};

export const createRetryJob = async (jobData: JobData, delayMs: number) => {
  return retryQueue.add('retry-node', jobData, {
    delay: delayMs,
  });
};

export const createScheduledJob = async (jobData: JobData, runAt: Date) => {
  const delay = runAt.getTime() - Date.now();
  if (delay > 0) {
    return scheduledQueue.add('scheduled-node', jobData, { delay });
  }
};

export const moveToDeadLetter = async (jobData: JobData, error: string) => {
  return deadLetterQueue.add('dead-letter', { ...jobData, error }, {
    jobId: `dlq-${jobData.executionContext.idempotencyKey}`,
  });
};

export const getQueueMetrics = async () => {
  const [execution, retry, scheduled, deadLetter] = await Promise.all([
    executionQueue.getJobCounts(),
    retryQueue.getJobCounts(),
    scheduledQueue.getJobCounts(),
    deadLetterQueue.getJobCounts(),
  ]);

  return {
    execution: { waiting: execution.waiting, active: execution.active, completed: execution.completed, failed: execution.failed },
    retry: { waiting: retry.waiting, active: retry.active, completed: retry.completed, failed: retry.failed },
    scheduled: { waiting: scheduled.waiting, active: scheduled.active, completed: scheduled.completed, failed: scheduled.failed },
    deadLetter: { waiting: deadLetter.waiting, active: deadLetter.active, completed: deadLetter.completed, failed: deadLetter.failed },
  };
};

export const closeQueues = async () => {
  await Promise.all([
    executionQueue.close(),
    retryQueue.close(),
    scheduledQueue.close(),
    deadLetterQueue.close(),
  ]);
};

export default {
  executionQueue,
  retryQueue,
  scheduledQueue,
  deadLetterQueue,
  createExecutionJob,
  createRetryJob,
  createScheduledJob,
  moveToDeadLetter,
  getQueueMetrics,
  closeQueues,
};