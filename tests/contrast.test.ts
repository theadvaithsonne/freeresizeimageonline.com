import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/** Reads the color tokens from src/styles/tokens.css and checks WCAG contrast (AA = 4.5:1 for normal text). */
const css = readFileSync(join(__dirname, '..', 'src', 'styles', 'tokens.css'), 'utf8');

function block(selector: string): Record<string, string> {
  const start = css.indexOf(selector);
  const end = css.indexOf('\n}', start);
  const body = css.slice(start, end);
  const vars: Record<string, string> = {};
  for (const m of body.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)) vars[m[1]!] = m[2]!;
  return vars;
}

const light = block(':root {');
const dark = { ...light, ...block(":root[data-theme='dark']") };

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
  ) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

const PAIRS: Array<[string, string, string]> = [
  // [foreground token, background token, what it is]
  ['text', 'bg', 'body text on the page'],
  ['text', 'surface', 'text on cards'],
  ['text-muted', 'bg', 'secondary text on the page'],
  ['text-muted', 'surface', 'secondary text on cards'],
  ['text-muted', 'surface-2', 'secondary text on tinted areas'],
  ['brand', 'bg', 'links and accents on the page'],
  ['brand', 'surface', 'links on cards'],
  ['on-brand', 'brand', 'text on primary buttons'],
  ['success-strong', 'surface', 'green text on cards'],
  ['success-strong', 'bg', 'green text on the page'],
  ['on-success', 'success-strong', 'text on the download-all button'],
  ['text', 'brand-soft', 'text on the selected option'],
  ['text', 'mint', 'badge text'],
  ['text', 'mint-soft', 'badge text'],
  ['text', 'sun', 'badge text'],
  ['danger', 'surface', 'error text on cards'],
  ['text', 'footer-bg', 'footer text'],
];

describe.each([
  ['light', light],
  ['dark', dark],
])('%s theme contrast (WCAG AA, 4.5:1)', (_name, tokens) => {
  for (const [fg, bg, label] of PAIRS) {
    it(`${label} (${fg} on ${bg})`, () => {
      expect(tokens[fg], `missing token ${fg}`).toBeDefined();
      expect(tokens[bg], `missing token ${bg}`).toBeDefined();
      expect(contrast(tokens[fg]!, tokens[bg]!)).toBeGreaterThanOrEqual(4.5);
    });
  }
});
