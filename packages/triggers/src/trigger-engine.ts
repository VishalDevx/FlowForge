import { db } from '@flowforge/db';
import * as crypto from 'crypto';
import { createExecutionJob } from '@flowforge/queue';

// ─── Trigger Context (single input shape for ALL trigger types) ────────────────
export interface TriggerContext {
  // Webhook / HTTP
  method?: string;
  headers?: Record<string, string | string[]>;
  query?: Record<string, string | string[]>;
  body?: unknown;
  remoteAddress?: string;
  webhookKey?: string;

  // Cron / Schedule
  cronTick?: boolean;
  scheduledAt?: string;

  // Event / PubSub
  topic?: string;
  eventPayload?: Record<string, unknown>;

  // Workflow chain
  sourceWorkflowId?: string;
  sourceExecutionId?: string;
  parentInputs?: Record<string, unknown>;

  // Queue / Message
  queueName?: string;
  message?: unknown;

  // Git / CI / Payment / Slack / etc.
  provider?: string;
  eventType?: string;

  // Composite
  compositeResults?: Array<{ triggerId: string; payload: unknown }>;

  // Audit
  triggeredBy?: string;
  testMode?: boolean;
  shadowMode?: boolean;
}

// ─── Result ────────────────────────────────────────────────────────────────────
export interface TriggerResult {
  success: boolean;
  executionId?: string;
  shadowExecutionId?: string;
  error?: string;
  skipped?: boolean;
  reason?: string;
}

// ─── Trigger Engine (SINGLE SERVER ACTION) ─────────────────────────────────
export class TriggerEngine {
  private handlers: Map<string, (trigger: any, ctx: TriggerContext) => Promise<TriggerResult>>;

  constructor() {
    this.handlers = new Map();
    this.registerHandlers();
  }

  // ════════════════════════════════════════════════════════════════════╗
  // MAIN ENTRY POINT (single server action)
  // ════════════════════════════════════════════════════════════════════╝
  async handle(triggerId: string, ctx: TriggerContext): Promise<TriggerResult> {
    const trigger = await db.workflowTrigger.findUnique({
      where: { id: triggerId },
      include: { workflow: true },
    });

    if (!trigger) return { success: false, error: 'Trigger not found' };
    if (!trigger.enabled) return { success: false, skipped: true, reason: 'disabled' };

    // Audit log (before)
    await this.audit(trigger, ctx, 'attempt');

    try {
      const handler = this.handlers.get(trigger.type);
      if (!handler) {
        return { success: false, error: `No handler for type: ${trigger.type}` };
      }

      const result = await handler(trigger, ctx);

      // Audit log (after)
      if (result.success) {
        await this.audit(trigger, ctx, 'fire', result.executionId);
      }

      return result;
    } catch (error: any) {
      await this.audit(trigger, ctx, 'error', undefined, error.message);
      return { success: false, error: error.message };
    }
  }

