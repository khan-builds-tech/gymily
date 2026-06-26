import type { FastifyReply } from 'fastify';
import type { ZodError } from 'zod';

/** Send the standard error envelope: { error: { code, message } }. */
export function sendError(reply: FastifyReply, status: number, code: string, message: string) {
  return reply.code(status).send({ error: { code, message } });
}

/** 400 from a Zod validation failure, surfacing the first issue. */
export function sendValidationError(reply: FastifyReply, err: ZodError) {
  const message = err.issues[0]?.message ?? 'Invalid input';
  return sendError(reply, 400, 'validation_error', message);
}
