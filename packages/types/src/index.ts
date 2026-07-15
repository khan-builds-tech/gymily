// Shared types + zod schemas for Gymily (app <-> API contract).
// Populated as features are built.

export const GYMILY_TYPES_VERSION = '0.1.0';

/** Standard API error envelope: { error: { code, message } }. */
export interface ApiError {
  error: {
    code: string;
    message: string;
  };
}

export * from './auth';
export * from './profile';
export * from './gym';
