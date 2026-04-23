import { z } from 'zod';

export const RoleSchema = z.enum(['owner', 'admin', 'developer', 'operator', 'viewer']);
export type Role = z.infer<typeof RoleSchema>;

export const WorkspaceMemberSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  workspaceId: z.string().uuid(),
  role: RoleSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const WorkspaceSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/),
  ownerId: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1).max(100),
  passwordHash: z.string(),
  emailVerified: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const SessionSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  token: z.string(),
  expiresAt: z.date(),
  createdAt: z.date(),
});

export const RefreshTokenSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  token: z.string(),
  expiresAt: z.date(),
  revokedAt: z.date().nullable(),
  createdAt: z.date(),
});

export const ApiKeySchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  workspaceId: z.string().uuid().nullable(),
  name: z.string().min(1).max(100),
  prefix: z.string(),
  keyHash: z.string(),
  lastUsedAt: z.date().nullable(),
  expiresAt: z.date().nullable(),
  createdAt: z.date(),
});

export const InvitationSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  email: z.string().email(),
  role: RoleSchema,
  token: z.string(),
  expiresAt: z.date(),
  createdAt: z.date(),
});

export const NodeTypeSchema = z.enum([
  'trigger.webhook',
  'trigger.cron',
  'trigger.manual',
  'trigger.event',
  'action.http',
  'action.email',
  'action.db',
  'action.transform',
  'action.condition',
  'action.delay',
  'action.queue',
  'action.callWorkflow',
  'action.webhook',
  'action.notify',
  'logic.branch',
  'logic.loop',
  'logic.merge',
  'logic.filter',
  'logic.map',
  'logic.retry',
  'logic.errorBoundary',
]);
export type NodeType = z.infer<typeof NodeTypeSchema>;

export const WorkflowNodeSchema = z.object({
  id: z.string().uuid(),
  workflowVersionId: z.string().uuid(),
  type: NodeTypeSchema,
  label: z.string().max(100),
  description: z.string().max(500).optional(),
  positionX: z.number(),
  positionY: z.number(),
  config: z.record(z.unknown()),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const WorkflowEdgeSchema = z.object({
  id: z.string().uuid(),
  workflowVersionId: z.string().uuid(),
  sourceNodeId: z.string().uuid(),
  targetNodeId: z.string().uuid(),
  sourceHandle: z.string().optional(),
  targetHandle: z.string().optional(),
  label: z.string().max(100).optional(),
  createdAt: z.date(),
});

export const TriggerSchema = z.enum(['webhook', 'cron', 'manual', 'event', 'scheduled']);
export type Trigger = z.infer<typeof TriggerSchema>;

export const WorkflowTriggerSchema = z.object({
  id: z.string().uuid(),
  workflowId: z.string().uuid(),
  type: TriggerSchema,
  config: z.record(z.unknown()),
  enabled: z.boolean(),
  webhookKey: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const WorkflowVersionStatusSchema = z.enum(['draft', 'published', 'archived']);
export type WorkflowVersionStatus = z.infer<typeof WorkflowVersionStatusSchema>;

export const WorkflowSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const WorkflowVersionSchema = z.object({
  id: z.string().uuid(),
  workflowId: z.string().uuid(),
  version: z.number().int().positive(),
  status: WorkflowVersionStatusSchema,
  nodes: z.array(WorkflowNodeSchema),
  edges: z.array(WorkflowEdgeSchema),
  executionPolicy: z.enum(['stop-on-first-failure', 'continue-on-branch-failure']).default('stop-on-first-failure'),
  retryPolicy: z.object({
    maxAttempts: z.number().int().min(1).max(10).default(3),
    backoffMs: z.number().int().min(100).default(1000),
    backoffMultiplier: z.number().min(1).max(5).default(2),
  }).optional(),
  timeoutMs: z.number().int().min(1000).optional(),
  createdAt: z.date(),
  createdBy: z.string().uuid(),
});

export const ExecutionStatusSchema = z.enum([
  'queued',
  'running',
  'paused',
  'waiting',
  'success',
  'failed',
  'cancelled',
  'dead-lettered',
]);
export type ExecutionStatus = z.infer<typeof ExecutionStatusSchema>;

export const ExecutionNodeStatusSchema = z.enum([
  'pending',
  'queued',
  'running',
  'success',
  'failed',
  'skipped',
  'cancelled',
  'dead-lettered',
]);
export type ExecutionNodeStatus = z.infer<typeof ExecutionNodeStatusSchema>;

export const ExecutionSchema = z.object({
  id: z.string().uuid(),
  workflowId: z.string().uuid(),
  workflowVersionId: z.string().uuid(),
  triggerType: TriggerSchema,
  triggerId: z.string().uuid().optional(),
  status: ExecutionStatusSchema,
  input: z.record(z.unknown()).optional(),
  output: z.record(z.unknown()).optional(),
  error: z.string().optional(),
  startedAt: z.date().nullable(),
  finishedAt: z.date().nullable(),
  createdAt: z.date(),
  createdBy: z.string().uuid().optional(),
});

export const ExecutionNodeSchema = z.object({
  id: z.string().uuid(),
  executionId: z.string().uuid(),
  nodeId: z.string().uuid(),
  nodeType: NodeTypeSchema,
  status: ExecutionNodeStatusSchema,
  input: z.record(z.unknown()).optional(),
  output: z.record(z.unknown()).optional(),
  error: z.string().optional(),
  retryCount: z.number().int().min(0).default(0),
  startedAt: z.date().nullable(),
  finishedAt: z.date().nullable(),
  createdAt: z.date(),
});

export const ExecutionLogSchema = z.object({
  id: z.string().uuid(),
  executionId: z.string().uuid(),
  executionNodeId: z.string().uuid().nullable(),
  level: z.enum(['debug', 'info', 'warn', 'error']),
  message: z.string(),
  meta: z.record(z.unknown()).optional(),
  createdAt: z.date(),
});

export const DeadLetterJobSchema = z.object({
  id: z.string().uuid(),
  executionId: z.string().uuid(),
  executionNodeId: z.string().uuid().optional(),
  nodeId: z.string().uuid().optional(),
  jobData: z.record(z.unknown()),
  error: z.string(),
  attempts: z.number().int().min(0),
  createdAt: z.date(),
});

export const SecretSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  name: z.string().min(1).max(100),
  value: z.string(),
  description: z.string().max(500).optional(),
  enabled: z.boolean().default(true),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const EnvironmentVariableSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  name: z.string().min(1).max(100),
  value: z.string(),
  description: z.string().max(500).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const AuditActionSchema = z.enum([
  'user.registered',
  'user.login',
  'user.logout',
  'user.password_changed',
  'user.email_verified',
  'workspace.created',
  'workspace.updated',
  'workspace.deleted',
  'member.invited',
  'member.accepted',
  'member.removed',
  'member.role_changed',
  'workflow.created',
  'workflow.updated',
  'workflow.deleted',
  'workflow.published',
  'workflow.duplicated',
  'workflow.versioned',
  'trigger.created',
  'trigger.updated',
  'trigger.deleted',
  'trigger.enabled',
  'trigger.disabled',
  'execution.started',
  'execution.completed',
  'execution.failed',
  'execution.cancelled',
  'execution.retried',
  'secret.created',
  'secret.updated',
  'secret.deleted',
  'secret.rotated',
  'api_key.created',
  'api_key.deleted',
]);
export type AuditAction = z.infer<typeof AuditActionSchema>;

export const AuditLogSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid().nullable(),
  userId: z.string().uuid().nullable(),
  action: AuditActionSchema,
  targetType: z.string().optional(),
  targetId: z.string().uuid().optional(),
  meta: z.record(z.unknown()).optional(),
  createdAt: z.date(),
});

export const NodeConfigSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('action.http'),
    method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
    url: z.string().url(),
    headers: z.record(z.string()).optional(),
    body: z.unknown().optional(),
    timeout: z.number().int().min(1000).max(30000).default(10000),
    retry: z.object({
      enabled: z.boolean(),
      maxAttempts: z.number().int().min(1).max(10),
      backoffMs: z.number().int().min(100),
    }).optional(),
  }),
  z.object({
    type: z.literal('action.email'),
    to: z.string().or(z.array(z.string().email())),
    subject: z.string(),
    body: z.string(),
    html: z.string().optional(),
  }),
  z.object({
    type: z.literal('action.condition'),
    expresión: z.string(),
  }),
  z.object({
    type: z.literal('action.delay'),
    durationMs: z.number().int().min(1000).max(86400000),
  }),
  z.object({
    type: z.literal('action.transform'),
    mapping: z.record(z.string()),
  }),
  z.object({
    type: z.literal('trigger.webhook'),
    method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'ANY']),
    path: z.string().min(1),
    auth: z.enum(['none', 'signature', 'bearer']).default('none'),
    schema: z.record(z.unknown()).optional(),
  }),
  z.object({
    type: z.literal('trigger.cron'),
    expression: z.string(),
  }),
]);

