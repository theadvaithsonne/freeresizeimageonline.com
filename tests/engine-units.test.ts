import { describe, expect, it } from 'vitest';
import { convertLength, toPixels } from '../src/engine';

describe('convertLength', () => {
  it('converts centimetres, millimetres and inches to pixels', () => {
    expect(convertLength(1, 'in', 'px', 300)).toBe(300);
    expect(convertLength(2.54, 'cm', 'px', 300)).toBeCloseTo(300, 6);
    expect(convertLength(25.4, 'mm', 'px', 96)).toBeCloseTo(96, 6);
    expect(Math.round(convertLength(10, 'cm', 'px', 300))).toBe(1181);
    expect(Math.round(convertLength(35, 'mm', 'px', 300))).toBe(413);
    expect(Math.round(convertLength(45, 'mm', 'px', 300))).toBe(531);
  });

  it('converts pixels back to physical lengths', () => {
    expect(convertLength(1000, 'px', 'cm', 300)).toBeCloseTo(8.4667, 3);
    expect(convertLength(1000, 'px', 'cm', 96)).toBeCloseTo(26.4583, 3);
    expect(convertLength(1920, 'px', 'cm', 96)).toBeCloseTo(50.8, 6);
    expect(convertLength(1200, 'px', 'in', 300)).toBe(4);
  });

  it('does not depend on the DPI between physical units', () => {
    expect(convertLength(2.54, 'cm', 'in', 72)).toBeCloseTo(1, 9);
    expect(convertLength(2.54, 'cm', 'in', 600)).toBeCloseTo(1, 9);
    expect(convertLength(1, 'in', 'mm', 150)).toBeCloseTo(25.4, 9);
  });

  it('returns the value unchanged for the same unit', () => {
    expect(convertLength(12.34, 'cm', 'cm', 300)).toBe(12.34);
    expect(convertLength(7, 'px', 'px', 96)).toBe(7);
  });

  it('agrees with toPixels, which rounds to whole pixels', () => {
    for (const [value, unit, dpi] of [[21, 'cm', 300], [8.5, 'in', 300], [297, 'mm', 300], [4, 'cm', 96]] as const) {
      expect(toPixels(value, unit, dpi)).toBe(Math.round(convertLength(value, unit, 'px', dpi)));
    }
  });

  it('gives the pixel sizes printed on the converter pages', () => {
    // A4 at 300 DPI, US Letter at 300 DPI, a 4x6 inch print at 300 DPI
    expect([Math.round(convertLength(210, 'mm', 'px', 300)), Math.round(convertLength(297, 'mm', 'px', 300))]).toEqual([2480, 3508]);
    expect([Math.round(convertLength(8.5, 'in', 'px', 300)), Math.round(convertLength(11, 'in', 'px', 300))]).toEqual([2550, 3300]);
    expect([Math.round(convertLength(4, 'in', 'px', 300)), Math.round(convertLength(6, 'in', 'px', 300))]).toEqual([1200, 1800]);
    // 10 x 15 cm
    expect([Math.round(convertLength(10, 'cm', 'px', 300)), Math.round(convertLength(15, 'cm', 'px', 300))]).toEqual([1181, 1772]);
  });
});
