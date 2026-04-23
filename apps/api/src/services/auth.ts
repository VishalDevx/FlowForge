import { prisma } from '../index.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import type { RegisterInput, LoginInput } from '../dtos/index.js';
import type { AuthUser } from '../types/index.js';
import { config } from '../config/index.js';
import { generateId } from '../utils/index.js';

interface AuthResult {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

export const authService = {
  async register(input: RegisterInput): Promise<AuthResult> {
    const existing = await prisma.user.findUnique({
      where: { email: input.email },
    });
    
    if (existing) {
      throw new Error('CONFLICT');
    }
    
    const passwordHash = await bcrypt.hash(input.password, config.bcrypt.rounds);
    
    const user = await prisma.user.create({
      data: {
        email: input.email,
        name: input.name,
        passwordHash,
      },
    });
    
    const accessToken = jwt.sign(
      { userId: user.id, email: user.email },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn as any }
    );
    
    const refreshToken = jwt.sign(
      { userId: user.id, email: user.email, type: 'refresh' },
      config.jwt.secret,
      { expiresIn: config.jwt.refreshExpiresIn as any }
    );
    
    await prisma.session.create({
      data: {
        userId: user.id,
        token: accessToken,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      },
    });
    
    return {
      user: { id: user.id, email: user.email, name: user.name },
      accessToken,
      refreshToken,
    };
  },

  async login(input: LoginInput): Promise<AuthResult> {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
    });
    
    if (!user) {
      throw new Error('UNAUTHORIZED');
    }
    
    const valid = await bcrypt.compare(input.password, user.passwordHash);
    
    if (!valid) {
      throw new Error('UNAUTHORIZED');
    }
    
    const accessToken = jwt.sign(
      { userId: user.id, email: user.email },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn as any }
    );
    
    const refreshToken = jwt.sign(
      { userId: user.id, email: user.email, type: 'refresh' },
      config.jwt.secret,
      { expiresIn: config.jwt.refreshExpiresIn as any }
    );
    
    await prisma.session.create({
      data: {
        userId: user.id,
        token: accessToken,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      },
    });
    
    return {
      user: { id: user.id, email: user.email, name: user.name },
      accessToken,
      refreshToken,
    };
  },

  async refresh(refreshToken: string): Promise<AuthResult> {
    const payload = jwt.verify(refreshToken, config.jwt.secret) as { userId: string; email: string };
    
    const stored = await prisma.refreshToken.findFirst({
      where: { token: refreshToken, userId: payload.userId, revokedAt: null },
    });
    
    if (!stored) {
      throw new Error('UNAUTHORIZED');
    }
    
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });
    
    if (!user) {
      throw new Error('UNAUTHORIZED');
    }
    
    await prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });
    
    const accessToken = jwt.sign(
      { userId: user.id, email: user.email },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn as any }
    );
    
    const newRefreshToken = jwt.sign(
      { userId: user.id, email: user.email, type: 'refresh' },
      config.jwt.secret,
      { expiresIn: config.jwt.refreshExpiresIn as any }
    );
    
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: newRefreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
    
    return {
      user: { id: user.id, email: user.email, name: user.name },
      accessToken,
      refreshToken: newRefreshToken,
    };
  },

  async getUser(userId: string): Promise<AuthUser | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true },
    });
    
    return user;
  },
};