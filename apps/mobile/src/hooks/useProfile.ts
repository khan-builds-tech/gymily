import { useQuery } from '@tanstack/react-query';
import type { Session } from '@supabase/supabase-js';
import type { Profile } from '@gymily/types';
import { supabase } from '@/lib/supabase';

/** The signed-in user's profile row, read directly via Supabase (RLS-guarded). */
export function useProfile(session: Session | null) {
  return useQuery({
    queryKey: ['profile', session?.user.id],
    queryFn: async (): Promise<Profile> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session!.user.id)
        .single();
      if (error) throw error;
      return data as Profile;
    },
    enabled: session != null,
  });
}
