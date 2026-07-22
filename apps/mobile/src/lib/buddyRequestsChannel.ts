import { subscribeToRealtimeInvalidation } from './realtimeChannel';

/** Live incoming Buddy Up requests — invalidates `['incoming-buddy-requests', userId]`. */
export function subscribeToBuddyRequests(userId: string): () => void {
  return subscribeToRealtimeInvalidation(
    `user:${userId}:buddy-requests`,
    { event: '*', schema: 'public', table: 'buddy_requests', filter: `target_id=eq.${userId}` },
    ['incoming-buddy-requests', userId],
  );
}

/**
 * Live updates to requests *I* sent — needed so I find out when the other
 * person accepts/rejects without a manual refresh (unlike the incoming side,
 * I'm not the one triggering that change). Invalidates both the pending-set
 * and the current-buddies list, since an accept affects both.
 */
export function subscribeToOutgoingBuddyRequests(userId: string): () => void {
  const topic = `user:${userId}:outgoing-buddy-requests`;
  const changeConfig = {
    event: '*' as const,
    schema: 'public',
    table: 'buddy_requests',
    filter: `requester_id=eq.${userId}`,
  };
  const unsubPending = subscribeToRealtimeInvalidation(topic, changeConfig, [
    'outgoing-buddy-requests',
    userId,
  ]);
  const unsubBuddies = subscribeToRealtimeInvalidation(topic, changeConfig, [
    'current-buddies',
    userId,
  ]);
  return () => {
    unsubPending();
    unsubBuddies();
  };
}

/**
 * Live "who's paired with whom" for a gym's roster — buddy_requests has no
 * gym_id column, so this can't be filtered server-side; it invalidates on
 * any buddy_requests change and lets the query itself re-scope by gym.
 */
export function subscribeToGymBuddyPairs(gymId: string): () => void {
  return subscribeToRealtimeInvalidation(
    `gym:${gymId}:buddy-pairs`,
    { event: '*', schema: 'public', table: 'buddy_requests' },
    ['gym-buddy-pairs', gymId],
  );
}
