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

// favicon.ico (browsers and crawlers still request /favicon.ico): PNG images packed in the ICO container.
const icoSizes = [16, 32, 48];
const icoPngs = await Promise.all(
  icoSizes.map((s) => sharp(mark, { density: 384 }).resize(s, s).png().toBuffer()),
);
const icoHeader = Buffer.alloc(6);
icoHeader.writeUInt16LE(1, 2); // type: icon
icoHeader.writeUInt16LE(icoSizes.length, 4);
let icoOffset = 6 + 16 * icoSizes.length;
const icoEntries = icoSizes.map((s, i) => {
  const entry = Buffer.alloc(16);
  entry.writeUInt8(s, 0); // width
  entry.writeUInt8(s, 1); // height
  entry.writeUInt16LE(1, 4); // colour planes
  entry.writeUInt16LE(32, 6); // bits per pixel
  entry.writeUInt32LE(icoPngs[i].length, 8);
  entry.writeUInt32LE(icoOffset, 12);
  icoOffset += icoPngs[i].length;
  return entry;
});
writeFileSync(join(pub, 'favicon.ico'), Buffer.concat([icoHeader, ...icoEntries, ...icoPngs]));

// 1200x630 social share image
const markB64 = mark.toString('base64');
const og = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#fff4e8"/><stop offset="1" stop-color="#ffe0c4"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#g)"/>
  <image href="data:image/svg+xml;base64,${markB64}" x="90" y="110" width="150" height="150"/>
  <text x="270" y="205" font-family="Arial, Helvetica, sans-serif" font-size="64" fill="#2b1005" font-weight="500">Free<tspan font-weight="800" fill="#c2410c">Resize</tspan>Image</text>
  <text x="90" y="360" font-family="Arial, Helvetica, sans-serif" font-size="68" font-weight="800" fill="#2b1005">Resize images online.</text>
  <text x="90" y="445" font-family="Arial, Helvetica, sans-serif" font-size="44" fill="#6e4a35">Free. Unlimited. No signup.</text>
  <text x="90" y="510" font-family="Arial, Helvetica, sans-serif" font-size="44" fill="#6e4a35">Your photos never leave your device.</text>
</svg>`;
await sharp(Buffer.from(og)).png().toFile(join(pub, 'og-image.png'));
writeFileSync(join(pub, '.icons-generated'), new Date().toISOString());
console.log('[icons] generated');
