// Renders the brand SVGs into the PNG icons/social image. Run manually: `npm run icons`.
// Output is committed so builds don't depend on this script.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const pub = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
const mark = readFileSync(join(pub, 'favicon.svg'));

await sharp(mark, { density: 384 }).resize(32, 32).png().toFile(join(pub, 'favicon-32.png'));
await sharp(mark, { density: 384 }).resize(180, 180).png().toFile(join(pub, 'apple-touch-icon.png'));
await sharp(mark, { density: 384 }).resize(192, 192).png().toFile(join(pub, 'icon-192.png'));
await sharp(mark, { density: 384 }).resize(512, 512).png().toFile(join(pub, 'icon-512.png'));

// 1200x630 social share image
const markB64 = mark.toString('base64');
const og = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#f6f8fc"/><stop offset="1" stop-color="#e3eaff"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#g)"/>
  <image href="data:image/svg+xml;base64,${markB64}" x="90" y="110" width="150" height="150"/>
  <text x="270" y="205" font-family="Arial, Helvetica, sans-serif" font-size="64" fill="#0e1726" font-weight="500">Free<tspan font-weight="800" fill="#2457f5">Resize</tspan>Image</text>
  <text x="90" y="360" font-family="Arial, Helvetica, sans-serif" font-size="68" font-weight="800" fill="#0e1726">Resize images online.</text>
  <text x="90" y="445" font-family="Arial, Helvetica, sans-serif" font-size="44" fill="#55627a">Free. Unlimited. No signup.</text>
  <text x="90" y="510" font-family="Arial, Helvetica, sans-serif" font-size="44" fill="#55627a">Your photos never leave your device.</text>
</svg>`;
await sharp(Buffer.from(og)).png().toFile(join(pub, 'og-image.png'));
writeFileSync(join(pub, '.icons-generated'), new Date().toISOString());
console.log('[icons] generated');
