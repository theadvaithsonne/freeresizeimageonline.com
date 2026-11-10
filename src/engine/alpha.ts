/** Parse "#rgb", "#rrggbb" or "rgb(r,g,b)" into [r,g,b]. Falls back to white. */
export function parseColor(css: string): [number, number, number] {
  const s = css.trim().toLowerCase();
  let m = s.match(/^#([0-9a-f]{3})$/);
  if (m) {
    const h = m[1]!;
    return [parseInt(h[0]! + h[0]!, 16), parseInt(h[1]! + h[1]!, 16), parseInt(h[2]! + h[2]!, 16)];
  }
  m = s.match(/^#([0-9a-f]{6})$/);
  if (m) {
    const h = m[1]!;
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  m = s.match(/^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/);
  if (m) {
    const c = (v: string) => Math.max(0, Math.min(255, parseInt(v, 10)));
    return [c(m[1]!), c(m[2]!), c(m[3]!)];
  }
  return [255, 255, 255];
}

/**
 * Blend RGBA pixels over a solid background, in place, leaving them fully opaque.
 * JPEG has no transparency, so transparent PNG/WebP pixels would otherwise turn black.
 */
export function flattenAlpha(rgba: Uint8ClampedArray, background: string): void {
  const [br, bg, bb] = parseColor(background);
  for (let i = 0; i < rgba.length; i += 4) {
    const a = rgba[i + 3]!;
    if (a === 255) continue;
    const f = a / 255;
    rgba[i] = Math.round(rgba[i]! * f + br * (1 - f));
    rgba[i + 1] = Math.round(rgba[i + 1]! * f + bg * (1 - f));
    rgba[i + 2] = Math.round(rgba[i + 2]! * f + bb * (1 - f));
    rgba[i + 3] = 255;
  }
}

/** True if any pixel is not fully opaque. */
export function hasTransparency(rgba: Uint8ClampedArray): boolean {
  for (let i = 3; i < rgba.length; i += 4) if (rgba[i] !== 255) return true;
  return false;
}
