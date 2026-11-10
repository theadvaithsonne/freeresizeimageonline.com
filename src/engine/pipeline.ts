import { decodeImage } from './decode';
import type { Encoder } from './encoder';
import { planResize } from './geometry';
import { formatFromMime, outputName } from './naming';
import { resample, scalePlan } from './resample';
import { fitToTargetSize } from './target-size';
import { EngineError, type OutputFormat, type ProcessResult, type ResizeOptions } from './types';

export interface ProcessContext {
  encoder: Encoder;
  signal?: AbortSignal;
}

function throwIfCancelled(signal?: AbortSignal) {
  if (signal?.aborted) throw new EngineError('cancelled', 'Cancelled');
}

/**
 * Resize / compress / convert one image entirely in the browser.
 * Steps: decode -> plan size -> resample (Pica) -> encode (WASM worker) -> Blob.
 * Metadata (EXIF, GPS, camera info) is not copied to the output, which also protects privacy.
 */
export async function processImage(
  file: File,
  options: ResizeOptions,
  { encoder, signal }: ProcessContext,
): Promise<ProcessResult> {
  throwIfCancelled(signal);
  const decoded = await decodeImage(file);
  const { bitmap } = decoded;

  try {
    const plan = planResize(decoded.width, decoded.height, options);
    const format: OutputFormat = options.format === 'original' ? formatFromMime(file.type) : options.format;
    const flattenOn = format === 'jpeg' ? options.background : null;
    const quality = Math.min(1, Math.max(0.01, options.quality / 100));

    let loadedScale = -1; // scale of the pixels currently inside the encoder
    let finalWidth = plan.outW;
    let finalHeight = plan.outH;

    const load = async (scale: number) => {
      if (scale === loadedScale) return;
      throwIfCancelled(signal);
      const scaled = scalePlan(plan, scale);
      const pixels = await resample(bitmap, scaled);
      await encoder.setImage(pixels, flattenOn);
      loadedScale = scale;
      finalWidth = scaled.outW;
      finalHeight = scaled.outH;
    };

    const result: Omit<ProcessResult, 'name' | 'originalBytes' | 'outputBytes'> & { blob: Blob } = {
      blob: undefined as unknown as Blob,
      width: plan.outW,
      height: plan.outH,
      format,
    };

    if (options.targetBytes && options.targetBytes > 0) {
      // When the target is far below the expected size, skip straight to a smaller scale instead of
      // spending several slow full-size encodes. Only a rough guess is possible for JPEG/WebP inputs
      // (their file size tracks pixel count); other inputs start at full size.
      let startScale = 1;
      if (format !== 'png' && /^image\/(jpe?g|pjpeg|webp)$/i.test(file.type)) {
        const expectedBytes = (file.size * (plan.outW * plan.outH)) / (decoded.width * decoded.height);
        const ratio = expectedBytes / options.targetBytes;
        if (ratio > 6) startScale = Math.min(1, Math.sqrt(1 / (ratio * 0.3)) * 1.5);
      }
      const target = await fitToTargetSize({
        targetBytes: options.targetBytes,
        qualityAdjustable: format !== 'png',
        startScale,
        // PNG sizes are measured without the slow optimiser, then re-encoded once with it below.
        encode: async (q, s) => {
          await load(s);
          const out = await encoder.encode(format, q, false);
          return { size: out.size, data: out.blob };
        },
        checkCancelled: () => throwIfCancelled(signal),
      });
      await load(target.scale);
      let blob = target.data;
      if (format === 'png') {
        const optimised = await encoder.encode('png', 1, true);
        if (optimised.size < blob.size) blob = optimised.blob;
      }
      result.blob = blob;
      result.quality = format === 'png' ? undefined : target.quality;
      result.extraScale = target.scale;
      result.reachedTarget = blob.size <= options.targetBytes;
    } else {
      await load(1);
      throwIfCancelled(signal);
      const out = await encoder.encode(format, quality, true);
      result.blob = out.blob;
      result.quality = format === 'png' ? undefined : quality;
    }

    return {
      ...result,
      width: finalWidth,
      height: finalHeight,
      name: outputName(file.name, format),
      originalBytes: file.size,
      outputBytes: result.blob.size,
    };
  } catch (err) {
    if (err instanceof EngineError) throw err;
    throw new EngineError('encode-failed', err instanceof Error ? err.message : String(err));
  } finally {
    bitmap.close();
  }
}
