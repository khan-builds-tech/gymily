import { supabase } from './supabase';
import { queryClient } from './queryClient';

interface PostgresChangesConfig {
  event: '*' | 'INSERT' | 'UPDATE' | 'DELETE';
  schema: string;
  table: string;
  filter?: string;
}

/**
 * Ref-counted Realtime subscription per topic, shared across every caller
 * interested in it. Supabase reuses the underlying channel object by topic
 * name, so two independent `.channel(topic).on(...)` calls for the *same*
 * topic (e.g. two screens mounted at once, since React Navigation keeps
 * prior screens mounted) throws on the second — only the first caller may
 * ever attach listeners/subscribe. This makes any number of callers safe:
 * the first subscribes for real, later ones just bump a ref count, and the
 * channel only closes once the last one unsubscribes.
 *
 * Used purely as a cache-invalidation signal — on any matching change, just
 * invalidate the registered query keys and let the existing queries refetch,
 * no manual merge. Different callers for the *same* topic can each register
 * their own query key to invalidate (e.g. one change feeding two different
 * lists) — every registered key gets invalidated on any matching change.
 */
const refCounts = new Map<string, number>();
const channels = new Map<string, ReturnType<typeof supabase.channel>>();
const queryKeysByTopic = new Map<string, Set<string>>();

function serializeKey(queryKey: unknown[]): string {
  return JSON.stringify(queryKey);
}

export function subscribeToRealtimeInvalidation(
  topic: string,
  changeConfig: PostgresChangesConfig,
  queryKey: unknown[],
): () => void {
  const count = refCounts.get(topic) ?? 0;

  const keys = queryKeysByTopic.get(topic) ?? new Set<string>();
  keys.add(serializeKey(queryKey));
  queryKeysByTopic.set(topic, keys);

  if (count === 0) {
    const channel = supabase
      .channel(topic)
      .on('postgres_changes', changeConfig, () => {
        for (const key of queryKeysByTopic.get(topic) ?? []) {
          queryClient.invalidateQueries({ queryKey: JSON.parse(key) });
        }
      })
      .subscribe();
    channels.set(topic, channel);
  }
  refCounts.set(topic, count + 1);

  return () => {
    const remaining = (refCounts.get(topic) ?? 1) - 1;
    if (remaining <= 0) {
      refCounts.delete(topic);
      queryKeysByTopic.delete(topic);
      const channel = channels.get(topic);
      if (channel) supabase.removeChannel(channel);
      channels.delete(topic);
    } else {
      refCounts.set(topic, remaining);
      // Leaves this caller's key registered for the topic's remaining
      // lifetime — harmless: at worst one extra, no-op-ish invalidation for
      // a query key that's no longer being watched by anyone.
    }
  };
}
