/**
 * Builds a PDF from JPEG pictures, one picture per page, with no library: a PDF is a short text structure around the
 * JPEG bytes (the JPEG goes in as it is, with the DCTDecode filter). Everything runs in the browser.
 */

export type PdfPageSize = 'a4' | 'letter' | 'fit';
export type PdfOrientation = 'auto' | 'portrait' | 'landscape';

export interface PdfOptions {
  pageSize: PdfPageSize;
  orientation: PdfOrientation;
  /** space around the picture, in PDF points (1 point = 1/72 inch) */
  margin: number;
}

export interface PdfPicture {
  /** a baseline or progressive JPEG with three colour channels (what a canvas writes) */
  jpeg: Uint8Array;
  /** its size in pixels */
  width: number;
  height: number;
}

export interface PagePlan {
  pageWidth: number;
  pageHeight: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

const POINTS = { a4: [595.28, 841.89], letter: [612, 792] } as const;
/** Largest page the PDF format allows in common readers: 200 inches. */
const MAX_PAGE = 14400;
/** "Same as the image": 96 pixels to the inch, the size a browser would show it at. */
const POINTS_PER_PIXEL = 72 / 96;

/** Where one picture goes on its page: scaled to fit inside the margins and centred (never stretched). */
export function planPage(picture: { width: number; height: number }, options: PdfOptions): PagePlan {
  const { width: pw, height: ph } = picture;
  const margin = Math.max(0, options.margin);

  if (options.pageSize === 'fit') {
    let w = pw * POINTS_PER_PIXEL;
    let h = ph * POINTS_PER_PIXEL;
    const scale = Math.min(1, (MAX_PAGE - 2 * margin) / Math.max(w, h));
    w *= scale;
    h *= scale;
    return { pageWidth: w + 2 * margin, pageHeight: h + 2 * margin, x: margin, y: margin, width: w, height: h };
  }

  const [a, b] = POINTS[options.pageSize];
  const landscape = options.orientation === 'landscape' || (options.orientation === 'auto' && pw > ph);
  const pageWidth = landscape ? b : a;
  const pageHeight = landscape ? a : b;
  const boxW = Math.max(1, pageWidth - 2 * margin);
  const boxH = Math.max(1, pageHeight - 2 * margin);
  const scale = Math.min(boxW / pw, boxH / ph);
  const width = pw * scale;
  const height = ph * scale;
  return { pageWidth, pageHeight, x: (pageWidth - width) / 2, y: (pageHeight - height) / 2, width, height };
}

const num = (n: number) => n.toFixed(2).replace(/\.?0+$/, '') || '0';

/** The finished PDF file. Throws when there is no picture. */
export function buildPdf(pictures: PdfPicture[], options: PdfOptions): Uint8Array {
  if (pictures.length === 0) throw new Error('A PDF needs at least one picture');
  const enc = new TextEncoder();
  const parts: Uint8Array[] = [];
  const offsets: number[] = [];
  let length = 0;
  const push = (data: Uint8Array | string) => {
    const bytes = typeof data === 'string' ? enc.encode(data) : data;
    parts.push(bytes);
    length += bytes.length;
  };
  const startObject = (id: number) => {
    offsets[id] = length;
    push(`${id} 0 obj\n`);
  };

  // object numbers: 1 catalog, 2 page tree, then per picture: page, content, image
  const pageId = (i: number) => 3 + i * 3;
  push('%PDF-1.4\n%âãÏÓ\n');
  startObject(1);
  push('<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
  startObject(2);
  push(`<< /Type /Pages /Count ${pictures.length} /Kids [${pictures.map((_, i) => `${pageId(i)} 0 R`).join(' ')}] >>\nendobj\n`);

  pictures.forEach((picture, i) => {
    const plan = planPage(picture, options);
    const page = pageId(i);
    const content = `q ${num(plan.width)} 0 0 ${num(plan.height)} ${num(plan.x)} ${num(plan.y)} cm /Im0 Do Q`;
    startObject(page);
    push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${num(plan.pageWidth)} ${num(plan.pageHeight)}] ` +
        `/Resources << /ProcSet [/PDF /ImageC] /XObject << /Im0 ${page + 2} 0 R >> >> /Contents ${page + 1} 0 R >>\nendobj\n`,
    );
    startObject(page + 1);
    push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream\nendobj\n`);
    startObject(page + 2);
    push(
      `<< /Type /XObject /Subtype /Image /Width ${picture.width} /Height ${picture.height} /ColorSpace /DeviceRGB ` +
        `/BitsPerComponent 8 /Filter /DCTDecode /Length ${picture.jpeg.length} >>\nstream\n`,
    );
    push(picture.jpeg);
    push('\nendstream\nendobj\n');
  });

  const objectCount = 2 + pictures.length * 3;
  const xrefAt = length;
  let xref = `xref\n0 ${objectCount + 1}\n0000000000 65535 f \n`;
  for (let id = 1; id <= objectCount; id++) xref += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`;
  push(xref);
  push(`trailer\n<< /Size ${objectCount + 1} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF\n`);

  const out = new Uint8Array(length);
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}
