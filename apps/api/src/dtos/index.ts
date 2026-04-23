import { z } from 'zod';

export const RegisterDto = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  password: z.string().min(8),
});

export const LoginDto = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const RefreshTokenDto = z.object({
  refreshToken: z.string(),
});

export const CreateWorkspaceDto = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/).optional(),
});

export const UpdateWorkspaceDto = z.object({
  name: z.string().min(1).max(100).optional(),
});

export const CreateWorkflowDto = z.object({
  workspaceId: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
});

export const UpdateWorkflowDto = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(1000).optional(),
});

export const WorkflowVersionDto = z.object({
  nodes: z.array(z.object({
    id: z.string().uuid(),
    type: z.string(),
    positionX: z.number(),
    positionY: z.number(),
    label: z.string().max(100),
    config: z.record(z.unknown()).optional(),
  })),
  edges: z.array(z.object({
    id: z.string().uuid(),
    sourceNodeId: z.string().uuid(),
    targetNodeId: z.string().uuid(),
  })),
  executionPolicy: z.enum(['stop-on-first-failure', 'continue-on-branch-failure']).optional(),
  retryPolicy: z.object({
    maxAttempts: z.number().int().min(1).max(10),
    backoffMs: z.number().int().min(100),
    backoffMultiplier: z.number().min(1).max(5),
  }).optional(),
  timeoutMs: z.number().int().min(1000).optional(),
});

export const CreateExecutionDto = z.object({
  workflowId: z.string().uuid(),
  input: z.record(z.unknown()).optional(),
});

export const WorkflowTriggerDto = z.object({
  type: z.enum(['webhook', 'cron', 'manual', 'event', 'scheduled']),
  config: z.record(z.unknown()),
  enabled: z.boolean().optional(),
});

export const CreateSecretDto = z.object({
  workspaceId: z.string().uuid(),
  name: z.string().min(1).max(100),
  value: z.string(),
  description: z.string().max(500).optional(),
  enabled: z.boolean().optional(),
});

export const UpdateSecretDto = z.object({
  name: z.string().min(1).max(100).optional(),
  value: z.string().optional(),
  description: z.string().max(500).optional(),
  enabled: z.boolean().optional(),
});

export const PaginationQueryDto = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type RegisterInput = z.infer<typeof RegisterDto>;
export type LoginInput = z.infer<typeof LoginDto>;
export type RefreshTokenInput = z.infer<typeof RefreshTokenDto>;
export type CreateWorkspaceInput = z.infer<typeof CreateWorkspaceDto>;
export type UpdateWorkspaceInput = z.infer<typeof UpdateWorkspaceDto>;
export type CreateWorkflowInput = z.infer<typeof CreateWorkflowDto>;
export type UpdateWorkflowInput = z.infer<typeof UpdateWorkflowDto>;
export type WorkflowVersionInput = z.infer<typeof WorkflowVersionDto>;
export type CreateExecutionInput = z.infer<typeof CreateExecutionDto>;
export type WorkflowTriggerInput = z.infer<typeof WorkflowTriggerDto>;
export type CreateSecretInput = z.infer<typeof CreateSecretDto>;
export type UpdateSecretInput = z.infer<typeof UpdateSecretDto>;
export type PaginationQuery = z.infer<typeof PaginationQueryDto>;