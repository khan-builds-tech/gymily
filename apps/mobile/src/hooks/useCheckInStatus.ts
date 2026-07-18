import { useQuery } from '@tanstack/react-query';
import type { Session } from '@supabase/supabase-js';
import type { CheckInStatus } from '@gymily/types';
import { supabase } from '@/lib/supabase';

/** The caller's own active check-in ("Training Now"), or null if not checked in. */
export function useCheckInStatus(session: Session | null) {
  return useQuery({
    queryKey: ['check-in-status', session?.user.id],
    queryFn: async (): Promise<CheckInStatus | null> => {
      const { data, error } = await supabase
        .from('check_ins')
        .select('gym_id, checked_in_at')
        .eq('user_id', session!.user.id)
        .is('checked_out_at', null)
        .maybeSingle();
      if (error) throw error;
      return data as CheckInStatus | null;
    },
    enabled: session != null,
  });
}
