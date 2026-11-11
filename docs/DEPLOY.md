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

## B. Live counters Worker (free)
The counters are one small Cloudflare Worker with a Durable Object (`worker/`), served on its own address
`counters.freeresizeimageonline.com` (no public workers.dev address). It was deployed on 2026-11-11:
```
npm run worker:deploy     # needs a workers.dev subdomain on the account (a one-time Cloudflare setting)
```
`COUNTERS.endpoint` in `src/config/site.ts` is `wss://counters.freeresizeimageonline.com/ws`; after changing it run
`npm run build && npx wrangler deploy`.

What it does: one anonymous WebSocket per open page; it sends only a number (images resized in a batch) and the Worker keeps
only two numbers (the running total and the open connections). Only our own domains may connect (other origins get 403).
The two stats are in the page from the first paint (a quiet "…" where the number goes), so nothing pops in on a refresh.
The total is read with a plain HTTPS GET of `/stats` (started from the page head, answered from the edge cache, usually well
under a second) and "online now" comes from the WebSocket, which also carries every later change live. A stat is dropped only
after three failed tries in a row (and comes back if its number can be read later). They show from the first real number
(`COUNTERS.minTotalToShow` / `minOnlineToShow` are 1). The numbers are real, never invented, and the resizer never depends on them.
From what window width the header shows the words next to the numbers is measured per language in
`src/config/header-widths.ts` (re-measure after changing the counter texts, tab names or language names).
A test build can talk to a stand-in server: `PUBLIC_COUNTERS_ENDPOINT=ws://127.0.0.1:8787/ws npx astro build --outDir dist-test`.

**Free allowance:** Workers / Durable Objects allow 100,000 requests per day for the whole account, shared with the other
Workers on it (for example the transcribevid ones). The counter is built to use very little (idle connections cost nothing,
broadcasts are grouped, `/stats` is cached). Watch Workers & Pages > Usage in the dashboard now and then.

## C. Google AdSense
1. `src/config/site.ts` contains the publisher id. Every page that may show ads has the AdSense snippet and the
   `google-adsense-account` meta tag in `<head>`, and `/ads.txt` is published (written during `npm run build`).
2. AdSense -> Sites -> freeresizeimageonline.com -> **Verify** (any of the three methods) -> **Request review**.
3. Keep **Auto ads OFF**: ads are placed manually (clearly labelled boxes that appear only once ad units exist).
4. After approval, create two Display ad units ("rail" and "inline"), paste their slot ids into `ADSENSE.slots` in
   `src/config/site.ts`, then rebuild and redeploy. The ad boxes and the ad column appear only from that moment.
5. AdSense -> **Privacy & messaging**: the EEA/UK/Switzerland and US-states messages are published (2026-11-11).
   The footer link "Privacy and cookie settings" re-opens the EU one for visitors who get it.

## D. Search Console
Add `https://freeresizeimageonline.com/` as a **Domain** property (DNS verification is easiest because Cloudflare
manages DNS), then submit `https://freeresizeimageonline.com/sitemap.xml`.

## E. Analytics
Cloudflare injects its cookie-free Web Analytics beacon automatically for proxied sites; view it under
**Analytics & Logs -> Web Analytics**. The privacy policy already describes it.
