import Fastify, { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../index.js';
import { hashPassword, verifyPassword, generateAccessToken, generateRefreshToken, sanitizeUser } from '../auth.js';

declare module 'fastify' {
  interface FastifyRequest {
    user?: { id: string; email: string };
    userId?: string;
  }
}

const UserSchema = {
  body: {
    type: 'object',
    properties: {
      email: { type: 'string', format: 'email' },
      name: { type: 'string', minLength: 1, maxLength: 100 },
      password: { type: 'string', minLength: 8 },
    },
    required: ['email', 'name', 'password'],
  },
};

export const authRoutes = async (fastify: FastifyInstance) => {
  fastify.post('/register', { schema: UserSchema }, async (request: FastifyRequest<{ body: { email: string; name: string; password: string }>, reply) => {
    const { email, name, password } = request.body;
    
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return reply.status(409).send({
        success: false,
        error: { code: 'CONFLICT', message: 'Email already registered' },
      });
    }
    
    const passwordHash = await hashPassword(password);
    
    const user = await prisma.user.create({
      data: { email, name, passwordHash },
    });
    
    const accessToken = generateAccessToken({ userId: user.id, email: user.email });
    const refreshToken = generateRefreshToken({ userId: user.id, email: user.email });
    
    await prisma.session.create({
      data: {
        userId: user.id,
        token: accessToken,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      },
    });
    
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
    
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'user_registered',
      },
    });
    
    return reply.status(201).send({
      success: true,
      data: { user: sanitizeUser(user), accessToken, refreshToken },
    });
  });

  fastify.post('/login', { schema: UserSchema }, async (request: FastifyRequest<{ body: { email: string; password: string }>, reply) => {
    const { email, password } = request.body;
    
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Invalid credentials' },
      });
    }
    
    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Invalid credentials' },
      });
    }
    
    const accessToken = generateAccessToken({ userId: user.id, email: user.email });
    const refreshToken = generateRefreshToken({ userId: user.id, email: user.email });
    
    await prisma.session.create({
      data: {
        userId: user.id,
        token: accessToken,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      },
    });
    
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
    
    return reply.status(200).send({
      success: true,
      data: { user: sanitizeUser(user), accessToken, refreshToken },
    });
  });

  fastify.post('/refresh', async (request: FastifyRequest<{ body: { refreshToken: string }>, reply) => {
    const { refreshToken } = request.body as { refreshToken: string };
    
    if (!refreshToken) {
      return reply.status(400).send({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'Refresh token required' },
      });
    }
    
    try {
      const { verifyRefreshToken } = await import('../auth.js');
      const payload = verifyRefreshToken(refreshToken);
      
      const storedToken = await prisma.refreshToken.findFirst({
        where: { token: refreshToken, userId: payload.userId, revokedAt: null },
      });
      
      if (!storedToken) {
        return reply.status(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Invalid refresh token' },
        });
      }
      
      const user = await prisma.user.findUnique({ where: { id: payload.userId } });
      if (!user) {
        return reply.status(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'User not found' },
        });
      }
      
      await prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: { revokedAt: new Date() },
      });
      
      const newAccessToken = generateAccessToken({ userId: user.id, email: user.email });
      const newRefreshToken = generateRefreshToken({ userId: user.id, email: user.email });
      
      await prisma.refreshToken.create({
        data: {
          userId: user.id,
          token: newRefreshToken,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });
      
      return reply.status(200).send({
        success: true,
        data: { accessToken: newAccessToken, refreshToken: newRefreshToken },
      });
    } catch {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Invalid or expired refresh token' },
      });
    }
  });

  fastify.post('/logout', { preHandler: [fastify.authenticate] }, async (request: FastifyRequest, reply) => {
    const authHeader = request.headers.authorization;
    if (authHeader) {
      const token = authHeader.substring(7);
      await prisma.session.deleteMany({ where: { token } });
    }
    
    return reply.status(200).send({ success: true });
  });

  fastify.get('/me', { preHandler: [fastify.authenticate] }, async (request: FastifyRequest, reply) => {
    const user = await prisma.user.findUnique({ where: { id: request.userId } });
    if (!user) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'User not found' },
      });
    }
    
    return reply.status(200).send({
      success: true,
      data: { user: sanitizeUser(user) },
    });
  });
};