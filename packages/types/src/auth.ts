import { z } from 'zod';

/**
 * Username rules (kept in lockstep with the `profiles_username_format`
 * CHECK constraint in the profiles migration): 3–30 chars, letters/digits/underscore.
 */
export const usernameSchema = z
  .string()
  .trim()
  .min(3, 'Username must be at least 3 characters')
  .max(30, 'Username must be at most 30 characters')
  .regex(/^[a-zA-Z0-9_]+$/, 'Use only letters, numbers and underscores');

export const emailSchema = z.string().trim().toLowerCase().email('Enter a valid email');

/** bcrypt truncates at 72 bytes; reject anything longer up front. */
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters');

export const fullNameSchema = z.string().trim().min(1, 'Name is required').max(80);

export const registerSchema = z.object({
  full_name: fullNameSchema,
  username: usernameSchema,
  email: emailSchema,
  password: passwordSchema,
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const checkUsernameSchema = z.object({
  username: usernameSchema,
});
export type CheckUsernameInput = z.infer<typeof checkUsernameSchema>;

export interface CheckUsernameResult {
  username: string;
  available: boolean;
}

export interface RegisterResult {
  user_id: string;
  username: string;
  /** True when Supabase requires email confirmation before login. */
  email_confirmation_required: boolean;
}
