import { z } from 'zod';
import { usernameSchema } from './auth';

/** A row of public.gyms (Phase 3 shape), with location flattened to lat/lng for JSON. */
export interface Gym {
  id: string;
  name: string;
  lat: number;
  lng: number;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  google_place_id: string | null;
  member_count: number;
  verified: boolean;
  created_at: string;
}

/** One candidate returned by a Google Places gym search. */
export interface GymSearchResult {
  google_place_id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  lat: number;
  lng: number;
}

export const selectGymSchema = z.object({
  google_place_id: z.string().min(1),
  name: z.string().trim().min(1).max(200),
  address: z.string().trim().max(300).nullable().optional(),
  city: z.string().trim().max(100).nullable().optional(),
  state: z.string().trim().max(100).nullable().optional(),
  country: z.string().trim().max(100).nullable().optional(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});
export type SelectGymInput = z.infer<typeof selectGymSchema>;

export interface SelectGymResult {
  gym_id: string;
}

/**
 * Gym detail as read directly from public.gyms for the gym detail screen.
 * No lat/lng — there's no map to plot them on yet (Phase 5).
 */
export interface GymDetail {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  member_count: number;
  verified: boolean;
}

/** One row in a gym's member list. */
export interface GymMember {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
}

/** The caller's own active check-in ("Training Now"), Phase 4 — null if not checked in. */
export interface CheckInStatus {
  gym_id: string;
  checked_in_at: string;
}

/** One person currently checked in at a gym — "Training Now", not the full member list. */
export interface ActiveMember {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  checked_in_at: string;
}

export const claimUsernameSchema = z.object({
  username: usernameSchema,
});
export type ClaimUsernameInput = z.infer<typeof claimUsernameSchema>;

export interface ClaimUsernameResult {
  username: string;
}
