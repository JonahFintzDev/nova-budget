// node_modules
import { type FastifyInstance } from 'fastify';
import { Type } from '@sinclair/typebox';

// classes
import { jwtPreHandler } from '../classes/auth';
import { db } from '../classes/database';

// ---- GET  /api/keys     — list the current user's API keys
// ---- POST /api/keys     — generate a new API key (plain key shown once)
// ---- DELETE /api/keys/:id — revoke an API key
export const keysRoutes = async (fastify: FastifyInstance): Promise<void> => {
  fastify.get('/api/keys', { preHandler: jwtPreHandler }, async (request, reply) => {
    const userId = request.jwtUser!.userId;
    const keys = await db.listApiKeys(userId);
    await reply.send(keys);
  });

  fastify.post(
    '/api/keys',
    {
      preHandler: jwtPreHandler,
      schema: {
        body: Type.Object({
          name: Type.String({ minLength: 1, maxLength: 100 }),
        }),
      },
    },
    async (request, reply) => {
      const userId = request.jwtUser!.userId;
      const { name } = request.body as { name: string };
      const created = await db.createApiKey(userId, name.trim());
      await reply.code(201).send({
        id: created.id,
        name: created.name,
        keyPrefix: created.keyPrefix,
        createdAt: created.createdAt,
        lastUsedAt: null,
        key: created.plainKey,
      });
    },
  );

  fastify.delete(
    '/api/keys/:id',
    {
      preHandler: jwtPreHandler,
      schema: { params: Type.Object({ id: Type.String() }) },
    },
    async (request, reply) => {
      const userId = request.jwtUser!.userId;
      const { id } = request.params as { id: string };
      const ok = await db.deleteApiKey(id, userId);
      if (!ok) {
        await reply.code(404).send({ error: 'API key not found' });
        return;
      }
      await reply.code(204).send();
    },
  );
};
