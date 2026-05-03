import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { authService } from '../services/auth.js';
import { RegisterDto, LoginDto, RefreshTokenDto } from '../dtos/index.js';
import { authenticate } from '../middlewares/auth.js';

export const authRoutes = async (fastify: FastifyInstance) => {
  fastify.post('/register', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const input = RegisterDto.parse(request.body);
      const result = await authService.register(input);
      return reply.status(201).send({ success: true, data: result });
    } catch (error: any) {
      if (error instanceof ZodError) {
        return reply.status(400).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: error.errors },
        });
      }
      if (error.message === 'CONFLICT') {
        return reply.status(409).send({
          success: false,
          error: { code: 'CONFLICT', message: 'Email already registered' },
        });
      }
      throw error;
    }
  });

  fastify.post('/login', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const input = LoginDto.parse(request.body);
      const result = await authService.login(input);
      return reply.status(200).send({ success: true, data: result });
    } catch (error: any) {
      if (error instanceof ZodError) {
        return reply.status(400).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: error.errors },
        });
      }
      if (error.message === 'UNAUTHORIZED') {
        return reply.status(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Invalid credentials' },
        });
      }
      throw error;
    }
  });

  fastify.post('/refresh', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const input = RefreshTokenDto.parse(request.body);
      const result = await authService.refresh(input.refreshToken);
      return reply.status(200).send({ success: true, data: result });
    } catch (error: any) {
      if (error.message === 'UNAUTHORIZED') {
        return reply.status(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Invalid refresh token' },
        });
      }
      throw error;
    }
  });

  fastify.get('/me', { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.userId) {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED' },
      });
    }
    const user = await authService.getUser(request.userId);
    return reply.status(200).send({ success: true, data: { user } });
  });

  fastify.post('/logout', { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.userId) {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED' },
      });
    }
    const body = request.body as { refreshToken?: string; all?: boolean };
    if (body.all) {
      await authService.logoutAll(request.userId);
    } else if (body.refreshToken) {
      await authService.logout(request.userId, body.refreshToken);
    }
    return reply.status(200).send({ success: true });
  });

  fastify.put('/password', { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.userId) {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED' },
      });
    }
    const body = request.body as { currentPassword?: string; newPassword?: string };
    if (!body.currentPassword || !body.newPassword) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'currentPassword and newPassword are required' },
      });
    }
    if (body.newPassword.length < 8) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Password must be at least 8 characters' },
      });
    }
    try {
      await authService.changePassword(request.userId, body.currentPassword, body.newPassword);
      return reply.status(200).send({ success: true });
    } catch (error: any) {
      if (error.message === 'UNAUTHORIZED') {
        return reply.status(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Current password is incorrect' },
        });
      }
      throw error;
    }
  });
};
