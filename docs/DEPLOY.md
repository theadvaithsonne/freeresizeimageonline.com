# Deploying to Cloudflare (free plan)

Two parts: the **website** (Cloudflare Pages) and the optional **live counters** (one Worker).
The domain `freeresizeimageonline.com` is already in your Cloudflare account (nameservers changed at BigRock).

## A. Website on Cloudflare Pages

### Option 1 - direct upload from this computer (no GitHub needed)
```
npm install
npx wrangler login                      # opens the browser once; click "Allow"
npm run build                           # runs tests, copies fonts, writes ads.txt, builds ./dist
npx wrangler pages project create freeresizeimageonline --production-branch main
npx wrangler pages deploy dist --project-name freeresizeimageonline --branch main
```
You get a `https://freeresizeimageonline.pages.dev` address immediately.

### Option 2 - automatic deploys from GitHub
1. Push this repository to GitHub (a private repo is fine).
2. Cloudflare dashboard -> **Workers & Pages** -> **Create** -> **Pages** -> **Connect to Git** -> pick the repo.
3. Build command `npm run build`, output directory `dist`. Environment variable `NODE_VERSION` = `22`.
4. Every push to `main` redeploys.

### Connect your domain (both options)
Cloudflare dashboard -> **Workers & Pages** -> `freeresizeimageonline` -> **Custom domains** -> **Set up a custom domain**:
- add `freeresizeimageonline.com` (Cloudflare creates the DNS record automatically)
- add `www.freeresizeimageonline.com` too, then in **Rules -> Redirect Rules** redirect `www` to the main domain (or tell Claude and it will give the exact rule).

HTTPS certificates are issued automatically (a few minutes).

## B. Live counters Worker (optional, free)
```
npx wrangler login                      # if not done already
npm run worker:deploy                   # deploys worker/ (Durable Object with the SQLite backend = free plan)
```
Wrangler prints the address, e.g. `https://frio-counters.<your-subdomain>.workers.dev`.
Put it into `src/config/site.ts`:
```ts
export const COUNTERS = { endpoint: 'wss://frio-counters.<your-subdomain>.workers.dev/ws', ... }
```
then rebuild and redeploy the site. (Optional: serve it from `counters.freeresizeimageonline.com` by enabling the `routes` block in `worker/wrangler.toml`.)

Free-plan note: Workers/Durable Objects free quotas are **per Cloudflare account**. If another site on the account uses Workers, they share the daily request allowance. When the allowance is used up the counters simply hide; the resizer keeps working.

## C. Google AdSense
1. `src/config/site.ts` already contains the publisher id. The site contains the AdSense snippet, the `google-adsense-account` meta tag and `/ads.txt`.
2. When the site is live: AdSense -> Sites -> freeresizeimageonline.com -> **Verify** (any of the three methods works) -> **Request review**.
3. Keep **Auto ads OFF** in AdSense. After approval, create two ad units (one vertical for the right column, one responsive for phones), paste their slot ids into `ADSENSE.slots` in `src/config/site.ts`, rebuild and redeploy.
4. AdSense -> **Privacy & messaging**: create the EEA/UK/Switzerland consent message (free Google CMP). The footer link "Privacy and cookie settings" re-opens it.

## D. Search Console
Add `https://freeresizeimageonline.com/` as a "Domain" property (DNS verification is easiest because Cloudflare manages DNS), then submit `https://freeresizeimageonline.com/sitemap.xml`.

## E. Cloudflare Web Analytics (cookie-free)
Cloudflare dashboard -> **Analytics & Logs** -> **Web Analytics** -> add the site. Because the site is proxied by Cloudflare, you can enable "Automatic setup"; no code changes are needed.
