import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { apiFetch } from './api';

const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.8;

/**
 * Opens the photo library, then downsizes/compresses the pick to a JPEG
 * capped at MAX_DIMENSION — raw camera photos are too large to upload
 * as-is (docs/feed.md defers full server-side processing to a later phase;
 * this client-side pass is the v1 stand-in). Returns null if the user
 * cancels or denies photo library access.
 */
export async function pickAndCompressImage(): Promise<string | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 1,
  });
  const asset = result.assets?.[0];
  if (result.canceled || !asset) return null;

  const manipulated = await manipulateAsync(asset.uri, [{ resize: { width: MAX_DIMENSION } }], {
    compress: JPEG_QUALITY,
    format: SaveFormat.JPEG,
  });
  return manipulated.uri;
}

/**
 * Uploads a local image file to R2 via a presigned PUT (from
 * POST /api/posts/upload-url), and returns the public URL it'll be
 * reachable at — ready to pass as `image_url` to POST /api/posts.
 */
export async function uploadPostImage(localUri: string): Promise<string> {
  const { upload_url, image_url } = await apiFetch<{ upload_url: string; image_url: string }>(
    '/api/posts/upload-url',
    { method: 'POST', body: { content_type: 'image/jpeg' } },
  );

  const fileResponse = await fetch(localUri);
  const blob = await fileResponse.blob();

  const uploadResponse = await fetch(upload_url, {
    method: 'PUT',
    headers: { 'Content-Type': 'image/jpeg' },
    body: blob,
  });
  if (!uploadResponse.ok) {
    throw new Error('Image upload failed');
  }

  return image_url;
}
