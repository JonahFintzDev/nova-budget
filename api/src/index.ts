// node_modules
import Fastify from 'fastify';
import fastifyAuth from '@fastify/auth';
import fastifyCors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import { existsSync } from 'node:fs';

// classes
import { registerAuth } from './classes/auth';
import { config } from './classes/config';

// routes
import { adminRoutes } from './routes/admin';
import { authRoutes } from './routes/auth';
import { healthRoutes } from './routes/health';
import { keysRoutes } from './routes/keys';
import { pushRoutes } from './routes/push';
import { settingsRoutes } from './routes/settings';

import { ensureVapidKeys } from './classes/push';

const main = async (): Promise<void> => {
  const fastify = Fastify({ logger: true });

  await fastify.register(fastifyCors, {
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  });

  await fastify.register(fastifySwagger, {
    openapi: {
      openapi: '3.1.0',
      info: {
        title: 'Nova Budget API',
        description: 'REST API for Nova Budget.',
        version: '1.0.0',
      },
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            description: 'JWT obtained from POST /api/auth/login.',
          },
        },
      },
    },
  });

  await fastify.register(fastifySwaggerUi, {
    routePrefix: '/api/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
      persistAuthorization: true,
    },
  });

  await fastify.register(fastifyAuth);

  registerAuth(fastify);

  await fastify.register(healthRoutes);
  await fastify.register(authRoutes);
  await fastify.register(settingsRoutes);
  await fastify.register(adminRoutes);
  await fastify.register(pushRoutes);
  await fastify.register(keysRoutes);

  if (config.isProduction) {
    const staticRoot = config.dashboardDistPath;
    if (existsSync(staticRoot)) {
      await fastify.register(fastifyStatic, {
        root: staticRoot,
        prefix: '/',
      });
      fastify.setNotFoundHandler(async (request, reply) => {
        if (request.method === 'GET' && !request.url.startsWith('/api')) {
          return reply.sendFile('index.html', staticRoot);
        }
        await reply.code(404).send({ error: 'Not found' });
      });
    } else {
      console.error('Dashboard dist path does not exist', staticRoot);
      process.exit(1);
    }
  }

  await fastify.listen({ port: config.port, host: '0.0.0.0' });

  ensureVapidKeys();
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
