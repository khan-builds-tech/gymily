import fp from 'fastify-plugin';
import type { FastifyReply, FastifyRequest } from 'fastify';

export interface AuthUser {
  id: string;
  email?: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    authUser?: AuthUser;
  }
  interface FastifyInstance {
    /** preHandler that requires a valid Supabase JWT; sets request.authUser. */
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

/**
 * Validates the `Authorization: Bearer <jwt>` header against Supabase Auth.
 * On success, attaches the resolved user to `request.authUser`.
 */
export default fp(
  async (app) => {
    app.decorate('authenticate', async (req: FastifyRequest, reply: FastifyReply) => {
      const header = req.headers.authorization;
      if (!header?.startsWith('Bearer ')) {
        return reply
          .code(401)
          .send({ error: { code: 'unauthorized', message: 'Missing bearer token' } });
      }

      const token = header.slice('Bearer '.length).trim();
      const { data, error } = await app.supabase.auth.getUser(token);
      if (error || !data.user) {
        return reply
          .code(401)
          .send({ error: { code: 'unauthorized', message: 'Invalid or expired token' } });
      }

      req.authUser = { id: data.user.id, email: data.user.email ?? undefined };
    });
  },
  { name: 'auth', dependencies: ['supabase'] },
);
