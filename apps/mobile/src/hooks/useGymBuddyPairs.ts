import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { GymBuddyPair } from '@gymily/types';
import { supabase } from '@/lib/supabase';
import { subscribeToGymBuddyPairs } from '@/lib/buddyRequestsChannel';

interface GymBuddyPairRow {
  user_id: string;
  buddy_id: string;
  buddy_username: string;
  buddy_full_name: string;
  buddy_avatar_url: string | null;
}

/**
 * Who's currently paired with whom at a gym — lets third parties see "A & B
 * are training together" the same way A and B see each other, so the roster
 * doesn't invite a Buddy Up request that the backend will reject anyway.
 */
export function useGymBuddyPairs(gymId: string | undefined) {
  const query = useQuery({
    queryKey: ['gym-buddy-pairs', gymId],
    queryFn: async (): Promise<Map<string, GymBuddyPair['buddy']>> => {
      const { data, error } = await supabase.rpc('gym_buddy_pairs', { p_gym_id: gymId! });
      if (error) throw error;
      const rows = data as unknown as GymBuddyPairRow[];
      return new Map(
        rows.map((row) => [
          row.user_id,
          {
            id: row.buddy_id,
            username: row.buddy_username,
            full_name: row.buddy_full_name,
            avatar_url: row.buddy_avatar_url,
          },
        ]),
      );
    },
    enabled: gymId != null,
  });

  useEffect(() => {
    if (!gymId) return;
    return subscribeToGymBuddyPairs(gymId);
  }, [gymId]);

  return query;
}
