/**
 * "Make it at most N KB" search.
 *
 * Strategy (generic over the encoder so it can be unit-tested without a browser):
 *  1. Highest quality already fits? Done (never make a file bigger than needed).
 *  2. Otherwise, at the current scale, binary-search the highest quality that fits.
 *  3. If even the lowest allowed quality is too big, shrink the image (estimating the needed
 *     scale from the size ratio, since file size roughly follows pixel count) and try again.
 *  4. If nothing fits, return the smallest result found and say the target was not reached.
 *
 * For lossless formats (PNG) quality has no effect, so only the scale is searched.
 */

export interface Encoded<T> {
  size: number;
  data: T;
}

export interface TargetSizeOptions<T> {
  targetBytes: number;
  /** Encode at `quality` (0-1) after scaling the image to `scale` (0-1] of its planned size. */
  encode: (quality: number, scale: number) => Promise<Encoded<T>>;
  /** false for PNG: quality is ignored and only the scale is searched. */
  qualityAdjustable: boolean;
  minQuality?: number;
  maxQuality?: number;
  /** Don't shrink below this fraction of the planned size. */
  minScale?: number;
  /** Maximum refinement steps for the quality search. */
  qualitySteps?: number;
  /** First scale to try (0-1]. Use a smaller value when the target is far below the input size. */
  startScale?: number;
  /** Stop refining once the result is within this fraction of the target (e.g. 0.97 = within 3%). */
  closeEnough?: number;
  /** Called before every encode; throw to abort. */
  checkCancelled?: () => void;
}

export interface TargetSizeResult<T> {
  data: T;
  size: number;
  quality: number;
  scale: number;
  reachedTarget: boolean;
}

export async function fitToTargetSize<T>(opts: TargetSizeOptions<T>): Promise<TargetSizeResult<T>> {
  const {
    targetBytes,
    encode,
    qualityAdjustable,
    minQuality = 0.1,
    maxQuality = 0.95,
    minScale = 0.05,
    qualitySteps = 7,
    startScale = 1,
    closeEnough = 0.97,
    checkCancelled,
  } = opts;

  const run = async (q: number, s: number) => {
    checkCancelled?.();
    const r = await encode(q, s);
    return { ...r, quality: q, scale: s };
  };

  let smallest: { size: number; data: T; quality: number; scale: number } | undefined;
  const track = (r: { size: number; data: T; quality: number; scale: number }) => {
    if (!smallest || r.size < smallest.size) smallest = r;
    return r;
  };

  // Lossless: shrink only.
  if (!qualityAdjustable) {
    const first = track(await run(maxQuality, 1));
    if (first.size <= targetBytes) return { ...first, reachedTarget: true };
    let hi = 1;
    let lo = minScale;
    let best: ReturnType<typeof track> | undefined;
    // Estimate first, then refine by bisection.
    let guess = Math.max(minScale, Math.min(0.95, Math.sqrt(targetBytes / first.size) * 0.97));
    for (let i = 0; i < 9; i++) {
      const r = track(await run(maxQuality, guess));
      if (r.size <= targetBytes) {
        best = r;
        lo = guess;
      } else {
        hi = guess;
      }
      guess = (lo + hi) / 2;
      if (best && hi - lo < 0.01) break;
    }
    if (best) return { ...best, reachedTarget: true };
    const s = smallest!;
    return { ...s, reachedTarget: false };
  }

  let scale = Math.min(1, Math.max(minScale, startScale));
  for (let attempt = 0; attempt < 10; attempt++) {
    const atMax = track(await run(maxQuality, scale));
    if (atMax.size <= targetBytes) return { ...atMax, reachedTarget: true };

    const atMin = track(await run(minQuality, scale));
    if (atMin.size <= targetBytes) {
      // Interpolate on log(size): file size is close to exponential in quality, so this needs
      // ~3-4 encodes instead of 7+ for plain bisection (each encode of a big photo takes seconds).
      let loQ = minQuality; // known to fit
      let hiQ = maxQuality; // known not to fit
      let loSize = atMin.size;
      let hiSize = atMax.size;
      let best = atMin;
      for (let i = 0; i < qualitySteps; i++) {
        if (best.size >= targetBytes * closeEnough || hiQ - loQ < 0.004) break;
        const denom = Math.log(hiSize) - Math.log(loSize);
        const t = denom > 0 ? (Math.log(targetBytes) - Math.log(loSize)) / denom : 0.5;
        const q = loQ + Math.min(0.9, Math.max(0.1, t)) * (hiQ - loQ);
        const r = track(await run(q, scale));
        if (r.size <= targetBytes) {
          best = r;
          loQ = q;
          loSize = r.size;
        } else {
          hiQ = q;
          hiSize = r.size;
        }
      }
      return { ...best, reachedTarget: true };
    }

    // Still too big at the lowest quality: shrink. File size ~ pixel count ~ scale^2.
    if (scale <= minScale) break;
    const ratio = Math.sqrt(targetBytes / atMin.size);
    const next = Math.max(minScale, Math.min(scale * 0.93, scale * ratio * 1.08));
    scale = next;
  }

  const s = smallest!;
  return { ...s, reachedTarget: false };
}
