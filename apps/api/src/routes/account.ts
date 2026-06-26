import type { FastifyInstance } from 'fastify';
import { sendError } from '../lib/errors.js';

export async function accountRoutes(app: FastifyInstance) {
  // DELETE /api/account — permanently delete the authenticated user.
  // Deleting the auth.users row cascades to public.profiles (FK ON DELETE CASCADE).
  // Required for App Store compliance.
  app.delete('/account', { preHandler: app.authenticate }, async (req, reply) => {
    const userId = req.authUser!.id;

    const { error } = await app.supabase.auth.admin.deleteUser(userId);
    if (error) {
      return sendError(reply, 500, 'delete_failed', error.message);
    }
    return reply.code(204).send();
  });
}
