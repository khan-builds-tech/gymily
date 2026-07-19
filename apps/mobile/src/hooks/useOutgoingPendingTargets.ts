import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { subscribeToOutgoingBuddyRequests } from '@/lib/buddyRequestsChannel';

/**
 * The set of target_ids the caller has a pending outgoing Buddy Up request
 * to — so a "Buddy Up" button can show "Requested" instead of erroring on
 * the one-pending-per-pair constraint. Live: if the other person accepts or
 * rejects, this updates without a manual refresh.
 */
export function useOutgoingPendingTargets(session: Session | null) {
  const userId = session?.user.id;

  const query = useQuery({
    queryKey: ['outgoing-buddy-requests', userId],
    queryFn: async (): Promise<Set<string>> => {
      const { data, error } = await supabase
        .from('buddy_requests')
        .select('target_id')
        .eq('requester_id', userId!)
        .eq('status', 'pending');
      if (error) throw error;
      return new Set((data as Array<{ target_id: string }>).map((row) => row.target_id));
    },
    enabled: session != null,
  });

  useEffect(() => {
    if (!userId) return;
    return subscribeToOutgoingBuddyRequests(userId);
  }, [userId]);

  return query;
}
