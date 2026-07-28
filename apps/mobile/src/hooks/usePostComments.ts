import { useQuery } from '@tanstack/react-query';
import type { PostComment } from '@gymily/types';
import { supabase } from '@/lib/supabase';

interface CommentRow {
  id: string;
  post_id: string;
  author_id: string;
  body: string;
  created_at: string;
  author: { username: string; full_name: string; avatar_url: string | null };
}

/** A post's comment thread, oldest first. */
export function usePostComments(postId: string | undefined) {
  return useQuery({
    queryKey: ['post-comments', postId],
    queryFn: async (): Promise<PostComment[]> => {
      const { data, error } = await supabase
        .from('post_comments')
        .select(
          'id, post_id, author_id, body, created_at, author:profiles(username, full_name, avatar_url)',
        )
        .eq('post_id', postId!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data as unknown as CommentRow[]).map((row) => ({
        id: row.id,
        post_id: row.post_id,
        author_id: row.author_id,
        body: row.body,
        created_at: row.created_at,
        author_username: row.author.username,
        author_full_name: row.author.full_name,
        author_avatar_url: row.author.avatar_url,
      }));
    },
    enabled: postId != null,
  });
}
