import { useQuery } from '@tanstack/react-query';
import type { GymDetail, GymMember } from '@gymily/types';
import { supabase } from '@/lib/supabase';

/** A gym's own details (name/address/member_count), for the gym detail screen. */
export function useGymDetail(gymId: string | undefined) {
  return useQuery({
    queryKey: ['gym', gymId],
    queryFn: async (): Promise<GymDetail> => {
      const { data, error } = await supabase
        .from('gyms')
        .select('id, name, address, city, state, country, member_count, verified')
        .eq('id', gymId!)
        .single();
      if (error) throw error;
      return data as GymDetail;
    },
    enabled: gymId != null,
  });
}

/** Who's currently a member of this gym — the entry point into public profiles. */
export function useGymMembers(gymId: string | undefined) {
  return useQuery({
    queryKey: ['gym-members', gymId],
    queryFn: async (): Promise<GymMember[]> => {
      const { data, error } = await supabase
        .from('gym_members')
        .select('profiles(id, username, full_name, avatar_url)')
        .eq('gym_id', gymId!)
        .eq('is_current', true);
      if (error) throw error;
      return (data as unknown as Array<{ profiles: GymMember }>).map((row) => row.profiles);
    },
    enabled: gymId != null,
  });
}