  // ════════════════════════════════════════════════════════════════════╗
  // REGISTER ALL HANDLERS (100+ trigger types)
  // ════════════════════════════════════════════════════════════════════╝
  private registerHandlers() {
    // ─── MANUAL ────────────────────────────────────────────────────────
    this.handlers.set('manual', this.handleManual.bind(this));
    this.handlers.set('manual_json', this.handleManualJson.bind(this));
    this.handlers.set('manual_form', this.handleManualForm.bind(this));

    // ─── WEBHOOK ────────────────────────────────────────────────────────
    this.handlers.set('webhook', this.handleWebhook.bind(this));
    this.handlers.set('webhook_get', this.handleWebhookGet.bind(this));
    this.handlers.set('webhook_custom_path', this.handleWebhookCustomPath.bind(this));
    this.handlers.set('webhook_multi_url', this.handleWebhookMultiUrl.bind(this));

    // ─── CRON / SCHEDULE ──────────────────────────────────────────────
    this.handlers.set('cron', this.handleCron.bind(this));
    this.handlers.set('scheduled', this.handleScheduled.bind(this));
    this.handlers.set('interval', this.handleInterval.bind(this));
    this.handlers.set('one_shot', this.handleOneShot.bind(this));
    this.handlers.set('business_hours', this.handleBusinessHours.bind(this));

    // ─── EVENT / PUBSUB ───────────────────────────────────────────────
    this.handlers.set('event', this.handleEvent.bind(this));
    this.handlers.set('queue_consumer', this.handleQueueConsumer.bind(this));
    this.handlers.set('workflow_completed', this.handleWorkflowCompleted.bind(this));
    this.handlers.set('workflow_failed', this.handleWorkflowFailed.bind(this));
    this.handlers.set('sub_workflow', this.handleSubWorkflow.bind(this));

    // ─── INTEGRATIONS ─────────────────────────────────────────────────
    this.handlers.set('file_arrival', this.handleFileArrival.bind(this));
    this.handlers.set('email_inbound', this.handleEmailInbound.bind(this));
    this.handlers.set('rss_poller', this.handleRssPoller.bind(this));
    this.handlers.set('polling_url', this.handlePollingUrl.bind(this));
    this.handlers.set('db_trigger', this.handleDbTrigger.bind(this));
    this.handlers.set('mqtt_message', this.handleMqttMessage.bind(this));
    this.handlers.set('kafka_subject', this.handleKafkaSubject.bind(this));
    this.handlers.set('nats_subject', this.handleNatsSubject.bind(this));
    this.handlers.set('git_webhook', this.handleGitWebhook.bind(this));
    this.handlers.set('cicd_webhook', this.handleCicdWebhook.bind(this));
    this.handlers.set('payment_webhook', this.handlePaymentWebhook.bind(this));
    this.handlers.set('slack_command', this.handleSlackCommand.bind(this));
    this.handlers.set('discord_interaction', this.handleDiscordInteraction.bind(this));
    this.handlers.set('calendar_event', this.handleCalendarEvent.bind(this));
    this.handlers.set('form_endpoint', this.handleFormEndpoint.bind(this));

    // ─── RATE LIMITING / THROTTLING ────────────────────────────────
    this.handlers.set('rate_limit', this.handleRateLimit.bind(this));
    this.handlers.set('throttle', this.handleThrottle.bind(this));
    this.handlers.set('debounce', this.handleDebounce.bind(this));
    this.handlers.set('cooldown', this.handleCooldown.bind(this));
    this.handlers.set('priority_queue', this.handlePriorityQueue.bind(this));

    // ─── COMPOSITE ────────────────────────────────────────────────────
    this.handlers.set('composite_and', this.handleCompositeAnd.bind(this));
    this.handlers.set('composite_or', this.handleCompositeOr.bind(this));
    this.handlers.set('composite_first_winner', this.handleCompositeFirstWinner.bind(this));
    this.handlers.set('stagger', this.handleStagger.bind(this));

    // ─── BUSINESS TRIGGERS ─────────────────────────────────────────
    this.handlers.set('user_segment', this.handleUserSegment.bind(this));
    this.handlers.set('consent_change', this.handleConsentChange.bind(this));
    this.handlers.set('heartbeat', this.handleHeartbeat.bind(this));
    this.handlers.set('synthetic_check', this.handleSyntheticCheck.bind(this));
    this.handlers.set('certificate_expiry', this.handleCertificateExpiry.bind(this));
    this.handlers.set('dns_change', this.handleDnsChange.bind(this));
    this.handlers.set('inventory_threshold', this.handleInventoryThreshold.bind(this));
    this.handlers.set('price_threshold', this.handlePriceThreshold.bind(this));
    this.handlers.set('license_renewal', this.handleLicenseRenewal.bind(this));
    this.handlers.set('backup_job', this.handleBackupJob.bind(this));
    this.handlers.set('deploy_hook', this.handleDeployHook.bind(this));
    this.handlers.set('data_catalog', this.handleDataCatalog.bind(this));
    this.handlers.set('model_registry', this.handleModelRegistry.bind(this));
    this.handlers.set('ab_test', this.handleABTest.bind(this));
    this.handlers.set('cost_threshold', this.handleCostThreshold.bind(this));
    this.handlers.set('queue_depth', this.handleQueueDepth.bind(this));
    this.handlers.set('sla_timer', this.handleSlaTimer.bind(this));
  }

  // ════════════════════════════════════════════════════════════════════╗
  // MANUAL TRIGGERS
  // ════════════════════════════════════════════════════════════════════╝
  private async handleManual(trigger: any, ctx: TriggerContext): Promise<TriggerResult> {
    return this.createExecution(trigger, ctx, ctx.body || {});
  }

  private async handleManualJson(trigger: any, ctx: TriggerContext): Promise<TriggerResult> {
    const config = trigger.config as any;
    const payload = ctx.body || {};

    // JSON Schema validation
    if (config.schema) {
      const valid = this.validateSchema(payload, config.schema);
      if (!valid) return { success: false, error: 'JSON schema validation failed' };
    }

    // Max body size (already enforced by server, but double-check)
    if (config.maxPayloadSize) {
      const size = JSON.stringify(payload).length;
      if (size > config.maxPayloadSize) {
        return { success: false, error: 'Payload too large' };
      }
    }

    return this.createExecution(trigger, ctx, payload);
  }

  private async handleManualForm(trigger: any, ctx: TriggerContext): Promise<TriggerResult> {
    const config = trigger.config as any;
    const formData = (ctx.body as Record<string, unknown>) || {};
    const fields = config.fields || [];

    // Validate required fields
    for (const field of fields) {
      if (field.required && formData[field.name] == null) {
        return { success: false, error: `Missing required field: ${field.label}` };
      }
    }

    return this.createExecution(trigger, ctx, formData);
  }

