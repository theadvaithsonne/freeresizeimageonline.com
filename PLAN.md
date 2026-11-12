# FreeResizeImageOnline.com — Build Plan & Task Tracker

> **Status: BUILT AND LIVE** at https://freeresizeimageonline.com (approved 2026-11-10). Remaining work is mostly owner-side (AdSense review, ad units, consent message, Cloudflare dashboard settings, counters decision).
> Claude ticks boxes as work is completed. Update the "Progress log" at the bottom after each step.

Legend: `[ ]` todo · `[~]` in progress · `[x]` done · `[!]` blocked  
Owner tags: **(C)** Claude · **(U)** You (account access / decisions) 

---

## 0. Product summary

A free, unlimited image resizer: **no login, no signup, no upload**. All image processing runs in the visitor's browser. Monetised with Google AdSense (one calm ad box on the right side, like transcribevid.com). Available in **20 languages** at launch. Hosted on **Cloudflare (free tier)**. **Target running cost: $0** (domain only).

### Fixed decisions
| Topic | Decision |
|---|---|
| Languages (20) | en, hi, es, pt-BR, fr, de, id, ar, ru, tr, ja, ko, vi, it, th, pl, nl, bn, ur, zh-CN |
| Hosting | Cloudflare **Worker with static assets** (`wrangler.jsonc`, deployed with `npx wrangler deploy`) + one small separate Worker for live counters (built, not deployed) |
| Audience | International. ~50% weight USA/UK (AdSense revenue), ~50% India (volume) |
| Cost rule | No paid APIs, models or services. Only free/open-source libraries |
| Privacy rule | Images never leave the device. Only anonymous counts are sent to our Worker |
| Ads | One ad box in the right column on desktop/tablet-landscape; one in-content slot below the result on phones. Never over buttons or navigation |
| Honesty rule | Counters show **real** numbers only. Nothing faked or pre-seeded |
| Responsive | Phones (320px) to 4K / ultrawide monitors, tablets, foldables, portrait + landscape |
| "Dynamic" | Presets, languages, ad slots, and text are all data/config-driven, not hard-coded |

---

## 1. Architecture (free-tier only)

```
Browser (visitor)
 ├─ loads static HTML/CSS/JS from Cloudflare (static assets)  (free, unlimited bandwidth)
 ├─ resizes / compresses / converts images locally            (Canvas + Web Workers + WASM codecs)
 └─ WebSocket (anonymous) ──► Cloudflare Worker + Durable Object (SQLite, free plan)
                               • "online now" = open connections
                               • "images resized" = running total, written in batches
```

**Library stack (all free, open-source):** Astro (MIT) · Pica (MIT, Lanczos resize) · jSquash / Squoosh codecs (Apache-2.0, MozJPEG/OxiPNG/WebP) · fflate (MIT, ZIP) · libheif WASM for HEIC (license to be checked, lazy-loaded) · Noto fonts (OFL).

