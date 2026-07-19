import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Session } from '@supabase/supabase-js';
import type { IncomingBuddyRequest } from '@gymily/types';
import { supabase } from '@/lib/supabase';
import { subscribeToBuddyRequests } from '@/lib/buddyRequestsChannel';

/** Pending Buddy Up requests sent *to* the caller — shown on the Training tab. */
export function useIncomingBuddyRequests(session: Session | null) {
  const query = useQuery({
    queryKey: ['incoming-buddy-requests', session?.user.id],
    queryFn: async (): Promise<IncomingBuddyRequest[]> => {
      const { data, error } = await supabase
        .from('buddy_requests')
        // Explicit FK hint: buddy_requests has two FKs to profiles (requester
        // and target) — PostgREST can't infer which one without this (same
        // ambiguity hit once before with profiles<->gyms).
        .select(
          'id, created_at, requester:profiles!buddy_requests_requester_id_fkey(id, username, full_name, avatar_url)',
        )
        .eq('target_id', session!.user.id)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString());
      if (error) throw error;
      return data as unknown as IncomingBuddyRequest[];
    },
    enabled: session != null,
  });

  const userId = session?.user.id;
  useEffect(() => {
    if (!userId) return;
    return subscribeToBuddyRequests(userId);
  }, [userId]);

  return query;
}
