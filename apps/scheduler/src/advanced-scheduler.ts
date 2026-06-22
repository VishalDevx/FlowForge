import { db } from '@flowforge/db';
import nodeCron from 'node-cron';
import { TriggerService } from './trigger-service';

const triggerService = new TriggerService();

export async function startScheduler() {
  console.log('[Scheduler] Starting advanced scheduler...');

  // Run every minute to check cron triggers
  nodeCron.schedule('* * * * *', async () => {
    await processCronTriggers();
    await processScheduledTriggers();
    await processIntervalTriggers();
    await processBusinessHoursTriggers();
    await processOneShotTriggers();
  });

  // Run every second for high-precision triggers (interval, debounce, etc.)
  nodeCron.schedule('* * * * * *', async () => {
    await processIntervalTriggers();
    await processThrottleQueue();
  });

  console.log('[Scheduler] Scheduler started');
}

async function processCronTriggers() {
  const triggers = await db.workflowTrigger.findMany({
    where: {
      type: 'cron',
      enabled: true,
    },
    include: { workflow: true },
  });

  for (const trigger of triggers) {
    try {
      const config = trigger.config as any;
      
      // Validate cron expression
      if (!nodeCron.validate(config.expression)) {
        console.error(`[Scheduler] Invalid cron expression: ${config.expression}`);
        continue;
      }

      // Check if it's time to run (node-cron handles this, but we need custom timezone)
      const now = new Date();
      const timezone = config.timezone || 'UTC';
      
      // Simple check: if expression matches now (simplified - in production use cron-parser)
      if (shouldRunCron(config.expression, now, timezone)) {
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

        console.log(`[Scheduler] Firing cron trigger ${trigger.id}`);
        await triggerService.handleCron(trigger.id);
      }
    } catch (error) {
      console.error(`[Scheduler] Error processing cron trigger ${trigger.id}:`, error);
    }
  }
}

async function processScheduledTriggers() {
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
    console.log(`[Scheduler] Firing scheduled trigger ${trigger.id}`);
    await triggerService.createExecution(
      trigger.workflowId,
      trigger.id,
      'scheduled',
      { scheduledAt: now.toISOString() }
    );
    
    // Disable one-time scheduled trigger
    await db.workflowTrigger.update({
      where: { id: trigger.id },
      data: { enabled: false },
    });
  }
}

async function processIntervalTriggers() {
  const now = Date.now();
  
  const triggers = await db.workflowTrigger.findMany({
    where: {
      type: 'interval',
      enabled: true,
    },
  });

  for (const trigger of triggers) {
    const config = trigger.config as any;
    const lastRun = (trigger as any).lastRunAt ? new Date((trigger as any).lastRunAt).getTime() : 0;
    
    if (now - lastRun >= config.everyMs) {
      console.log(`[Scheduler] Firing interval trigger ${trigger.id}`);
      await triggerService.createExecution(
        trigger.workflowId,
        trigger.id,
        'interval',
        { intervalMs: config.everyMs }
      );
      
      // Update last run time (would need a field in DB or use a separate state store)
    }
  }
}

async function processOneShotTriggers() {
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
    console.log(`[Scheduler] Firing one-shot trigger ${trigger.id}`);
    await triggerService.createExecution(
      trigger.workflowId,
      trigger.id,
      'one_shot',
      { firedAt: now.toISOString() }
    );
    
    // Disable after firing
    await db.workflowTrigger.update({
      where: { id: trigger.id },
      data: { enabled: false },
    });
  }
}

async function processBusinessHoursTriggers() {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon, etc.
  const timeString = now.toTimeString().slice(0, 5); // HH:MM
  
  const triggers = await db.workflowTrigger.findMany({
    where: {
      type: 'business_hours',
      enabled: true,
    },
  });

  for (const trigger of triggers) {
    const config = trigger.config as any;
    
    // Check if today is a work day
    if (!config.workDays?.includes(dayOfWeek)) continue;
    
    // Check if within work hours
    if (timeString < config.workHoursStart || timeString > config.workHoursEnd) continue;
    
    // Check exclude dates (holidays)
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
    
    if (!existing) {
      console.log(`[Scheduler] Firing business hours trigger ${trigger.id}`);
      await triggerService.createExecution(
        trigger.workflowId,
        trigger.id,
        'business_hours',
        { firedAt: now.toISOString() }
      );
    }
  }
}

async function processThrottleQueue() {
  // Process throttled triggers (would need a queue in Redis)
  // Placeholder for throttle logic
}

function shouldRunCron(expression: string, now: Date, timezone: string): boolean {
  // Simplified cron check - in production use 'cron-parser' or similar
  // This is a placeholder
  return true;
}
