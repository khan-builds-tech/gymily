import { supabase } from './supabase';
import { queryClient } from './queryClient';

/**
 * Ref-counted Realtime subscription per gym, shared across every
 * `useActiveMembers` mount for that gym. Supabase reuses the underlying
 * channel object by topic name, so a second independent `.channel(...).on(...)`
 * call for the same gym (e.g. the gym detail screen and the Training tab
 * both mounted at once, since React Navigation keeps prior screens mounted)
 * throws — only the first caller may ever attach listeners/subscribe.
 */
const refCounts = new Map<string, number>();
const channels = new Map<string, ReturnType<typeof supabase.channel>>();

export function subscribeToGymPresence(gymId: string): () => void {
  const count = refCounts.get(gymId) ?? 0;

  if (count === 0) {
    const channel = supabase
      .channel(`gym:${gymId}:presence`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'check_ins', filter: `gym_id=eq.${gymId}` },
        () => queryClient.invalidateQueries({ queryKey: ['gym-active-members', gymId] }),
      )
      .subscribe();
    channels.set(gymId, channel);
  }
  refCounts.set(gymId, count + 1);

  return () => {
    const remaining = (refCounts.get(gymId) ?? 1) - 1;
    if (remaining <= 0) {
      refCounts.delete(gymId);
      const channel = channels.get(gymId);
      if (channel) supabase.removeChannel(channel);
      channels.delete(gymId);
    } else {
      refCounts.set(gymId, remaining);
    }
  };
}
