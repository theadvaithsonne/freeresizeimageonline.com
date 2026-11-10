// Tells search engines that support IndexNow (Bing, Yandex, Seznam, Naver, ...) which pages exist or changed.
// Run after every deploy:  node scripts/indexnow.mjs
// It reads the page list from dist/sitemap.xml (so run a build first) and sends only public page URLs.
// Google does not use IndexNow: for Google use Search Console (see docs/SEO.md).
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const host = 'freeresizeimageonline.com';
// The key file lives in public/<key>.txt and contains the key itself; that is how the search engine checks ownership.
const keyFile = readdirSync(join(root, 'public')).find((f) => /^[0-9a-f]{32}\.txt$/.test(f));
if (!keyFile) throw new Error('No IndexNow key file found in public/');
const key = keyFile.replace('.txt', '');

const sitemap = readFileSync(join(root, 'dist', 'sitemap.xml'), 'utf8');
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
if (urls.length === 0) throw new Error('dist/sitemap.xml has no URLs - run a build first');

const response = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host, key, keyLocation: `https://${host}/${keyFile}`, urlList: urls }),
});
console.log(`IndexNow: sent ${urls.length} URLs, answer ${response.status} ${response.statusText}`);
// 200/202 = accepted. 403 = the key file is not reachable yet (deploy first). 422 = a URL is not on this host.
