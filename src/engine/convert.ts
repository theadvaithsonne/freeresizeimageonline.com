import type { Encoder } from './encoder';
import { baseName, extensionFor } from './naming';
import { EngineError, type OutputFormat, type ProcessResult } from './types';

export interface ConvertedFile {
  blob: Blob;
  name: string;
  format: OutputFormat;
}

/**
 * Save an already-resized result in another format (JPG / PNG / WebP) - the visitor can pick the
 * download format after resizing. Nothing is resized again: the pixels of the result are re-encoded.
 * Transparent areas become `background` when the new format is JPG.
 */
export async function convertResult(
  result: ProcessResult,
  format: OutputFormat,
  encoder: Encoder,
  options: { quality?: number; background?: string } = {},
): Promise<ConvertedFile> {
  if (result.format === format) return { blob: result.blob, name: result.name, format };

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(result.blob);
  } catch {
    throw new EngineError('decode-failed', 'The resized image could not be read back');
  }

  try {
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new EngineError('encode-failed', 'Canvas is not available');
    ctx.drawImage(bitmap, 0, 0);
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
    canvas.width = 0;

    await encoder.setImage(pixels, format === 'jpeg' ? (options.background ?? '#ffffff') : null);
    const encoded = await encoder.encode(format, options.quality ?? 0.92, true);
    return {
      blob: encoded.blob,
      name: `${baseName(result.name)}.${extensionFor(format)}`,
      format,
    };
  } finally {
    bitmap.close();
  }
}
