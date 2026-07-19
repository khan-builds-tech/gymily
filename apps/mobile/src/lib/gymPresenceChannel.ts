import { subscribeToRealtimeInvalidation } from './realtimeChannel';

/** Live "Training Now" for a gym — invalidates `['gym-active-members', gymId]`. */
export function subscribeToGymPresence(gymId: string): () => void {
  return subscribeToRealtimeInvalidation(
    `gym:${gymId}:presence`,
    { event: '*', schema: 'public', table: 'check_ins', filter: `gym_id=eq.${gymId}` },
    ['gym-active-members', gymId],
  );
}
