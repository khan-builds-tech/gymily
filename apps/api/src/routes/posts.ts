import type { FastifyInstance } from 'fastify';
import { createPostSchema, addCommentSchema, uploadUrlSchema } from '@gymily/types';
import { sendError, sendValidationError } from '../lib/errors.js';
import { presignPostUpload } from '../lib/r2.js';

/**
 * All writes here are single-table, owned-row mutations with no cross-table
 * business rules (unlike buddy_requests' same-gym check) — so, like
 * `profile.ts`'s claim-username, they use the service-role client with an
 * explicit `author_id`/`user_id` filter rather than a Postgres RPC. Reads
 * (the feed, comments) go direct-to-Supabase from the client.
 */
export async function postRoutes(app: FastifyInstance) {
  // POST /api/posts/upload-url — presigned R2 PUT URL for a post image.
  app.post('/posts/upload-url', { preHandler: app.authenticate }, async (req, reply) => {
    const parsed = uploadUrlSchema.safeParse(req.body);
    if (!parsed.success) return sendValidationError(reply, parsed.error);

    if (!app.config.R2_BUCKET) {
      return sendError(reply, 503, 'uploads_not_configured', 'Image uploads are not configured yet');
    }

    const { upload_url, image_url } = await presignPostUpload(
      app.config,
      req.authUser!.id,
      parsed.data.content_type,
    );

    return reply.send({ upload_url, image_url });
  });

  // POST /api/posts — create a post. gym_id is snapshotted from the
  // caller's current profile, never taken from the request body.
  app.post('/posts', { preHandler: app.authenticate }, async (req, reply) => {
    const parsed = createPostSchema.safeParse(req.body);
    if (!parsed.success) return sendValidationError(reply, parsed.error);

    const { data: profile, error: profileError } = await app.supabase
      .from('profiles')
      .select('gym_id')
      .eq('id', req.authUser!.id)
      .single();

    if (profileError) {
      return sendError(reply, 500, 'create_post_failed', profileError.message);
    }

    const { data, error } = await app.supabase
      .from('posts')
      .insert({
        author_id: req.authUser!.id,
        gym_id: (profile as { gym_id: string | null } | null)?.gym_id ?? null,
        body: parsed.data.body ?? null,
        image_url: parsed.data.image_url ?? null,
      })
      .select('id')
      .single();

    if (error) {
      return sendError(reply, 500, 'create_post_failed', error.message);
    }

    return reply.code(201).send({ id: (data as { id: string }).id });
  });

  // DELETE /api/posts/:id — delete own post.
  app.delete<{ Params: { id: string } }>(
    '/posts/:id',
    { preHandler: app.authenticate },
    async (req, reply) => {
      const { error, count } = await app.supabase
        .from('posts')
        .delete({ count: 'exact' })
        .eq('id', req.params.id)
        .eq('author_id', req.authUser!.id);

      if (error) {
        return sendError(reply, 500, 'delete_post_failed', error.message);
      }
      if (!count) {
        return sendError(reply, 404, 'post_not_found', 'Post not found');
      }

      return reply.code(204).send();
    },
  );

  // POST /api/posts/:id/like — like a post. Idempotent: liking an
  // already-liked post is a no-op, not an error.
  app.post<{ Params: { id: string } }>(
    '/posts/:id/like',
    { preHandler: app.authenticate },
    async (req, reply) => {
      const { error } = await app.supabase
        .from('post_likes')
        .insert({ post_id: req.params.id, user_id: req.authUser!.id });

      if (error && error.code !== '23505') {
        return sendError(reply, 400, 'like_failed', error.message);
      }

      return reply.code(204).send();
    },
  );

  // DELETE /api/posts/:id/like — unlike.
  app.delete<{ Params: { id: string } }>(
    '/posts/:id/like',
    { preHandler: app.authenticate },
    async (req, reply) => {
      const { error } = await app.supabase
        .from('post_likes')
        .delete()
        .eq('post_id', req.params.id)
        .eq('user_id', req.authUser!.id);

      if (error) {
        return sendError(reply, 400, 'unlike_failed', error.message);
      }

      return reply.code(204).send();
    },
  );

  // POST /api/posts/:id/comments — add a comment.
  app.post<{ Params: { id: string } }>(
    '/posts/:id/comments',
    { preHandler: app.authenticate },
    async (req, reply) => {
      const parsed = addCommentSchema.safeParse(req.body);
      if (!parsed.success) return sendValidationError(reply, parsed.error);

      const { data, error } = await app.supabase
        .from('post_comments')
        .insert({ post_id: req.params.id, author_id: req.authUser!.id, body: parsed.data.body })
        .select('id, created_at')
        .single();

      if (error) {
        return sendError(reply, 400, 'add_comment_failed', error.message);
      }

      const result = data as { id: string; created_at: string };
      return reply.code(201).send({ id: result.id, created_at: result.created_at });
    },
  );

  // DELETE /api/comments/:id — delete own comment. Own-comment only for
  // v1 — a post's author can't moderate comments on their own post yet.
  app.delete<{ Params: { id: string } }>(
    '/comments/:id',
    { preHandler: app.authenticate },
    async (req, reply) => {
      const { error, count } = await app.supabase
        .from('post_comments')
        .delete({ count: 'exact' })
        .eq('id', req.params.id)
        .eq('author_id', req.authUser!.id);

      if (error) {
        return sendError(reply, 500, 'delete_comment_failed', error.message);
      }
      if (!count) {
        return sendError(reply, 404, 'comment_not_found', 'Comment not found');
      }

      return reply.code(204).send();
    },
  );
}