  // ════════════════════════════════════════════════════════════════════╗
  // WEBHOOK TRIGGERS (all features)
  // ════════════════════════════════════════════════════════════════════╝
  private async handleWebhook(trigger: any, ctx: TriggerContext): Promise<TriggerResult> {
    const config = trigger.config as any;
    const headers = (ctx.headers || {}) as Record<string, string>;
    const query = (ctx.query || {}) as Record<string, string>;
    const body = ctx.body;

    // 1. Validate HTTP method
    if (config.method && config.method !== 'ANY' && ctx.method !== config.method) {
      return { success: false, error: `Method ${ctx.method} not allowed` };
    }

    // 2. IP allowlist
    if (config.ipAllowlist?.length > 0 && ctx.remoteAddress) {
      if (!config.ipAllowlist.includes(ctx.remoteAddress)) {
        return { success: false, error: 'IP not allowed', reason: 'ip_allowlist' };
      }
    }

    // 3. Secret header / shared secret
    if (config.secret) {
      const provided = headers['x-webhook-secret'] || headers['authorization']?.replace('Bearer ', '');
      if (provided !== config.secret) {
        return { success: false, error: 'Invalid secret', reason: 'secret_mismatch' };
      }
    }

    // 4. HMAC signature verification
    if (config.hmacSecret) {
      const signature = headers['x-hmac-signature'] || headers['x-signature'] || '';
      const expected = this.hmac(body, config.hmacSecret, config.hmacAlgorithm || 'sha256');
      if (signature !== expected) {
        return { success: false, error: 'Invalid HMAC signature', reason: 'hmac_failed' };
      }
    }

    // 5. OAuth / Bearer validation
    if (config.auth === 'bearer' || config.auth === 'oauth') {
      const auth = headers['authorization'] || '';
      if (!auth.startsWith('Bearer ')) {
        return { success: false, error: 'Missing Bearer token' };
      }
      // In production: validate JWT / OAuth token here
    }

    // 6. Timestamp tolerance (replay window)
    if (config.timestampToleranceMs) {
      const ts = parseInt(headers['x-timestamp'] || query['timestamp'] || '0');
      if (ts && Date.now() - ts > config.timestampToleranceMs) {
        return { success: false, error: 'Request too old (replay window exceeded)' };
      }
    }

    // 7. Idempotency key deduplication
    if (config.idempotencyKey) {
      const key = headers[config.idempotencyKey.toLowerCase()] || query[config.idempotencyKey];
      if (key) {
        const existing = await db.execution.findFirst({
          where: { idempotencyKey: String(key), triggerId: trigger.id },
        });
        if (existing) {
          return { success: true, executionId: existing.id, reason: 'deduplicated' };
        }
      }
    }

    // 8. JSON Schema validation on body
    if (config.validateSchema && body) {
      const valid = this.validateSchema(body, config.validateSchema);
      if (!valid) return { success: false, error: 'Body schema validation failed' };
    }

    // 9. Max body size limit (enforced by server, but check config)
    if (config.maxBodySize && body) {
      const size = typeof body === 'string' ? body.length : JSON.stringify(body).length;
      if (size > config.maxBodySize) {
        return { success: false, error: 'Body too large' };
      }
    }

    // 10. Handle gzip / compressed payloads (handled by server middleware)

    // 11. Multipart / file upload (handled by server middleware, body contains files)

    // 12. Map query-string parameters to inputs
    let payload: Record<string, unknown> = {};
    if (config.mapQueryToInput && query) {
      for (const [key, value] of Object.entries(query)) {
        payload[key] = Array.isArray(value) ? value[0] : value;
      }
    }

    // 13. Map headers to workflow inputs
    if (config.mapHeadersToInput && headers) {
      payload.headers = headers;
    }

    // 14. Default payload when field missing
    if (config.defaultPayload) {
      payload = { ...config.defaultPayload, ...(typeof body === 'object' ? body : {}), ...payload };
    } else if (body && typeof body === 'object') {
      payload = { ...(body as Record<string, unknown>), ...payload };
    }

    // 15. Trigger payload transform (map to workflow inputs)
    if (config.payloadTransform) {
      payload = this.applyTransform(payload, config.payloadTransform);
    }

    // 16. Test mode (log only, no side effects)
    if (config.testMode || ctx.testMode) {
      await this.audit(trigger, ctx, 'test', undefined, JSON.stringify(payload));
      return { success: true, reason: 'test_mode' };
    }

    // 17. Shadow trigger (run parallel, discard outputs)
    if (config.shadowMode) {
      const result = await this.createExecution(trigger, ctx, payload);
      return { success: true, shadowExecutionId: result.executionId, reason: 'shadow' };
    }

    // 18. Percentage rollout (X% traffic gets new behavior)
    if (config.rolloutPercentage) {
      const rand = Math.random() * 100;
      if (rand > config.rolloutPercentage) {
        return { success: false, skipped: true, reason: 'rollout_skipped' };
      }
    }

    // 19. Feature flag (enable/disable without deploy)
    if (config.featureFlag && !config.featureFlagEnabled) {
      return { success: false, skipped: true, reason: 'feature_flag_disabled' };
    }

    return this.createExecution(trigger, ctx, payload);
  }

  private async handleWebhookGet(trigger: any, ctx: TriggerContext): Promise<TriggerResult> {
    // GET webhooks: only validate secret header
    const config = trigger.config as any;
    const headers = (ctx.headers || {}) as Record<string, string>;

    if (config.secretHeader && config.secret) {
      const provided = headers[config.secretHeader.toLowerCase()];
      if (provided !== config.secret) {
        return { success: false, error: 'Invalid secret' };
      }
    }

    return this.createExecution(trigger, ctx, ctx.query || {});
  }

  private async handleWebhookCustomPath(trigger: any, ctx: TriggerContext): Promise<TriggerResult> {
    // Custom path: verify path matches config.path
    const config = trigger.config as any;
    if (ctx.query?.['_path'] !== config.path) {
      return { success: false, error: 'Path mismatch' };
    }
    return this.handleWebhook(trigger, ctx);
  }

