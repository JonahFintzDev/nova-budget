import { type FastifyInstance } from 'fastify';
import { Type } from '@sinclair/typebox';
import { jwtPreHandler } from '../classes/auth';
import { db } from '../classes/database';

export const transactionsRoutes = async (fastify: FastifyInstance): Promise<void> => {
  // GET /api/transactions — list user's transactions (optionally filtered by categoryId)
  fastify.get(
    '/api/transactions',
    {
      preHandler: jwtPreHandler,
      schema: {
        querystring: Type.Object({
          categoryId: Type.Optional(Type.String()),
        }),
      },
    },
    async (request, reply) => {
      const userId = request.jwtUser!.userId;
      const { categoryId } = request.query as { categoryId?: string };
      const transactions = await db.listTransactions(userId, categoryId);
      await reply.send(transactions);
    },
  );

  // POST /api/transactions — create transaction
  fastify.post(
    '/api/transactions',
    {
      preHandler: jwtPreHandler,
      schema: {
        body: Type.Object({
          categoryId: Type.String(),
          name: Type.String({ minLength: 1 }),
          tag: Type.Optional(Type.String()),
          price: Type.Number({ minimum: 0 }),
          date: Type.String(),
        }),
      },
    },
    async (request, reply) => {
      const userId = request.jwtUser!.userId;
      const body = request.body as {
        categoryId: string;
        name: string;
        tag?: string;
        price: number;
        date: string;
      };
      const tx = await db.createTransaction(userId, body);
      if (!tx) {
        await reply.code(400).send({ error: 'Category not found or does not belong to user' });
        return;
      }
      await reply.code(201).send(tx);
    },
  );

  // PATCH /api/transactions/:id — update transaction
  fastify.patch(
    '/api/transactions/:id',
    {
      preHandler: jwtPreHandler,
      schema: {
        params: Type.Object({ id: Type.String() }),
        body: Type.Object({
          categoryId: Type.Optional(Type.String()),
          name: Type.Optional(Type.String({ minLength: 1 })),
          tag: Type.Optional(Type.String()),
          price: Type.Optional(Type.Number({ minimum: 0 })),
          date: Type.Optional(Type.String()),
        }),
      },
    },
    async (request, reply) => {
      const userId = request.jwtUser!.userId;
      const { id } = request.params as { id: string };
      const body = request.body as Record<string, unknown>;
      const updated = await db.updateTransaction(id, userId, body);
      if (!updated) {
        await reply.code(404).send({ error: 'Transaction not found' });
        return;
      }
      await reply.send(updated);
    },
  );

  // DELETE /api/transactions/:id — delete transaction
  fastify.delete(
    '/api/transactions/:id',
    {
      preHandler: jwtPreHandler,
      schema: { params: Type.Object({ id: Type.String() }) },
    },
    async (request, reply) => {
      const userId = request.jwtUser!.userId;
      const { id } = request.params as { id: string };
      const ok = await db.deleteTransaction(id, userId);
      if (!ok) {
        await reply.code(404).send({ error: 'Transaction not found' });
        return;
      }
      await reply.code(204).send();
    },
  );
};
