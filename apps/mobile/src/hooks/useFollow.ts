import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { apiFetch } from '@/lib/api';

/** Whether the caller currently follows a given user. */
export function useFollowStatus(targetId: string | undefined, session: Session | null) {
  return useQuery({
    queryKey: ['follow-status', targetId, session?.user.id],
    queryFn: async (): Promise<boolean> => {
      const { data, error } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('follower_id', session!.user.id)
        .eq('following_id', targetId!)
        .maybeSingle();
      if (error) throw error;
      return data != null;
    },
    enabled: targetId != null && session != null,
  });
}

/**
 * Follow/unfollow a user. Invalidates follow-status, any open public
 * profile (followers/following counts), and the caller's own profile
 * (their own following_count) — broad by design, this isn't hot-path like
 * likes/comments.
 */
export function useToggleFollow(session: Session | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ targetId, following }: { targetId: string; following: boolean }) => {
      await apiFetch(`/api/follows/${targetId}`, { method: following ? 'DELETE' : 'POST' });
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['follow-status', variables.targetId, session?.user.id],
      });
      queryClient.invalidateQueries({ queryKey: ['public-profile'] });
      queryClient.invalidateQueries({ queryKey: ['profile', session?.user.id] });
    },
  });
}
