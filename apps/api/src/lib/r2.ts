import { randomUUID } from 'node:crypto';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { Env } from '../env.js';

const EXTENSION_BY_CONTENT_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

function client(env: Env): S3Client {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
  });
}

/**
 * A presigned PUT URL for a post image, plus the public URL it'll be
 * reachable at once uploaded there. The key is namespaced by user id so a
 * caller is only ever presigned to write under their own prefix.
 */
export async function presignPostUpload(
  env: Env,
  userId: string,
  contentType: string,
): Promise<{ upload_url: string; image_url: string }> {
  const extension = EXTENSION_BY_CONTENT_TYPE[contentType] ?? 'jpg';
  const key = `posts/${userId}/${randomUUID()}.${extension}`;

  const upload_url = await getSignedUrl(
    client(env),
    new PutObjectCommand({ Bucket: env.R2_BUCKET, Key: key, ContentType: contentType }),
    { expiresIn: 300 },
  );

  return { upload_url, image_url: `${env.R2_PUBLIC_URL}/${key}` };
}