**Live counters — design notes**
- Cloudflare free plan limits Workers / Durable Object requests (100,000/day per the official docs; resets 00:00 UTC). WebSocket messages are billed at a fraction of a request, so one open socket per visitor is much cheaper than polling. Exact limits must be re-checked in Step 7 before building.
- Counter increments are sent **once per batch** (a number), not per image; the Durable Object accumulates in memory and flushes to storage every few seconds.
- If the free quota is ever exhausted, the widgets simply **hide themselves**; the resizer keeps working (it never depends on the Worker).
- Anti-abuse: cap the increment per message, rate-limit per connection. (A vanity counter can't be made 100% tamper-proof; this is accepted.)
- Display thresholds (configurable): counter appears once the real total ≥ 100; "online now" appears once ≥ 3 people are connected, so a brand-new site doesn't look empty. This hides numbers, it never invents them.

---

## 2. Information needed from you (for AdSense approval + deployment)

> Send these when convenient. Items marked ★ are needed before Step 9.

- [x] ★ **Publisher / site owner name:** Advaith Bibhishan Sonne (received 2026-11-10)
- [x] ★ **Governing country/state** for the Terms: India (Bengaluru, Karnataka) (received 2026-11-10)
- [x] ★ **Contact email:** DECIDED — show `theadvaithsonne@gmail.com` directly on the site (Contact, Privacy, Terms). Email Routing not needed.
- [x] **Postal address:** DECIDED — NOT shown on the site unless AdSense policy turns out to require it (to be verified against Google's official policy text in Step 9.4). AdSense takes the address privately inside the AdSense account.
- [x] **Cloudflare account:** already exists (hosts another site). Add this domain to the same account. Note: free-tier Worker/Durable Object quota is per account, so check usage of the existing site before Step 7.
- [ ] ★ **Google account for AdSense** (must belong to someone 18+, and be the person who gets paid). Do you already have an AdSense account / publisher ID (`pub-XXXXXXXXXXXXXXXX`)?
- [ ] **GitHub repository** (you have a GitHub tab open) — done: `origin` is https://github.com/theadvaithsonne/freeresizeimageonline.com (deploys are manual with `npx wrangler deploy`; CI only checks and builds).
- [ ] **BigRock access** — you'll change the domain's nameservers to Cloudflare's (I'll give exact steps). I never need your BigRock password.
- [ ] **Analytics choice** — I recommend *no Google Analytics*; use Cloudflare Web Analytics (cookie-less) + Google Search Console. This keeps the consent banner simpler. Confirm.
- [ ] Anything you want in branding (colors you like, a competitor design you admire). Otherwise I decide.

*What you enter yourself and I never see: AdSense bank/payment details, tax details (e.g. PAN for India if asked), identity verification.*

---

## STEP 1 — Project setup & repository
- [x] 1.1 (C) Initialise Astro project (TypeScript, static output) in this folder
- [x] 1.2 (C) Folder structure: `src/pages`, `src/components`, `src/i18n`, `src/engine`, `src/data`, `worker/`
- [x] 1.3 (C) `.gitignore`, `README.md` (how to run/build/deploy), Vitest + strict TypeScript config. *(Separate lint/formatter skipped for now: `astro check` covers types; can add Prettier later if wanted.)*
- [x] 1.4 (C) Git branching convention (in README) + first commit
- [x] 1.5 (C) Build, tests and type-check verified (`npm run build`, `npm test`, `npm run check` all pass)

**Done when:** blank site builds and runs locally.

## STEP 2 — Branding, design system & responsive foundation
- [x] 2.1 (C) Name/tagline/logo (SVG), favicon set, social share image (`scripts/make-icons.mjs`, output committed in `public/`)
- [x] 2.2 (C) Design tokens: colors, spacing, type scale (fluid typography), radius, shadows (`src/styles/tokens.css`)
- [x] 2.3 (C) Light + dark theme (follows system, manual toggle, remembered, no flash on load)
- [x] 2.4 (C) Responsive layout shell: header, main, right ad column, footer, `AdSlot` component. Verified by screenshots at 320, 390, 768, 1440, 2560 px
- [x] 2.5 (C) Fonts: self-hosted Inter + Noto per script (Devanagari, Arabic, Bengali, Thai, JP, KR, SC), copied from `@fontsource-variable` by `scripts/copy-fonts.mjs`; each page links only its language's sheets and browsers fetch only the glyph slices used. Language metadata in `src/i18n/languages.ts`
- [x] 2.6 (C) Accessibility basics: skip link, visible focus ring, ARIA labels, reduced-motion, 44px touch targets. *(Contrast checked by eye only; run an automated audit in Step 12.)*

**Done when:** empty shell looks right on all screen sizes in both themes.

## STEP 3 — Internationalisation framework (20 languages)
- [x] 3.1 (C) Routing: `src/pages/[...lang]/` generates `/` (English) + `/hi/`, `/es/`, `/pt-br/`, … (20 pages built). Own helpers in `src/i18n/index.ts` (`localizedPath`, `stripLocale`, `alternates`)
- [x] 3.2 (C) JSON translation files per language (`src/i18n/locales/*.json`), typed keys (`MessageKey`, checked by `npm run check`); `npm test` verifies identical keys, no empty values, placeholders intact, key strings not left in English; `npm run build` runs the tests first so a broken locale fails the build
- [x] 3.3 (C) Language switcher: header dropdown, native names, `lang`/`hreflang` on links, closes on Escape/outside click, icon-only on phones
- [x] 3.4 (C) "View this site in <language>?" bar in the visitor's own language, from browser language or saved choice; suggest only, never redirects; "No thanks" is remembered
- [x] 3.5 (C) `hreflang` for all 20 + `x-default`, canonical, localized title/description/og:locale
- [x] 3.6 (C) RTL for Arabic & Urdu: `dir="rtl"`, logical CSS properties, mirrored layout verified by screenshot
- [x] 3.7 (C) Locale-aware formatting in `src/i18n/format.ts` (numbers, %, px/cm/mm/in, KB/MB, compact counts, dates); always Latin digits (inputs are ASCII); unit-tested
- [x] 3.8 (C) Translation strings cover the shell, tool, content pages, legal pages and guides in all 20 languages (validated by `scripts/check-locale.mjs` and `tests/i18n.test.ts`)

**Done when:** switching language changes all UI text and the URL; Arabic/Urdu mirror correctly.

## STEP 4 — Core image engine (runs in browser)
- [x] 4.1 (C) Decode any browser-readable image (JPG, PNG, WebP, GIF first frame, BMP, AVIF where supported) with EXIF orientation applied (`src/engine/decode.ts`). *File picker, drag-drop and paste UI are built in Step 5.*
- [x] 4.2 (C) High-quality resize with Pica (tiled, multi-threaded, MKS2013 filter) loaded lazily; Fit / Crop / Stretch modes. Encoding runs in our own Web Worker.
- [x] 4.3 (C) Units px / % / cm / mm / in with DPI, aspect-ratio helper (`units.ts`, `geometry.ts`)
- [x] 4.4 (C) JPG / PNG / WebP output via MozJPEG, OxiPNG, libwebp (jSquash WASM) in a worker, automatic fallback to the browser's canvas encoders; transparent images get a white (configurable) background when saved as JPG
- [x] 4.5 (C) **Target file size**: interpolating quality search, then scale estimate if needed; clear `reachedTarget` result. Browser-tested: 50 KB target -> 50,587 B in 1.7 s; 20 KB target from a 12 MP photo -> 19,152 B in 3.0 s
- [x] 4.6 (C) Sequential batch queue (one bad file never stops the rest), progress, cancel; streaming ZIP via fflate (`batch.ts`, `zip.ts`). *Progress bar UI is in Step 5.*
- [x] 4.7 (C) Large-image safety: size limits (16384 px side, 64 MP desktop, 16.7 MP iPhone/iPad Safari, 24 MP low-memory Android), canvases released after use, input cap 200 MP. *Real iPhone test is in Step 12.*
- [x] 4.8 (C) EXIF orientation applied; re-encoding removes all metadata (EXIF/GPS/camera), which is stated as a privacy feature. No "keep metadata" option.
- [ ] 4.9 (C) HEIC/HEIF input — **deferred to v1.1** (browser can't decode it natively; needs a libheif WASM whose licence must be checked first)
- [x] 4.10 (C) 86 unit tests (units, geometry, target-size search, naming, alpha, batch, zip) + a real-browser integration run in headless Chrome (WASM encoders, crop, transparency, corrupt file, oversize request, ZIP) — all passed. Tip: run `npm test` from PowerShell; under Git Bash Vitest fails to start.

**Done when:** engine passes tests and handles 50-image batches and 30MP photos without freezing.

## STEP 5 — Tool UI & presets
- [x] 5.1 (C) Main tool page: big drop zone, options panel, result list with before/after and per-file download - **Done:** Drop zone, options panel, per-file rows with thumbnail, status and before/after size, download; ZIP for batches (src/components/tool/). Tested with real files in Chrome.
- [x] 5.2 (C) Presets as **data files** (easy to extend): social (Instagram, YouTube, Facebook, X, WhatsApp, Pinterest…), documents (US 2×2 in, UK 35×45 mm, India, Schengen, DS-160…), India forms (20/50/100 KB, signature), marketplaces (Amazon, Etsy, Shopify…) - **Done:** Presets are data in src/data/presets.ts (12 social, 9 photo ID/visa, 6 file-size limits, 3 online stores, 5 web). Etsy and India passport sizes left out because I could not verify them.
- [x] 5.3 (C) "Free · Unlimited · No login" badges (like transcribevid.com), privacy note: "Your images never leave your device" - **Done:** Badges and the privacy note appear on every page.
- [x] 5.4 (C) Friendly empty/error/loading states, undo/reset - **Done:** Error message per failure code, notice for unusable files, cancel, remove, clear all.
- [x] 5.5 (C) Mobile UX: thumb-friendly controls, sticky download bar, no horizontal scroll - **Done:** Sticky action bar on phones, 44px touch targets, no horizontal overflow at 375px (checked).

**Done when:** a first-time user can resize an image in under 10 seconds on a phone and a desktop.

## STEP 6 — Ad layout system (right-side box)
- [x] 6.1 (C) Right-column ad box: sticky, fixed reserved height (no layout shift), clearly labelled "Advertisement", shown on ≥1024px - **Done:** Sticky right box from 1024px with reserved height.
- [x] 6.2 (C) Phone/tablet-portrait: single in-content slot placed in the content area *below* the result, **separated from Download/Reset buttons by real content and spacing** (Google warns about ads near download/navigation buttons causing accidental clicks). Never inside modals, loading or empty screens. - **Done:** One inline slot below the content on phones/tablets; none on legal pages and none inside the tool.
- [x] 6.3 (C) Placeholder state before AdSense approval: friendly note "Ads keep FreeResizeImageOnline free" (no click-begging, no incentives to click) - **Done:** Friendly placeholder until ad units exist.
- [x] 6.4 (C) Ad component driven by config (slot IDs, on/off per page) — real AdSense code switched on in Step 14 - **Done:** ADSENSE config in src/config/site.ts; ad code renders only when slot ids are set.
- [x] 6.5 (C) Lazy-load ads so they never slow the tool - **Done:** Only the visible box is filled; no auto-refresh. The AdSense snippet sits in the page head, which Google needs for ownership verification.

**Done when:** layout is stable (CLS ≈ 0) with and without ads, on all breakpoints.

## STEP 7 — Live counters (images resized + online now)
- [x] 7.1 (C) Re-check Cloudflare free-tier limits (Workers, Durable Objects, WebSocket billing) from official docs - **Done:** Official docs: free plan = 100,000 requests/day and SQLite-backed Durable Objects only; D1 write limits were unclear so D1 is not used. The quota is per account (shared with other Workers).
- [x] 7.2 (C) Worker + Durable Object (SQLite): WebSocket presence, running total, batched flush - **Done:** worker/src/index.ts: Durable Object with WebSocket hibernation.
- [x] 7.3 (C) Client widget: animated counters in header (like transcribevid.com), formatted per locale - **Done:** Counters.astro + counters-client.ts; in the header on wide screens, in the footer on phones.
- [x] 7.4 (C) Send increment once per completed batch; cap + rate-limit - **Done:** One message per batch; server caps 100 per message, 1 per second and 2000 per hour per connection.
- [x] 7.5 (C) Reconnect with back-off; pause when tab hidden; hide widgets on failure/quota - **Done:** Back-off reconnect, pauses when the tab is hidden, pills hide on failure.
- [x] 7.6 (C) Thresholds + config (hide until real counts are meaningful) - **Done:** Thresholds in the COUNTERS config; real numbers only.
- [x] 7.7 (C) Local testing with `wrangler` (no deploy yet) - **Done:** Tested locally with wrangler dev: presence, total, rate limit, junk input, ping, stats endpoint. The widget stays hidden until the Worker is deployed and COUNTERS.endpoint is set (docs/DEPLOY.md).

**Done when:** two browser tabs show "2 online" and the counter rises after a resize; killing the Worker doesn't break the tool.

## STEP 8 — Content pages (English first)
- [x] 8.1 (C) Home/tool page with how-it-works, features, FAQ (structured data) - **Done:** Home page: how it works, why, FAQ, plus FAQPage / HowTo / SoftwareApplication data.
- [x] 8.2 (C) Intent pages (unique, useful content each — no duplicates): resize to KB (20/50/100/200), resize in cm / mm / inch, passport & visa photo, social-media sizes, convert JPG/PNG/WebP, compress image - **Done:** Six landing pages: resize to KB, cm/mm/in, passport photo size (data-driven table), social media sizes, convert, compress.
- [x] 8.3 (C) Guides: "photo size for X form", "how to reduce image size without losing quality" (original, helpful) - **Done:** Folded into the landing pages (tips + FAQ) instead of separate thin articles.
- [x] 8.4 (C) Internal linking, breadcrumbs, related tools - **Done:** Related-tools links and BreadcrumbList data.
- [x] 8.5 (C) Localised variants of examples per audience (US/UK passport, India forms) - **Done:** Examples for US/UK/EU passport sizes and India form limits (KB presets, PAN photo).

**Done when:** ~12 high-quality pages exist in English.

## STEP 9 — Legal, trust & AdSense compliance
- [x] 9.1 (C) About, Contact, Privacy Policy, Terms of Service, Cookie policy (needs info from Section 2) - **Done:** About, Contact, Privacy, Terms (no separate cookie page: covered in Privacy).
- [x] 9.2 (C) Privacy Policy covers: no image uploads, anonymous counter connection, Cloudflare analytics, Google AdSense cookies/ad personalisation, user choices - **Done:** Privacy covers local processing, the anonymous counter, Cloudflare analytics, Google ad cookies and opt-out, EEA/UK/CH consent, and rights.
- [x] 9.3 (C) "Privacy and cookie settings" link in footer (as on transcribevid.com) wired to Google's consent message (EEA/UK/CH) — set up inside AdSense → Privacy & messaging - **Done:** Footer link re-opens Google consent message (works once AdSense messaging is configured).
- [~] 9.4 (C) (First pass done 2026-11-10, see "AdSense policy findings" below; repeat before submitting.) Review against Google Publisher Policies and AdSense program policies: original content, no misleading UI, ads not placed in navigation, no incentivised clicks, no prohibited content
- [x] 9.5 (C) `ads.txt` with your publisher ID (after you send it); `robots.txt`; sitemap link - **Done:** ads.txt generated from the publisher id (ca-pub-5152758693265080), robots.txt, and a sitemap.xml with hreflang.
- [ ] 9.6 (C) Pre-submission checklist run & documented

**Done when:** every item in the checklist passes.

## STEP 10 — Translations (19 languages + English)
- [x] 10.1 (C) Glossary: handled through consistent instructions per language (formal/informal address, resize/compress terms); each translator kept button names identical between the UI and the how-to text
- [x] 10.2 (C) UI strings (core + tool) for all 20 languages
- [x] 10.3 (C) Home page and six landing pages for all 20 languages: natural wording, local search phrasing for titles/descriptions, same facts and numbers
- [x] 10.4 (C) Privacy and Terms translated faithfully; a note on every translated legal page links to the English version, which applies if they differ
- [x] 10.5 (C) Automated checks: `node scripts/check-locale.mjs` and the Vitest suite verify files, keys, list lengths, placeholders, protected terms (brand, Google AdSense, Cloudflare), and that long texts are not left in English. RTL pages verified by screenshot (Arabic, Urdu layout mirrors).
- [ ] 10.6 (U, optional) Native-speaker proof-read, ideally for Hindi, Spanish, German, French, Portuguese and the legal pages. The translators flagged these points: French users often write Ko/Mo instead of KB/MB; Russian page titles use "КБ"; several languages write Bengaluru as Bangalore; SEO titles are worth a native look.

**Done when:** all 20 languages are complete; checks pass.

> ⚠ Honest caveat: translations are written by Claude without native review. Google doesn't treat AI translation as spam by itself, but low-quality bulk translation can hurt SEO/AdSense review — so quality over volume, and proof-reading of main markets is advised.

## STEP 11 — Technical SEO & performance
- [x] 11.1 (C) `sitemap.xml` with all 221 URLs x language alternates, canonical + hreflang (x-default = English), `robots.txt`
- [x] 11.2 (C) Structured data: SoftwareApplication, FAQPage, HowTo, BreadcrumbList
- [x] 11.3 (C) Lighthouse on the live site (mobile): performance 91-100, accessibility 100, SEO 100, layout shift ~0, LCP 1.0-1.7 s. Best Practices 77 only because Google AdSense sets third-party cookies (the privacy page scores 100). Cache headers in `public/_headers`; WASM codecs and Pica load only when used; fonts split per script.
- [x] 11.4 (C) Open Graph / Twitter cards with a 1200x630 image and per-language `og:locale`
- [x] 11.5 (C) Security headers: nosniff, referrer policy, permissions policy. A strict Content-Security-Policy is deliberately NOT set because AdSense loads from many changing domains and the resizer needs blob: workers.

## STEP 12 — Testing (device + browser matrix)
- [~] 12.1 (C) Browsers: tested in Chrome (desktop emulation of phone/tablet sizes). **Not tested**: real Safari/iPhone, Firefox, Edge, Samsung Internet. The engine falls back to the built-in canvas encoders if WebAssembly workers fail, and the iPhone canvas-size limit is built in, but a real-device check is still needed (12.6).
- [x] 12.2 (C) Screens 320 / 820 / 1280 px across all 20 languages (120 page views) plus 390, 1440, 2560 spot checks: no horizontal overflow after fixes (header, size table and big button were fixed at 320 px); portrait + landscape rules in CSS.
- [x] 12.3 (C) Stress on the live site: 50 photos in 11.5 s with no UI freeze (longest pause 66 ms, 12 MB memory); 30-megapixel 10 MB photo -> 94 KB in 3.8 s and -> 2000 px in 1.6 s; corrupt file and 30,000 px request give clear messages; Download-as JPG/PNG/WebP and ZIP verified byte-for-byte. HEIC not supported (v1.1).
- [x] 12.4 (C) All 20 languages checked for layout overflow at phone and desktop widths; screenshots reviewed for Arabic (RTL), Hindi, Japanese. Long German/Russian/French text fixed where it overflowed.
- [x] 12.5 (C) Accessibility: Lighthouse accessibility 100 on all tested live pages; WCAG AA contrast enforced by 34 automated checks in both themes; skip link, focus rings, labels, reduced motion. Not done: a test with a real screen reader.
- [ ] 12.6 (U) Please open https://freeresizeimageonline.com on your own phone(s) and try a resize + download, ideally on an iPhone too, and tell me if anything looks or works wrong.

## STEP 13 — Deployment
- [x] 13.1 (U/C) Cloudflare account already existed; deployed with Wrangler (already logged in on this computer), so no GitHub repo is needed. GitHub auto-deploy stays optional (docs/DEPLOY.md).
- [x] 13.2 (C) Site deployed as a Cloudflare Worker with static assets (Cloudflare has merged Pages into Workers); config in `wrangler.jsonc`. The counter Worker is ready but **not deployed** (see 7.x note: shared free quota with the other site on this account).
- [x] 13.3 (U) Nameservers at BigRock changed to `nia.ns.cloudflare.com` + `rajeev.ns.cloudflare.com` on 2026-11-10; Cloudflare serves the zone.
- [x] 13.4 (C) Custom domains freeresizeimageonline.com and www attached, HTTPS working. Optional 1-minute dashboard step: redirect www to the root domain (docs/DEPLOY.md).
- [x] 13.5 (C) ~~Cloudflare Email Routing~~ — not needed (public contact email is the Gmail address)
- [~] 13.6 (C/U) Cloudflare Web Analytics beacon is injected automatically. (U) Add the domain in Google Search Console and submit https://freeresizeimageonline.com/sitemap.xml.

## STEP 14 — AdSense application & go-live of ads
- [~] 14.1 (U) AdSense site added; **Verify** is ready to click (the site is live with the code snippet, meta tag and ads.txt), then **Request review**.
- [x] 14.2 (C) AdSense code snippet in `<head>`, `google-adsense-account` meta tag, and `/ads.txt` (publisher ca-pub-5152758693265080) are live.
- [ ] 14.3 (U) Wait for review (can take days to weeks); (C) fix anything flagged. Reminder: Auto ads OFF; create the consent message under Privacy & messaging.
- [ ] 14.4 (C) Switch on ad box via config; verify layout; configure consent message
- [ ] 14.5 (C) Check AdSense policy centre; monitor "Auto ads" off (manual placement only)

## STEP 15 — Post-launch
- [ ] 15.1 Watch Search Console (impressions per language/page) and AdSense (RPM per country)
- [ ] 15.2 Add pages for queries that show demand; improve weak translations
- [ ] 15.3 v1.1 tools: crop, rotate/flip, passport photo sheet, more presets
- [ ] 15.4 Monitor Cloudflare free-tier usage for the counter Worker

---

## AdSense policy findings (verified 2026-11-10 from Google's official pages)

Sources read: AdSense Program policies (updated Aug 4, 2026), Eligibility requirements (answer 9724), Google Publisher Policies, Ad placement policies (answer 1346295), AdSense supported languages (answer 9727), "Required content" for privacy policies.

| Question | Finding |
|---|---|
| **Is a postal address required on the site?** | **No.** None of the official pages above require a postal address or even a contact page. Address is entered privately in the AdSense account. Our site will show owner name + email (also avoids "concealing information about the publisher", which the misrepresentation policy forbids). |
| Privacy policy | **Required.** Must disclose data collection/sharing/use, that third parties (incl. Google) may use cookies/web beacons to serve ads based on prior visits, and how users can opt out of personalised ads (Google Ads Settings). |
| Eligibility | 18+, you own the site and can access its HTML, content is your own and high quality, follows policies. |
| Languages | All 20 of our languages are on Google's supported list (Arabic, Bengali, Hindi, Urdu, Thai, etc. included). Ads on pages primarily in an *unsupported* language are not allowed — not a problem for us. |
| Ad labels | Only "Advertisement" or "Sponsored Links". No misleading headings. |
| Placement | No ads near buttons that cause accidental clicks (download/navigation buttons); ads must not look like menus/nav/download links; no images aligned with ads; no flashy arrows/animations; no auto-refresh; no pop-ups/pop-unders; no ads on robots-blocked or password-protected pages. |
| Inventory value | No ads on screens without publisher content or with low-value content; no replicated content; not more ads than content. → Keep real content on every page; no ads in modals/empty states. |
| Click policies | Never click own ads; never ask/incentivise users to click ("Ads keep us free" note is OK, "please click" is NOT). |
| Other | `ads.txt` (authorised inventory), Better Ads Standards, EU user-consent policy, Google web-search spam policies. |
| Not found in official text | Sticky/anchored ads and ads-per-page limits are not covered on the pages I read. Our sticky right-side box sits beside content (not over it), which should be fine; we'll re-check Google's Better Ads / ad-format pages in Step 9 before launch. |
| Reality check | Google does not publish a formal "must have About/Contact" rule, but approval reviewers look for a legitimate, finished site; About/Contact/Privacy/Terms are cheap trust signals and we'll include them. |

---

## Risks
| Risk | Mitigation |
|---|---|
| AdSense rejects "low-value / thin / auto-translated" content | Original, useful content per page and language; modest page count; strong legal pages |
| Cloudflare free quota exhausted by counter traffic | WebSocket design, batching, widgets auto-hide; resizer never depends on Worker |
| Counter numbers look low at launch | Thresholds hide them until meaningful; never faked |
| Single ad box = lower revenue than multiple ads | Chosen for UX; more slots can be added later by config |
| Big images crash mobile Safari | Tiling, size limits with clear messages |
| Translations without native review | Glossaries, plain language, automated checks, optional proof-reading |
| HEIC library licence (LGPL) | Check before bundling; otherwise defer to v1.1 |

---

## Progress log
| Date | Step | Note |
|---|---|---|
| 2026-11-10 | Planning | Plan v2 written, awaiting approval |
| 2026-11-10 | Planning | AdSense policies verified (no postal address required); plan v3 approved by owner |
| 2026-11-10 | Step 1 | Done. Astro 7 + TypeScript + Vitest set up; build, tests, type-check pass |
| 2026-11-10 | Step 4 | Done except HEIC (deferred to v1.1). Engine in `src/engine/`, public API in `src/engine/index.ts`. |
| 2026-11-10 | Step 3 | Done (3.8 stays open on purpose: more strings arrive with later steps). 20 language pages, switcher, suggestion bar, RTL, formatting, tests (51 passing). |
| 2026-11-10 | Step 13.3 | Nameservers switched at BigRock to Cloudflare; waiting for Cloudflare to mark the domain Active |
| 2026-11-10 | Step 2 | Done. Design system, light/dark, responsive shell, ad slot placeholders, fonts, brand icons. Hard-coded English labels in Header/Footer/AdSlot/Layout get replaced by translation keys in Step 3. |
| 2026-11-10 | Steps 5-11 | Tool UI, ads, counters (built, not deployed), content, legal, 19 translations, SEO. Site deployed to Cloudflare, AdSense snippet + meta tag + ads.txt live. |
| 2026-11-11 | Owner requests | (1) Everything committed, pushed to GitHub (`origin/main`) and deployed. (2) New warm cream/burnt-orange palette taken from the reference screenshot (light + dark), orange logo and icons. (3) Larger text and controls for low-vision readers: root font 18-28px, 52px+ controls, bigger headings, wider content area, tool-link strip. (4) "Download as" JPG / PNG / WebP after resizing, for single files and ZIP. (5) AdSense policy pass: see `docs/ADSENSE-CHECKLIST.md`. |
| 2026-11-11 | Results view + audit | (1) Pressing Resize now opens a separate results view: progress bar, one card per image (thumbnail, before/after size, saved %, per-image download), a sticky toolbar (Change settings, Start over, Cancel, Download as, Download all as ZIP) and a totals line. (2) An independent audit found 50 issues (`docs/AUDIT-2026-11-11.md`); all code-side items are fixed: unit/DPI conversion, decimal KB limits, cancel, validation messages next to the button, bidi-safe numbers, JSON-LD escaping, plain 404, AdSense script only on home pages until ad units exist, language banner moved to the top, bigger touch targets, system fonts for Japanese/Korean/Chinese (14 MB less), favicon.ico, worker hardening, CI. (3) Three written guides (reduce size, JPG vs PNG vs WebP, photo size for online forms) in all 20 languages. |
| 2026-11-11 | Menu, SEO pages, content | (1) Phones and tablets get a menu (burger) button instead of the sideways-scrolling strip; the menu lists every tool page by group, the guides and the legal pages (the theme switch moves into it on very small phones). (2) 8 new landing pages in 20 languages for the most searched tasks: resize to 20, 50, 100 and 200 KB, resize signature, PNG to JPG, JPG to PNG, WebP to JPG (each with its own intro, steps, tips, explanatory section and FAQ). (3) Every tool page got an explanatory section and a one-line summary; the guides index got real text and an FAQ. (4) Home "Popular tasks" cards and a multi-column footer link every page from every page. (5) Structured data (WebSite, WebApplication), IndexNow script, `docs/SEO.md` with the Search Console steps. 461 pages, 236 tests. |
| 2026-11-11 | Design pass, FAQ, ads | (1) Calmer design: smaller headings, more space, steps in a row, explanation and tips side by side, FAQ as a clean list, thumbnails on a neutral background, one-row link strip, a results toolbar with the main action first on phones. (2) Dark mode is now true black. (3) Header tabs Guides and FAQ (menu on phones) and a new FAQ page with every question grouped by tool (20 languages). (4) Ads: a box under the results on phones and tablets; **fixed the ad loader, which never ran** (the script was wrapped in a template string) and now creates the ad element only in a visible box, so hidden boxes cannot swallow the request. Checked with dummy ad units. The owner confirmed Auto ads is OFF in AdSense. 481 pages, 237 tests. |
| 2026-11-11 | Counters on refresh + TranscribeVid look | (1) Counters no longer hide on a refresh: both stats are in the page from the first paint ("…" until the number arrives), the total is read with a fast HTTPS GET of `/stats` (started from the page head, `preconnect`) and "online now" comes from the WebSocket; a stat is dropped only after 3 failed tries, and the socket reconnects without hiding anything. Measured in a real browser: visible at once, filled in about 0.3-0.6 s (was 1.3-2.3 s). (2) The look now follows TranscribeVid: flat (no shadows or blur), its warm cream / burnt-orange / teal palette and text sizes (18-21 px body, 28-40 px title), tabs with a filled open tab and an orange bar, outlined pill buttons, pastel chips on the title row, drop zone and settings card, quiet counters, footer with underlined links; a drop overlay when files are dragged over the window; the words next to the header counters appear from a width measured per language, so long translations never squeeze the logo (240 language/width combinations checked). Tracked test builds (`dist-countertest`, `.wrangler-test-state`) removed from git. |
| 2026-11-11 | Home FAQ removed, right ad column on | (1) The home page no longer repeats the FAQ (the FAQ tab and page have it; its FAQPage markup went with it). (2) The AdSense "Right column" unit (slot 3536472557) is set, so the ad column (336 px, label "Advertisement") appears on screens from 1200 px; the "Phone and tablet" unit (slot 1696118130) is set too: boxes under the how-to steps and under the results on screens below 1200 px. |
| 2026-11-12 | Sticky ad column, SEO pages, CI fix | (1) The right-hand ad column stays in view while scrolling, within Google's sticky-ad rules (desktop mouse screens at least 768 px tall, ad at most 300 px wide, stops at the footer). (2) Keyword research from public autocomplete (US + India) and 8 new landing pages in all 20 languages: resize to 10 KB, 30 KB, 500 KB, 1 MB, in pixels, bulk image resizer, JPG to WebP, PNG to WebP; sharper titles and descriptions on the existing pages (641 pages, 640 in the sitemap). (3) GitHub CI had failed on every push since 10 Nov because package-lock.json lacked @emnapi/core and runtime 1.11.1 (pinned exactly by an optional wasm package): fixed with npm overrides to 1.11.3 and a regenerated lock file; npm ci now passes on npm 10 and 11 for Linux. |
| 2026-11-12 | Sticky ad on laptop screens | The sticky ad column did not stick on 125%-scaled laptop screens (about 728 px of page height). Now: the tall 300x600 ad sticks from 720 px of window height (tighter spacing), shorter windows get a 300x250 ad that sticks too, and a tall ad stops sticking if the window is made shorter. Tested at 1536x728, 1920x1000, 1366x650 and 1280x560. |
