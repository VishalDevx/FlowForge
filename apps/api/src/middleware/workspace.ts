import { FastifyRequest, FastifyReply } from 'fastify';
import { WorkspaceService } from '@flowforge/workspace';
import { Role } from '@prisma/client';
import type { AuthUser } from '../types/index.js';

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthUser;
  }
}

export const hasWorkspacePermission = (requiredRole: Role) => {
  return async (req: FastifyRequest, res: FastifyReply): Promise<void> => {
    try {
      const workspaceId = (req.params as any).id;
      const hasPermission = await WorkspaceService.hasPermission(workspaceId, req.user!.id, requiredRole);
      if (!hasPermission) {
        res.status(403).send({ error: 'Insufficient permissions' });
      }
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  };
};
