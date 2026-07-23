import type { FastifyInstance } from 'fastify';
import { sendError } from '../lib/errors.js';

export async function followRoutes(app: FastifyInstance) {
  // POST /api/follows/:userId — follow a user. Idempotent: following an
  // already-followed user is a no-op, not an error.
  app.post<{ Params: { userId: string } }>(
    '/follows/:userId',
    { preHandler: app.authenticate },
    async (req, reply) => {
      const followerId = req.authUser!.id;
      const followingId = req.params.userId;

      if (followingId === followerId) {
        return sendError(reply, 400, 'cannot_follow_self', 'You cannot follow yourself');
      }

      const { error } = await app.supabase
        .from('follows')
        .insert({ follower_id: followerId, following_id: followingId });

      if (error && error.code !== '23505') {
        return sendError(reply, 400, 'follow_failed', error.message);
      }

      return reply.code(204).send();
    },
  );

  // DELETE /api/follows/:userId — unfollow.
  app.delete<{ Params: { userId: string } }>(
    '/follows/:userId',
    { preHandler: app.authenticate },
    async (req, reply) => {
      const { error } = await app.supabase
        .from('follows')
        .delete()
        .eq('follower_id', req.authUser!.id)
        .eq('following_id', req.params.userId);

      if (error) {
        return sendError(reply, 400, 'unfollow_failed', error.message);
      }

      return reply.code(204).send();
    },
  );
}
