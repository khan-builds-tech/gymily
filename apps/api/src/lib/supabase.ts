import { createClient, type SupabaseClient, type SupabaseClientOptions } from '@supabase/supabase-js';
import ws from 'ws';
import type { Env } from '../env.js';

type RealtimeTransport = NonNullable<SupabaseClientOptions<'public'>['realtime']>['transport'];

// supabase-js eagerly constructs a realtime client, which needs a WebSocket
// implementation. Node < 22 has no global WebSocket, so supply `ws`.
// (The server itself never uses realtime — that's client-side.) The `ws`
// types don't structurally match Supabase's WebSocketLikeConstructor, so cast.
const serverOpts: SupabaseClientOptions<'public'> = {
  auth: { autoRefreshToken: false, persistSession: false },
  realtime: { transport: ws as unknown as RealtimeTransport },
};

/** Service-role client — bypasses RLS. Use only for trusted server logic. */
export function createAdminClient(env: Env): SupabaseClient {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, serverOpts);
}

/** Anon client — for public auth operations (signUp, etc.), RLS enforced. */
export function createAnonClient(env: Env): SupabaseClient {
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, serverOpts);
}

/**
 * Anon-keyed client that forwards the caller's own JWT, so RLS and
 * `auth.uid()` (e.g. inside the `select_gym` RPC) resolve to that user
 * rather than the service role.
 */
export function createUserClient(env: Env, accessToken: string): SupabaseClient {
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    ...serverOpts,
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}