export const HttpNodeResponseSchema = z.object({
  statusCode: z.number().int(),
  statusText: z.string(),
  headers: z.record(z.string()),
  body: z.unknown(),
  durationMs: z.number().int(),
});

export const JobDataSchema = z.object({
  executionId: z.string().uuid(),
  nodeId: z.string().uuid(),
  nodeType: NodeTypeSchema,
  config: z.record(z.unknown()),
  input: z.record(z.unknown()),
  retryCount: z.number().int().min(0),
  executionContext: z.object({
    workflowId: z.string().uuid(),
    workflowVersionId: z.string().uuid(),
    triggerType: TriggerSchema,
    triggerId: z.string().uuid().optional(),
    idempotencyKey: z.string(),
  }),
});

export type JobData = z.infer<typeof JobDataSchema>;

export const JobResultSchema = z.object({
  success: z.boolean(),
  output: z.record(z.unknown()).optional(),
  error: z.string().optional(),
  retry: z.object({
    shouldRetry: z.boolean(),
    retryDelayMs: z.number().int().optional(),
  }).optional(),
});

export type JobResult = z.infer<typeof JobResultSchema>;

export const UserCreateInput = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  password: z.string().min(8),
});

export const UserLoginInput = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const WorkspaceCreateInput = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/),
});

export const WorkflowCreateInput = z.object({
  workspaceId: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
});

export const TriggerCreateInput = z.object({
  workflowId: z.string().uuid(),
  type: TriggerSchema,
  config: z.record(z.unknown()),
});

export const ExecutionCreateInput = z.object({
  workflowId: z.string().uuid(),
  triggerType: TriggerSchema,
  triggerId: z.string().uuid().optional(),
  input: z.record(z.unknown()).optional(),
});

export const SecretCreateInput = z.object({
  workspaceId: z.string().uuid(),
  name: z.string().min(1).max(100),
  value: z.string(),
  description: z.string().max(500).optional(),
});

export const PaginatedQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const ApiResponseSchema = z.object({
  success: z.boolean(),
  data: z.unknown().optional(),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.unknown()).optional(),
  }).optional(),
  meta: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }).optional(),
});

export const ApiErrorCodeSchema = z.enum([
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'VALIDATION_ERROR',
  'CONFLICT',
  'RATE_LIMITED',
  'INTERNAL_ERROR',
  'BAD_REQUEST',
]);