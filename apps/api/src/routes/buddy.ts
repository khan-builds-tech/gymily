import type { FastifyInstance, FastifyRequest } from 'fastify';
import { sendBuddyRequestSchema, respondBuddyRequestSchema } from '@gymily/types';
import { sendError, sendValidationError } from '../lib/errors.js';
import { createUserClient } from '../lib/supabase.js';

/** Bearer token from an already-`app.authenticate`d request. */
function getBearerToken(req: FastifyRequest): string {
  return req.headers.authorization!.slice('Bearer '.length).trim();
}

export async function buddyRoutes(app: FastifyInstance) {
  // POST /api/buddy-requests — send a Buddy Up request. Only allowed if the
  // caller and the target are both currently checked in at the same gym.
  app.post('/buddy-requests', { preHandler: app.authenticate }, async (req, reply) => {
    const parsed = sendBuddyRequestSchema.safeParse(req.body);
    if (!parsed.success) return sendValidationError(reply, parsed.error);

    const userClient = createUserClient(app.config, getBearerToken(req));
    const { data, error } = await userClient.rpc('send_buddy_request', {
      p_target_id: parsed.data.target_id,
    });

    if (error) {
      return sendError(reply, 400, 'send_buddy_request_failed', error.message);
    }

    return reply.code(201).send({ id: data as string });
  });

  // POST /api/buddy-requests/:id/respond — accept or reject an incoming request.
  app.post<{ Params: { id: string } }>(
    '/buddy-requests/:id/respond',
    { preHandler: app.authenticate },
    async (req, reply) => {
      const parsed = respondBuddyRequestSchema.safeParse(req.body);
      if (!parsed.success) return sendValidationError(reply, parsed.error);

      const userClient = createUserClient(app.config, getBearerToken(req));
      const { error } = await userClient.rpc('respond_buddy_request', {
        p_request_id: req.params.id,
        p_accept: parsed.data.accept,
      });

      if (error) {
        return sendError(reply, 400, 'respond_buddy_request_failed', error.message);
      }

      return reply.code(204).send();
    },
  );

  // POST /api/buddy-requests/end — explicitly end the caller's active buddy
  // session(s), rather than waiting for the 3-hour window to lapse.
  app.post('/buddy-requests/end', { preHandler: app.authenticate }, async (req, reply) => {
    const userClient = createUserClient(app.config, getBearerToken(req));
    const { error } = await userClient.rpc('end_buddy_session');

    if (error) {
      return sendError(reply, 400, 'end_buddy_session_failed', error.message);
    }

    return reply.code(204).send();
  });
}
