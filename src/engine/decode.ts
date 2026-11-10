import { EngineError } from './types';

export interface DecodedImage {
  bitmap: ImageBitmap;
  width: number;
  height: number;
}

const IMAGE_EXT = /\.(jpe?g|png|webp|gif|bmp|avif|jfif)$/i;

export function looksLikeImage(file: Blob & { name?: string }): boolean {
  return file.type.startsWith('image/') || IMAGE_EXT.test(file.name ?? '');
}

/**
 * Decode an image file in the browser. EXIF orientation is applied, so phone photos come out upright.
 * (HEIC is not decodable by most browsers; support is planned separately.)
 */
export async function decodeImage(file: Blob & { name?: string }): Promise<DecodedImage> {
  if (!looksLikeImage(file)) throw new EngineError('unsupported-type', 'Not an image file');
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    try {
      // Some browsers reject the options object.
      bitmap = await createImageBitmap(file);
    } catch {
      throw new EngineError('decode-failed', 'This image could not be read');
    }
  }
  return { bitmap, width: bitmap.width, height: bitmap.height };
}
