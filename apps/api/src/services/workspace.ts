import { prisma } from '../db.js';
import type { CreateWorkspaceInput, UpdateWorkspaceInput, PaginationQuery } from '../dtos/index.js';
import { generateSlug, generateId } from '../utils/index.js';

export const workspaceService: Record<string, Function> = {
  async create(input: CreateWorkspaceInput, userId: string) {
    const slug = input.slug || generateSlug(input.name);
    
    const existing = await prisma.workspace.findUnique({
      where: { slug },
    });
    
    if (existing) {
      const newSlug = `${slug}-${generateId().slice(0, 8)}`;
      return this.createWithSlug(input, userId, newSlug);
    }
    
    return this.createWithSlug(input, userId, slug);
  },

  async createWithSlug(input: CreateWorkspaceInput, userId: string, slug: string) {
    const workspace = await prisma.workspace.create({
      data: {
        name: input.name,
        slug,
        ownerId: userId,
      },
    });
    
    await prisma.workspaceMember.create({
      data: {
        userId,
        workspaceId: workspace.id,
        role: 'owner',
      },
    });
    
    await prisma.auditLog.create({
      data: {
        workspaceId: workspace.id,
        userId,
        action: 'workspace_created',
      },
    });
    
    return workspace;
  },

  async findAll(userId: string, query: PaginationQuery) {
    const { page = 1, limit = 20 } = query;
    
    const [workspaces, total] = await Promise.all([
      prisma.workspace.findMany({
        where: {
          members: {
            some: { userId },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.workspace.count({
        where: {
          members: {
            some: { userId },
          },
        },
      }),
    ]);
    
    return {
      data: workspaces,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  },

  async findById(id: string, userId: string) {
    const member = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId: id,
        userId,
      },
    });
    
    if (!member) {
      return null;
    }
    
    return prisma.workspace.findUnique({
      where: { id },
    });
  },

  async update(id: string, userId: string, input: UpdateWorkspaceInput) {
    const member = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId: id,
        userId,
        role: 'owner',
      },
    });
    
    if (!member) {
      throw new Error('FORBIDDEN');
    }
    
    const workspace = await prisma.workspace.update({
      where: { id },
      data: input,
    });
    
    await prisma.auditLog.create({
      data: {
        workspaceId: id,
        userId,
        action: 'workspace_updated',
        meta: input,
      },
    });
    
    return workspace;
  },

  async delete(id: string, userId: string) {
    const member = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId: id,
        userId,
        role: 'owner',
      },
    });
    
    if (!member) {
      throw new Error('FORBIDDEN');
    }
    
    await prisma.workspace.delete({
      where: { id },
    });
  },

  async getMembers(workspaceId: string) {
    return prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: { user: { select: { id: true, email: true, name: true } } },
    });
  },

  async addMember(workspaceId: string, email: string, role: string, userId: string) {
    const user = await prisma.user.findUnique({
      where: { email },
    });
    
    if (!user) {
      throw new Error('NOT_FOUND');
    }
    
    const member = await prisma.workspaceMember.create({
      data: {
        workspaceId,
        userId: user.id,
        role: role as any,
      },
    });
    
    await prisma.auditLog.create({
      data: {
        workspaceId,
        userId,
        action: 'member_invited',
        targetType: 'user',
        targetId: user.id,
      },
    });
    
    return member;
  },

  async removeMember(workspaceId: string, memberId: string, userId: string) {
    await prisma.workspaceMember.delete({
      where: { id: memberId },
    });
    
    await prisma.auditLog.create({
      data: {
        workspaceId,
        userId,
        action: 'member_removed',
        targetId: memberId,
      },
    });
  },
};