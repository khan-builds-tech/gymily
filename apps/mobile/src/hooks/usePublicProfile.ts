import { useQuery } from '@tanstack/react-query';
import type { PublicProfile } from '@gymily/types';
import { supabase } from '@/lib/supabase';

/** Another user's profile, by username, for their public profile screen. */
export function usePublicProfile(username: string | undefined) {
  return useQuery({
    queryKey: ['public-profile', username],
    queryFn: async (): Promise<PublicProfile> => {
      const { data, error } = await supabase
        .from('profiles')
        // Explicit FK hint: profiles<->gyms has two relationships
        // (profiles.gym_id -> gyms.id, and gyms.created_by -> profiles.id) —
        // PostgREST can't infer which one without this.
        .select('id, username, full_name, bio, avatar_url, city, gym:gyms!profiles_gym_id_fkey(id, name, city)')
        .eq('username', username!)
        .single();
      if (error) throw error;
      return data as unknown as PublicProfile;
    },
    enabled: username != null,
  });
}
