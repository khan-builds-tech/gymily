import { useInfiniteQuery } from '@tanstack/react-query';
import type { Session } from '@supabase/supabase-js';
import type { FeedPost } from '@gymily/types';
import { supabase } from '@/lib/supabase';

const PAGE_SIZE = 5;

/**
 * The Feed — every post, newest first (get_feed RPC). Cursor-paginated on
 * created_at (not offset, which would skip/repeat posts as new ones are
 * created between pages), 5 at a time.
 */
export function useFeed(session: Session | null) {
  return useInfiniteQuery({
    queryKey: ['feed', session?.user.id],
    queryFn: async ({ pageParam }): Promise<FeedPost[]> => {
      const { data, error } = await supabase.rpc('get_feed', {
        p_before: pageParam,
        p_limit: PAGE_SIZE,
      });
      if (error) throw error;
      return data as FeedPost[];
    },
    initialPageParam: new Date().toISOString(),
    getNextPageParam: (lastPage) =>
      lastPage.length === PAGE_SIZE ? lastPage[lastPage.length - 1].created_at : undefined,
    enabled: session != null,
  });
}
