export interface User {
  id: string;
  email: string;
  name?: string;
  passwordHash?: string;
  emailVerified?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
  members?: WorkspaceMember[];
  owner?: User;
}

export interface WorkspaceMember {
  id: string;
  userId: string;
  workspaceId: string;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
  user?: User;
}

export type Role = 'owner' | 'admin' | 'developer' | 'operator' | 'viewer';

export interface WorkspaceApiKey {
  id: string;
  workspaceId: string;
  userId: string;
  name: string;
  prefix: string;
  keyHash: string;
  lastUsedAt?: Date;
  expiresAt?: Date;
  createdAt: Date;
}

export interface WorkspaceInvitation {
  id: string;
  workspaceId: string;
  email: string;
  role: Role;
  token: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface WorkspaceSecret {
  id: string;
  workspaceId: string;
  name: string;
  value: string;
  description?: string;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface EnvironmentVariable {
  id: string;
  workspaceId: string;
  name: string;
  value: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkspaceAuditLog {
  id: string;
  workspaceId?: string;
  userId?: string;
  action: AuditAction;
  targetType?: string;
  targetId?: string;
  meta?: Record<string, any>;
  createdAt: Date;
  user?: User;
}

export type AuditAction =
  | 'user_registered'
  | 'user_login'
  | 'user_logout'
  | 'user_password_changed'
  | 'user_email_verified'
  | 'workspace_created'
  | 'workspace_updated'
  | 'workspace_deleted'
  | 'member_invited'
  | 'member_accepted'
  | 'member_removed'
  | 'member_role_changed'
  | 'workflow_created'
  | 'workflow_updated'
  | 'workflow_deleted'
  | 'workflow_published'
  | 'workflow_duplicated'
  | 'workflow_versioned'
  | 'trigger_created'
  | 'trigger_updated'
  | 'trigger_deleted'
  | 'trigger_enabled'
  | 'trigger_disabled'
  | 'execution_started'
  | 'execution_completed'
  | 'execution_failed'
  | 'execution_cancelled'
  | 'execution_retried'
  | 'secret_created'
  | 'secret_updated'
  | 'secret_deleted'
  | 'secret_rotated'
  | 'api_key_created'
  | 'api_key_deleted';
