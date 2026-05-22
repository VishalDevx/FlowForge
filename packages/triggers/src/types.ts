import { z } from 'zod';

// Base trigger config schema
export const BaseTriggerConfigSchema = z.object({
  enabled: z.boolean().default(true),
  description: z.string().optional(),
  tags: z.array(z.string()).default([]),
});

// Manual trigger configs
export const ManualTriggerConfigSchema = z.object({
  type: z.literal('manual'),
  requirePayload: z.boolean().default(false),
  formSchema: z.record(z.unknown()).optional(),
});

export const ManualJsonTriggerConfigSchema = z.object({
  type: z.literal('manual_json'),
  schema: z.record(z.unknown()).optional(),
  maxPayloadSize: z.number().default(102400), // 100KB
});

export const ManualFormTriggerConfigSchema = z.object({
  type: z.literal('manual_form'),
  fields: z.array(z.object({
    name: z.string(),
    label: z.string(),
    type: z.enum(['text', 'number', 'email', 'password', 'textarea', 'select', 'checkbox']),
    required: z.boolean().default(false),
    options: z.array(z.string()).optional(),
    defaultValue: z.unknown().optional(),
  })),
});

// Webhook trigger configs
export const WebhookTriggerConfigSchema = z.object({
  type: z.literal('webhook'),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'ANY']).default('POST'),
  secret: z.string().optional(),
  hmacSecret: z.string().optional(),
  hmacAlgorithm: z.enum(['sha256', 'sha512']).default('sha256'),
  timestampToleranceMs: z.number().default(300000), // 5 min
  idempotencyKey: z.string().optional(), // header name for dedup
  ipAllowlist: z.array(z.string()).default([]),
  validateSchema: z.record(z.unknown()).optional(),
  maxBodySize: z.number().default(1048576), // 1MB
  handleGzip: z.boolean().default(true),
  handleMultipart: z.boolean().default(false),
  mapQueryToInput: z.boolean().default(true),
  mapHeadersToInput: z.boolean().default(false),
  testMode: z.boolean().default(false),
});

export const WebhookGetTriggerConfigSchema = z.object({
  type: z.literal('webhook_get'),
  secretHeader: z.string().default('X-Webhook-Secret'),
  validateSignature: z.boolean().default(false),
});

