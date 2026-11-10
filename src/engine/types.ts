/** Shared types for the in-browser image engine. Nothing here touches the network. */

export type OutputFormat = 'jpeg' | 'png' | 'webp';
/** 'original' keeps the input format when it is supported, otherwise falls back to JPEG/PNG. */
export type FormatChoice = OutputFormat | 'original';

export type LengthUnit = 'px' | 'cm' | 'mm' | 'in';
export type SizeMode = 'dimensions' | 'percent' | 'keep';

/**
 * fit     - keep the aspect ratio, scale to fit INSIDE the width x height box
 * crop    - fill the box exactly, trimming the overflow (centered)
 * stretch - exactly width x height, ignoring the aspect ratio
 */
export type FitMode = 'fit' | 'crop' | 'stretch';

export interface ResizeOptions {
  mode: SizeMode;
  /** Used when mode = 'dimensions'. At least one of width/height must be set. */
  width?: number;
  height?: number;
  unit: LengthUnit;
  /** Dots per inch; only matters for cm / mm / in. */
  dpi: number;
  fit: FitMode;
  /** Used when mode = 'percent' (e.g. 50 = half size). */
  percent?: number;
  format: FormatChoice;
  /** 1-100. Ignored for PNG (lossless). */
  quality: number;
  /** Aim for the largest quality that stays at or below this many bytes. */
  targetBytes?: number;
  /** CSS color used to replace transparency when the output is JPEG. */
  background: string;
}

export const DEFAULT_OPTIONS: ResizeOptions = {
  mode: 'keep',
  unit: 'px',
  dpi: 96,
  fit: 'fit',
  format: 'original',
  quality: 85,
  background: '#ffffff',
};

export interface ProcessResult {
  blob: Blob;
  /** Suggested file name for download. */
  name: string;
  width: number;
  height: number;
  format: OutputFormat;
  originalBytes: number;
  outputBytes: number;
  /** Final quality used (0-1) when quality-based encoding applied. */
  quality?: number;
  /** Extra downscale applied to reach a target size (1 = none). */
  extraScale?: number;
  /** Only set when a target size was requested. */
  reachedTarget?: boolean;
}

export type EngineErrorCode =
  | 'decode-failed'
  | 'unsupported-type'
  | 'invalid-size'
  | 'too-large'
  | 'encode-failed'
  | 'cancelled';

export class EngineError extends Error {
  constructor(
    public readonly code: EngineErrorCode,
    message?: string,
  ) {
    super(message ?? code);
    this.name = 'EngineError';
  }
}

/** Safety limits so a phone doesn't run out of memory. */
export const LIMITS = {
  /** Longest allowed output side in pixels. */
  maxSide: 16384,
  /** Largest allowed output area in pixels on desktops (RGBA = 4 bytes each). */
  maxOutputPixels: 64_000_000,
  /** Safari on iPhone/iPad refuses canvases larger than this (16,777,216 px = 4096 x 4096). */
  maxOutputPixelsIOS: 16_777_216,
  /** Phones with little memory. */
  maxOutputPixelsLowMemory: 24_000_000,
  /** Largest allowed input area in pixels. */
  maxInputPixels: 200_000_000,
} as const;

/** Largest output area (pixels) that is safe on the current device. Falls back to the desktop limit outside a browser. */
export function maxOutputPixelsForDevice(): number {
  if (typeof navigator === 'undefined') return LIMITS.maxOutputPixels;
  const ua = navigator.userAgent ?? '';
  // iPadOS reports itself as a Mac but has a touch screen.
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  if (isIOS) return LIMITS.maxOutputPixelsIOS;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  if (typeof memory === 'number' && memory <= 2) return LIMITS.maxOutputPixelsLowMemory;
  return LIMITS.maxOutputPixels;
}
