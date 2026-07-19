import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Session } from '@supabase/supabase-js';
import type { CurrentBuddy } from '@gymily/types';
import { supabase } from '@/lib/supabase';
import { subscribeToOutgoingBuddyRequests } from '@/lib/buddyRequestsChannel';

interface BuddyRequestRow {
  requester_id: string;
  target_id: string;
  requester: CurrentBuddy;
  target: CurrentBuddy;
}

/**
 * People the caller currently has an accepted, still-live Buddy Up
 * connection with, in either direction — "connected for the session", reusing
 * the same `expires_at` set when the request was first sent.
 */
export function useCurrentBuddies(session: Session | null) {
  const userId = session?.user.id;

  const query = useQuery({
    queryKey: ['current-buddies', userId],
    queryFn: async (): Promise<CurrentBuddy[]> => {
      const { data, error } = await supabase
        .from('buddy_requests')
        .select(
          'requester_id, target_id,' +
            'requester:profiles!buddy_requests_requester_id_fkey(id, username, full_name, avatar_url),' +
            'target:profiles!buddy_requests_target_id_fkey(id, username, full_name, avatar_url)',
        )
        .or(`requester_id.eq.${userId},target_id.eq.${userId}`)
        .eq('status', 'accepted')
        .gt('expires_at', new Date().toISOString());
      if (error) throw error;
      const others = (data as unknown as BuddyRequestRow[]).map((row) =>
        row.requester_id === userId ? row.target : row.requester,
      );
      // Dedupe by id — a request/accept can happen in both directions
      // between the same two people (each a separate row), which would
      // otherwise show the same person twice.
      return Array.from(new Map(others.map((buddy) => [buddy.id, buddy])).values());
    },
    enabled: userId != null,
  });

  useEffect(() => {
    if (!userId) return;
    return subscribeToOutgoingBuddyRequests(userId);
  }, [userId]);

  return query;
}
