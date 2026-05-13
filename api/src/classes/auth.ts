// node_modules
import { type FastifyInstance, type FastifyReply, type FastifyRequest } from 'fastify';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// classes
import { config } from './config';
import { db } from './database';

// types
import type { JwtUser } from '../@types/index';

interface JwtPayload {
  userId: string;
  username: string;
  isAdmin: boolean;
  iat?: number;
  exp?: number;
}

const SALT_ROUNDS = 10;

export const hashPassword = async (plain: string): Promise<string> => {
  return bcrypt.hash(plain, SALT_ROUNDS);
};

export const comparePassword = async (plain: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(plain, hash);
};

export const signToken = (userId: string, username: string, isAdmin: boolean): string => {
  const payload: JwtPayload = { userId, username, isAdmin };
  return jwt.sign(payload, config.jwtSecret, { expiresIn: '30d' });
};

export const verifyToken = (token: string): JwtPayload => {
  return jwt.verify(token, config.jwtSecret) as JwtPayload;
};

export const extractBearerToken = (request: FastifyRequest): string | null => {
  const header = request.headers['authorization'];
  if (!header || typeof header !== 'string' || !header.startsWith('Bearer ')) {
    return null;
  }
  return header.slice(7);
};

export const jwtPreHandler = async (
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> => {
  const token = extractBearerToken(request);
  if (!token) {
    await reply.code(401).send({ error: 'Missing authorization token' });
    return;
  }
  try {
    const payload = verifyToken(token);
    const user = await db.findUserById(payload.userId);
    if (!user) {
      await reply.code(401).send({ error: 'Invalid or expired token' });
      return;
    }
    request.jwtUser = {
      userId: user.id,
      username: user.username,
      isAdmin: user.isAdmin,
    };
  } catch {
    await reply.code(401).send({ error: 'Invalid or expired token' });
    return;
  }
};

export const adminRolePreHandler = async (
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> => {
  if (!request.jwtUser?.isAdmin) {
    await reply.code(403).send({ error: 'Admin access required' });
    return;
  }
};

export const registerAuth = (fastify: FastifyInstance): void => {
  fastify.decorateRequest<JwtUser | null>('jwtUser', null);
};
