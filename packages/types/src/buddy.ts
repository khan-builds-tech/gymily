import { z } from 'zod';

export const sendBuddyRequestSchema = z.object({
  target_id: z.string().uuid(),
});
export type SendBuddyRequestInput = z.infer<typeof sendBuddyRequestSchema>;

export const respondBuddyRequestSchema = z.object({
  accept: z.boolean(),
});
export type RespondBuddyRequestInput = z.infer<typeof respondBuddyRequestSchema>;

/** A pending buddy request someone sent to the caller — shown on the Training tab. */
export interface IncomingBuddyRequest {
  id: string;
  created_at: string;
  requester: {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string | null;
  };
}

/** Someone the caller currently has an accepted, still-live buddy connection with. */
export interface CurrentBuddy {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
}

/** Who a given gym member is currently paired with, for third-party viewers of the roster. */
export interface GymBuddyPair {
  user_id: string;
  buddy: CurrentBuddy;
}
