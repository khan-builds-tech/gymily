import type { FastifyInstance } from 'fastify';
import { claimUsernameSchema, type ClaimUsernameResult } from '@gymily/types';
import { sendError, sendValidationError } from '../lib/errors.js';
import { usernameTaken } from './auth.js';

export async function profileRoutes(app: FastifyInstance) {
  // POST /api/profile/claim-username — lets an OAuth signup (auto-generated
  // placeholder username, profiles.needs_username = true) pick a real one.
  app.post('/profile/claim-username', { preHandler: app.authenticate }, async (req, reply) => {
    const parsed = claimUsernameSchema.safeParse(req.body);
    if (!parsed.success) return sendValidationError(reply, parsed.error);

    const { username } = parsed.data;
    if (await usernameTaken(app, username)) {
      return sendError(reply, 409, 'username_taken', 'Username is already taken');
    }

    const { error } = await app.supabase
      .from('profiles')
      .update({ username, needs_username: false })
      .eq('id', req.authUser!.id);

    if (error) {
      return sendError(reply, 500, 'claim_username_failed', error.message);
    }

    const result: ClaimUsernameResult = { username };
    return reply.send(result);
  });
}
