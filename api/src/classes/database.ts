// node_modules
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// classes
import { config } from './config';

// generated
import { PrismaClient } from '../generated/client/client';
import type { Prisma } from '../generated/client/client';

const pool = new Pool({ connectionString: config.database.url });
const adapter = new PrismaPg(pool);
const _prisma = new PrismaClient({ adapter });

// -------------------------------------------------- Users --------------------------------------------------

const countUsers = async (): Promise<number> => {
  return _prisma.user.count();
};

const findUserByUsername = async (username: string) => {
  return _prisma.user.findUnique({ where: { username } });
};

const findUserById = async (id: string) => {
  return _prisma.user.findUnique({ where: { id } });
};

const createUser = async (data: {
  username: string;
  passwordHash: string;
  isAdmin?: boolean;
  language?: string;
}) => {
  return _prisma.user.create({
    data: {
      id: randomUUID(),
      username: data.username,
      passwordHash: data.passwordHash,
      isAdmin: data.isAdmin ?? false,
      language: data.language ?? 'en',
    },
  });
};

const updateUser = async (id: string, data: Prisma.UserUpdateInput) => {
  try {
    return await _prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        username: true,
        isAdmin: true,
        createdAt: true,
        language: true,
        autoTheme: true,
        darkTheme: true,
        lightTheme: true,
      },
    });
  } catch {
    return null;
  }
};

const deleteUser = async (id: string): Promise<boolean> => {
  try {
    await _prisma.user.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
};

const listUsers = async () => {
  return _prisma.user.findMany({
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      username: true,
      isAdmin: true,
      createdAt: true,
      language: true,
      autoTheme: true,
      darkTheme: true,
      lightTheme: true,
    },
  });
};

// -------------------------------------------------- Settings --------------------------------------------------

const getUserSettings = async (userId: string) => {
  const user = await findUserById(userId);
  if (!user) {
    return null;
  }
  return {
    language: user.language,
    autoTheme: user.autoTheme,
    darkTheme: user.darkTheme,
    lightTheme: user.lightTheme,
  };
};

const updateUserSettings = async (
  userId: string,
  data: {
    language?: string;
    autoTheme?: boolean;
    darkTheme?: string | null;
    lightTheme?: string | null;
  },
) => {
  return _prisma.user.update({
    where: { id: userId },
    data,
    select: {
      language: true,
      autoTheme: true,
      darkTheme: true,
      lightTheme: true,
    },
  });
};

const getAppSettings = async (): Promise<{ registrationEnabled: boolean }> => {
  const rows = await _prisma.appSettings.findMany({
    where: { key: { in: ['registrationEnabled'] } },
  });
  const map = new Map(rows.map((row) => [row.key, row.value]));
  return {
    registrationEnabled: (map.get('registrationEnabled') ?? 'true') === 'true',
  };
};

const updateAppSettings = async (data: { registrationEnabled?: boolean }): Promise<void> => {
  if (data.registrationEnabled !== undefined) {
    await _prisma.appSettings.upsert({
      where: { key: 'registrationEnabled' },
      create: { key: 'registrationEnabled', value: data.registrationEnabled ? 'true' : 'false' },
      update: { value: data.registrationEnabled ? 'true' : 'false' },
    });
  }
};

// -------------------------------------------------- Push Subscriptions --------------------------------------------------

const upsertPushSubscription = async (data: {
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}): Promise<void> => {
  const id = randomUUID();
  await _prisma.pushSubscription.upsert({
    where: { endpoint: data.endpoint },
    create: {
      id,
      userId: data.userId,
      endpoint: data.endpoint,
      p256dh: data.p256dh,
      auth: data.auth,
    },
    update: {
      userId: data.userId,
      p256dh: data.p256dh,
      auth: data.auth,
    },
  });
};

const deletePushSubscriptionByEndpoint = async (endpoint: string): Promise<void> => {
  await _prisma.pushSubscription.deleteMany({ where: { endpoint } });
};

const listPushSubscriptions = async () => {
  return _prisma.pushSubscription.findMany();
};

const listPushSubscriptionsByUser = async (userId: string) => {
  return _prisma.pushSubscription.findMany({ where: { userId } });
};

// -------------------------------------------------- API Keys --------------------------------------------------

const listApiKeys = async (userId: string) => {
  return _prisma.apiKey.findMany({
    where: { userId },
    select: { id: true, name: true, keyPrefix: true, createdAt: true, lastUsedAt: true },
    orderBy: { createdAt: 'desc' },
  });
};

const createApiKey = async (
  userId: string,
  name: string,
): Promise<{ id: string; name: string; keyPrefix: string; createdAt: Date; plainKey: string }> => {
  const rawKey = randomBytes(32).toString('hex');
  const keyPrefix = rawKey.slice(0, 8);
  const keyHash = createHash('sha256').update(rawKey).digest('hex');
  const record = await _prisma.apiKey.create({
    data: { userId, name, keyHash, keyPrefix },
    select: { id: true, name: true, keyPrefix: true, createdAt: true },
  });
  return { ...record, plainKey: rawKey };
};

const deleteApiKey = async (id: string, userId: string): Promise<boolean> => {
  const existing = await _prisma.apiKey.findFirst({ where: { id, userId } });
  if (!existing) {
    return false;
  }
  await _prisma.apiKey.delete({ where: { id } });
  return true;
};

const findApiKeyByRawKey = async (
  rawKey: string,
): Promise<{ id: string; userId: string } | null> => {
  const keyHash = createHash('sha256').update(rawKey).digest('hex');
  return _prisma.apiKey.findUnique({
    where: { keyHash },
    select: { id: true, userId: true },
  });
};

const touchApiKeyUsage = async (id: string): Promise<void> => {
  await _prisma.apiKey.update({ where: { id }, data: { lastUsedAt: new Date() } });
};

// -------------------------------------------------- Export --------------------------------------------------

export const db = {
  countUsers,
  findUserByUsername,
  findUserById,
  createUser,
  updateUser,
  deleteUser,
  listUsers,
  getUserSettings,
  updateUserSettings,
  getAppSettings,
  updateAppSettings,
  upsertPushSubscription,
  deletePushSubscriptionByEndpoint,
  listPushSubscriptions,
  listPushSubscriptionsByUser,
  listApiKeys,
  createApiKey,
  deleteApiKey,
  findApiKeyByRawKey,
  touchApiKeyUsage,
};
