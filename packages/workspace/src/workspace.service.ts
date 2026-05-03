import { db } from '@flowforge/db';
import { Prisma } from '@flowforge/db';
import { Role, TriggerType, ExecutionStatus, AuditAction } from '@prisma/client';
import { Buffer } from 'buffer';
import crypto from 'crypto';
import process from 'process';

function encrypt(value: string): string {
  if (!process.env.ENCRYPTION_KEY) return value;
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(process.env.ENCRYPTION_KEY, 'hex'), iv);
  let encrypted = cipher.update(value, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

function decrypt(encrypted: string): string {
  if (!process.env.ENCRYPTION_KEY) return encrypted;
  const parts = encrypted.split(':');
  if (parts.length !== 3) return encrypted;
  const [ivHex, authTagHex, encryptedText] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(process.env.ENCRYPTION_KEY, 'hex'), iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

export const WorkspaceService: Record<string, Function> = {
  // 1. Create workspace
  create: async (ownerId: string, name: string, slug?: string) => {
    const finalSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const workspace = await db.workspace.create({
      data: {
        name,
        slug: finalSlug,
        ownerId,
        members: { create: { userId: ownerId, role: Role.owner } },
      },
      include: { members: { include: { user: true } } },
    });
    await WorkspaceService.logAudit(workspace.id, ownerId, AuditAction.workspace_created, { name, slug: finalSlug });
    return workspace;
  },

  // 2. Get workspace by ID
  getById: async (id: string) => {
    return db.workspace.findUnique({
      where: { id },
      include: { members: { include: { user: true } } },
    });
  },

  // 3. Get workspace by slug
  getBySlug: async (slug: string) => {
    return db.workspace.findUnique({
      where: { slug },
      include: { members: { include: { user: true } } },
    });
  },

  // 4. Update workspace
  update: async (id: string, data: Prisma.WorkspaceUpdateInput) => {
    return db.workspace.update({ where: { id }, data });
  },

  // 5. Delete workspace (hard delete)
  delete: async (id: string) => {
    return db.workspace.delete({ where: { id } });
  },

  // 6. Invite member (create invitation)
  inviteMember: async (workspaceId: string, email: string, role: Role, invitedBy: string) => {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const invitation = await db.invitation.create({
      data: { workspaceId, email, role, token, expiresAt },
    });
    await WorkspaceService.logAudit(workspaceId, invitedBy, AuditAction.member_invited, { email, role });
    return invitation;
  },

  // 7. Accept invitation
  acceptInvitation: async (token: string, userId: string) => {
    const invitation = await db.invitation.findUnique({ where: { token } });
    if (!invitation || invitation.expiresAt < new Date()) {
      throw new Error('Invalid or expired invitation');
    }
    const member = await db.workspaceMember.create({
      data: { workspaceId: invitation.workspaceId, userId, role: invitation.role },
      include: { user: true, workspace: true },
    });
    await db.invitation.delete({ where: { id: invitation.id } });
    await WorkspaceService.logAudit(invitation.workspaceId, userId, AuditAction.member_accepted, { role: invitation.role });
    return member;
  },

  // 8. Remove member
  removeMember: async (workspaceId: string, userId: string, removedBy: string) => {
    const result = await db.workspaceMember.deleteMany({
      where: { workspaceId, userId },
    });
    await WorkspaceService.logAudit(workspaceId, removedBy, AuditAction.member_removed, { userId });
    return result;
  },

  // 9. Update member role
  updateMemberRole: async (workspaceId: string, userId: string, role: Role, updatedBy: string) => {
    const result = await db.workspaceMember.updateMany({
      where: { workspaceId, userId },
      data: { role },
    });
    const member = await db.workspaceMember.findFirst({
      where: { workspaceId, userId },
      include: { user: true },
    });
    await WorkspaceService.logAudit(workspaceId, updatedBy, AuditAction.member_role_changed, { userId, role });
    return member;
  },

  // 10. Get workspace members
  getMembers: async (workspaceId: string) => {
    return db.workspaceMember.findMany({
      where: { workspaceId },
      include: { user: true },
    });
  },

  // 11. Create workspace API key
  createApiKey: async (workspaceId: string, name: string, userId: string, prefix?: string) => {
    const key = crypto.randomBytes(32).toString('hex');
    const keyHash = hashApiKey(key);
    const apiKey = await db.apiKey.create({
      data: {
        workspaceId,
        userId,
        name,
        prefix: prefix || 'ffw_',
        keyHash,
      },
    });
    await WorkspaceService.logAudit(workspaceId, userId, AuditAction.api_key_created, { name });
    return { ...apiKey, plaintextKey: `${prefix || 'ffw_'}${key}` };
  },

  // 12. Revoke API key
  revokeApiKey: async (apiKeyId: string, workspaceId: string, userId: string) => {
    const result = await db.apiKey.delete({ where: { id: apiKeyId, workspaceId } });
    await WorkspaceService.logAudit(workspaceId, userId, AuditAction.api_key_deleted, { apiKeyId });
    return result;
  },

  // 13. List workspace API keys
  listApiKeys: async (workspaceId: string) => {
    return db.apiKey.findMany({
      where: { workspaceId },
      select: { id: true, name: true, prefix: true, lastUsedAt: true, expiresAt: true, createdAt: true },
    });
  },

  // 14. Validate API key
  validateApiKey: async (plaintextKey: string) => {
    const keyHash = hashApiKey(plaintextKey);
    const apiKey = await db.apiKey.findFirst({ where: { keyHash }, include: { workspace: true, user: true } });
    if (apiKey) {
      await db.apiKey.update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } });
    }
    return apiKey;
  },

  // 15. Store secret
  storeSecret: async (workspaceId: string, name: string, value: string, description?: string, userId?: string) => {
    const encrypted = encrypt(value);
    const secret = await db.secret.upsert({
      where: { workspaceId_name: { workspaceId, name } },
      update: { value: encrypted, description: description || undefined, updatedAt: new Date() },
      create: { workspaceId, name, value: encrypted, description },
    });
    if (userId) await WorkspaceService.logAudit(workspaceId, userId, AuditAction.secret_created, { name });
    return secret;
  },

  // 16. Get secret (decrypted)
  getSecret: async (workspaceId: string, name: string) => {
    const secret = await db.secret.findUnique({ where: { workspaceId_name: { workspaceId, name } } });
    if (!secret) return null;
    return { ...secret, value: decrypt(secret.value) };
  },

  // 17. List secrets (without values)
  listSecrets: async (workspaceId: string) => {
    return db.secret.findMany({
      where: { workspaceId },
      select: { id: true, name: true, description: true, enabled: true, createdAt: true, updatedAt: true },
    });
  },

  // 18. Delete secret
  deleteSecret: async (workspaceId: string, name: string, userId: string) => {
    const result = await db.secret.delete({ where: { workspaceId_name: { workspaceId, name } } });
    await WorkspaceService.logAudit(workspaceId, userId, AuditAction.secret_deleted, { name });
    return result;
  },

  // 19. Rotate secret
  rotateSecret: async (workspaceId: string, name: string, newValue: string, userId: string) => {
    const encrypted = encrypt(newValue);
    const secret = await db.secret.update({
      where: { workspaceId_name: { workspaceId, name } },
      data: { value: encrypted, updatedAt: new Date() },
    });
    await WorkspaceService.logAudit(workspaceId, userId, AuditAction.secret_rotated, { name });
    return secret;
  },

  // 20. Create environment variable
  createEnvVar: async (workspaceId: string, name: string, value: string, description?: string) => {
    return db.environmentVariable.create({
      data: { workspaceId, name, value, description },
    });
  },

  // 21. Get environment variable
  getEnvVar: async (workspaceId: string, name: string) => {
    return db.environmentVariable.findUnique({ where: { workspaceId_name: { workspaceId, name } } });
  },

  // 22. List environment variables
  listEnvVars: async (workspaceId: string) => {
    return db.environmentVariable.findMany({
      where: { workspaceId },
      select: { id: true, name: true, description: true, createdAt: true, updatedAt: true },
    });
  },

  // 23. Update environment variable
  updateEnvVar: async (workspaceId: string, name: string, value: string, description?: string) => {
    return db.environmentVariable.update({
      where: { workspaceId_name: { workspaceId, name } },
      data: { value, description: description || undefined, updatedAt: new Date() },
    });
  },

  // 24. Delete environment variable
  deleteEnvVar: async (workspaceId: string, name: string) => {
    return db.environmentVariable.delete({ where: { workspaceId_name: { workspaceId, name } } });
  },

  // 25. Get workspace workflows
  getWorkflows: async (workspaceId: string) => {
    return db.workflow.findMany({
      where: { workspaceId },
      include: { versions: true, triggers: true },
    });
  },

  // 26. Get workflow by ID
  getWorkflow: async (workspaceId: string, workflowId: string) => {
    return db.workflow.findUnique({
      where: { id: workflowId, workspaceId },
      include: { versions: true, triggers: true, executions: true },
    });
  },

  // 27. Create workflow
  createWorkflow: async (workspaceId: string, name: string, description?: string, userId?: string) => {
    const workflow = await db.workflow.create({
      data: { workspaceId, name, description },
    });
    if (userId) await WorkspaceService.logAudit(workspaceId, userId, AuditAction.workflow_created, { name, workflowId: workflow.id });
    return workflow;
  },

  // 28. Duplicate workflow
  duplicateWorkflow: async (workspaceId: string, workflowId: string, newName: string, userId: string) => {
    const original = await db.workflow.findUnique({
      where: { id: workflowId, workspaceId },
      include: { versions: true, triggers: true },
    });
    if (!original) throw new Error('Workflow not found');
    const duplicated = await db.workflow.create({
      data: {
        workspaceId,
        name: newName,
        description: original.description,
        versions: { create: original.versions.map((v: any) => ({ ...v, id: undefined, workflowId: undefined })) },
        triggers: { create: original.triggers.map((t: any) => ({ ...t, id: undefined, workflowId: undefined })) },
      },
    });
    await WorkspaceService.logAudit(workspaceId, userId, AuditAction.workflow_duplicated, { originalId: workflowId, newId: duplicated.id });
    return duplicated;
  },

  // 29. Get workflow triggers
  getTriggers: async (workspaceId: string, workflowId?: string) => {
    return db.workflowTrigger.findMany({
      where: { workflow: { workspaceId }, ...(workflowId && { workflowId }) },
      include: { workflow: true },
    });
  },

  // 30. Create webhook trigger
  createWebhookTrigger: async (workspaceId: string, workflowId: string, config: any, userId: string) => {
    const webhookKey = crypto.randomBytes(32).toString('hex');
    const trigger = await db.workflowTrigger.create({
      data: { workflowId, type: TriggerType.webhook, config, webhookKey, enabled: true },
    });
    await WorkspaceService.logAudit(workspaceId, userId, AuditAction.trigger_created, { workflowId, type: 'webhook' });
    return { ...trigger, webhookUrl: `/api/webhooks/${webhookKey}` };
  },

  // 31. Create cron trigger
  createCronTrigger: async (workspaceId: string, workflowId: string, cronExpression: string, config: any, userId: string) => {
    const trigger = await db.workflowTrigger.create({
      data: { workflowId, type: TriggerType.cron, config: { ...config, cronExpression }, enabled: true },
    });
    await WorkspaceService.logAudit(workspaceId, userId, AuditAction.trigger_created, { workflowId, type: 'cron' });
    return trigger;
  },

  // 32. Delete trigger
  deleteTrigger: async (workspaceId: string, triggerId: string, userId: string) => {
    const result = await db.workflowTrigger.delete({ where: { id: triggerId } });
    await WorkspaceService.logAudit(workspaceId, userId, AuditAction.trigger_deleted, { triggerId });
    return result;
  },

  // 33. Enable/disable trigger
  toggleTrigger: async (workspaceId: string, triggerId: string, enabled: boolean, userId: string) => {
    const trigger = await db.workflowTrigger.update({
      where: { id: triggerId },
      data: { enabled },
    });
    await WorkspaceService.logAudit(workspaceId, userId, enabled ? AuditAction.trigger_enabled : AuditAction.trigger_disabled, { triggerId });
    return trigger;
  },

  // 34. Get workspace executions
  getExecutions: async (workspaceId: string, limit = 20, offset = 0, status?: ExecutionStatus) => {
    return db.execution.findMany({
      where: { workspaceId, ...(status && { status }) },
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
      include: { workflow: true, nodes: true },
    });
  },

  // 35. Get execution stats
  getExecutionStats: async (workspaceId: string) => {
    return db.execution.groupBy({
      by: ['status'],
      where: { workspaceId },
      _count: { status: true },
    });
  },

  // 36. Get execution by ID
  getExecution: async (workspaceId: string, executionId: string) => {
    return db.execution.findUnique({
      where: { id: executionId, workspaceId },
      include: { workflow: true, nodes: true, logs: true, deadLetters: true },
    });
  },

  // 37. Cancel execution
  cancelExecution: async (workspaceId: string, executionId: string, userId: string) => {
    const execution = await db.execution.update({
      where: { id: executionId, workspaceId },
      data: { status: ExecutionStatus.cancelled, finishedAt: new Date() },
    });
    await WorkspaceService.logAudit(workspaceId, userId, AuditAction.execution_cancelled, { executionId });
    return execution;
  },

  // 38. Retry execution
  retryExecution: async (workspaceId: string, executionId: string, userId: string) => {
    const original = await db.execution.findUnique({ where: { id: executionId, workspaceId } });
    if (!original) throw new Error('Execution not found');
    const retry = await db.execution.create({
      data: {
        workspaceId,
        workflowId: original.workflowId,
        workflowVersionId: original.workflowVersionId,
        triggerType: original.triggerType,
        status: ExecutionStatus.queued,
        input: original.input as any,
      },
    });
    await WorkspaceService.logAudit(workspaceId, userId, AuditAction.execution_retried, { originalId: executionId, newId: retry.id });
    return retry;
  },

  // 39. Get audit logs
  getAuditLogs: async (workspaceId: string, limit = 50, offset = 0) => {
    return db.auditLog.findMany({
      where: { workspaceId },
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
      include: { user: true },
    });
  },

  // 40. Log audit
  logAudit: async (workspaceId: string, userId: string | undefined, action: AuditAction, meta?: Record<string, any>) => {
    return db.auditLog.create({
      data: {
        workspaceId,
        userId,
        action,
        targetType: 'workspace',
        targetId: workspaceId,
        meta: meta ? JSON.parse(JSON.stringify(meta)) : undefined,
      },
    });
  },

  // 41. Check user permission
  hasPermission: async (workspaceId: string, userId: string, requiredRole: Role) => {
    const member = await db.workspaceMember.findFirst({
      where: { workspaceId, userId },
    });
    if (!member) return false;
    const roleHierarchy: Record<string, number> = { owner: 5, admin: 4, developer: 3, operator: 2, viewer: 1 };
    return roleHierarchy[member.role] >= roleHierarchy[requiredRole];
  },

  // 42. Get workspace usage stats
  getUsage: async (workspaceId: string) => {
    const [workflowCount, executionCount, secretCount, envVarCount] = await Promise.all([
      db.workflow.count({ where: { workspaceId } }),
      db.execution.count({ where: { workspaceId } }),
      db.secret.count({ where: { workspaceId } }),
      db.environmentVariable.count({ where: { workspaceId } }),
    ]);
    return { workflows: workflowCount, executions: executionCount, secrets: secretCount, envVars: envVarCount };
  },

  // 43. List user workspaces
  listUserWorkspaces: async (userId: string) => {
    return db.workspace.findMany({
      where: { members: { some: { userId } } },
      include: { members: { where: { userId } } },
    });
  },

  // 44. Generate unique slug
  generateSlug: async (name: string) => {
    let slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    let counter = 1;
    while (await db.workspace.findUnique({ where: { slug } })) {
      slug = `${slug}-${counter}`;
      counter++;
    }
    return slug;
  },

  // 45. Transfer ownership
  transferOwnership: async (workspaceId: string, newOwnerId: string, currentOwnerId: string) => {
    const workspace = await db.workspace.findUnique({ where: { id: workspaceId } });
    if (workspace?.ownerId !== currentOwnerId) throw new Error('Only owner can transfer ownership');
    await WorkspaceService.updateMemberRole(workspaceId, newOwnerId, Role.owner, currentOwnerId);
    const updated = await db.workspace.update({ where: { id: workspaceId }, data: { ownerId: newOwnerId } });
    await WorkspaceService.logAudit(workspaceId, currentOwnerId, AuditAction.workspace_updated, { transferredTo: newOwnerId });
    return updated;
  },

  // 46. Get pending invitations
  getInvitations: async (workspaceId: string) => {
    return db.invitation.findMany({ where: { workspaceId, expiresAt: { gt: new Date() } } });
  },

  // 47. Revoke invitation
  revokeInvitation: async (workspaceId: string, invitationId: string, userId: string) => {
    const result = await db.invitation.delete({ where: { id: invitationId, workspaceId } });
    await WorkspaceService.logAudit(workspaceId, userId, AuditAction.member_removed, { invitationId });
    return result;
  },

  // 48. Search workflows
  searchWorkflows: async (workspaceId: string, query: string) => {
    return db.workflow.findMany({
      where: { workspaceId, name: { contains: query, mode: 'insensitive' } },
      include: { versions: true },
    });
  },

  // 49. Get worker heartbeats
  getWorkerHeartbeats: async () => {
    return db.workerHeartbeat.findMany({
      orderBy: { lastSeen: 'desc' },
    });
  },

  // 50. Export workflow (full definition)
  exportWorkflow: async (workspaceId: string, workflowId: string) => {
    return db.workflow.findUnique({
      where: { id: workflowId, workspaceId },
      include: { versions: true, triggers: true },
    });
  },

  // 51. Import workflow
  importWorkflow: async (workspaceId: string, workflowData: any, userId: string) => {
    const workflow = await db.workflow.create({
      data: {
        workspaceId,
        name: workflowData.name,
        description: workflowData.description,
        versions: { create: workflowData.versions || [] },
        triggers: { create: workflowData.triggers || [] },
      },
    });
    await WorkspaceService.logAudit(workspaceId, userId, AuditAction.workflow_created, { name: workflowData.name, imported: true });
    return workflow;
  },

  // 52. Get execution nodes for an execution
  getExecutionNodes: async (workspaceId: string, executionId: string) => {
    return db.executionNode.findMany({
      where: { execution: { workspaceId }, executionId },
      orderBy: { createdAt: 'asc' },
    });
  },

  // 53. Get dead letter jobs
  getDeadLetterJobs: async (workspaceId: string, executionId?: string) => {
    return db.deadLetterJob.findMany({
      where: { execution: { workspaceId }, ...(executionId && { executionId }) },
      include: { execution: true },
    });
  },

  // 54. Retry dead letter job
  retryDeadLetterJob: async (workspaceId: string, jobId: string, userId: string) => {
    const job = await db.deadLetterJob.findUnique({ where: { id: jobId } });
    if (!job) throw new Error('Job not found');
    const execution = await db.execution.findUnique({ where: { id: job.executionId } });
    if (!execution || execution.workspaceId !== workspaceId) throw new Error('Job not found');
    const newNode = await db.executionNode.create({
      data: {
        executionId: job.executionId,
        nodeId: job.executionNodeId || crypto.randomUUID(),
        nodeType: 'action_queue' as any,
        status: 'pending' as any,
        input: job.jobData as any,
      },
    });
    await db.deadLetterJob.delete({ where: { id: jobId } });
    await WorkspaceService.logAudit(workspaceId, userId, AuditAction.execution_retried, { jobId, newNodeId: newNode.id });
    return newNode;
  },

  // 55. Purge old executions
  purgeOldExecutions: async (workspaceId: string, olderThanDays: number, userId: string) => {
    const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
    const result = await db.execution.deleteMany({
      where: { workspaceId, createdAt: { lt: cutoff } },
    });
    await WorkspaceService.logAudit(workspaceId, userId, AuditAction.workspace_updated, { purged: result.count, olderThanDays });
    return result;
  },

  // 56. Get execution logs
  getExecutionLogs: async (workspaceId: string, executionId: string, level?: string) => {
    return db.executionLog.findMany({
      where: { execution: { workspaceId }, executionId, ...(level && { level }) },
      orderBy: { createdAt: 'asc' },
    });
  },
};
