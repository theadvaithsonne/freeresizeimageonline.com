import { unzipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { batchProgress, createItems, runBatch, type ProcessFn } from '../src/engine/batch';
import { zipFiles } from '../src/engine/zip';
import { DEFAULT_OPTIONS, EngineError, type ProcessResult } from '../src/engine/types';

const result = (name: string): ProcessResult => ({
  blob: new Blob([name]),
  name,
  width: 10,
  height: 10,
  format: 'jpeg',
  originalBytes: 100,
  outputBytes: 50,
});

describe('runBatch', () => {
  it('processes files in order, one at a time', async () => {
    const order: string[] = [];
    let running = 0;
    let maxRunning = 0;
    const process: ProcessFn<string> = async (file) => {
      running++;
      maxRunning = Math.max(maxRunning, running);
      await new Promise((r) => setTimeout(r, 5));
      order.push(file);
      running--;
      return result(file);
    };
    const items = await runBatch(createItems(['a', 'b', 'c']), DEFAULT_OPTIONS, process);
    expect(order).toEqual(['a', 'b', 'c']);
    expect(maxRunning).toBe(1);
    expect(items.every((i) => i.status === 'done')).toBe(true);
  });

  it('one failing file does not stop the rest', async () => {
    const process: ProcessFn<string> = async (file) => {
      if (file === 'bad') throw new EngineError('decode-failed', 'nope');
      return result(file);
    };
    const items = await runBatch(createItems(['a', 'bad', 'c']), DEFAULT_OPTIONS, process);
    expect(items.map((i) => i.status)).toEqual(['done', 'error', 'done']);
    expect(items[1]!.error).toBe('decode-failed');
    expect(batchProgress(items)).toMatchObject({ total: 3, done: 2, failed: 1, fraction: 1 });
  });

  it('cancelling marks the remaining files as cancelled', async () => {
    const controller = new AbortController();
    const process: ProcessFn<string> = async (file) => {
      if (file === 'b') controller.abort();
      return result(file);
    };
    const items = await runBatch(createItems(['a', 'b', 'c', 'd']), DEFAULT_OPTIONS, process, {
      signal: controller.signal,
    });
    expect(items.map((i) => i.status)).toEqual(['done', 'done', 'cancelled', 'cancelled']);
  });

  it('reports every status change', async () => {
    const seen: string[] = [];
    await runBatch(createItems(['a']), DEFAULT_OPTIONS, async (f) => result(f), {
      onUpdate: (item) => seen.push(item.status),
    });
    expect(seen).toEqual(['processing', 'done']);
  });
});

describe('zipFiles', () => {
  it('creates a valid ZIP with unique names', async () => {
    const zip = await zipFiles([
      { name: 'photo.jpg', blob: new Blob(['one']) },
      { name: 'photo.jpg', blob: new Blob(['two']) },
      { name: 'other.png', blob: new Blob(['three']) },
    ]);
    expect(zip.type).toBe('application/zip');
    const files = unzipSync(new Uint8Array(await zip.arrayBuffer()));
    expect(Object.keys(files).sort()).toEqual(['other.png', 'photo (2).jpg', 'photo.jpg']);
    expect(new TextDecoder().decode(files['photo (2).jpg'])).toBe('two');
  });

  it('handles an empty list', async () => {
    const zip = await zipFiles([]);
    expect(zip.size).toBeGreaterThan(0); // an empty ZIP still has an end record
  });
});
