// Writes public/ads.txt from the AdSense publisher id in src/config/site.ts (ADSENSE.client).
// If no id is set yet, no file is written (an empty/invalid ads.txt would only cause warnings).
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = readFileSync(join(root, 'src', 'config', 'site.ts'), 'utf8');
const match = source.match(/client:\s*'ca-pub-(\d{10,20})'/);
const target = join(root, 'public', 'ads.txt');

if (match) {
  // f08c47fec0942fa0 is Google's fixed certification authority id for AdSense.
  writeFileSync(target, `google.com, pub-${match[1]}, DIRECT, f08c47fec0942fa0\n`);
  console.log('[ads.txt] written for pub-' + match[1]);
} else {
  if (existsSync(target)) rmSync(target);
  console.log('[ads.txt] skipped: no AdSense publisher id configured yet');
}
