import { prisma } from '../db.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import type { RegisterInput, LoginInput } from '../dtos/index.js';
import type { AuthUser } from '../types/index.js';
import { config } from '../config/index.js';

interface AuthResult {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

const REFRESH_EXPIRES_IN_MS = 7 * 24 * 60 * 60 * 1000;

export const authService = {
  async register(input: RegisterInput): Promise<AuthResult> {
    const existing = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    if (existing) {
      throw new Error('CONFLICT');
    }

    const passwordHash = await bcrypt.hash(input.password, config.bcryptRounds);

    const user = await prisma.user.create({
      data: {
        email: input.email.toLowerCase(),
        name: input.name,
        passwordHash,
      },
    });

    const { accessToken, refreshToken } = await generateTokens(user.id, user.email);

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + REFRESH_EXPIRES_IN_MS),
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
      where: { email: input.email.toLowerCase() },
    });

    if (!user) {
      throw new Error('UNAUTHORIZED');
    }

    const valid = await bcrypt.compare(input.password, user.passwordHash);

    if (!valid) {
      throw new Error('UNAUTHORIZED');
    }

    const { accessToken, refreshToken } = await generateTokens(user.id, user.email);

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + REFRESH_EXPIRES_IN_MS),
      },
    });

    return {
      user: { id: user.id, email: user.email, name: user.name },
      accessToken,
      refreshToken,
    };
  },

  async refresh(refreshToken: string): Promise<AuthResult> {
    const stored = await prisma.refreshToken.findFirst({
      where: { token: refreshToken, revokedAt: null },
      include: { user: true },
    });

    if (!stored) {
      throw new Error('UNAUTHORIZED');
    }

    if (stored.expiresAt < new Date()) {
      await prisma.refreshToken.update({
        where: { id: stored.id },
        data: { revokedAt: new Date() },
      });
      throw new Error('UNAUTHORIZED');
    }

    try {
      jwt.verify(refreshToken, config.jwt.secret);
    } catch {
      throw new Error('UNAUTHORIZED');
    }

    await prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const user = stored.user;
    const { accessToken, refreshToken: newRefreshToken } = await generateTokens(user.id, user.email);

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: newRefreshToken,
        expiresAt: new Date(Date.now() + REFRESH_EXPIRES_IN_MS),
      },
    });

    return {
      user: { id: user.id, email: user.email, name: user.name },
      accessToken,
      refreshToken: newRefreshToken,
    };
  },

  async logout(userId: string, refreshToken: string): Promise<void> {
    await prisma.refreshToken.updateMany({
      where: { userId, token: refreshToken },
      data: { revokedAt: new Date() },
    });
  },

  async logoutAll(userId: string): Promise<void> {
    await prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  },

  async getUser(userId: string): Promise<AuthUser | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true },
    });

    return user;
  },

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('NOT_FOUND');
    }

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);

    if (!valid) {
      throw new Error('UNAUTHORIZED');
    }

    const passwordHash = await bcrypt.hash(newPassword, config.bcryptRounds);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    await this.logoutAll(userId);
  },
};

async function generateTokens(userId: string, email: string): Promise<{ accessToken: string; refreshToken: string }> {
  const accessToken = jwt.sign(
    { userId, email },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn as jwt.SignOptions['expiresIn'] }
  );

  const refreshToken = jwt.sign(
    { userId, email, type: 'refresh' },
    config.jwt.secret,
    { expiresIn: config.jwt.refreshExpiresIn as jwt.SignOptions['expiresIn'] }
  );

  return { accessToken, refreshToken };
}
