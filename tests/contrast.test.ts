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
  ['text', 'surface-2', 'text on tinted areas and ghost buttons'],
  ['text', 'surface-3', 'text on the open tab'],
  ['text-strong', 'bg', 'headings on the page'],
  ['text-strong', 'surface', 'headings on cards'],
  ['text-strong', 'surface-3', 'bold text on the open tab'],
  ['text-muted', 'bg', 'secondary text on the page'],
  ['text-muted', 'surface', 'secondary text on cards'],
  ['text-muted', 'surface-2', 'secondary text on tinted areas'],
  ['text-muted', 'footer-bg', 'secondary text in the footer'],
  ['brand', 'bg', 'accents on the page'],
  ['brand', 'surface', 'accents on cards'],
  ['on-brand', 'brand', 'text on primary buttons'],
  ['on-brand', 'brand-strong', 'text on primary buttons (hover)'],
  ['accent', 'bg', 'links on the page'],
  ['accent', 'surface', 'links on cards'],
  ['accent', 'surface-2', 'links on tinted areas'],
  ['success-strong', 'surface', 'teal text on cards'],
  ['success-strong', 'bg', 'teal text on the page'],
  ['on-success', 'success-strong', 'text on the download-all button'],
  ['text', 'success-soft', 'text on the result summary'],
  ['text-strong', 'success-soft', 'bold text on the result summary'],
  ['text', 'brand-soft', 'text on the selected option'],
  ['brand-strong', 'brand-soft', 'accent text on the selected option'],
  ['tint-ink', 'mint', 'chip text'],
  ['tint-ink', 'mint-soft', 'chip text'],
  ['tint-ink', 'sun', 'chip text'],
  ['tint-ink', 'peach', 'chip text'],
  ['danger', 'surface', 'error text on cards'],
  ['danger', 'danger-soft', 'error text in error boxes'],
  ['text', 'danger-soft', 'text in error boxes'],
  ['text', 'footer-bg', 'footer text'],
];

/** Edges of form controls and other parts that are needed to find or understand a control: WCAG 1.4.11, 3:1. */
const NON_TEXT_PAIRS: Array<[string, string, string]> = [
  ['border-strong', 'surface', 'edge of a field on a card'],
  ['border-strong', 'bg', 'edge of a field on the page'],
  ['live', 'surface', 'the green dot of "online now"'],
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
  for (const [fg, bg, label] of NON_TEXT_PAIRS) {
    it(`${label} (${fg} on ${bg}, 3:1)`, () => {
      expect(contrast(tokens[fg]!, tokens[bg]!)).toBeGreaterThanOrEqual(3);
    });
  }
});
