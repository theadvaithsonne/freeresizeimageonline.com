import type Pica from 'pica';
import { integerRect, type ResizePlan } from './geometry';
import { EngineError } from './types';

type PicaInstance = ReturnType<typeof Pica>;
let picaPromise: Promise<PicaInstance> | undefined;

/**
 * Load Pica lazily so pages that never resize don't pay for it. A failed download (flaky mobile connection) is
 * NOT remembered: the next resize tries again. Returns null when it cannot be loaded.
 */
async function getPica(): Promise<PicaInstance | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    picaPromise ??= import('pica').then((m) => {
      const Ctor = (m.default ?? m) as unknown as new () => PicaInstance;
      return new Ctor();
    });
    try {
      return await picaPromise;
    } catch {
      picaPromise = undefined; // forget the failure so a later try can succeed
      if (attempt === 0) await new Promise((r) => setTimeout(r, 400));
    }
  }
  return null;
}

/** The plan scaled by an extra factor (used when shrinking to reach a target file size). */
export function scalePlan(plan: ResizePlan, scale: number): ResizePlan {
  if (scale >= 1) return plan;
  return {
    ...plan,
    outW: Math.max(1, Math.round(plan.outW * scale)),
    outH: Math.max(1, Math.round(plan.outH * scale)),
    identity: false,
  };
}

/**
 * Resample `bitmap` as described by `plan` with Pica (tiled, multi-threaded, the MKS2013 filter:
 * a Lanczos-style resize that also sharpens, so it looks much better than a plain canvas
 * downscale) and return the raw RGBA pixels.
 */
export async function resample(bitmap: ImageBitmap, plan: ResizePlan): Promise<ImageData> {
  const dest = document.createElement('canvas');
  dest.width = plan.outW;
  dest.height = plan.outH;
  const ctx = dest.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new EngineError('too-large', 'Canvas is not available');

  try {
    if (plan.identity) {
      ctx.drawImage(bitmap, 0, 0);
    } else {
      let source: ImageBitmap = bitmap;
      let cropped = false;
      const s = plan.source;
      if (s.x !== 0 || s.y !== 0 || s.w !== bitmap.width || s.h !== bitmap.height) {
        const r = integerRect(s, bitmap.width, bitmap.height);
        source = await createImageBitmap(bitmap, r.x, r.y, r.w, r.h);
        cropped = true;
      }
      try {
        const pica = await getPica();
        if (pica) {
          await pica.resize(source, dest);
        } else {
          // Resizer library unavailable: use the browser's own high-quality scaling so the visitor still gets a result.
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(source, 0, 0, source.width, source.height, 0, 0, plan.outW, plan.outH);
        }
      } finally {
        if (cropped) source.close();
      }
    }
    return ctx.getImageData(0, 0, plan.outW, plan.outH);
  } finally {
    // Free the canvas memory right away (matters on phones).
    dest.width = 0;
    dest.height = 0;
  }
}
