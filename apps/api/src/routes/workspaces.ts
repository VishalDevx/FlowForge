import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../index.js';
import { WorkspaceCreateInput } from '@flowforge/contracts';
import { generateSlug } from '@flowforge/utils';

declare module 'fastify' {
  interface FastifyRequest {
    workspaceId?: string;
  }
}

const workspacePlugin = async (fastify: FastifyInstance) => {
  fastify.decorate('workspaceAuth', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    
    const member = await prisma.workspaceMember.findFirst({
      where: { workspaceId: id, userId: request.userId },
    });
    
    if (!member) {
      return reply.status(403).send({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Access denied to workspace' },
      });
    }
    
    request.workspaceId = id;
  });
};

export const workspaceRoutes = async (fastify: FastifyInstance) => {
  await fastify.register(workspacePlugin);

  fastify.post('/', { preHandler: [fastify.authenticate] }, async (request: FastifyRequest<{ Body: typeof WorkspaceCreateInput }>, reply) => {
    const { name, slug: providedSlug } = WorkspaceCreateInput.parse(request.body);
    const slug = providedSlug || generateSlug(name);
    
    const existing = await prisma.workspace.findFirst({
      where: { OR: [{ slug }, { name }] },
    });
    
    if (existing) {
      return reply.status(409).send({
        success: false,
        error: { code: 'CONFLICT', message: 'Workspace name or slug already exists' },
      });
    }
    
    const workspace = await prisma.workspace.create({
      data: {
        name,
        slug,
        ownerId: request.userId!,
      },
    });
    
    await prisma.workspaceMember.create({
      data: {
        userId: request.userId!,
        workspaceId: workspace.id,
        role: 'owner',
      },
    });
    
    await prisma.auditLog.create({
      data: {
        workspaceId: workspace.id,
        userId: request.userId,
        action: 'workspace.created',
        targetType: 'workspace',
        targetId: workspace.id,
      },
    });
    
    return reply.status(201).send({
      success: true,
      data: { workspace },
    });
  });

  fastify.get('/', { preHandler: [fastify.authenticate] }, async (request: FastifyRequest, reply) => {
    const members = await prisma.workspaceMember.findMany({
      where: { userId: request.userId },
      include: { workspace: true },
    });
    
    return reply.status(200).send({
      success: true,
      data: { workspaces: members.map((m) => m.workspace) },
    });
  });

  fastify.get('/:id', { preHandler: [fastify.authenticate, fastify.workspaceAuth] }, async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const workspace = await prisma.workspace.findUnique({
      where: { id: request.params.id },
      include: {
        members: { include: { user: { select: { id: true, email: true, name: true } } } },
      },
    });
    
    if (!workspace) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Workspace not found' },
      });
    }
    
    return reply.status(200).send({
      success: true,
      data: { workspace },
    });
  });

  fastify.patch('/:id', { preHandler: [fastify.authenticate, fastify.workspaceAuth] }, async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const { name } = request.body as { name?: string };
    
    const workspace = await prisma.workspace.update({
      where: { id: request.params.id },
      data: { name },
    });
    
    await prisma.auditLog.create({
      data: {
        workspaceId: workspace.id,
        userId: request.userId,
        action: 'workspace.updated',
        meta: { name },
      },
    });
    
    return reply.status(200).send({
      success: true,
      data: { workspace },
    });
  });

  fastify.delete('/:id', { preHandler: [fastify.authenticate, fastify.workspaceAuth] }, async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
    await prisma.workspace.delete({
      where: { id: request.params.id },
    });
    
    await prisma.auditLog.create({
      data: {
        workspaceId: request.params.id,
        userId: request.userId,
        action: 'workspace.deleted',
      },
    });
    
    return reply.status(200).send({ success: true });
  });

  fastify.post('/:id/invitations', { preHandler: [fastify.authenticate, fastify.workspaceAuth] }, async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const { email, role } = request.body as { email: string; role: string };
    
    const member = await prisma.workspaceMember.findFirst({
      where: { workspaceId: request.params.id, userId: request.userId },
    });
    
    if (!member || !['owner', 'admin'].includes(member.role)) {
      return reply.status(403).send({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Only owners and admins can invite members' },
      });
    }
    
    const token = crypto.randomUUID();
    const invitation = await prisma.invitation.create({
      data: {
        workspaceId: request.params.id,
        email,
        role: role as any,
        token,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
    
    await prisma.auditLog.create({
      data: {
        workspaceId: request.params.id,
        userId: request.userId,
        action: 'member.invited',
        targetType: 'member',
        meta: { email, role },
      },
    });
    
    return reply.status(201).send({
      success: true,
      data: { invitation: { ...invitation, token } },
    });
  });

  fastify.post('/:id/members/:memberId', { preHandler: [fastify.authenticate, fastify.workspaceAuth] }, async (request: FastifyRequest<{ Params: { id: string; memberId: string } }>, reply) => {
    const { role } = request.body as { role: string };
    
    await prisma.workspaceMember.update({
      where: { id: request.params.memberId },
      data: { role: role as any },
    });
    
    await prisma.auditLog.create({
      data: {
        workspaceId: request.params.id,
        userId: request.userId,
        action: 'member.role_changed',
        meta: { memberId: request.params.memberId, role },
      },
    });
    
    return reply.status(200).send({ success: true });
  });

  fastify.delete('/:id/members/:memberId', { preHandler: [fastify.authenticate, fastify.workspaceAuth] }, async (request: FastifyRequest<{ Params: { id: string; memberId: string } }>, reply) => {
    const member = await prisma.workspaceMember.findFirst({
      where: { workspaceId: request.params.id, userId: request.userId },
    });
    
    if (!member || !['owner', 'admin'].includes(member.role)) {
      return reply.status(403).send({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Only owners and admins can remove members' },
      });
    }
    
    await prisma.workspaceMember.delete({
      where: { id: request.params.memberId },
    });
    
    await prisma.auditLog.create({
      data: {
        workspaceId: request.params.id,
        userId: request.userId,
        action: 'member.removed',
        meta: { memberId: request.params.memberId },
      },
    });
    
    return reply.status(200).send({ success: true });
  });
};