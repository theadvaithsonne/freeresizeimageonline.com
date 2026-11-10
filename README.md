# freeresizeimageonline.com

Free, unlimited, private image resizer. No login, no uploads: all processing runs in the visitor's browser.
Static site on Cloudflare Pages, 20 languages, monetised with Google AdSense.

The task tracker and full plan live in [PLAN.md](PLAN.md).

## Requirements
- Node.js 20+ and npm

## Commands
| Command | What it does |
|---|---|
| `npm install` | Install dependencies |
| `npm run dev` | Dev server at http://localhost:4321 |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run check` | Type-check Astro/TypeScript files |
| `npm test` | Run unit tests (Vitest) |

## Structure
```
src/pages        routes (one folder per language is added in Step 3)
src/components   UI components
src/i18n         translation files + helpers
src/engine       image processing (runs in the browser, in Web Workers)
src/data         presets and other config-driven data
worker/          Cloudflare Worker for the live counters (Step 7)
tests/           unit tests
public/          static files (favicons, robots.txt, ads.txt)
```

## Deploy (Cloudflare Pages)
Build command: `npm run build` · Output directory: `dist`. Details are added in Step 13.

## Conventions
- Branch off `main` for each step: `step-N-short-name`; merge when the step's "Done when" is met.
- Images never leave the device. Do not add server-side image processing or paid services.
