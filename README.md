# freeresizeimageonline.com

Free, unlimited, private image resizer. No login, no uploads: all processing runs in the visitor's browser.
Static site on Cloudflare, 20 languages, monetised with Google AdSense.

- Live: https://freeresizeimageonline.com
- Task tracker and full plan: [PLAN.md](PLAN.md)
- How to deploy and connect AdSense / Search Console: [docs/DEPLOY.md](docs/DEPLOY.md)

## Requirements
- Node.js 20+ and npm (Cloudflare deploys use `.node-version` = 22)

## Commands
| Command | What it does |
|---|---|
| `npm install` | Install dependencies |
| `npm run dev` | Dev server at http://localhost:4321 |
| `npm run build` | Tests, copy fonts, write `ads.txt`, build `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run check` | Type-check Astro/TypeScript files |
| `npm test` | Run unit tests (Vitest). On Windows run it from PowerShell, not Git Bash |
| `node scripts/check-locale.mjs [code]` | Validate translations against English |
| `npx wrangler deploy` | Upload `dist/` to Cloudflare (after `npm run build`) |
| `npm run worker:dev` / `worker:deploy` | Run / deploy the live-counter Worker |

## Structure
```
src/pages        routes: [...lang]/ has every page for all 20 languages (English at the root)
src/components   UI: tool/ (resizer), content/ (landing + legal pages), header, footer, ads, counters
src/engine       image processing (runs in the browser: Pica resize, WASM encoders in a Web Worker)
src/i18n         language list, helpers, number/unit formatting, locales/<code>/{core,tool,pages,legal}.json
src/data         presets (sizes) and routes
src/config       site.ts: owner, contact, AdSense ids, counter endpoint
worker/          Cloudflare Worker + Durable Object for the live counters
scripts/         font copy, icons, ads.txt, locale validator
tests/           unit tests
public/          static files (icons, robots.txt, _headers; fonts and ads.txt are generated)
```

## Adding or changing text
1. Edit the English file in `src/i18n/locales/en/`.
2. Add the same keys to the other 19 languages (keep `{placeholders}` and list lengths).
3. `node scripts/check-locale.mjs` must print OK for every language; `npm test` repeats the check.

## Rules of the project
- Images never leave the device. No server-side image processing, no paid services or APIs.
- Counters show real numbers only.
- Ads: one clearly labelled box; Auto ads stay OFF in AdSense; never next to action buttons.
- Branch per step (`step-N-short-name`), merge to `main` when the step's "Done when" is met.