export const WebhookCustomPathConfigSchema = z.object({
  type: z.literal('webhook_custom_path'),
  path: z.string().min(1),
  methods: z.array(z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'])).default(['POST']),
});

export const WebhookMultiUrlConfigSchema = z.object({
  type: z.literal('webhook_multi_url'),
  urls: z.array(z.string().url()).min(1),
  strategy: z.enum(['all', 'first-success', 'any']).default('all'),
});

// Cron/Schedule trigger configs
export const CronTriggerConfigSchema = z.object({
  type: z.literal('cron'),
  expression: z.string(), // 5-field cron expression
  timezone: z.string().default('UTC'),
  pauseOnDisable: z.boolean().default(false),
  skipIfRunning: z.boolean().default(true),
  misfirePolicy: z.enum(['fire-now', 'skip', 'queue']).default('skip'),
});

export const ScheduledTriggerConfigSchema = z.object({
  type: z.literal('scheduled'),
  at: z.date(),
  timezone: z.string().default('UTC'),
});

export const IntervalTriggerConfigSchema = z.object({
  type: z.literal('interval'),
  everyMs: z.number().min(1000),
  startTime: z.date().optional(),
  endTime: z.date().optional(),
});

export const OneShotTriggerConfigSchema = z.object({
  type: z.literal('one_shot'),
  at: z.date(),
  timezone: z.string().default('UTC'),
});

export const BusinessHoursTriggerConfigSchema = z.object({
  type: z.literal('business_hours'),
  timezone: z.string(),
  workDays: z.array(z.number().min(0).max(6)).default([1, 2, 3, 4, 5]), // Mon-Fri
  workHoursStart: z.string().default('09:00'),
  workHoursEnd: z.string().default('17:00'),
  excludeDates: z.array(z.date()).default([]), // holidays
});

// Event triggers
export const EventTriggerConfigSchema = z.object({
  type: z.literal('event'),
  topic: z.string(),
  filter: z.record(z.unknown()).optional(),
});

export const QueueConsumerTriggerConfigSchema = z.object({
  type: z.literal('queue_consumer'),
  queueName: z.string(),
  jobName: z.string().optional(),
  concurrency: z.number().default(1),
});

export const WorkflowCompletedTriggerConfigSchema = z.object({
  type: z.literal('workflow_completed'),
  sourceWorkflowId: z.string().uuid().optional(),
  sourceWorkflowName: z.string().optional(),
});

export const WorkflowFailedTriggerConfigSchema = z.object({
  type: z.literal('workflow_failed'),
  sourceWorkflowId: z.string().uuid().optional(),
});

export const SubWorkflowTriggerConfigSchema = z.object({
  type: z.literal('sub_workflow'),
  parentInputs: z.record(z.unknown()).optional(),
});

// Composite triggers
export const CompositeAndTriggerConfigSchema = z.object({
  type: z.literal('composite_and'),
  triggers: z.array(z.string().uuid()).min(2), // trigger IDs
  windowMs: z.number().default(60000), // time window to wait for all
});

export const CompositeOrTriggerConfigSchema = z.object({
  type: z.literal('composite_or'),
  triggers: z.array(z.string().uuid()).min(2),
});

export const CompositeFirstWinnerConfigSchema = z.object({
  type: z.literal('composite_first_winner'),
  triggers: z.array(z.string().uuid()).min(2),
});

// Rate limiting triggers
export const RateLimitTriggerConfigSchema = z.object({
  type: z.literal('rate_limit'),
  maxRunsPerMinute: z.number().positive(),
  perSource: z.boolean().default(true),
});

export const ThrottleTriggerConfigSchema = z.object({
  type: z.literal('throttle'),
  maxConcurrent: z.number().positive().default(5),
});

export const DebounceTriggerConfigSchema = z.object({
  type: z.literal('debounce'),
  waitMs: z.number().min(100).default(1000),
});

export const CooldownTriggerConfigSchema = z.object({
  type: z.literal('cooldown'),
  minGapMs: z.number().min(1000).default(60000), // 1 min
});

// Unified trigger config schema
export const TriggerConfigSchema = z.discriminatedUnion('type', [
  ManualTriggerConfigSchema,
  ManualJsonTriggerConfigSchema,
  ManualFormTriggerConfigSchema,
  WebhookTriggerConfigSchema,
  WebhookGetTriggerConfigSchema,
  WebhookCustomPathConfigSchema,
  WebhookMultiUrlConfigSchema,
  CronTriggerConfigSchema,
  ScheduledTriggerConfigSchema,
  IntervalTriggerConfigSchema,
  OneShotTriggerConfigSchema,
  BusinessHoursTriggerConfigSchema,
  EventTriggerConfigSchema,
  QueueConsumerTriggerConfigSchema,
  WorkflowCompletedTriggerConfigSchema,
  WorkflowFailedTriggerConfigSchema,
  SubWorkflowTriggerConfigSchema,
  CompositeAndTriggerConfigSchema,
  CompositeOrTriggerConfigSchema,
  CompositeFirstWinnerConfigSchema,
  RateLimitTriggerConfigSchema,
  ThrottleTriggerConfigSchema,
  DebounceTriggerConfigSchema,
  CooldownTriggerConfigSchema,
]);

export type TriggerConfig = z.infer<typeof TriggerConfigSchema>;
export type WebhookTriggerConfig = z.infer<typeof WebhookTriggerConfigSchema>;
export type CronTriggerConfig = z.infer<typeof CronTriggerConfigSchema>;
export type EventTriggerConfig = z.infer<typeof EventTriggerConfigSchema>;