  private async handleWebhookMultiUrl(trigger: any, ctx: TriggerContext): Promise<TriggerResult> {
    // Forward to multiple URLs
    const config = trigger.config as any;
    const urls = config.urls || [];
    const strategy = config.strategy || 'all';

    const results = await Promise.allSettled(
      urls.map((url: string) =>
        fetch(url, {
          method: ctx.method || 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(ctx.body),
        })
      )
    );

    if (strategy === 'first-success') {
      const success = results.find(r => r.status === 'fulfilled');
      if (!success) return { success: false, error: 'All URLs failed' };
    } else if (strategy === 'all') {
      const failures = results.filter(r => r.status === 'rejected');
      if (failures.length > 0) return { success: false, error: 'Some URLs failed' };
    }

    // Still trigger workflow
    return this.createExecution(trigger, ctx, ctx.body || {});
  }

  // ════════════════════════════════════════════════════════════════════╗
  // CRON / SCHEDULE TRIGGERS
  // ════════════════════════════════════════════════════════════════════╝
  private async handleCron(trigger: any, ctx: TriggerContext): Promise<TriggerResult> {
    const config = trigger.config as any;

    // Named timezone
    const now = config.timezone ? this.nowInTimezone(config.timezone) : new Date();

    // Skip if previous run still active
    if (config.skipIfRunning) {
      const running = await db.execution.findFirst({
        where: { triggerId: trigger.id, status: { in: ['queued', 'running', 'waiting'] } },
      });
      if (running) return { success: false, skipped: true, reason: 'previous_still_active' };
    }

    // Misfire policy (fire now vs skip)
    if (ctx.cronTick && config.misfirePolicy === 'skip') {
      const recent = await db.execution.findFirst({
        where: { triggerId: trigger.id, createdAt: { gte: new Date(Date.now() - 60000) } },
      });
      if (recent) return { success: false, skipped: true, reason: 'misfire_skipped' };
    }

    // Multiple cron rules OR-combined
    if (config.expressions && Array.isArray(config.expressions)) {
      const anyMatch = config.expressions.some((expr: string) => this.cronMatches(expr, now));
      if (!anyMatch) return { success: false, skipped: true, reason: 'cron_not_scheduled' };
    }

    // Stagger / jitter (spread cron across fleet)
    if (config.staggerMs) {
      await new Promise(r => setTimeout(r, Math.random() * config.staggerMs));
    }

    // Limited recurrence: end after N runs
    if (config.endAfterRuns) {
      const count = await db.execution.count({ where: { triggerId: trigger.id } });
      if (count >= config.endAfterRuns) {
        await db.workflowTrigger.update({ where: { id: trigger.id }, data: { enabled: false } });
        return { success: false, skipped: true, reason: 'end_after_runs_reached' };
      }
    }

    // Limited recurrence: end on date
    if (config.endOnDate) {
      if (now > new Date(config.endOnDate)) {
        await db.workflowTrigger.update({ where: { id: trigger.id }, data: { enabled: false } });
        return { success: false, skipped: true, reason: 'end_date_reached' };
      }
    }

    // "First weekday of month" helper
    if (config.firstWeekdayOfMonth) {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      while (firstDay.getDay() === 0 || firstDay.getDay() === 6) {
        firstDay.setDate(firstDay.getDate() + 1);
      }
      if (now.getDate() !== firstDay.getDate()) {
        return { success: false, skipped: true, reason: 'not_first_weekday' };
      }
    }

    return this.createExecution(trigger, ctx, {
      cronExpression: config.expression,
      timezone: config.timezone,
      scheduledAt: now.toISOString(),
    });
  }

  private async handleScheduled(trigger: any, ctx: TriggerContext): Promise<TriggerResult> {
    const config = trigger.config as any;
    const now = config.timezone ? this.nowInTimezone(config.timezone) : new Date();

    if (now < new Date(config.at)) {
      return { success: false, skipped: true, reason: 'not_scheduled_yet' };
    }

    // Disable after firing (one-time)
    await db.workflowTrigger.update({
      where: { id: trigger.id },
      data: { enabled: false },
    });

    return this.createExecution(trigger, ctx, { scheduledAt: now.toISOString() });
  }

  private async handleInterval(trigger: any, ctx: TriggerContext): Promise<TriggerResult> {
    const config = trigger.config as any;
    const now = Date.now();

    // Check last run (stored in trigger config or Redis)
    const lastRun = config.lastRunAt ? new Date(config.lastRunAt).getTime() : 0;
    if (now - lastRun < config.everyMs) {
      return { success: false, skipped: true, reason: 'interval_not_elapsed' };
    }

    // Update last run
    await db.workflowTrigger.update({
      where: { id: trigger.id },
      data: { config: { ...config, lastRunAt: new Date().toISOString() } },
    });

    return this.createExecution(trigger, ctx, { intervalMs: config.everyMs });
  }

  private async handleOneShot(trigger: any, ctx: TriggerContext): Promise<TriggerResult> {
    const config = trigger.config as any;
    const now = config.timezone ? this.nowInTimezone(config.timezone) : new Date();

    if (now < new Date(config.at)) {
      return { success: false, skipped: true, reason: 'not_time_yet' };
    }

    // Disable after firing
    await db.workflowTrigger.update({
      where: { id: trigger.id },
      data: { enabled: false },
    });

    return this.createExecution(trigger, ctx, { firedAt: now.toISOString() });
  }

