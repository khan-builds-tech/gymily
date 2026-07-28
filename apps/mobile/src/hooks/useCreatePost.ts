import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Session } from '@supabase/supabase-js';
import type { CreatePostResult } from '@gymily/types';
import { apiFetch } from '@/lib/api';

export function useCreatePost(session: Session | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { body?: string; image_url?: string }) =>
      apiFetch<CreatePostResult>('/api/posts', { method: 'POST', body: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed', session?.user.id] });
    },
  });
}
