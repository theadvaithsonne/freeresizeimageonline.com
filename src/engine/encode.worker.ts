/// <reference lib="webworker" />
/**
 * Runs the WASM image encoders (MozJPEG, OxiPNG, libwebp via jSquash) off the main thread so the page
 * stays responsive. The decoded pixels are sent once ('set'), then encoded many times ('encode')
 * when searching for a target file size.
 */
import { encode as encodeJpeg } from '@jsquash/jpeg';
import { encode as encodePng } from '@jsquash/png';
import { optimise as optimisePng } from '@jsquash/oxipng';
import { encode as encodeWebp } from '@jsquash/webp';
import { flattenAlpha } from './alpha';
import type { OutputFormat } from './types';

export type WorkerRequest =
  | { id: number; type: 'set'; width: number; height: number; buffer: ArrayBuffer; flatten: string | null }
  | { id: number; type: 'encode'; format: OutputFormat; quality: number; optimize: boolean }
  | { id: number; type: 'clear' };

export type WorkerResponse =
  | { id: number; ok: true; buffer?: ArrayBuffer }
  | { id: number; ok: false; error: string };

let image: ImageData | null = null;

async function encode(format: OutputFormat, quality: number, optimize: boolean): Promise<ArrayBuffer> {
  if (!image) throw new Error('no image loaded');
  const q = Math.round(Math.min(1, Math.max(0.01, quality)) * 100);
  switch (format) {
    case 'jpeg':
      return encodeJpeg(image, { quality: q });
    case 'webp':
      return encodeWebp(image, { quality: q });
    case 'png': {
      const raw = await encodePng(image);
      if (!optimize) return raw;
      // Smaller effort on big images so the tab doesn't stall.
      const level = image.width * image.height > 3_000_000 ? 1 : 2;
      try {
        return await optimisePng(raw, { level });
      } catch {
        return raw;
      }
    }
  }
}

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const msg = event.data;
  try {
    switch (msg.type) {
      case 'set': {
        const pixels = new Uint8ClampedArray(msg.buffer);
        if (msg.flatten) flattenAlpha(pixels, msg.flatten);
        image = new ImageData(pixels, msg.width, msg.height);
        (self as unknown as Worker).postMessage({ id: msg.id, ok: true } satisfies WorkerResponse);
        break;
      }
      case 'encode': {
        const buffer = await encode(msg.format, msg.quality, msg.optimize);
        (self as unknown as Worker).postMessage({ id: msg.id, ok: true, buffer } satisfies WorkerResponse, [buffer]);
        break;
      }
      case 'clear':
        image = null;
        (self as unknown as Worker).postMessage({ id: msg.id, ok: true } satisfies WorkerResponse);
        break;
    }
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    (self as unknown as Worker).postMessage({ id: msg.id, ok: false, error } satisfies WorkerResponse);
  }
};