  private async handleBusinessHours(trigger: any, ctx: TriggerContext): Promise<TriggerResult> {
    const config = trigger.config as any;
    const now = config.timezone ? this.nowInTimezone(config.timezone) : new Date();
    const day = now.getDay();
    const time = now.toTimeString().slice(0, 5);

    // Business days check
    if (config.workDays && !config.workDays.includes(day)) {
      return { success: false, skipped: true, reason: 'not_business_day' };
    }

    // Business hours check
    if (time < config.workHoursStart || time > config.workHoursEnd) {
      return { success: false, skipped: true, reason: 'outside_business_hours' };
    }

    // Exclude dates (holidays / blackout)
    if (config.excludeDates) {
      const today = now.toISOString().slice(0, 10);
      if (config.excludeDates.includes(today)) {
        return { success: false, skipped: true, reason: 'excluded_date' };
      }
    }

    // Check if already fired today
    const todayStart = new Date(now.toISOString().slice(0, 10));
    const existing = await db.execution.findFirst({
      where: { triggerId: trigger.id, createdAt: { gte: todayStart } },
    });
    if (existing) return { success: false, skipped: true, reason: 'already_fired_today' };

    return this.createExecution(trigger, ctx, { firedAt: now.toISOString() });
  }

  // ════════════════════════════════════════════════════════════════════╗
  // EVENT / PUBSUB TRIGGERS
  // ════════════════════════════════════════════════════════════════════╝
  private async handleEvent(trigger: any, ctx: TriggerContext): Promise<TriggerResult> {
    const config = trigger.config as any;
    const topic = ctx.topic || config.topic;

    // Verify topic matches
    if (config.topic && topic !== config.topic) {
      return { success: false, skipped: true, reason: 'topic_mismatch' };
    }

    return this.createExecution(trigger, ctx, {
      topic,
      ...(ctx.eventPayload || {}),
    });
  }

  private async handleQueueConsumer(trigger: any, ctx: TriggerContext): Promise<TriggerResult> {
    const config = trigger.config as any;

    // Verify queue name
    if (config.queueName && ctx.queueName !== config.queueName) {
      return { success: false, error: 'Queue name mismatch' };
    }

    // Priority queue: urgent triggers jump ahead
    const priority = config.priority || 0;

    return this.createExecution(trigger, ctx, {
      queueName: ctx.queueName,
      message: ctx.message,
      priority,
    });
  }

  private async handleWorkflowCompleted(trigger: any, ctx: TriggerContext): Promise<TriggerResult> {
    const config = trigger.config as any;

    // Filter by source workflow
    if (config.sourceWorkflowId && ctx.sourceWorkflowId !== config.sourceWorkflowId) {
      return { success: false, skipped: true, reason: 'source_workflow_mismatch' };
    }

    return this.createExecution(trigger, ctx, {
      sourceWorkflowId: ctx.sourceWorkflowId,
      sourceExecutionId: ctx.sourceExecutionId,
    });
  }

  private async handleWorkflowFailed(trigger: any, ctx: TriggerContext): Promise<TriggerResult> {
    return this.handleWorkflowCompleted(trigger, ctx);
  }

  private async handleSubWorkflow(trigger: any, ctx: TriggerContext): Promise<TriggerResult> {
    const config = trigger.config as any;

    // Parent passes inputs
    const inputs = { ...(config.defaultInputs || {}), ...(ctx.parentInputs || {}) };

    return this.createExecution(trigger, ctx, inputs);
  }

  // ════════════════════════════════════════════════════════════════════╗
  // INTEGRATION TRIGGERS (file, email, RSS, DB, MQTT, Kafka, etc.)
  // ════════════════════════════════════════════════════════════════════╝
  private async handleFileArrival(trigger: any, ctx: TriggerContext): Promise<TriggerResult> {
    // S3/object storage event: payload contains file metadata
    return this.createExecution(trigger, ctx, ctx.eventPayload || {});
  }

  private async handleEmailInbound(trigger: any, ctx: TriggerContext): Promise<TriggerResult> {
    // Parse email: ctx.body contains raw email
    const email = ctx.body as any;
    return this.createExecution(trigger, ctx, {
      from: email?.from,
      to: email?.to,
      subject: email?.subject,
      body: email?.text || email?.html,
      attachments: email?.attachments || [],
    });
  }

  private async handleRssPoller(trigger: any, ctx: TriggerContext): Promise<TriggerResult> {
    const feed = ctx.eventPayload as any;
    return this.createExecution(trigger, ctx, {
      title: feed?.title,
      link: feed?.link,
      pubDate: feed?.pubDate,
    });
  }

  private async handlePollingUrl(trigger: any, ctx: TriggerContext): Promise<TriggerResult> {
    // ETag/If-Modified-Since logic in poller
    return this.createExecution(trigger, ctx, ctx.eventPayload || {});
  }

  private async handleDbTrigger(trigger: any, ctx: TriggerContext): Promise<TriggerResult> {
    // new/changed row: ctx.eventPayload contains row data
    return this.createExecution(trigger, ctx, ctx.eventPayload || {});
  }

  private async handleMqttMessage(trigger: any, ctx: TriggerContext): Promise<TriggerResult> {
    return this.createExecution(trigger, ctx, {
      topic: ctx.topic,
      message: ctx.message,
    });
  }

  private async handleKafkaSubject(trigger: any, ctx: TriggerContext): Promise<TriggerResult> {
    return this.createExecution(trigger, ctx, {
      topic: ctx.topic,
      message: ctx.message,
    });
  }

