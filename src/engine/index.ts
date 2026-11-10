/**
 * Public API of the image engine. Everything runs in the visitor's browser: no uploads, no server.
 *
 *   const encoder = createEncoder();
 *   const items = createItems(files);
 *   await runBatch(items, options, (file, opts, signal) => processImage(file, opts, { encoder, signal }));
 *   const zip = await zipFiles(items.filter(i => i.result).map(i => ({ name: i.result!.name, blob: i.result!.blob })));
 *   encoder.dispose();
 */
export * from './types';
export { toPixels, fromPixels, lockedCounterpart } from './units';
export { planResize } from './geometry';
export { fitToTargetSize } from './target-size';
export { createEncoder, type Encoder } from './encoder';
export { processImage } from './pipeline';
export { createItems, runBatch, batchProgress, type BatchItem, type ItemStatus } from './batch';
export { zipFiles } from './zip';
export { downloadBlob } from './download';
export { decodeImage, looksLikeImage } from './decode';
export { outputName, formatFromMime } from './naming';
