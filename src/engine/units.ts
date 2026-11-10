import type { LengthUnit } from './types';

const CM_PER_INCH = 2.54;
const MM_PER_INCH = 25.4;

/** Convert a physical/pixel length to whole pixels (at least 1). */
export function toPixels(value: number, unit: LengthUnit, dpi: number): number {
  let px: number;
  switch (unit) {
    case 'px':
      px = value;
      break;
    case 'in':
      px = value * dpi;
      break;
    case 'cm':
      px = (value / CM_PER_INCH) * dpi;
      break;
    case 'mm':
      px = (value / MM_PER_INCH) * dpi;
      break;
  }
  return Math.max(1, Math.round(px));
}

/** Convert pixels to a length in `unit` (rounded to 2 decimals for physical units). */
export function fromPixels(px: number, unit: LengthUnit, dpi: number): number {
  let value: number;
  switch (unit) {
    case 'px':
      return Math.round(px);
    case 'in':
      value = px / dpi;
      break;
    case 'cm':
      value = (px / dpi) * CM_PER_INCH;
      break;
    case 'mm':
      value = (px / dpi) * MM_PER_INCH;
      break;
  }
  return Math.round(value * 100) / 100;
}

/**
 * Keep one dimension in sync with the other when the aspect ratio is locked.
 * Returns the *other* side in the same unit as `value`.
 */
export function lockedCounterpart(
  value: number,
  fromSide: number,
  toSide: number,
  unit: LengthUnit,
): number {
  if (!(fromSide > 0) || !(toSide > 0)) return value;
  const result = (value * toSide) / fromSide;
  return unit === 'px' ? Math.round(result) : Math.round(result * 100) / 100;
}

export function isFiniteNumber(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n);
}
