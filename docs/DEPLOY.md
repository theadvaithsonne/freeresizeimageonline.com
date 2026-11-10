# Deploying to Cloudflare (free plan)

Two parts: the **website** and the optional **live counters** (one small Worker).
The domain `freeresizeimageonline.com` is in your Cloudflare account (nameservers changed at BigRock).

## A. The website (already live)

Cloudflare has merged "Pages" into "Workers": a static site is now a Worker that serves a folder of files
("static assets"). It is free, with unlimited requests for static files. The settings are in `wrangler.jsonc`.

```
npm install                 # once
npx wrangler login          # once per computer (opens the browser; click Allow)
npm run build               # runs the tests, copies fonts, writes ads.txt, builds ./dist
npx wrangler deploy         # uploads ./dist and keeps freeresizeimageonline.com + www attached
```
Every deploy is a new "version"; rolling back is possible from the Cloudflare dashboard
(Workers & Pages -> freeresizeimageonline -> Deployments).

Optional: automatic deploys from GitHub. Push the repo, then in the dashboard open the Worker ->
Settings -> Builds -> connect the repository; build command `npm run build`, deploy command `npx wrangler deploy`.

Headers and caching are in `public/_headers`. Unknown URLs show `src/pages/404.astro`.

### www redirect (recommended, 1 minute, in the dashboard)
Both `freeresizeimageonline.com` and `www.freeresizeimageonline.com` serve the site and every page declares
`https://freeresizeimageonline.com/...` as its canonical address, so search engines do the right thing.
To also redirect visitors: dashboard -> the domain -> **Rules** -> **Redirect Rules** -> template
"Redirect from WWW to root".

## B. Live counters Worker (optional, free) - NOT deployed yet
```
npm run worker:deploy
```
Wrangler prints an address like `https://frio-counters.<your-subdomain>.workers.dev`. Put it into
`src/config/site.ts`:
```ts
export const COUNTERS = { endpoint: 'wss://frio-counters.<your-subdomain>.workers.dev/ws', ... }
```
then `npm run build && npx wrangler deploy` again.

**Check first:** Workers / Durable Objects free allowances (100,000 requests/day) are shared by every Worker in the
same Cloudflare account. If another site on this account (for example one with its own "online now" counter) already
uses a good part of that allowance, adding this Worker could use it up and affect that site. When the allowance is
used up the counters here simply hide; the resizer keeps working.

## C. Google AdSense
1. `src/config/site.ts` contains the publisher id. Every page that may show ads has the AdSense snippet and the
   `google-adsense-account` meta tag in `<head>`, and `/ads.txt` is published (written during `npm run build`).
2. AdSense -> Sites -> freeresizeimageonline.com -> **Verify** (any of the three methods) -> **Request review**.
3. Keep **Auto ads OFF**: ads are placed manually (one clearly labelled box).
4. After approval, create two ad units (one vertical for the right column, one responsive for phones), paste their
   slot ids into `ADSENSE.slots` in `src/config/site.ts`, then rebuild and redeploy.
5. AdSense -> **Privacy & messaging**: create the EEA/UK/Switzerland consent message (free Google CMP).
   The footer link "Privacy and cookie settings" re-opens it.

## D. Search Console
Add `https://freeresizeimageonline.com/` as a **Domain** property (DNS verification is easiest because Cloudflare
manages DNS), then submit `https://freeresizeimageonline.com/sitemap.xml`.

## E. Analytics
Cloudflare injects its cookie-free Web Analytics beacon automatically for proxied sites; view it under
**Analytics & Logs -> Web Analytics**. The privacy policy already describes it.
