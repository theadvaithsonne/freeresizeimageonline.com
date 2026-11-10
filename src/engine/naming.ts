import type { OutputFormat } from './types';

const EXT: Record<OutputFormat, string> = { jpeg: 'jpg', png: 'png', webp: 'webp' };
export const MIME: Record<OutputFormat, string> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

/** Map an input MIME type to an output format we can write (JPEG for photos, PNG for the rest). */
export function formatFromMime(mime: string): OutputFormat {
  const m = mime.toLowerCase();
  if (m === 'image/jpeg' || m === 'image/jpg' || m === 'image/pjpeg') return 'jpeg';
  if (m === 'image/webp') return 'webp';
  if (m === 'image/png') return 'png';
  // GIF, BMP, AVIF, etc.: PNG keeps pixels exactly; the user can pick another format.
  return 'png';
}

export function extensionFor(format: OutputFormat): string {
  return EXT[format];
}

/** "My Photo.HEIC" -> "My Photo". Strips path separators and control characters. */
export function baseName(fileName: string): string {
  const withoutPath = fileName.split(/[\\/]/).pop() ?? fileName;
  const dot = withoutPath.lastIndexOf('.');
  const base = dot > 0 ? withoutPath.slice(0, dot) : withoutPath;
  // eslint-disable-next-line no-control-regex
  const clean = base.replace(/[\u0000-\u001f<>:"|?*]/g, '').trim();
  return clean || 'image';
}

export function outputName(fileName: string, format: OutputFormat, suffix = '-resized'): string {
  return `${baseName(fileName)}${suffix}.${EXT[format]}`;
}

/** Make names unique inside one ZIP: a.jpg, a.jpg -> a.jpg, a (2).jpg */
export function dedupeNames(names: string[]): string[] {
  const seen = new Map<string, number>();
  return names.map((name) => {
    const key = name.toLowerCase();
    const count = seen.get(key) ?? 0;
    seen.set(key, count + 1);
    if (count === 0) return name;
    const dot = name.lastIndexOf('.');
    const stem = dot > 0 ? name.slice(0, dot) : name;
    const ext = dot > 0 ? name.slice(dot) : '';
    return `${stem} (${count + 1})${ext}`;
  });
}
