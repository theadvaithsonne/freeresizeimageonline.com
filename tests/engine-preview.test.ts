import { describe, expect, it } from 'vitest';
import { PREVIEW_EXACT_MAX_PIXELS, previewEdge, previewSize, showsResultAsIs } from '../src/engine/preview';

describe('result preview sizes', () => {
  it('shows a modest result as it is, and a big one through a preview of its own', () => {
    expect(showsResultAsIs(1600, 1200)).toBe(true); // 1.92 MP
    expect(showsResultAsIs(1581, 1581)).toBe(true); // just under the limit
    expect(PREVIEW_EXACT_MAX_PIXELS).toBe(2_500_000);
    // the case that was blurry: a 2,024 x 1,297 px result (2.6 MP) was shown with the 160 px thumbnail
    expect(showsResultAsIs(2024, 1297)).toBe(false);
    expect(showsResultAsIs(4000, 3000)).toBe(false);
  });

  it('scales a big result down to the edge, keeping its shape', () => {
    expect(previewSize(2024, 1297, 1280)).toEqual({ width: 1280, height: 820 });
    expect(previewSize(1297, 2024, 1280)).toEqual({ width: 820, height: 1280 });
    expect(previewSize(4000, 3000, 800)).toEqual({ width: 800, height: 600 });
  });

  it('never enlarges, and never goes below one pixel', () => {
    expect(previewSize(640, 480, 1280)).toEqual({ width: 640, height: 480 });
    expect(previewSize(10000, 3, 800)).toEqual({ width: 800, height: 1 });
  });

  it('the preview is much sharper than the 160 px thumbnail it replaces, and smaller with more cards', () => {
    expect(previewEdge(1)).toBeGreaterThan(160 * 4);
    expect(previewEdge(1)).toBe(1280);
    expect(previewEdge(4)).toBe(1280);
    expect(previewEdge(5)).toBe(800);
    expect(previewEdge(24)).toBe(800);
    expect(previewEdge(25)).toBe(560);
    expect(previewEdge(500)).toBe(560);
    expect(previewEdge(500)).toBeGreaterThan(160 * 3);
  });
});