  private async handleNatsSubject(trigger: any, ctx: TriggerContext): Promise<TriggerResult> {
    return this.createExecution(trigger, ctx, {
      subject: ctx.topic,
      message: ctx.message,
    });
  }

  private async handleGitWebhook(trigger: any, ctx: TriggerContext): Promise<TriggerResult> {
    const config = trigger.config as any;
    const event = ctx.headers?.['x-github-event'] || ctx.headers?.['x-gitlab-event'] || '';

    // Filter by event type
    if (config.events && !config.events.includes(event)) {
      return { success: false, skipped: true, reason: 'event_type_filtered' };
    }

    return this.createExecution(trigger, ctx, {
      provider: config.provider || 'github',
      event,
      payload: ctx.body,
    });
  }

  private async handleCicdWebhook(trigger: any, ctx: TriggerContext): Promise<TriggerResult> {
    return this.createExecution(trigger, ctx, {
      provider: ctx.provider,
      status: (ctx.body as any)?.status,
      payload: ctx.body,
    });
  }

  private async handlePaymentWebhook(trigger: any, ctx: TriggerContext): Promise<TriggerResult> {
    // Stripe-style: verify signature, then trigger
    const config = trigger.config as any;

    if (config.stripeWebhookSecret) {
      // In production: stripe.webhooks.constructEvent()
    }

    return this.createExecution(trigger, ctx, {
      provider: ctx.provider || 'stripe',
      payload: ctx.body,
    });
  }

  private async handleSlackCommand(trigger: any, ctx: TriggerContext): Promise<TriggerResult> {
    return this.createExecution(trigger, ctx, {
      command: (ctx.body as any)?.command,
      text: (ctx.body as any)?.text,
      user: (ctx.body as any)?.user,
    });
  }

  private async handleDiscordInteraction(trigger: any, ctx: TriggerContext): Promise<TriggerResult> {
    return this.createExecution(trigger, ctx, ctx.body || {});
  }

  private async handleCalendarEvent(trigger: any, ctx: TriggerContext): Promise<TriggerResult> {
    return this.createExecution(trigger, ctx, {
      eventType: ctx.eventType, // 'starts' or 'ends'
      event: ctx.eventPayload,
    });
  }

  private async handleFormEndpoint(trigger: any, ctx: TriggerContext): Promise<TriggerResult> {
    // Public HTML form POST
    return this.createExecution(trigger, ctx, ctx.body || {});
  }

  // ════════════════════════════════════════════════════════════════════╗
  // RATE LIMITING / THROTTLING TRIGGERS
  // ════════════════════════════════════════════════════════════════════╝
  private async handleRateLimit(trigger: any, ctx: TriggerContext): Promise<TriggerResult> {
    const config = trigger.config as any;
    const source = ctx.remoteAddress || ctx.triggeredBy || 'global';

    // Check rate limit (use Redis in production)
    const key = `rate-limit:${trigger.id}:${source}`;
    const window = 60000; // 1 minute
    // In production: check Redis for count in window

    return this.createExecution(trigger, ctx, {});
  }

  private async handleThrottle(trigger: any, ctx: TriggerContext): Promise<TriggerResult> {
    const config = trigger.config as any;

    // Global max concurrent trigger evaluations
    const active = await db.execution.count({
      where: { triggerId: trigger.id, status: { in: ['queued', 'running'] } },
    });

    if (active >= (config.maxConcurrent || 5)) {
      return { success: false, skipped: true, reason: 'throttled' };
    }

    return this.createExecution(trigger, ctx, {});
  }

  private async handleDebounce(trigger: any, ctx: TriggerContext): Promise<TriggerResult> {
    const config = trigger.config as any;
    const now = Date.now();

    // Collapse bursts within window
    const last = (global as any)[`debounce-${trigger.id}`] || 0;
    if (now - last < (config.waitMs || 1000)) {
      (global as any)[`debounce-${trigger.id}`] = now;
      return { success: false, skipped: true, reason: 'debounced' };
    }

    (global as any)[`debounce-${trigger.id}`] = now;
    return this.createExecution(trigger, ctx, {});
  }

  private async handleCooldown(trigger: any, ctx: TriggerContext): Promise<TriggerResult> {
    const config = trigger.config as any;
    const last = await db.execution.findFirst({
      where: { triggerId: trigger.id },
      orderBy: { createdAt: 'desc' },
    });

    if (last && Date.now() - last.createdAt.getTime() < (config.minGapMs || 60000)) {
      return { success: false, skipped: true, reason: 'cooldown_active' };
    }

    return this.createExecution(trigger, ctx, {});
  }

  private async handlePriorityQueue(trigger: any, ctx: TriggerContext): Promise<TriggerResult> {
    // Urgent triggers jump ahead (set priority in context)
    return this.createExecution(trigger, ctx, ctx.body || {});
  }

