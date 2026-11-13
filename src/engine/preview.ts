/**
 * Sizes for the picture shown on a result card.
 *
 * A result up to PREVIEW_EXACT_MAX_PIXELS is shown as it is (the card simply scales the real file down). A bigger one used to be
 * shown with the 160 px thumbnail of the ORIGINAL, stretched to the width of the card, which looked very blurry even though the
 * downloaded file was fine. Now a bigger result gets a preview of its own: the result scaled down to a sharp but modest size.
 * The size depends on how many cards share the page, so a big batch stays light on memory.
 */

/** Results up to this many pixels are previewed as they are (an object URL of the result file). */
export const PREVIEW_EXACT_MAX_PIXELS = 2_500_000;

/** Longest side, in pixels, of the preview of a big result, by the number of cards on the page. */
export function previewEdge(cardCount: number): number {
  if (cardCount <= 4) return 1280; // one to four large cards: sharp even on a high-density screen
  if (cardCount <= 24) return 800;
  return 560; // a long batch: small cards, and the memory of every preview adds up
}

/** True when the result is shown as it is, false when it needs a scaled-down preview. */
export function showsResultAsIs(width: number, height: number): boolean {
  return width * height <= PREVIEW_EXACT_MAX_PIXELS;
}

/** The size of the preview: the result scaled down so that its longest side is `edge`, same shape, never enlarged, never below 1 px. */
export function previewSize(width: number, height: number, edge: number): { width: number; height: number } {
  const longest = Math.max(width, height);
  const scale = longest > edge ? edge / longest : 1;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}
