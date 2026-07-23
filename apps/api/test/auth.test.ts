import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import type { Env } from '../src/env.js';

// These tests exercise validation + routing only; the failing paths return
// before any Supabase network call, so they run without a live stack.
const testEnv: Env = {
  NODE_ENV: 'test',
  PORT: 0,
  HOST: '127.0.0.1',
  SUPABASE_URL: 'http://127.0.0.1:54321',
  SUPABASE_ANON_KEY: 'test-anon-key',
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
  GOOGLE_PLACES_API_KEY: 'test-places-key',
  R2_ACCOUNT_ID: '',
  R2_ACCESS_KEY_ID: '',
  R2_SECRET_ACCESS_KEY: '',
  R2_BUCKET: '',
  R2_PUBLIC_URL: '',
};

let app: FastifyInstance;

beforeAll(async () => {
  app = await buildApp(testEnv);
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

describe('GET /health', () => {
  it('returns ok', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'ok' });
  });
});

describe('POST /api/auth/register validation', () => {
  it('rejects a too-short password', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { full_name: 'Aman', username: 'amank', email: 'a@b.com', password: 'short' },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('validation_error');
  });

  it('rejects an invalid username', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { full_name: 'Aman', username: 'a b!', email: 'a@b.com', password: 'longenough1' },
    });
    expect(res.statusCode).toBe(400);
  });
});

describe('POST /api/auth/check-username validation', () => {
  it('rejects a username shorter than 3 chars', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/check-username',
      payload: { username: 'ab' },
    });
    expect(res.statusCode).toBe(400);
  });
});

describe('DELETE /api/account auth guard', () => {
  it('401s without a bearer token', async () => {
    const res = await app.inject({ method: 'DELETE', url: '/api/account' });
    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe('unauthorized');
  });
});
