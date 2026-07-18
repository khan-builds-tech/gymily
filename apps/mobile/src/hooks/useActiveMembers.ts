import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ActiveMember } from '@gymily/types';
import { supabase } from '@/lib/supabase';
import { subscribeToGymPresence } from '@/lib/gymPresenceChannel';

/**
 * Who's currently checked in ("Training Now") at a gym — a live list, not
 * just a count, so it can double as the count (`.length`) and as the actual
 * "people training at your gym" surface Buddy Up needs.
 */
export function useActiveMembers(gymId: string | undefined) {
  const query = useQuery({
    queryKey: ['gym-active-members', gymId],
    queryFn: async (): Promise<ActiveMember[]> => {
      const { data, error } = await supabase
        .from('check_ins')
        .select('checked_in_at, profiles(id, username, full_name, avatar_url)')
        .eq('gym_id', gymId!)
        .is('checked_out_at', null)
        .gt('expires_at', new Date().toISOString());
      if (error) throw error;
      return (
        data as unknown as Array<{
          checked_in_at: string;
          profiles: Omit<ActiveMember, 'checked_in_at'>;
        }>
      ).map((row) => ({ ...row.profiles, checked_in_at: row.checked_in_at }));
    },
    enabled: gymId != null,
  });

  useEffect(() => {
    if (!gymId) return;
    return subscribeToGymPresence(gymId);
  }, [gymId]);

  return query;
}
