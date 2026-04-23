import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ZodError } from 'zod';
import { authService } from '../services/auth.js';
import { RegisterDto, LoginDto, RefreshTokenDto, PaginationQueryDto } from '../dtos/index.js';

export const authController = {
  async register(request: FastifyRequest, reply: FastifyReply) {
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
  },

  async login(request: FastifyRequest, reply: FastifyReply) {
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
  },

  async refresh(request: FastifyRequest, reply: FastifyReply) {
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
  },

  async me(request: FastifyRequest, reply: FastifyReply) {
    if (!request.userId) {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED' },
      });
    }
    const user = await authService.getUser(request.userId);
    return reply.status(200).send({ success: true, data: { user } });
  },

  async logout(request: FastifyRequest, reply: FastifyReply) {
    return reply.status(200).send({ success: true });
  },
};

export const authRoutes = async (fastify: FastifyInstance) => {
  fastify.post('/register', authController.register);
  fastify.post('/login', authController.login);
  fastify.post('/refresh', authController.refresh);
  fastify.get('/me', authController.me);
  fastify.post('/logout', authController.logout);
};