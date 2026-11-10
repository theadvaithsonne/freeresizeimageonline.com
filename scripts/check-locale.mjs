// Validates translated locale files against the English source.
// Usage: node scripts/check-locale.mjs <code> [<code> ...]   (or no arguments to check every language)
// Checks: same files, same keys, same array lengths, no empty strings, identical {placeholders},
// brand/protected terms kept, and that the text is actually translated.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'i18n', 'locales');
const FILES = ['core.json', 'tool.json', 'pages.json', 'legal.json'];
const PROTECTED = ['FreeResizeImageOnline', 'Google AdSense', 'Cloudflare', 'WebAssembly', 'JavaScript'];
// Keys whose value may legitimately equal English (brand strings, units, formats, URLs, etc.)
const SAME_OK = /(^|\.)(locationValue)$/;

function flatten(value, prefix = '', out = {}) {
  if (typeof value === 'string') out[prefix] = value;
  else if (Array.isArray(value)) {
    out[prefix + '#length'] = String(value.length);
    value.forEach((v, i) => flatten(v, `${prefix}[${i}]`, out));
  } else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) flatten(v, prefix ? `${prefix}.${k}` : k, out);
  }
  return out;
}
const load = (code, file) => flatten(JSON.parse(readFileSync(join(root, code, file), 'utf8')));
const placeholders = (s) => (s.match(/\{\w+\}/g) ?? []).sort().join(',');

const requested = process.argv.slice(2);
const codes = requested.length ? requested : readdirSync(root, { withFileTypes: true }).filter((d) => d.isDirectory() && d.name !== 'en').map((d) => d.name);

let problems = 0;
for (const code of codes) {
  const issues = [];
  for (const file of FILES) {
    if (!existsSync(join(root, code, file))) {
      issues.push(`${file}: missing file`);
      continue;
    }
    let en, tr;
    try {
      en = load('en', file);
      tr = load(code, file);
    } catch (e) {
      issues.push(`${file}: invalid JSON (${e.message})`);
      continue;
    }
    const enKeys = Object.keys(en);
    const trKeys = Object.keys(tr);
    for (const k of enKeys) if (!(k in tr)) issues.push(`${file}: missing ${k}`);
    for (const k of trKeys) if (!(k in en)) issues.push(`${file}: unexpected ${k}`);
    for (const k of enKeys) {
      if (!(k in tr)) continue;
      if (k.endsWith('#length')) {
        if (tr[k] !== en[k]) issues.push(`${file}: ${k} is ${tr[k]}, expected ${en[k]}`);
        continue;
      }
      const t = tr[k];
      if (t.trim() === '') issues.push(`${file}: empty ${k}`);
      if (placeholders(t) !== placeholders(en[k])) issues.push(`${file}: placeholders differ in ${k} (expected ${placeholders(en[k]) || 'none'})`);
      for (const term of PROTECTED) {
        if (en[k].includes(term) && !t.includes(term)) issues.push(`${file}: ${k} must keep "${term}"`);
      }
      if (/^\s|\s$/.test(t) && !/^\s|\s$/.test(en[k])) issues.push(`${file}: stray whitespace in ${k}`);
    }
    // Spot check that the long texts really are translated, not copied.
    const longKeys = enKeys.filter((k) => !k.endsWith('#length') && en[k].length > 60);
    const copied = longKeys.filter((k) => tr[k] === en[k] && !SAME_OK.test(k));
    if (copied.length > 0) issues.push(`${file}: ${copied.length} long texts are still English, e.g. ${copied[0]}`);
  }
  if (issues.length) {
    problems += issues.length;
    console.log(`\n${code}: ${issues.length} problem(s)`);
    issues.slice(0, 25).forEach((i) => console.log('  - ' + i));
    if (issues.length > 25) console.log(`  ... and ${issues.length - 25} more`);
  } else {
    console.log(`${code}: OK`);
  }
}
process.exit(problems ? 1 : 0);
