import { toPixels, isFiniteNumber } from './units';
import { EngineError, LIMITS, maxOutputPixelsForDevice, type ResizeOptions } from './types';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ResizePlan {
  /** Output size in pixels. */
  outW: number;
  outH: number;
  /** Region of the source image that is scaled into the output (full image unless cropping). */
  source: Rect;
  /** True when the output is identical in size and no crop is needed (nothing to resample). */
  identity: boolean;
}

const round = (n: number) => Math.max(1, Math.round(n));

/**
 * Work out the output size and which part of the source to use.
 * Pure function: no canvas, no DOM, easy to test.
 */
export function planResize(
  srcW: number,
  srcH: number,
  options: ResizeOptions,
  maxOutputPixels: number = maxOutputPixelsForDevice(),
): ResizePlan {
  if (!(srcW > 0) || !(srcH > 0)) throw new EngineError('decode-failed', 'Image has no size');
  if (srcW * srcH > LIMITS.maxInputPixels) throw new EngineError('too-large', 'Input image is too large');

  const full: Rect = { x: 0, y: 0, w: srcW, h: srcH };
  let outW = srcW;
  let outH = srcH;
  let source = full;

  if (options.mode === 'percent') {
    const pct = options.percent;
    if (!isFiniteNumber(pct) || pct <= 0) throw new EngineError('invalid-size', 'Percent must be above 0');
    outW = round((srcW * pct) / 100);
    outH = round((srcH * pct) / 100);
  } else if (options.mode === 'dimensions') {
    const wIn = options.width;
    const hIn = options.height;
    const hasW = isFiniteNumber(wIn) && wIn > 0;
    const hasH = isFiniteNumber(hIn) && hIn > 0;
    if (!hasW && !hasH) throw new EngineError('invalid-size', 'Enter a width or a height');
    const tW = hasW ? toPixels(wIn, options.unit, options.dpi) : undefined;
    const tH = hasH ? toPixels(hIn, options.unit, options.dpi) : undefined;

    if (tW !== undefined && tH === undefined) {
      outW = tW;
      outH = round((srcH * tW) / srcW);
    } else if (tH !== undefined && tW === undefined) {
      outH = tH;
      outW = round((srcW * tH) / srcH);
    } else {
      const bw = tW!;
      const bh = tH!;
      if (options.fit === 'stretch') {
        outW = bw;
        outH = bh;
      } else if (options.fit === 'fit') {
        const scale = Math.min(bw / srcW, bh / srcH);
        outW = round(srcW * scale);
        outH = round(srcH * scale);
      } else {
        // crop: cover the box, trim what overflows, centered
        outW = bw;
        outH = bh;
        const scale = Math.max(bw / srcW, bh / srcH);
        const cw = Math.min(srcW, bw / scale);
        const ch = Math.min(srcH, bh / scale);
        source = { x: (srcW - cw) / 2, y: (srcH - ch) / 2, w: cw, h: ch };
      }
    }
  }

  if (outW > LIMITS.maxSide || outH > LIMITS.maxSide || outW * outH > maxOutputPixels) {
    throw new EngineError('too-large', `Output ${outW}x${outH} is too large for this device`);
  }

  const identity =
    outW === srcW && outH === srcH && source.x === 0 && source.y === 0 && source.w === srcW && source.h === srcH;
  return { outW, outH, source, identity };
}

/** Integer crop rectangle (createImageBitmap needs whole pixels). */
export function integerRect(r: Rect, maxW: number, maxH: number): Rect {
  const x = Math.max(0, Math.floor(r.x));
  const y = Math.max(0, Math.floor(r.y));
  const w = Math.max(1, Math.min(maxW - x, Math.round(r.w)));
  const h = Math.max(1, Math.min(maxH - y, Math.round(r.h)));
  return { x, y, w, h };
}
