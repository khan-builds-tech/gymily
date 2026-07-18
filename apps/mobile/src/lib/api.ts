import { supabase } from './supabase';
import type { ApiError } from '@gymily/types';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

if (!API_URL) {
  throw new Error('Missing EXPO_PUBLIC_API_URL. Check apps/mobile/.env');
}

export class ApiRequestError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** Attach the current user's JWT (default: true). */
  auth?: boolean;
}

/**
 * Typed fetch against the Fastify API. Attaches the Supabase access token,
 * parses the standard `{ error: { code, message } }` envelope into ApiRequestError.
 */
export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true } = options;

  // Only set Content-Type when there's actually a body — Fastify's JSON
  // parser rejects a request that declares application/json but sends an
  // empty body (every no-payload POST: join, checkin, heartbeat, checkout...).
  const headers: Record<string, string> = {};
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (auth) {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.access_token) {
      headers.Authorization = `Bearer ${session.access_token}`;
    }
  }

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (res.status === 204) return undefined as T;

  const json = await res.json().catch(() => null);

  if (!res.ok) {
    const err = (json as ApiError | null)?.error;
    throw new ApiRequestError(
      res.status,
      err?.code ?? 'unknown',
      err?.message ?? `Request failed (${res.status})`,
    );
  }

  return json as T;
}
