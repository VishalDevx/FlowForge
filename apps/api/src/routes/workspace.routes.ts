import { FastifyInstance } from 'fastify';
import { WorkspaceService } from '@flowforge/workspace';
import { authenticate } from '../middlewares/auth';
import { hasWorkspacePermission } from '../middleware/workspace';
import { Role } from '@prisma/client';

export default async function workspaceRoutes(server: FastifyInstance) {
  // Create workspace
  server.post('/workspaces', { preHandler: authenticate }, async (req: any, res: any) => {
    try {
      const { name, slug } = req.body;
      const workspace = await WorkspaceService.create(req.user.id, name, slug);
      res.status(201).send(workspace);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  // Get workspace by ID
  server.get('/workspaces/:id', { preHandler: [authenticate, hasWorkspacePermission('viewer' as Role)] }, async (req: any, res: any) => {
    try {
      const workspace = await WorkspaceService.getById((req.params as any).id);
      res.send(workspace);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  // Update workspace
  server.patch('/workspaces/:id', { preHandler: [authenticate, hasWorkspacePermission('admin' as Role)] }, async (req: any, res: any) => {
    try {
      const workspace = await WorkspaceService.update((req.params as any).id, req.body);
      res.send(workspace);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  // Invite member
  server.post('/workspaces/:id/members/invite', { preHandler: [authenticate, hasWorkspacePermission('admin' as Role)] }, async (req: any, res: any) => {
    try {
      const { email, role } = req.body;
      const invitation = await WorkspaceService.inviteMember((req.params as any).id, email, role, req.user.id);
      res.status(201).send(invitation);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  // Accept invitation
  server.post('/invitations/accept', { preHandler: authenticate }, async (req: any, res: any) => {
    try {
      const { token } = req.body;
      const member = await WorkspaceService.acceptInvitation(token, req.user.id);
      res.status(201).send(member);
    } catch (error: any) {
      res.status(400).send({ error: error.message });
    }
  });

  // Remove member
  server.delete('/workspaces/:id/members/:userId', { preHandler: [authenticate, hasWorkspacePermission('admin' as Role)] }, async (req: any, res: any) => {
    try {
      await WorkspaceService.removeMember((req.params as any).id, (req.params as any).userId, req.user.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  // Update member role
  server.patch('/workspaces/:id/members/:userId/role', { preHandler: [authenticate, hasWorkspacePermission('admin' as Role)] }, async (req: any, res: any) => {
    try {
      const { role } = req.body;
      const member = await WorkspaceService.updateMemberRole((req.params as any).id, (req.params as any).userId, role, req.user.id);
      res.send(member);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  // Create API key
  server.post('/workspaces/:id/api-keys', { preHandler: [authenticate, hasWorkspacePermission('admin' as Role)] }, async (req: any, res: any) => {
    try {
      const { name, prefix } = req.body;
      const apiKey = await WorkspaceService.createApiKey((req.params as any).id, name, req.user.id, prefix);
      res.status(201).send(apiKey);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  // Revoke API key
  server.delete('/workspaces/:id/api-keys/:keyId', { preHandler: [authenticate, hasWorkspacePermission('admin' as Role)] }, async (req: any, res: any) => {
    try {
      await WorkspaceService.revokeApiKey((req.params as any).keyId, (req.params as any).id, req.user.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  // List API keys
  server.get('/workspaces/:id/api-keys', { preHandler: [authenticate, hasWorkspacePermission('viewer' as Role)] }, async (req: any, res: any) => {
    try {
      const keys = await WorkspaceService.listApiKeys((req.params as any).id);
      res.send(keys);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  // Store secret
  server.post('/workspaces/:id/secrets', { preHandler: [authenticate, hasWorkspacePermission('developer' as Role)] }, async (req: any, res: any) => {
    try {
      const { name, value, description } = req.body;
      const secret = await WorkspaceService.storeSecret((req.params as any).id, name, value, description, req.user.id);
      res.send(secret);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  // List secrets
  server.get('/workspaces/:id/secrets', { preHandler: [authenticate, hasWorkspacePermission('developer' as Role)] }, async (req: any, res: any) => {
    try {
      const secrets = await WorkspaceService.listSecrets((req.params as any).id);
      res.send(secrets);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  // Delete secret
  server.delete('/workspaces/:id/secrets/:name', { preHandler: [authenticate, hasWorkspacePermission('developer' as Role)] }, async (req: any, res: any) => {
    try {
      await WorkspaceService.deleteSecret((req.params as any).id, (req.params as any).name, req.user.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  // Get workflows
  server.get('/workspaces/:id/workflows', { preHandler: [authenticate, hasWorkspacePermission('viewer' as Role)] }, async (req: any, res: any) => {
    try {
      const workflows = await WorkspaceService.getWorkflows((req.params as any).id);
      res.send(workflows);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  // Create workflow
  server.post('/workspaces/:id/workflows', { preHandler: [authenticate, hasWorkspacePermission('developer' as Role)] }, async (req: any, res: any) => {
    try {
      const { name, description } = req.body;
      const workflow = await WorkspaceService.createWorkflow((req.params as any).id, name, description, req.user.id);
      res.status(201).send(workflow);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  // Duplicate workflow
  server.post('/workspaces/:id/workflows/:workflowId/duplicate', { preHandler: [authenticate, hasWorkspacePermission('developer' as Role)] }, async (req: any, res: any) => {
    try {
      const { newName } = req.body;
      const workflow = await WorkspaceService.duplicateWorkflow((req.params as any).id, (req.params as any).workflowId, newName, req.user.id);
      res.status(201).send(workflow);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  // Get executions
  server.get('/workspaces/:id/executions', { preHandler: [authenticate, hasWorkspacePermission('viewer' as Role)] }, async (req: any, res: any) => {
    try {
      const limit = parseInt((req.query as any).limit) || 20;
      const offset = parseInt((req.query as any).offset) || 0;
      const executions = await WorkspaceService.getExecutions((req.params as any).id, limit, offset);
      res.send(executions);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  // Get execution stats
  server.get('/workspaces/:id/execution-stats', { preHandler: [authenticate, hasWorkspacePermission('viewer' as Role)] }, async (req: any, res: any) => {
    try {
      const stats = await WorkspaceService.getExecutionStats((req.params as any).id);
      res.send(stats);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  // Get usage
  server.get('/workspaces/:id/usage', { preHandler: [authenticate, hasWorkspacePermission('viewer' as Role)] }, async (req: any, res: any) => {
    try {
      const usage = await WorkspaceService.getUsage((req.params as any).id);
      res.send(usage);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  // List user workspaces
  server.get('/user/workspaces', { preHandler: authenticate }, async (req: any, res: any) => {
    try {
      const workspaces = await WorkspaceService.listUserWorkspaces(req.user.id);
      res.send(workspaces);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  // Get audit logs
  server.get('/workspaces/:id/audit-logs', { preHandler: [authenticate, hasWorkspacePermission('admin' as Role)] }, async (req: any, res: any) => {
    try {
      const limit = parseInt((req.query as any).limit) || 50;
      const offset = parseInt((req.query as any).offset) || 0;
      const logs = await WorkspaceService.getAuditLogs((req.params as any).id, limit, offset);
      res.send(logs);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  // Transfer ownership
  server.post('/workspaces/:id/transfer-ownership', { preHandler: [authenticate, hasWorkspacePermission('owner' as Role)] }, async (req: any, res: any) => {
    try {
      const { newOwnerId } = req.body;
      const workspace = await WorkspaceService.transferOwnership((req.params as any).id, newOwnerId, req.user.id);
      res.send(workspace);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  // Purge old executions
  server.delete('/workspaces/:id/purge-executions', { preHandler: [authenticate, hasWorkspacePermission('admin' as Role)] }, async (req: any, res: any) => {
    try {
      const olderThanDays = parseInt((req.query as any).olderThanDays) || 30;
      const result = await WorkspaceService.purgeOldExecutions((req.params as any).id, olderThanDays, req.user.id);
      res.send(result);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });
}
