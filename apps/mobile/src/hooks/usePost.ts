import { useQuery } from '@tanstack/react-query';
import type { Session } from '@supabase/supabase-js';
import type { PostDetail } from '@gymily/types';
import { supabase } from '@/lib/supabase';

/** A single post + author, for the post detail screen. */
export function usePost(postId: string | undefined) {
  return useQuery({
    queryKey: ['post', postId],
    queryFn: async (): Promise<PostDetail> => {
      const { data, error } = await supabase
        .from('posts')
        .select(
          'id, author_id, gym_id, body, image_url, like_count, comment_count, created_at, author:profiles(username, full_name, avatar_url)',
        )
        .eq('id', postId!)
        .single();
      if (error) throw error;
      return data as unknown as PostDetail;
    },
    enabled: postId != null,
  });
}

/** Whether the caller has liked this post — not part of the posts row itself. */
export function useIsPostLikedByMe(postId: string | undefined, session: Session | null) {
  return useQuery({
    queryKey: ['post-liked-by-me', postId, session?.user.id],
    queryFn: async (): Promise<boolean> => {
      const { data, error } = await supabase
        .from('post_likes')
        .select('post_id')
        .eq('post_id', postId!)
        .eq('user_id', session!.user.id)
        .maybeSingle();
      if (error) throw error;
      return data != null;
    },
    enabled: postId != null && session != null,
  });
}
