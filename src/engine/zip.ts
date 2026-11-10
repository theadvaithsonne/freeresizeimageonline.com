import { Zip, ZipPassThrough } from 'fflate';
import { dedupeNames } from './naming';

export interface ZipEntry {
  name: string;
  blob: Blob;
}

/**
 * Bundle files into a ZIP without compressing them again (JPEG/PNG/WebP are already compressed),
 * so even big batches zip quickly. Duplicate names are made unique.
 */
export async function zipFiles(entries: readonly ZipEntry[]): Promise<Blob> {
  const names = dedupeNames(entries.map((e) => e.name));
  const chunks: Uint8Array[] = [];

  return new Promise<Blob>((resolve, reject) => {
    const zip = new Zip((err, chunk, final) => {
      if (err) {
        reject(err);
        return;
      }
      chunks.push(chunk);
      if (final) resolve(new Blob(chunks as BlobPart[], { type: 'application/zip' }));
    });

    (async () => {
      for (let i = 0; i < entries.length; i++) {
        const file = new ZipPassThrough(names[i]!);
        zip.add(file);
        file.push(new Uint8Array(await entries[i]!.blob.arrayBuffer()), true);
      }
      zip.end();
    })().catch(reject);
  });
}
