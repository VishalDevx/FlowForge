import { FastifyInstance } from 'fastify';
import { prisma } from '../index.js';

export const auditRoutes = async (fastify: FastifyInstance) => {
  fastify.get('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { workspaceId, page = '1', limit = '20', action } = request.query as Record<string, string>;

    const where: any = {};
    if (workspaceId) where.workspaceId = workspaceId;
    if (action) where.action = { contains: action };

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return reply.status(200).send({
      success: true,
      data: { logs },
      meta: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) },
    });
  });
};