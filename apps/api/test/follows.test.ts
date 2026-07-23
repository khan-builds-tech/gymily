import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import type { Env } from '../src/env.js';

// These tests exercise auth guards only; the failing paths return before
// any Supabase network call, so they run without a live stack.
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

describe('POST /api/follows/:userId auth guard', () => {
  it('401s without a bearer token', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/follows/some-id' });
    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe('unauthorized');
  });
});

describe('DELETE /api/follows/:userId auth guard', () => {
  it('401s without a bearer token', async () => {
    const res = await app.inject({ method: 'DELETE', url: '/api/follows/some-id' });
    expect(res.statusCode).toBe(401);
  });
});
