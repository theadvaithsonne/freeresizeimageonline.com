import { describe, expect, it } from 'vitest';
import { fitToTargetSize } from '../src/engine/target-size';
import { dedupeNames, extensionFor, formatFromMime, outputName, baseName } from '../src/engine/naming';
import { flattenAlpha, hasTransparency, parseColor } from '../src/engine/alpha';

/** Fake encoder: size grows with quality and with scale^2, like a real JPEG. */
function fakeEncoder(base: number) {
  const calls: Array<[number, number]> = [];
  return {
    calls,
    encode: async (q: number, s: number) => {
      calls.push([q, s]);
      return { size: Math.round(base * s * s * (0.05 + q)), data: { q, s } };
    },
  };
}

describe('fitToTargetSize', () => {
  it('returns immediately when the best quality already fits', async () => {
    const enc = fakeEncoder(100_000);
    const r = await fitToTargetSize({ targetBytes: 500_000, encode: enc.encode, qualityAdjustable: true });
    expect(r.reachedTarget).toBe(true);
    expect(r.scale).toBe(1);
    expect(enc.calls).toHaveLength(1);
  });

  it('finds the highest quality that fits, without shrinking', async () => {
    const enc = fakeEncoder(1_000_000);
    const target = 500_000;
    const r = await fitToTargetSize({ targetBytes: target, encode: enc.encode, qualityAdjustable: true });
    expect(r.reachedTarget).toBe(true);
    expect(r.size).toBeLessThanOrEqual(target);
    expect(r.scale).toBe(1);
    // close to the target: a good search doesn't leave much on the table
    expect(r.size).toBeGreaterThan(target * 0.9);
  });

  it('needs only a handful of (slow) encodes to land near the target', async () => {
    const enc = fakeEncoder(1_000_000);
    const r = await fitToTargetSize({ targetBytes: 500_000, encode: enc.encode, qualityAdjustable: true });
    expect(enc.calls.length).toBeLessThanOrEqual(6);
    expect(r.size).toBeGreaterThanOrEqual(500_000 * 0.97);
  });

  it('starts at a smaller scale when told the target is far below the input size', async () => {
    const enc = fakeEncoder(10_000_000);
    const r = await fitToTargetSize({
      targetBytes: 50_000,
      encode: enc.encode,
      qualityAdjustable: true,
      startScale: 0.1,
    });
    expect(enc.calls[0]![1]).toBeCloseTo(0.1);
    expect(r.reachedTarget).toBe(true);
    expect(r.size).toBeLessThanOrEqual(50_000);
    expect(enc.calls.length).toBeLessThanOrEqual(8);
  });

  it('shrinks the image when even the lowest quality is too big', async () => {
    const enc = fakeEncoder(10_000_000);
    const target = 50_000;
    const r = await fitToTargetSize({ targetBytes: target, encode: enc.encode, qualityAdjustable: true });
    expect(r.reachedTarget).toBe(true);
    expect(r.size).toBeLessThanOrEqual(target);
    expect(r.scale).toBeLessThan(1);
    expect(enc.calls.length).toBeLessThan(40);
  });

  it('reports failure (with the smallest result) when the target is impossible', async () => {
    const enc = fakeEncoder(10_000_000);
    const r = await fitToTargetSize({ targetBytes: 1, encode: enc.encode, qualityAdjustable: true });
    expect(r.reachedTarget).toBe(false);
    expect(r.size).toBeGreaterThan(1);
  });

  it('lossless mode only searches the scale', async () => {
    const enc = fakeEncoder(2_000_000);
    const r = await fitToTargetSize({ targetBytes: 200_000, encode: enc.encode, qualityAdjustable: false });
    expect(r.reachedTarget).toBe(true);
    expect(r.size).toBeLessThanOrEqual(200_000);
    expect(new Set(enc.calls.map(([q]) => q)).size).toBe(1); // quality never varied
  });

  it('can be cancelled between encodes', async () => {
    const enc = fakeEncoder(10_000_000);
    let n = 0;
    await expect(
      fitToTargetSize({
        targetBytes: 50_000,
        encode: enc.encode,
        qualityAdjustable: true,
        checkCancelled: () => {
          if (++n > 3) throw new Error('cancelled');
        },
      }),
    ).rejects.toThrow('cancelled');
  });
});

describe('naming', () => {
  it('builds output names', () => {
    expect(outputName('My Photo.HEIC', 'jpeg')).toBe('My Photo-resized.jpg');
    expect(outputName('a/b\\c.png', 'webp', '')).toBe('c.webp');
    expect(outputName('', 'png')).toBe('image-resized.png');
    expect(baseName('weird<>:"|?*name.jpg')).toBe('weirdname');
    expect(extensionFor('jpeg')).toBe('jpg');
  });

  it('maps input types to output formats', () => {
    expect(formatFromMime('image/jpeg')).toBe('jpeg');
    expect(formatFromMime('image/webp')).toBe('webp');
    expect(formatFromMime('image/gif')).toBe('png');
    expect(formatFromMime('image/bmp')).toBe('png');
  });

  it('de-duplicates names for ZIP files', () => {
    expect(dedupeNames(['a.jpg', 'b.jpg', 'A.jpg', 'a.jpg'])).toEqual(['a.jpg', 'b.jpg', 'A (2).jpg', 'a (3).jpg']);
  });
});

describe('alpha', () => {
  it('parses colors', () => {
    expect(parseColor('#fff')).toEqual([255, 255, 255]);
    expect(parseColor('#1a2B3c')).toEqual([26, 43, 60]);
    expect(parseColor('rgb(1, 2, 3)')).toEqual([1, 2, 3]);
    expect(parseColor('nonsense')).toEqual([255, 255, 255]);
  });

  it('flattens transparency onto the background', () => {
    const px = new Uint8ClampedArray([0, 0, 0, 0, 255, 0, 0, 255, 0, 0, 0, 128]);
    expect(hasTransparency(px)).toBe(true);
    flattenAlpha(px, '#ffffff');
    expect(Array.from(px.slice(0, 4))).toEqual([255, 255, 255, 255]); // fully transparent -> background
    expect(Array.from(px.slice(4, 8))).toEqual([255, 0, 0, 255]); // opaque unchanged
    expect(px[8]).toBeGreaterThan(120); // half-transparent black over white -> mid gray
    expect(px[8]).toBeLessThan(135);
    expect(hasTransparency(px)).toBe(false);
  });
});
