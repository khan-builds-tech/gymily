import type { FastifyInstance } from 'fastify';
import {
  registerSchema,
  checkUsernameSchema,
  type RegisterResult,
  type CheckUsernameResult,
} from '@gymily/types';
import { sendError, sendValidationError } from '../lib/errors.js';

/** Returns true if a profile already owns this (case-insensitive) username. */
async function usernameTaken(app: FastifyInstance, username: string): Promise<boolean> {
  const { data, error } = await app.supabase
    .from('profiles')
    .select('id')
    .eq('username', username)
    .maybeSingle();
  // Fail loud rather than masking a misconfig (e.g. missing grants) as "available".
  if (error) throw new Error(`username lookup failed: ${error.message}`);
  return data != null;
}

export async function authRoutes(app: FastifyInstance) {
  // POST /api/auth/register — email/password signup.
  // The on_auth_user_created DB trigger creates the matching profiles row from
  // the user metadata we pass here. If email confirmation is enabled, GoTrue
  // sends the verification email and returns no session.
  app.post('/auth/register', async (req, reply) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) return sendValidationError(reply, parsed.error);

    const { full_name, username, email, password } = parsed.data;

    // Pre-check for a clean 409 (the UNIQUE constraint is the real guard).
    if (await usernameTaken(app, username)) {
      return sendError(reply, 409, 'username_taken', 'Username is already taken');
    }

    const { data, error } = await app.supabaseAnon.auth.signUp({
      email,
      password,
      options: { data: { full_name, username } },
    });

    if (error) {
      if (/registered|already/i.test(error.message)) {
        return sendError(reply, 409, 'email_taken', 'An account with this email already exists');
      }
      return sendError(reply, 400, 'signup_failed', error.message);
    }
    if (!data.user) {
      return sendError(reply, 500, 'signup_failed', 'Signup returned no user');
    }

    const result: RegisterResult = {
      user_id: data.user.id,
      username,
      email_confirmation_required: data.session === null,
    };
    return reply.code(201).send(result);
  });

  // POST /api/auth/check-username — availability check for the signup form.
  app.post('/auth/check-username', async (req, reply) => {
    const parsed = checkUsernameSchema.safeParse(req.body);
    if (!parsed.success) return sendValidationError(reply, parsed.error);

    const result: CheckUsernameResult = {
      username: parsed.data.username,
      available: !(await usernameTaken(app, parsed.data.username)),
    };
    return reply.send(result);
  });
}
