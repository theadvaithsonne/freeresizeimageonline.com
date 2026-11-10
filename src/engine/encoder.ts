import { flattenAlpha } from './alpha';
import { MIME } from './naming';
import { EngineError, type OutputFormat } from './types';
import type { WorkerRequest, WorkerResponse } from './encode.worker';

export interface EncodedImage {
  blob: Blob;
  size: number;
}

/** Holds one decoded image and encodes it (repeatedly) to the requested format/quality. */
export interface Encoder {
  /** Load pixels. `flattenOn` replaces transparency with that color (needed for JPEG). */
  setImage(image: ImageData, flattenOn: string | null): Promise<void>;
  /** quality is 0-1 (ignored for PNG). `optimize` runs the slower PNG optimiser. */
  encode(format: OutputFormat, quality: number, optimize: boolean): Promise<EncodedImage>;
  dispose(): void;
  /** Which implementation is currently active (useful for diagnostics/tests). */
  readonly kind: 'wasm' | 'canvas';
}

/** Best encoder: WASM codecs (MozJPEG, OxiPNG, libwebp) in a Web Worker. */
class WorkerEncoder implements Encoder {
  readonly kind = 'wasm' as const;
  private worker: Worker;
  private nextId = 1;
  private pending = new Map<number, { resolve: (r: WorkerResponse) => void; reject: (e: Error) => void }>();

  constructor() {
    this.worker = new Worker(new URL('./encode.worker.ts', import.meta.url), { type: 'module' });
    this.worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
      const p = this.pending.get(e.data.id);
      if (p) {
        this.pending.delete(e.data.id);
        p.resolve(e.data);
      }
    };
    this.worker.onerror = (e) => {
      const err = new Error(e.message || 'encoder worker failed');
      for (const p of this.pending.values()) p.reject(err);
      this.pending.clear();
    };
  }

  private request(msg: WorkerRequest, transfer: Transferable[] = []): Promise<WorkerResponse> {
    return new Promise((resolve, reject) => {
      this.pending.set(msg.id, { resolve, reject });
      this.worker.postMessage(msg, transfer);
    });
  }

  private async call(msg: WorkerRequest, transfer: Transferable[] = []): Promise<WorkerResponse> {
    const res = await this.request(msg, transfer);
    if (!res.ok) throw new Error(res.error);
    return res;
  }

  async setImage(image: ImageData, flattenOn: string | null): Promise<void> {
    // Copy so the caller keeps its ImageData; the copy's buffer is transferred (no second copy).
    const copy = image.data.slice().buffer;
    await this.call(
      { id: this.nextId++, type: 'set', width: image.width, height: image.height, buffer: copy, flatten: flattenOn },
      [copy],
    );
  }

  async encode(format: OutputFormat, quality: number, optimize: boolean): Promise<EncodedImage> {
    const res = await this.call({ id: this.nextId++, type: 'encode', format, quality, optimize });
    const buffer = (res as { buffer?: ArrayBuffer }).buffer;
    if (!buffer) throw new Error('empty encode result');
    return { blob: new Blob([buffer], { type: MIME[format] }), size: buffer.byteLength };
  }

  dispose(): void {
    void this.request({ id: this.nextId++, type: 'clear' }).catch(() => {});
    this.worker.terminate();
    this.pending.clear();
  }
}

/** Fallback: the browser's built-in encoders. Works everywhere but compresses a little less well. */
class CanvasEncoder implements Encoder {
  readonly kind = 'canvas' as const;
  private canvas: HTMLCanvasElement | null = null;

  async setImage(image: ImageData, flattenOn: string | null): Promise<void> {
    const data = image.data.slice();
    if (flattenOn) flattenAlpha(data, flattenOn);
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new EngineError('encode-failed', 'Canvas is not available');
    ctx.putImageData(new ImageData(data, image.width, image.height), 0, 0);
    this.canvas = canvas;
  }

  encode(format: OutputFormat, quality: number): Promise<EncodedImage> {
    const canvas = this.canvas;
    if (!canvas) return Promise.reject(new EngineError('encode-failed', 'No image loaded'));
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob || blob.type !== MIME[format]) {
            reject(new EngineError('encode-failed', `This browser cannot save ${format.toUpperCase()}`));
          } else {
            resolve({ blob, size: blob.size });
          }
        },
        MIME[format],
        quality,
      );
    });
  }

  dispose(): void {
    if (this.canvas) {
      this.canvas.width = 0;
      this.canvas.height = 0;
    }
    this.canvas = null;
  }
}

/**
 * Create the best available encoder. If the worker/WASM path fails at any point
 * (old browser, blocked WASM, strict policy) we silently continue with the canvas encoder.
 */
export function createEncoder(): Encoder {
  let active: Encoder;
  let lastImage: { image: ImageData; flattenOn: string | null } | null = null;
  let usingFallback = false;

  try {
    active = typeof Worker === 'undefined' ? new CanvasEncoder() : new WorkerEncoder();
    usingFallback = typeof Worker === 'undefined';
  } catch {
    active = new CanvasEncoder();
    usingFallback = true;
  }

  async function switchToFallback(): Promise<void> {
    active.dispose();
    active = new CanvasEncoder();
    usingFallback = true;
    if (lastImage) await active.setImage(lastImage.image, lastImage.flattenOn);
  }

  return {
    get kind() {
      return usingFallback ? ('canvas' as const) : ('wasm' as const);
    },
    async setImage(image, flattenOn) {
      lastImage = { image, flattenOn };
      try {
        await active.setImage(image, flattenOn);
      } catch (err) {
        if (usingFallback) throw err;
        await switchToFallback();
      }
    },
    async encode(format, quality, optimize) {
      try {
        return await active.encode(format, quality, optimize);
      } catch (err) {
        if (usingFallback) throw err;
        await switchToFallback();
        return active.encode(format, quality, optimize);
      }
    },
    dispose() {
      active.dispose();
      lastImage = null;
    },
  };
}