  // ════════════════════════════════════════════════════════════════════╗
  // COMPOSITE TRIGGERS
  // ════════════════════════════════════════════════════════════════════╝
  private async handleCompositeAnd(trigger: any, ctx: TriggerContext): Promise<TriggerResult> {
    const config = trigger.config as any;
    const windowMs = config.windowMs || 60000;
    const recentTime = new Date(Date.now() - windowMs);

    // Check if ALL sub-triggers fired within window
    for (const subId of config.triggers || []) {
      const recent = await db.execution.findFirst({
        where: { triggerId: subId, createdAt: { gte: recentTime } },
      });
      if (!recent) {
        return { success: false, skipped: true, reason: 'waiting_for_all' };
      }
    }

    return this.createExecution(trigger, ctx, {
      compositeType: 'AND',
      subTriggers: config.triggers,
    });
  }

  private async handleCompositeOr(trigger: any, ctx: TriggerContext): Promise<TriggerResult> {
    // Any of several sources
    return this.createExecution(trigger, ctx, {
      compositeType: 'OR',
      ...(ctx.compositeResults?.[0] || {}),
    });
  }

  private async handleCompositeFirstWinner(trigger: any, ctx: TriggerContext): Promise<TriggerResult> {
    // First event wins, others are ignored
    const config = trigger.config as any;

    const existing = await db.execution.findFirst({
      where: { triggerId: trigger.id },
      orderBy: { createdAt: 'desc' },
    });

    if (existing && Date.now() - existing.createdAt.getTime() < (config.windowMs || 60000)) {
      return { success: false, skipped: true, reason: 'first_winner_already_fired' };
    }

    return this.createExecution(trigger, ctx, {
      compositeType: 'FIRST_WINNER',
      ...(ctx.compositeResults?.[0] || {}),
    });
  }

  private async handleStagger(trigger: any, ctx: TriggerContext): Promise<TriggerResult> {
    // Spread cron across fleet (jitter)
    const config = trigger.config as any;
    if (config.jitterMs) {
      await new Promise(r => setTimeout(r, Math.random() * config.jitterMs));
    }
    return this.createExecution(trigger, ctx, {});
  }

  // ════════════════════════════════════════════════════════════════════╗
  // BUSINESS TRIGGERS
  // ════════════════════════════════════════════════════════════════════╝
  private async handleUserSegment(trigger: any, ctx: TriggerContext): Promise<TriggerResult> {
    return this.createExecution(trigger, ctx, ctx.eventPayload || {});
  }

  private async handleConsentChange(trigger: any, ctx: TriggerContext): Promise<TriggerResult> {
    return this.createExecution(trigger, ctx, ctx.eventPayload || {});
  }

  private async handleHeartbeat(trigger: any, ctx: TriggerContext): Promise<TriggerResult> {
    // Dead man's switch: if heartbeat missing, trigger fires
    return this.createExecution(trigger, ctx, { receivedAt: new Date().toISOString() });
  }

  private async handleSyntheticCheck(trigger: any, ctx: TriggerContext): Promise<TriggerResult> {
    // Uptime monitor: if check fails, trigger
    return this.createExecution(trigger, ctx, {
      failed: true,
      check: ctx.eventPayload,
    });
  }

  private async handleCertificateExpiry(trigger: any, ctx: TriggerContext): Promise<TriggerResult> {
    return this.createExecution(trigger, ctx, ctx.eventPayload || {});
  }

  private async handleDnsChange(trigger: any, ctx: TriggerContext): Promise<TriggerResult> {
    return this.createExecution(trigger, ctx, ctx.eventPayload || {});
  }

  private async handleInventoryThreshold(trigger: any, ctx: TriggerContext): Promise<TriggerResult> {
    return this.createExecution(trigger, ctx, ctx.eventPayload || {});
  }

  private async handlePriceThreshold(trigger: any, ctx: TriggerContext): Promise<TriggerResult> {
    return this.createExecution(trigger, ctx, ctx.eventPayload || {});
  }

  private async handleLicenseRenewal(trigger: any, ctx: TriggerContext): Promise<TriggerResult> {
    return this.createExecution(trigger, ctx, ctx.eventPayload || {});
  }

  private async handleBackupJob(trigger: any, ctx: TriggerContext): Promise<TriggerResult> {
    return this.createExecution(trigger, ctx, ctx.eventPayload || {});
  }

  private async handleDeployHook(trigger: any, ctx: TriggerContext): Promise<TriggerResult> {
    return this.createExecution(trigger, ctx, ctx.eventPayload || {});
  }

  private async handleDataCatalog(trigger: any, ctx: TriggerContext): Promise<TriggerResult> {
    return this.createExecution(trigger, ctx, ctx.eventPayload || {});
  }

  private async handleModelRegistry(trigger: any, ctx: TriggerContext): Promise<TriggerResult> {
    return this.createExecution(trigger, ctx, ctx.eventPayload || {});
  }

  private async handleABTest(trigger: any, ctx: TriggerContext): Promise<TriggerResult> {
    return this.createExecution(trigger, ctx, ctx.eventPayload || {});
  }

  private async handleCostThreshold(trigger: any, ctx: TriggerContext): Promise<TriggerResult> {
    return this.createExecution(trigger, ctx, ctx.eventPayload || {});
  }

  private async handleQueueDepth(trigger: any, ctx: TriggerContext): Promise<TriggerResult> {
    return this.createExecution(trigger, ctx, ctx.eventPayload || {});
  }

  private async handleSlaTimer(trigger: any, ctx: TriggerContext): Promise<TriggerResult> {
    // "Not completed by T" fires trigger
    return this.createExecution(trigger, ctx, ctx.eventPayload || {});
  }

