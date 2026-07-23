import { z } from 'zod';

/** A row of public.posts, as returned by get_feed (author flattened in). */
export interface FeedPost {
  id: string;
  author_id: string;
  gym_id: string | null;
  body: string | null;
  image_url: string | null;
  like_count: number;
  comment_count: number;
  created_at: string;
  author_username: string;
  author_full_name: string;
  author_avatar_url: string | null;
  liked_by_me: boolean;
}

export const createPostSchema = z
  .object({
    body: z.string().trim().min(1).max(2000).optional(),
    image_url: z.string().url().optional(),
  })
  .refine((data) => !!data.body || !!data.image_url, {
    message: 'A post needs a body or an image',
  });
export type CreatePostInput = z.infer<typeof createPostSchema>;

export interface CreatePostResult {
  id: string;
}

const UPLOAD_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export const uploadUrlSchema = z.object({
  content_type: z.enum(UPLOAD_CONTENT_TYPES),
});
export type UploadUrlInput = z.infer<typeof uploadUrlSchema>;

/** upload_url: presigned R2 PUT, valid briefly. image_url: where it'll live once uploaded. */
export interface UploadUrlResult {
  upload_url: string;
  image_url: string;
}

export const addCommentSchema = z.object({
  body: z.string().trim().min(1).max(1000),
});
export type AddCommentInput = z.infer<typeof addCommentSchema>;

export interface AddCommentResult {
  id: string;
  created_at: string;
}

/** A row of public.post_comments, with author info flattened in. */
export interface PostComment {
  id: string;
  post_id: string;
  author_id: string;
  body: string;
  created_at: string;
  author_username: string;
  author_full_name: string;
  author_avatar_url: string | null;
}
