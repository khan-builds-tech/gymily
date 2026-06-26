import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(8080),
  HOST: z.string().default('0.0.0.0'),
  /** Supabase project URL (local: http://127.0.0.1:54321). */
  SUPABASE_URL: z.string().url(),
  /** Public anon key — used for public auth operations (signup/login). */
  SUPABASE_ANON_KEY: z.string().min(1),
  /** Service-role key — server-only, bypasses RLS. NEVER ship to the client. */
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
});

export type Env = z.infer<typeof envSchema>;

/** Parse + validate process.env. Throws with a readable message on misconfig. */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return parsed.data;
}

declare module 'fastify' {
  interface FastifyInstance {
    config: Env;
  }
}
