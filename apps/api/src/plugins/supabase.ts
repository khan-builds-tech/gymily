import fp from 'fastify-plugin';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient, createAnonClient } from '../lib/supabase.js';

declare module 'fastify' {
  interface FastifyInstance {
    /** Service-role client (bypasses RLS). */
    supabase: SupabaseClient;
    /** Anon client (public auth ops). */
    supabaseAnon: SupabaseClient;
  }
}

/** Decorates the app with Supabase clients built from validated config. */
export default fp(
  async (app) => {
    app.decorate('supabase', createAdminClient(app.config));
    app.decorate('supabaseAnon', createAnonClient(app.config));
  },
  { name: 'supabase', dependencies: [] },
);
