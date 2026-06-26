import Fastify, { type FastifyInstance } from 'fastify';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import sensible from '@fastify/sensible';
import rateLimit from '@fastify/rate-limit';
import { loadEnv, type Env } from './env.js';
import supabasePlugin from './plugins/supabase.js';
import authPlugin from './plugins/auth.js';
import { healthRoutes } from './routes/health.js';
import { authRoutes } from './routes/auth.js';
import { accountRoutes } from './routes/account.js';

/** Build the Fastify app. Pass an explicit env in tests; defaults to process.env. */
export async function buildApp(env: Env = loadEnv()): Promise<FastifyInstance> {
  const app = Fastify({
    logger:
      env.NODE_ENV === 'test'
        ? false
        : { transport: env.NODE_ENV === 'development' ? { target: 'pino-pretty' } : undefined },
  });

  app.decorate('config', env);

  // Security + ergonomics.
  await app.register(helmet);
  await app.register(cors, { origin: true });
  await app.register(sensible);
  await app.register(rateLimit, { max: 100, timeWindow: '1 minute' });

  // Infrastructure.
  await app.register(supabasePlugin);
  await app.register(authPlugin);

  // Routes.
  await app.register(healthRoutes);
  await app.register(authRoutes, { prefix: '/api' });
  await app.register(accountRoutes, { prefix: '/api' });

  return app;
}
