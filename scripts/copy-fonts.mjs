// Copies self-hosted font CSS + woff2 files from node_modules into public/fonts/.
// Fontsource CSS uses `unicode-range`, so browsers download only the slices a page actually needs.
// The output folder is generated (git-ignored); it runs automatically before dev and build.
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const FONTS = [
  'inter',
  'noto-sans-devanagari',
  'noto-sans-arabic',
  'noto-sans-bengali',
  'noto-sans-thai',
];

const out = join(root, 'public', 'fonts');
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

for (const name of FONTS) {
  const src = join(root, 'node_modules', '@fontsource-variable', name);
  if (!existsSync(src)) {
    console.error(`[fonts] missing package @fontsource-variable/${name} - run npm install`);
    process.exit(1);
  }
  const dest = join(out, name);
  mkdirSync(dest, { recursive: true });
  cpSync(join(src, 'index.css'), join(dest, 'index.css'));
  cpSync(join(src, 'files'), join(dest, 'files'), { recursive: true });
}
console.log(`[fonts] copied ${FONTS.length} font families to public/fonts`);
