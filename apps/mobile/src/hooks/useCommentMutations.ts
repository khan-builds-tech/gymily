import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Session } from '@supabase/supabase-js';
import { apiFetch } from '@/lib/api';

function invalidatePostQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  postId: string,
  session: Session | null,
) {
  queryClient.invalidateQueries({ queryKey: ['post-comments', postId] });
  queryClient.invalidateQueries({ queryKey: ['post', postId] });
  queryClient.invalidateQueries({ queryKey: ['feed', session?.user.id] });
}

export function useAddComment(postId: string, session: Session | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: string) =>
      apiFetch(`/api/posts/${postId}/comments`, { method: 'POST', body: { body } }),
    onSuccess: () => invalidatePostQueries(queryClient, postId, session),
  });
}

export function useDeleteComment(postId: string, session: Session | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (commentId: string) => apiFetch(`/api/comments/${commentId}`, { method: 'DELETE' }),
    onSuccess: () => invalidatePostQueries(queryClient, postId, session),
  });
}
