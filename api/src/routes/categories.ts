import { type FastifyInstance } from 'fastify';
import { Type } from '@sinclair/typebox';
import { jwtPreHandler } from '../classes/auth';
import { db } from '../classes/database';

export const categoriesRoutes = async (fastify: FastifyInstance): Promise<void> => {
  // GET /api/categories — list user's categories
  fastify.get('/api/categories', { preHandler: jwtPreHandler }, async (request, reply) => {
    const userId = request.jwtUser!.userId;
    const categories = await db.listCategories(userId);
    await reply.send(categories);
  });

  // POST /api/categories — create category
  fastify.post(
    '/api/categories',
    {
      preHandler: jwtPreHandler,
      schema: {
        body: Type.Object({
          name: Type.String({ minLength: 1 }),
          icon: Type.String(),
          color: Type.String(),
          resetDay: Type.Integer({ minimum: 1, maximum: 31 }),
          limit: Type.Optional(Type.Union([Type.Number({ minimum: 0 }), Type.Null()])),
        }),
      },
    },
    async (request, reply) => {
      const userId = request.jwtUser!.userId;
      const body = request.body as {
        name: string;
        icon: string;
        color: string;
        resetDay: number;
        limit?: number | null;
      };
      const category = await db.createCategory(userId, body);
      await reply.code(201).send(category);
    },
  );

  // PATCH /api/categories/:id — update category
  fastify.patch(
    '/api/categories/:id',
    {
      preHandler: jwtPreHandler,
      schema: {
        params: Type.Object({ id: Type.String() }),
        body: Type.Object({
          name: Type.Optional(Type.String({ minLength: 1 })),
          icon: Type.Optional(Type.String()),
          color: Type.Optional(Type.String()),
          resetDay: Type.Optional(Type.Integer({ minimum: 1, maximum: 31 })),
          limit: Type.Optional(Type.Union([Type.Number({ minimum: 0 }), Type.Null()])),
        }),
      },
    },
    async (request, reply) => {
      const userId = request.jwtUser!.userId;
      const { id } = request.params as { id: string };
      const body = request.body as Record<string, unknown>;
      const updated = await db.updateCategory(id, userId, body);
      if (!updated) {
        await reply.code(404).send({ error: 'Category not found' });
        return;
      }
      await reply.send(updated);
    },
  );

  // DELETE /api/categories/:id — delete category (cascades transactions)
  fastify.delete(
    '/api/categories/:id',
    {
      preHandler: jwtPreHandler,
      schema: { params: Type.Object({ id: Type.String() }) },
    },
    async (request, reply) => {
      const userId = request.jwtUser!.userId;
      const { id } = request.params as { id: string };
      const ok = await db.deleteCategory(id, userId);
      if (!ok) {
        await reply.code(404).send({ error: 'Category not found' });
        return;
      }
      await reply.code(204).send();
    },
  );
};
