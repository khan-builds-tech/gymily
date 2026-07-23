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
  /** Server-only key for the Google Places API (gym search). Optional so the
   *  API still boots before this is provisioned; /gyms/search 503s until set. */
  GOOGLE_PLACES_API_KEY: z.string().default(''),
  /** Cloudflare R2 (post images). Optional so the API still boots before
   *  this is provisioned; /posts/upload-url 503s until set. */
  R2_ACCOUNT_ID: z.string().default(''),
  R2_ACCESS_KEY_ID: z.string().default(''),
  R2_SECRET_ACCESS_KEY: z.string().default(''),
  R2_BUCKET: z.string().default(''),
  R2_PUBLIC_URL: z.string().default(''),
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
