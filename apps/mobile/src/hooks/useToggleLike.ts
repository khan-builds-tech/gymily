import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Session } from '@supabase/supabase-js';
import { apiFetch } from '@/lib/api';

/**
 * Like/unlike a post. Invalidates every place a like_count/liked state is
 * cached — the Feed list and, if open, that post's own detail screen.
 */
export function useToggleLike(session: Session | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ postId, liked }: { postId: string; liked: boolean }) => {
      await apiFetch(`/api/posts/${postId}/like`, { method: liked ? 'DELETE' : 'POST' });
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: ['feed', session?.user.id] });
      queryClient.invalidateQueries({ queryKey: ['post', variables.postId] });
      queryClient.invalidateQueries({
        queryKey: ['post-liked-by-me', variables.postId, session?.user.id],
      });
    },
  });
}
