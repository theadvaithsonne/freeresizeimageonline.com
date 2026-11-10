import { EngineError, type EngineErrorCode, type ProcessResult, type ResizeOptions } from './types';

export type ItemStatus = 'queued' | 'processing' | 'done' | 'error' | 'cancelled';

export interface BatchItem<F = File> {
  id: number;
  file: F;
  status: ItemStatus;
  result?: ProcessResult;
  error?: EngineErrorCode;
  message?: string;
}

export interface BatchHooks<F> {
  /** Called every time an item changes (status, result or error). */
  onUpdate?: (item: BatchItem<F>, all: readonly BatchItem<F>[]) => void;
  signal?: AbortSignal;
}

export type ProcessFn<F> = (file: F, options: ResizeOptions, signal?: AbortSignal) => Promise<ProcessResult>;

export function createItems<F>(files: readonly F[], startId = 1): BatchItem<F>[] {
  return files.map((file, i) => ({ id: startId + i, file, status: 'queued' as const }));
}

/**
 * Process items one at a time (keeps memory low on phones). One bad file never stops the batch.
 * Cancelling marks everything not yet finished as 'cancelled'.
 */
export async function runBatch<F>(
  items: BatchItem<F>[],
  options: ResizeOptions,
  process: ProcessFn<F>,
  { onUpdate, signal }: BatchHooks<F> = {},
): Promise<BatchItem<F>[]> {
  const notify = (item: BatchItem<F>) => onUpdate?.(item, items);

  for (const item of items) {
    if (item.status !== 'queued') continue;

    if (signal?.aborted) {
      item.status = 'cancelled';
      notify(item);
      continue;
    }

    item.status = 'processing';
    notify(item);
    try {
      item.result = await process(item.file, options, signal);
      item.status = 'done';
    } catch (err) {
      if (err instanceof EngineError && err.code === 'cancelled') {
        item.status = 'cancelled';
      } else {
        item.status = 'error';
        item.error = err instanceof EngineError ? err.code : 'encode-failed';
        item.message = err instanceof Error ? err.message : String(err);
      }
    }
    notify(item);
  }
  return items;
}

export function batchProgress<F>(items: readonly BatchItem<F>[]) {
  const total = items.length;
  const finished = items.filter((i) => i.status === 'done' || i.status === 'error' || i.status === 'cancelled').length;
  return {
    total,
    finished,
    done: items.filter((i) => i.status === 'done').length,
    failed: items.filter((i) => i.status === 'error').length,
    fraction: total === 0 ? 0 : finished / total,
  };
}
