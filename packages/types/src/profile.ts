/** A row of public.profiles (Phase 2 shape). Mirrors the SQL migration. */
export interface Profile {
  id: string;
  username: string;
  full_name: string;
  bio: string | null;
  avatar_url: string | null;
  city: string | null;
  gym_id: string | null;
  created_at: string;
  updated_at: string;
}
