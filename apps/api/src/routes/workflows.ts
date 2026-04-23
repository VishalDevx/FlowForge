import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../index.js';
import { WorkflowCreateInput } from '@flowforge/contracts';

export const workflowRoutes = async (fastify: FastifyInstance) => {
  fastify.post('/', { preHandler: [fastify.authenticate] }, async (request: FastifyRequest<{ Body: typeof WorkflowCreateInput }>, reply) => {
    const { workspaceId, name, description } = WorkflowCreateInput.parse(request.body);
    
    const member = await prisma.workspaceMember.findFirst({
      where: { workspaceId, userId: request.userId },
    });
    
    if (!member) {
      return reply.status(403).send({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Access denied to workspace' },
      });
    }
    
    const workflow = await prisma.workflow.create({
      data: {
        workspaceId,
        name,
        description,
      },
    });
    
    await prisma.workflowVersion.create({
      data: {
        workflowId: workflow.id,
        version: 1,
        status: 'draft',
        nodes: [],
        edges: [],
      },
    });
    
    await prisma.auditLog.create({
      data: {
        workspaceId,
        userId: request.userId,
        action: 'workflow.created',
        targetType: 'workflow',
        targetId: workflow.id,
      },
    });
    
    return reply.status(201).send({
      success: true,
      data: { workflow },
    });
  });

  fastify.get('/', { preHandler: [fastify.authenticate] }, async (request: FastifyRequest, reply) => {
    const { workspaceId, page = '1', limit = '20' } = request.query as Record<string, string>;
    
    if (!workspaceId) {
      return reply.status(400).send({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'workspaceId is required' },
      });
    }
    
    const [workflows, total] = await Promise.all([
      prisma.workflow.findMany({
        where: { workspaceId },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.workflow.count({ where: { workspaceId } }),
    ]);
    
    return reply.status(200).send({
      success: true,
      data: { workflows },
      meta: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) },
    });
  });

  fastify.get('/:id', { preHandler: [fastify.authenticate] }, async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const workflow = await prisma.workflow.findUnique({
      where: { id: request.params.id },
      include: { versions: { orderBy: { version: 'desc' }, take: 10 } },
    });
    
    if (!workflow) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Workflow not found' },
      });
    }
    
    return reply.status(200).send({
      success: true,
      data: { workflow },
    });
  });

  fastify.patch('/:id', { preHandler: [fastify.authenticate] }, async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const { name, description } = request.body as Record<string, string>;
    
    const workflow = await prisma.workflow.update({
      where: { id: request.params.id },
      data: { name, description },
    });
    
    await prisma.auditLog.create({
      data: {
        workspaceId: workflow.workspaceId,
        userId: request.userId,
        action: 'workflow.updated',
        meta: { name, description },
      },
    });
    
    return reply.status(200).send({
      success: true,
      data: { workflow },
    });
  });

  fastify.delete('/:id', { preHandler: [fastify.authenticate] }, async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const workflow = await prisma.workflow.findUnique({
      where: { id: request.params.id },
    });
    
    if (!workflow) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Workflow not found' },
      });
    }
    
    await prisma.workflow.delete({
      where: { id: request.params.id },
    });
    
    await prisma.auditLog.create({
      data: {
        workspaceId: workflow.workspaceId,
        userId: request.userId,
        action: 'workflow.deleted',
      },
    });
    
    return reply.status(200).send({ success: true });
  });

  fastify.post('/:id/versions', { preHandler: [fastify.authenticate] }, async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const { nodes, edges, executionPolicy, retryPolicy, timeoutMs } = request.body as Record<string, unknown>;
    
    const latestVersion = await prisma.workflowVersion.findFirst({
      where: { workflowId: request.params.id },
      orderBy: { version: 'desc' },
    });
    
    const newVersion = await prisma.workflowVersion.create({
      data: {
        workflowId: request.params.id,
        version: (latestVersion?.version || 0) + 1,
        status: 'draft',
        nodes: nodes as any,
        edges: edges as any,
        executionPolicy: executionPolicy as any,
        retryPolicy: retryPolicy as any,
        timeoutMs: timeoutMs as any,
        createdBy: request.userId!,
      },
    });
    
    return reply.status(201).send({
      success: true,
      data: { version: newVersion },
    });
  });

  fastify.get('/:id/versions/:versionId', { preHandler: [fastify.authenticate] }, async (request: FastifyRequest<{ Params: { id: string; versionId: string } }>, reply) => {
    const version = await prisma.workflowVersion.findUnique({
      where: { id: request.params.versionId },
    });
    
    if (!version || version.workflowId !== request.params.id) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Version not found' },
      });
    }
    
    return reply.status(200).send({
      success: true,
      data: { version },
    });
  });

  fastify.post('/:id/publish', { preHandler: [fastify.authenticate] }, async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const { versionId } = request.body as { versionId: string };
    
    const version = await prisma.workflowVersion.update({
      where: { id: versionId },
      data: { status: 'published' },
    });
    
    await prisma.workflow.update({
      where: { id: request.params.id },
      data: { publishedVersionId: versionId },
    });
    
    await prisma.auditLog.create({
      data: {
        workspaceId: version.workflowId,
        userId: request.userId,
        action: 'workflow.published',
        meta: { versionId, version: version.version },
      },
    });
    
    return reply.status(200).send({
      success: true,
      data: { version },
    });
  });

  fastify.post('/:id/duplicate', { preHandler: [fastify.authenticate] }, async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const { name } = request.body as { name: string };
    
    const original = await prisma.workflow.findUnique({
      where: { id: request.params.id },
      include: { versions: { orderBy: { version: 'desc' }, take: 1 } },
    });
    
    if (!original) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Workflow not found' },
      });
    }
    
    const newWorkflow = await prisma.workflow.create({
      data: {
        workspaceId: original.workspaceId,
        name: name || `${original.name} (Copy)`,
        description: original.description,
      },
    });
    
    const latestVersion = original.versions[0];
    if (latestVersion) {
      await prisma.workflowVersion.create({
        data: {
          workflowId: newWorkflow.id,
          version: 1,
          status: 'draft',
          nodes: latestVersion.nodes,
          edges: latestVersion.edges,
          executionPolicy: latestVersion.executionPolicy,
          retryPolicy: latestVersion.retryPolicy,
          timeoutMs: latestVersion.timeoutMs,
          createdBy: request.userId!,
        },
      });
    }
    
    await prisma.auditLog.create({
      data: {
        workspaceId: original.workspaceId,
        userId: request.userId,
        action: 'workflow.duplicated',
        meta: { originalId: request.params.id, newId: newWorkflow.id },
      },
    });
    
    return reply.status(201).send({
      success: true,
      data: { workflow: newWorkflow },
    });
  });
};