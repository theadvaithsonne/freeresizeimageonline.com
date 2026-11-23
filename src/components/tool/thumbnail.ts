/**
 * The small picture shown for every added image (the file list and, until the real result is ready, the result card).
 * It used to be 160 pixels wide, which is too small for a card that is 400+ pixels wide, or for a list box on a screen with a
 * high pixel density (laptops at 150 % or more, Macs, phones): the browser had to stretch it and it looked blurry.
 * It is now sized for the place it is shown, decoded upright (phone photos are turned the right way up) and scaled down
 * with the browser's best quality. The original file is never changed.
 */

/** Longest side, in pixels, of the thumbnail of a batch of `count` pictures. Big cards need more pixels; a long batch needs little memory. */
export function thumbnailEdge(count: number): number {
  if (count <= 4) return 1000; // one to four large cards: sharp even on a high-density screen
  if (count <= 24) return 800;
  return 480; // a long batch: small cards, and the memory of every thumbnail adds up
}

/** Longest side of a thumbnail that is only shown in a small square (the page list of the PDF maker). */
export const LIST_THUMBNAIL_EDGE = 360;

/**
 * Makes the thumbnail of `file`: the picture upright and at most `edge` pixels on its longest side (never enlarged), as a JPEG on a
 * `backdrop` colour (so transparent parts do not turn black). `onSize` gets the real, upright size of the picture (in pixels).
 * Throws when the browser cannot read the file, and returns null when it cannot write the JPEG.
 */
export async function makeThumbnail(
  file: Blob,
  edge: number,
  backdrop: string,
  onSize?: (width: number, height: number) => void,
): Promise<Blob | null> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    bitmap = await createImageBitmap(file); // a browser without the option
  }
  try {
    onSize?.(bitmap.width, bitmap.height);
    const scale = Math.min(1, edge / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = backdrop;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.88));
    canvas.width = 0;
    return blob;
  } finally {
    bitmap.close();
  }
}