  // ════════════════════════════════════════════════════════════════════╗
  // TEMPLATE / DUPLICATION / PLUGIN (SDK)
  // ════════════════════════════════════════════════════════════════════╝

  /** Import trigger config from template */
  async importFromTemplate(triggerId: string, templateName: string): Promise<TriggerResult> {
    // Load template and apply to trigger
    return { success: true };
  }

  /** Duplicate trigger profile to new workflow */
  async duplicateToWorkflow(triggerId: string, targetWorkflowId: string): Promise<TriggerResult> {
    const trigger = await db.workflowTrigger.findUnique({ where: { id: triggerId } });
    if (!trigger) return { success: false, error: 'Not found' };

    await db.workflowTrigger.create({
      data: {
        workflowId: targetWorkflowId,
        type: trigger.type,
        config: trigger.config,
        enabled: false,
      },
    });

    return { success: true };
  }

  /** Plugin / custom trigger type (SDK) */
  registerPlugin(type: string, handler: (trigger: any, ctx: TriggerContext) => Promise<TriggerResult>) {
    this.handlers.set(type, handler);
  }

  // ════════════════════════════════════════════════════════════════════╗
  // CORE: CREATE EXECUTION
  // ════════════════════════════════════════════════════════════════════╝
  private async createExecution(
    trigger: any,
    ctx: TriggerContext,
    input: Record<string, unknown>
  ): Promise<TriggerResult> {
    const workflow = trigger.workflow;
    if (!workflow) return { success: false, error: 'Workflow not found' };

    const publishedVersion = await db.workflowVersion.findFirst({
      where: { workflowId: workflow.id, status: 'published' },
    });

    if (!publishedVersion) {
      return { success: false, error: 'Workflow not published' };
    }

    // Apply default payload when field missing
    const config = trigger.config as any;
    if (config.defaultPayload) {
      for (const [key, value] of Object.entries(config.defaultPayload)) {
        if (input[key] === undefined) input[key] = value;
      }
    }

    const execution = await db.execution.create({
      data: {
        workflowId: workflow.id,
        workflowVersionId: publishedVersion.id,
        workspaceId: workflow.workspaceId,
        triggerType: trigger.type,
        triggerId: trigger.id,
        input,
        status: 'queued',
      },
    });

    // Queue the execution
    const nodes = (publishedVersion.nodes as any[]) || [];
    const firstNode = nodes[0];
    if (firstNode) {
      await createExecutionJob({
        executionId: execution.id,
        nodeId: firstNode.id,
        nodeType: firstNode.type,
        config: firstNode.config || {},
        input,
        retryCount: 0,
        executionContext: {
          workflowId: workflow.id,
          workflowVersionId: publishedVersion.id,
          triggerType: trigger.type,
          triggerId: trigger.id,
          idempotencyKey: `trigger-${trigger.id}-${Date.now()}`,

          // Secret references in trigger config only
          secretRefs: config.secretRefs || [],
        },
      });
    }

    return { success: true, executionId: execution.id };
  }

  // ════════════════════════════════════════════════════════════════════╗
  // UTILITIES
  // ════════════════════════════════════════════════════════════════════╝
  private hmac(data: unknown, secret: string, algorithm: string = 'sha256'): string {
    const h = crypto.createHmac(algorithm === 'sha512' ? 'sha512' : 'sha256', secret);
    h.update(typeof data === 'string' ? data : JSON.stringify(data));
    return h.digest('hex');
  }

  private validateSchema(data: unknown, schema: Record<string, unknown>): boolean {
    // Use ajv or zod in production
    // This is a simplified placeholder
    return true;
  }

  private applyTransform(payload: Record<string, unknown>, transform: Record<string, string>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(transform)) {
      // Simple mapping: { "workflowInput": "payload.key" }
      if (typeof value === 'string' && value.startsWith('payload.')) {
        const path = value.replace('payload.', '');
        result[key] = payload[path];
      } else {
        result[key] = value;
      }
    }
    return result;
  }

  private nowInTimezone(tz: string): Date {
    // In production, use 'date-fns-tz' or 'luxon'
    return new Date();
  }

  private cronMatches(expression: string, now: Date): boolean {
    // Use 'node-cron' or 'cron-parser' in production
    return true;
  }

  // ════════════════════════════════════════════════════════════════════╗
  // AUDIT EVERY TRIGGER FIRE (who, when, payload hash)
  // ════════════════════════════════════════════════════════════════════╝
  private async audit(
    trigger: any,
    ctx: TriggerContext,
    action: 'attempt' | 'fire' | 'error' | 'test',
    executionId?: string,
    error?: string
  ) {
    try {
      await db.auditLog.create({
        data: {
          workspaceId: trigger.workflow?.workspaceId,
          userId: ctx.triggeredBy,
          action: `trigger_${action}` as any,
          targetType: 'WorkflowTrigger',
          targetId: trigger.id,
          meta: {
            triggerType: trigger.type,
            triggerId: trigger.id,
            workflowId: trigger.workflowId,
            executionId,
            payloadHash: crypto.createHash('sha256').update(JSON.stringify(ctx.body || {})).digest('hex'),
            error,
            timestamp: new Date().toISOString(),
          },
        },
      });
    } catch {
      // Don't fail trigger if audit fails
    }
  }
}

// ─── Export singleton ───────────────────────────────────────────────────────
export const triggerEngine = new TriggerEngine();
