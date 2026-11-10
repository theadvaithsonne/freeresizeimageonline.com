import { describe, expect, it } from 'vitest';
import { planResize, integerRect } from '../src/engine/geometry';
import { dpiForUnitChange, fromPixels, lockedCounterpart, toPixels } from '../src/engine/units';
import { DEFAULT_OPTIONS, EngineError, LIMITS, type ResizeOptions } from '../src/engine/types';

const opts = (o: Partial<ResizeOptions>): ResizeOptions => ({ ...DEFAULT_OPTIONS, ...o });

describe('units', () => {
  it('converts physical units to pixels at a DPI', () => {
    expect(toPixels(1, 'in', 300)).toBe(300);
    expect(toPixels(2.54, 'cm', 300)).toBe(300);
    expect(toPixels(25.4, 'mm', 300)).toBe(300);
    expect(toPixels(35, 'mm', 300)).toBe(413); // passport width
    expect(toPixels(45, 'mm', 300)).toBe(531); // passport height
    expect(toPixels(800, 'px', 300)).toBe(800);
  });

  it('never returns less than 1 pixel', () => {
    expect(toPixels(0.0001, 'cm', 72)).toBe(1);
  });

  it('round-trips pixels to units', () => {
    expect(fromPixels(300, 'in', 300)).toBe(1);
    expect(fromPixels(413, 'mm', 300)).toBeCloseTo(34.97, 1);
    expect(fromPixels(640.4, 'px', 96)).toBe(640);
  });

  it('switching a pixel size to cm keeps the same number of pixels', () => {
    const dpi = dpiForUnitChange('px', 'cm', 96); // a pixel preset leaves 96 in the hidden DPI box
    expect(dpi).toBe(300);
    const cm = fromPixels(1080, 'cm', dpi);
    expect(cm).toBeCloseTo(9.14, 2);
    expect(toPixels(cm, 'cm', dpi)).toBe(1080); // not 3,376 as it was before the fix
  });

  it('keeps a deliberate print DPI and never changes DPI for other unit switches', () => {
    expect(dpiForUnitChange('px', 'in', 600)).toBe(600);
    expect(dpiForUnitChange('cm', 'mm', 96)).toBe(96);
    expect(dpiForUnitChange('in', 'px', 300)).toBe(300);
  });

  it('keeps the aspect ratio when locked', () => {
    expect(lockedCounterpart(500, 4000, 3000, 'px')).toBe(375);
    expect(lockedCounterpart(10, 4, 3, 'cm')).toBe(7.5);
    expect(lockedCounterpart(10, 0, 3, 'cm')).toBe(10);
  });
});

describe('planResize', () => {
  it('keeps the original size in "keep" mode', () => {
    const p = planResize(4000, 3000, opts({ mode: 'keep' }));
    expect([p.outW, p.outH, p.identity]).toEqual([4000, 3000, true]);
  });

  it('percent scales both sides', () => {
    const p = planResize(4000, 3000, opts({ mode: 'percent', percent: 50 }));
    expect([p.outW, p.outH]).toEqual([2000, 1500]);
    expect(p.identity).toBe(false);
  });

  it('width only: height follows the aspect ratio', () => {
    const p = planResize(4000, 3000, opts({ mode: 'dimensions', width: 800 }));
    expect([p.outW, p.outH]).toEqual([800, 600]);
  });

  it('height only: width follows the aspect ratio', () => {
    const p = planResize(4000, 3000, opts({ mode: 'dimensions', height: 600 }));
    expect([p.outW, p.outH]).toEqual([800, 600]);
  });

  it('fit stays inside the box and keeps the ratio', () => {
    const p = planResize(4000, 3000, opts({ mode: 'dimensions', width: 1000, height: 1000, fit: 'fit' }));
    expect([p.outW, p.outH]).toEqual([1000, 750]);
    expect(p.source).toEqual({ x: 0, y: 0, w: 4000, h: 3000 });
  });

  it('stretch gives exactly the box', () => {
    const p = planResize(4000, 3000, opts({ mode: 'dimensions', width: 1000, height: 1000, fit: 'stretch' }));
    expect([p.outW, p.outH]).toEqual([1000, 1000]);
  });

  it('crop fills the box and trims the overflow, centered', () => {
    const p = planResize(4000, 3000, opts({ mode: 'dimensions', width: 1000, height: 1000, fit: 'crop' }));
    expect([p.outW, p.outH]).toEqual([1000, 1000]);
    expect(p.source.h).toBeCloseTo(3000);
    expect(p.source.w).toBeCloseTo(3000);
    expect(p.source.x).toBeCloseTo(500);
    expect(p.source.y).toBeCloseTo(0);
  });

  it('uses DPI for physical sizes (passport photo 35x45 mm @300dpi)', () => {
    const p = planResize(
      3000,
      4000,
      opts({ mode: 'dimensions', width: 35, height: 45, unit: 'mm', dpi: 300, fit: 'crop' }),
    );
    expect([p.outW, p.outH]).toEqual([413, 531]);
  });

  it('rejects empty or invalid input', () => {
    expect(() => planResize(100, 100, opts({ mode: 'dimensions' }))).toThrow(EngineError);
    expect(() => planResize(100, 100, opts({ mode: 'percent', percent: 0 }))).toThrow(EngineError);
    expect(() => planResize(0, 100, opts({}))).toThrow(EngineError);
  });

  it('rejects outputs that are too large for a phone', () => {
    expect(() => planResize(1000, 1000, opts({ mode: 'dimensions', width: LIMITS.maxSide + 1 }))).toThrow(
      /too large/i,
    );
    expect(() => planResize(1000, 1000, opts({ mode: 'percent', percent: 100000 }))).toThrow(EngineError);
  });

  it('uses a lower output limit on devices with small canvases (iPhone Safari)', () => {
    const big = opts({ mode: 'dimensions', width: 5000, height: 4000, fit: 'stretch' }); // 20 MP
    expect(() => planResize(6000, 4000, big, LIMITS.maxOutputPixels)).not.toThrow();
    expect(() => planResize(6000, 4000, big, LIMITS.maxOutputPixelsIOS)).toThrow(/too large/i);
  });

  it('integerRect clamps to the image', () => {
    expect(integerRect({ x: 0.4, y: 0.6, w: 99.5, h: 50.2 }, 100, 100)).toEqual({ x: 0, y: 0, w: 100, h: 50 });
  });
});
