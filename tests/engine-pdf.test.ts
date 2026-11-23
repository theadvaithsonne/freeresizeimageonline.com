import { describe, expect, it } from 'vitest';
import { buildPdf, planPage, type PdfOptions } from '../src/engine/pdf';

const jpeg = (n: number) => new Uint8Array([0xff, 0xd8, ...Array.from({ length: n }, (_, i) => i % 251), 0xff, 0xd9]);
const base: PdfOptions = { pageSize: 'a4', orientation: 'auto', margin: 0 };
const latin1 = (bytes: Uint8Array) => Array.from(bytes, (b) => String.fromCharCode(b)).join('');

describe('planPage', () => {
  it('fits a portrait picture on a portrait A4 page, centred and never stretched', () => {
    const plan = planPage({ width: 1000, height: 2000 }, { ...base, margin: 36 });
    expect(plan.pageWidth).toBeCloseTo(595.28, 2);
    expect(plan.pageHeight).toBeCloseTo(841.89, 2);
    expect(plan.height / plan.width).toBeCloseTo(2, 5);
    expect(plan.x).toBeGreaterThanOrEqual(36 - 0.001);
    expect(plan.x + plan.width).toBeLessThanOrEqual(595.28 - 36 + 0.001);
    expect(plan.y + plan.height).toBeLessThanOrEqual(841.89 - 36 + 0.001);
    expect(plan.x * 2 + plan.width).toBeCloseTo(plan.pageWidth, 5);
  });

  it('turns the page when the picture is wide (automatic) or when landscape is chosen', () => {
    expect(planPage({ width: 2000, height: 1000 }, base).pageWidth).toBeCloseTo(841.89, 2);
    expect(planPage({ width: 1000, height: 2000 }, { ...base, orientation: 'landscape' }).pageWidth).toBeCloseTo(841.89, 2);
    expect(planPage({ width: 2000, height: 1000 }, { ...base, orientation: 'portrait' }).pageWidth).toBeCloseTo(595.28, 2);
  });

  it('uses US Letter', () => {
    const plan = planPage({ width: 1000, height: 1400 }, { ...base, pageSize: 'letter' });
    expect([plan.pageWidth, plan.pageHeight]).toEqual([612, 792]);
  });

  it('"same as the image" makes the page the size of the picture at 96 pixels per inch, plus the margin', () => {
    const plan = planPage({ width: 960, height: 480 }, { pageSize: 'fit', orientation: 'auto', margin: 10 });
    expect(plan.width).toBeCloseTo(720, 5);
    expect(plan.height).toBeCloseTo(360, 5);
    expect(plan.pageWidth).toBeCloseTo(740, 5);
    expect(plan.x).toBe(10);
  });

  it('keeps a huge picture inside the largest page a PDF reader accepts', () => {
    const plan = planPage({ width: 40000, height: 20000 }, { pageSize: 'fit', orientation: 'auto', margin: 0 });
    expect(plan.pageWidth).toBeLessThanOrEqual(14400 + 0.001);
  });
});

describe('buildPdf', () => {
  const pdf = buildPdf(
    [
      { jpeg: jpeg(500), width: 800, height: 600 },
      { jpeg: jpeg(1200), width: 600, height: 900 },
    ],
    base,
  );
  const text = latin1(pdf);

  it('is a PDF with two pages', () => {
    expect(text.startsWith('%PDF-1.4')).toBe(true);
    expect(text.trimEnd().endsWith('%%EOF')).toBe(true);
    expect(text).toContain('/Count 2');
    expect(text.match(/\/Type \/Page /g)).toHaveLength(2);
    expect(text).toContain('/Filter /DCTDecode');
  });

  it('has a cross-reference table whose offsets really point at the objects', () => {
    const startxref = Number(/startxref\n(\d+)\n%%EOF/.exec(text)![1]);
    expect(text.slice(startxref, startxref + 4)).toBe('xref');
    const entries = [...text.slice(startxref).matchAll(/(\d{10}) 00000 n /g)].map((m) => Number(m[1]));
    expect(entries).toHaveLength(2 + 2 * 3);
    entries.forEach((offset, i) => expect(text.slice(offset, offset + 8)).toBe(`${i + 1} 0 obj\n`));
  });

  it('stores each JPEG unchanged, with the right stream length', () => {
    const first = jpeg(500);
    const at = text.indexOf('stream\n', text.indexOf('/Width 800')) + 'stream\n'.length;
    expect(Array.from(pdf.slice(at, at + first.length))).toEqual(Array.from(first));
    expect(text).toContain(`/Length ${first.length} >>`);
  });

  it('refuses an empty list', () => {
    expect(() => buildPdf([], base)).toThrow();
  });
});
