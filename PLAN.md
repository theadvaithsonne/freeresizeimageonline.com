# FreeResizeImageOnline.com — Build Plan & Task Tracker

> **Status: AWAITING APPROVAL.** No code is written until the owner approves this plan.
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
| Hosting | Cloudflare Pages (static site) + one small Cloudflare Worker for live counters |
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
 ├─ loads static HTML/CSS/JS from Cloudflare Pages CDN        (free, unlimited bandwidth)
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
- [ ] **GitHub repository** (you have a GitHub tab open) — Cloudflare Pages deploys from it. Create an empty repo and tell me the URL, or I will give steps.
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
- [ ] 3.1 (C) Astro i18n routing: `/` = English, `/hi/`, `/es/`, … per language
- [ ] 3.2 (C) JSON translation files per language + typed key checking (build fails on missing keys)
- [ ] 3.3 (C) Language switcher (header dropdown, native language names, search-friendly)
- [ ] 3.4 (C) Auto-suggest language from browser setting (suggest only, never force-redirect); remember choice
- [ ] 3.5 (C) `hreflang` tags + `x-default`, localized `<title>`/meta, canonical URLs
- [ ] 3.6 (C) RTL support for Arabic & Urdu (`dir="rtl"`, mirrored layout)
- [ ] 3.7 (C) Locale-aware numbers, units & dates

**Done when:** switching language changes all UI text and the URL; Arabic/Urdu mirror correctly.

## STEP 4 — Core image engine (runs in browser)
- [ ] 4.1 (C) Load images (file picker, drag-drop anywhere, paste, multi-select); read dimensions/metadata
- [ ] 4.2 (C) High-quality resize with Pica in a Web Worker; Fit / Crop / Stretch modes
- [ ] 4.3 (C) Units: px, %, cm, mm, inch with DPI; lock aspect ratio
- [ ] 4.4 (C) Output formats JPG / PNG / WebP with quality control (MozJPEG/OxiPNG/WebP WASM)
- [ ] 4.5 (C) **Target file size** mode (e.g. 20 / 50 / 100 / 200 KB): quality binary-search, then gentle downscale if needed; clear message when impossible
- [ ] 4.6 (C) Batch queue, sequential processing, progress, cancel; ZIP download via fflate
- [ ] 4.7 (C) Large-image safety: tiled processing, iOS canvas-size limits, memory cleanup (revoke URLs)
- [ ] 4.8 (C) EXIF orientation fix; option to strip metadata (privacy)
- [ ] 4.9 (C) HEIC/HEIF input (lazy-loaded WASM) — v1 if licence is OK, otherwise v1.1
- [ ] 4.10 (C) Unit tests for unit conversion, KB-targeting, batch logic

**Done when:** engine passes tests and handles 50-image batches and 30MP photos without freezing.

## STEP 5 — Tool UI & presets
- [ ] 5.1 (C) Main tool page: big drop zone, options panel, result list with before/after and per-file download
- [ ] 5.2 (C) Presets as **data files** (easy to extend): social (Instagram, YouTube, Facebook, X, WhatsApp, Pinterest…), documents (US 2×2 in, UK 35×45 mm, India, Schengen, DS-160…), India forms (20/50/100 KB, signature), marketplaces (Amazon, Etsy, Shopify…)
- [ ] 5.3 (C) "Free · Unlimited · No login" badges (like transcribevid.com), privacy note: "Your images never leave your device"
- [ ] 5.4 (C) Friendly empty/error/loading states, undo/reset
- [ ] 5.5 (C) Mobile UX: thumb-friendly controls, sticky download bar, no horizontal scroll

**Done when:** a first-time user can resize an image in under 10 seconds on a phone and a desktop.

## STEP 6 — Ad layout system (right-side box)
- [ ] 6.1 (C) Right-column ad box: sticky, fixed reserved height (no layout shift), clearly labelled "Advertisement", shown on ≥1024px
- [ ] 6.2 (C) Phone/tablet-portrait: single in-content slot placed in the content area *below* the result, **separated from Download/Reset buttons by real content and spacing** (Google warns about ads near download/navigation buttons causing accidental clicks). Never inside modals, loading or empty screens.
- [ ] 6.3 (C) Placeholder state before AdSense approval: friendly note "Ads keep FreeResizeImageOnline free" (no click-begging, no incentives to click)
- [ ] 6.4 (C) Ad component driven by config (slot IDs, on/off per page) — real AdSense code switched on in Step 14
- [ ] 6.5 (C) Lazy-load ads so they never slow the tool

**Done when:** layout is stable (CLS ≈ 0) with and without ads, on all breakpoints.

## STEP 7 — Live counters (images resized + online now)
- [ ] 7.1 (C) Re-check Cloudflare free-tier limits (Workers, Durable Objects, WebSocket billing) from official docs
- [ ] 7.2 (C) Worker + Durable Object (SQLite): WebSocket presence, running total, batched flush
- [ ] 7.3 (C) Client widget: animated counters in header (like transcribevid.com), formatted per locale
- [ ] 7.4 (C) Send increment once per completed batch; cap + rate-limit
- [ ] 7.5 (C) Reconnect with back-off; pause when tab hidden; hide widgets on failure/quota
- [ ] 7.6 (C) Thresholds + config (hide until real counts are meaningful)
- [ ] 7.7 (C) Local testing with `wrangler` (no deploy yet)

