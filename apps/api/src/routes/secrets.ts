import { FastifyInstance } from 'fastify';
import { prisma } from '../index.js';
import { SecretCreateInput } from '@flowforge/contracts';
import { createCipheriv, randomBytes, createDecipheriv } from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

const encrypt = (text: string): string => {
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
};

const decrypt = (encryptedText: string): string => {
  const [ivHex, encrypted] = encryptedText.split(':');
  const decipher = createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), Buffer.from(ivHex, 'hex'));
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
};

export const secretRoutes = async (fastify: FastifyInstance) => {
  fastify.post('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { workspaceId, name, value, description } = SecretCreateInput.parse(request.body);

    const member = await prisma.workspaceMember.findFirst({
      where: { workspaceId, userId: request.userId },
    });

    if (!member || !['owner', 'admin'].includes(member.role)) {
      return reply.status(403).send({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Only owners and admins can manage secrets' },
      });
    }

    const encryptedValue = encrypt(value);

    const secret = await prisma.secret.create({
      data: { workspaceId, name, value: encryptedValue, description, enabled: true },
    });

    await prisma.auditLog.create({
      data: { workspaceId, userId: request.userId, action: 'secret.created', meta: { name } },
    });

    return reply.status(201).send({
      success: true,
      data: { secret: { ...secret, value: '***' } },
    });
  });

  fastify.get('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { workspaceId } = request.query as { workspaceId: string };

    const secrets = await prisma.secret.findMany({
      where: { workspaceId },
      select: { id: true, name: true, enabled: true, description: true, createdAt: true, updatedAt: true },
    });

    return reply.status(200).send({
      success: true,
      data: { secrets: secrets.map((s) => ({ ...s, value: '***' })) },
    });
  });

  fastify.patch('/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const secret = await prisma.secret.findUnique({
      where: { id: request.params.id },
    });

    if (!secret) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Secret not found' } });
    }

    const { name, value, description, enabled } = request.body as Record<string, string>;
    const updateData: any = {};
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (enabled !== undefined) updateData.enabled = enabled;
    if (value) updateData.value = encrypt(value);

    const updated = await prisma.secret.update({
      where: { id: request.params.id },
      data: updateData,
    });

    await prisma.auditLog.create({
      data: { workspaceId: secret.workspaceId, userId: request.userId, action: 'secret.updated', meta: { name: updated.name } },
    });

    return reply.status(200).send({
      success: true,
      data: { secret: { ...updated, value: '***' } },
    });
  });

  fastify.delete('/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const secret = await prisma.secret.findUnique({
      where: { id: request.params.id },
    });

    if (!secret) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Secret not found' } });
    }

    await prisma.secret.delete({ where: { id: request.params.id } });

    await prisma.auditLog.create({
      data: { workspaceId: secret.workspaceId, userId: request.userId, action: 'secret.deleted', meta: { name: secret.name } },
    });

    return reply.status(200).send({ success: true });
  });
};