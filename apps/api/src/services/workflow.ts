import { prisma } from '../index.js';
import type { CreateWorkflowInput, UpdateWorkflowInput, WorkflowVersionInput, CreateExecutionInput, PaginationQuery } from '../dtos/index.js';

export const workflowService = {
  async create(input: CreateWorkflowInput, userId: string) {
    const workspace = await prisma.workspace.findUnique({
      where: { id: input.workspaceId },
      include: { members: { where: { userId } } },
    });
    
    if (!workspace || workspace.members.length === 0) {
      throw new Error('FORBIDDEN');
    }
    
    const workflow = await prisma.workflow.create({
      data: {
        workspaceId: input.workspaceId,
        name: input.name,
        description: input.description,
      },
    });
    
    await prisma.workflowVersion.create({
      data: {
        workflowId: workflow.id,
        version: 1,
        status: 'draft',
        nodes: [],
        edges: [],
        createdBy: userId,
      },
    });
    
    await prisma.auditLog.create({
      data: {
        workspaceId: input.workspaceId,
        userId,
        action: 'workflow_created',
        targetType: 'workflow',
        targetId: workflow.id,
      },
    });
    
    return workflow;
  },

  async findAll(workspaceId: string, query: PaginationQuery) {
    const { page = 1, limit = 20 } = query;
    
    const [workflows, total] = await Promise.all([
      prisma.workflow.findMany({
        where: { workspaceId },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.workflow.count({ where: { workspaceId } }),
    ]);
    
    return {
      data: workflows,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  },

  async findById(id: string, userId: string) {
    const workflow = await prisma.workflow.findUnique({
      where: { id },
      include: { versions: { orderBy: { version: 'desc' }, take: 10 } },
    });
    
    if (!workflow) return null;
    
    const member = await prisma.workspaceMember.findFirst({
      where: { workspaceId: workflow.workspaceId, userId },
    });
    
    return member ? workflow : null;
  },

  async update(id: string, userId: string, input: UpdateWorkflowInput) {
    const workflow = await prisma.workflow.findUnique({ where: { id } });
    
    if (!workflow) throw new Error('NOT_FOUND');
    
    const updated = await prisma.workflow.update({
      where: { id },
      data: input,
    });
    
    await prisma.auditLog.create({
      data: {
        workspaceId: workflow.workspaceId,
        userId,
        action: 'workflow_updated',
        meta: input,
      },
    });
    
    return updated;
  },

  async delete(id: string, userId: string) {
    const workflow = await prisma.workflow.findUnique({ where: { id } });
    
    if (!workflow) throw new Error('NOT_FOUND');
    
    await prisma.workflow.delete({ where: { id } });
  },

  async createVersion(id: string, userId: string, input: WorkflowVersionInput) {
    const latest = await prisma.workflowVersion.findFirst({
      where: { workflowId: id },
      orderBy: { version: 'desc' },
    });
    
    const version = await prisma.workflowVersion.create({
      data: {
        workflowId: id,
        version: (latest?.version || 0) + 1,
        status: 'draft',
        nodes: input.nodes as any,
        edges: input.edges as any,
        executionPolicy: input.executionPolicy as any,
        retryPolicy: input.retryPolicy as any,
        timeoutMs: input.timeoutMs,
        createdBy: userId,
      },
    });
    
    return version;
  },

  async publishVersion(workflowId: string, versionId: string, userId: string) {
    const version = await prisma.workflowVersion.update({
      where: { id: versionId },
      data: { status: 'published' },
    });
    
    await prisma.workflow.update({
      where: { id: workflowId },
      data: { publishedVersionId: versionId },
    });
    
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'workflow_published',
        targetType: 'workflow',
        targetId: workflowId,
        meta: { versionId, version: version.version },
      },
    });
    
    return version;
  },
};

export const executionService = {
  async create(input: CreateExecutionInput, userId: string) {
    const workflow = await prisma.workflow.findUnique({
      where: { id: input.workflowId },
    });
    
    if (!workflow) throw new Error('NOT_FOUND');
    if (!workflow.publishedVersionId) throw new Error('NO_PUBLISHED_VERSION');
    
    const idempotencyKey = `${input.workflowId}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    
    const execution = await prisma.execution.create({
      data: {
        workspaceId: workflow.workspaceId,
        workflowId: input.workflowId,
        workflowVersionId: workflow.publishedVersionId,
        triggerType: 'manual',
        status: 'queued',
        input: input.input as any,
        idempotencyKey,
        createdBy: userId,
      },
    });
    
    await prisma.auditLog.create({
      data: {
        workspaceId: workflow.workspaceId,
        userId,
        action: 'execution_started',
        targetType: 'execution',
        targetId: execution.id,
      },
    });
    
    return execution;
  },

  async findAll(workflowId: string, query: PaginationQuery) {
    const { page = 1, limit = 20 } = query;
    
    const [executions, total] = await Promise.all([
      prisma.execution.findMany({
        where: { workflowId },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.execution.count({ where: { workflowId } }),
    ]);
    
    return {
      data: executions,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  },

  async findById(id: string, userId: string) {
    const execution = await prisma.execution.findUnique({
      where: { id },
      include: { nodes: true, logs: { orderBy: { createdAt: 'desc' }, take: 100 } },
    });
    
    return execution;
  },

  async cancel(id: string, userId: string) {
    const execution = await prisma.execution.update({
      where: { id },
      data: { status: 'cancelled' },
    });
    
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'execution_cancelled',
        targetType: 'execution',
        targetId: id,
      },
    });
    
    return execution;
  },
};