**Done when:** two browser tabs show "2 online" and the counter rises after a resize; killing the Worker doesn't break the tool.

## STEP 8 — Content pages (English first)
- [ ] 8.1 (C) Home/tool page with how-it-works, features, FAQ (structured data)
- [ ] 8.2 (C) Intent pages (unique, useful content each — no duplicates): resize to KB (20/50/100/200), resize in cm / mm / inch, passport & visa photo, social-media sizes, convert JPG/PNG/WebP, compress image
- [ ] 8.3 (C) Guides: "photo size for X form", "how to reduce image size without losing quality" (original, helpful)
- [ ] 8.4 (C) Internal linking, breadcrumbs, related tools
- [ ] 8.5 (C) Localised variants of examples per audience (US/UK passport, India forms)

**Done when:** ~12 high-quality pages exist in English.

## STEP 9 — Legal, trust & AdSense compliance
- [ ] 9.1 (C) About, Contact, Privacy Policy, Terms of Service, Cookie policy (needs info from Section 2)
- [ ] 9.2 (C) Privacy Policy covers: no image uploads, anonymous counter connection, Cloudflare analytics, Google AdSense cookies/ad personalisation, user choices
- [ ] 9.3 (C) "Privacy and cookie settings" link in footer (as on transcribevid.com) wired to Google's consent message (EEA/UK/CH) — set up inside AdSense → Privacy & messaging
- [~] 9.4 (C) (First pass done 2026-11-10, see "AdSense policy findings" below; repeat before submitting.) Review against Google Publisher Policies and AdSense program policies: original content, no misleading UI, ads not placed in navigation, no incentivised clicks, no prohibited content
- [ ] 9.5 (C) `ads.txt` with your publisher ID (after you send it); `robots.txt`; sitemap link
- [ ] 9.6 (C) Pre-submission checklist run & documented

**Done when:** every item in the checklist passes.

## STEP 10 — Translations (19 languages + English)
- [ ] 10.1 (C) Glossary of key terms per language (resize, compress, quality, DPI, batch…)
- [ ] 10.2 (C) UI strings for all 20 languages
- [ ] 10.3 (C) Tool/intent page content for all 20 languages — localised, not word-for-word; local examples
- [ ] 10.4 (C) Legal pages translated (legal text: English version is authoritative; stated on page)
- [ ] 10.5 (C) Automated checks: no missing keys, no leftover English, placeholders intact, RTL pages render
- [ ] 10.6 (U, optional) Native-speaker proof-read of top markets (Hindi, Spanish, German, French, Portuguese)

**Done when:** all 20 languages are complete; checks pass.

> ⚠ Honest caveat: translations are written by Claude without native review. Google doesn't treat AI translation as spam by itself, but low-quality bulk translation can hurt SEO/AdSense review — so quality over volume, and proof-reading of main markets is advised.

## STEP 11 — Technical SEO & performance
- [ ] 11.1 (C) Sitemap per language, canonical + hreflang audit
- [ ] 11.2 (C) Structured data: SoftwareApplication, FAQPage, HowTo, BreadcrumbList
- [ ] 11.3 (C) Core Web Vitals: Lighthouse ≥ 90 mobile; lazy-load WASM codecs; font subsetting; cache headers (`_headers`)
- [ ] 11.4 (C) Open Graph / Twitter cards per language
- [ ] 11.5 (C) Security headers (CSP compatible with AdSense, X-Content-Type-Options, etc.)

## STEP 12 — Testing (device + browser matrix)
- [ ] 12.1 (C) Browsers: Chrome, Edge, Firefox, Safari (macOS + iOS), Samsung Internet
- [ ] 12.2 (C) Screens: 320 / 375 / 414 / 768 / 1024 / 1280 / 1440 / 1920 / 2560 / 3840 px; portrait + landscape
- [ ] 12.3 (C) Stress: 50-image batch, 30MP file, GIF/BMP/WebP/HEIC inputs, corrupted files, low-memory phone
- [ ] 12.4 (C) All 20 languages visual check (long German/Russian text, CJK, Thai, RTL)
- [ ] 12.5 (C) Accessibility check (keyboard only, screen-reader labels)
- [ ] 12.6 (U) Real-device spot check on your phone(s)

## STEP 13 — Deployment
- [ ] 13.1 (U) Create Cloudflare + GitHub accounts/repo; (C) push code
- [ ] 13.2 (C) Cloudflare Pages project (build command, output dir) + Worker deploy for counters
- [ ] 13.3 (U) Change nameservers at BigRock to Cloudflare's (I give exact steps); wait for propagation
- [ ] 13.4 (C) Custom domain + HTTPS, www → apex redirect
- [x] 13.5 (C) ~~Cloudflare Email Routing~~ — not needed (public contact email is the Gmail address)
- [ ] 13.6 (C) Cloudflare Web Analytics; (U) Google Search Console verification + submit sitemaps

## STEP 14 — AdSense application & go-live of ads
- [ ] 14.1 (U) Apply for AdSense with the live site (needs the site to be public, finished and in the languages)
- [ ] 14.2 (C) Add AdSense verification snippet / `ads.txt`
- [ ] 14.3 (U) Wait for review (can take days to weeks); (C) fix anything flagged
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
| 2026-11-10 | Step 2 | Done. Design system, light/dark, responsive shell, ad slot placeholders, fonts, brand icons. Hard-coded English labels in Header/Footer/AdSlot/Layout get replaced by translation keys in Step 3. |
