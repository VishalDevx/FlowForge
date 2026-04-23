import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { createLogger } from '@flowforge/logger';
import {
  UserSchema,
  RoleSchema,
  type Role,
  type UserCreateInput,
  type UserLoginInput,
} from '@flowforge/contracts';

const logger = createLogger('@flowforge/auth');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';
const BCRYPT_ROUNDS = 12;

export interface TokenPayload {
  userId: string;
  email: string;
  role?: Role;
  workspaceId?: string;
}

export interface RefreshTokenPayload {
  userId: string;
  tokenId: string;
  type: 'refresh';
}

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
};

export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

export const generateAccessToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN as string });
};

export const generateRefreshToken = (payload: TokenPayload): string => {
  return jwt.sign({ ...payload, type: 'refresh' }, JWT_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRES_IN as string,
  });
};

export const verifyAccessToken = (token: string): TokenPayload => {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
};

export const verifyRefreshToken = (token: string): RefreshTokenPayload => {
  return jwt.verify(token, JWT_SECRET) as RefreshTokenPayload;
};

export const generateIdempotencyKey = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
};

export const sanitizeUser = (user: {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
}) => ({
  id: user.id,
  email: user.email,
  name: user.name,
  emailVerified: user.emailVerified,
});

export { JWT_SECRET, JWT_EXPIRES_IN, REFRESH_TOKEN_EXPIRES_IN, BCRYPT_ROUNDS };
export default logger;