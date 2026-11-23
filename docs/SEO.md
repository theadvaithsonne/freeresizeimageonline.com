# Getting found in search

A new site does not appear in Google straight away, and ranking takes weeks to months. What the code can do is make the
site easy to find, easy to understand and fast. What only the owner can do is tell the search engines the site exists and
earn links from other sites. Both lists are below.

## What the site already does

| Area | What is in place |
|---|---|
| One page per search intent | Home, resize to KB (and separate pages for 10, 20, 30, 50, 100, 200, 500 KB and 1 MB, pixels, bulk, JPG/PNG to WebP), signature, cm / mm / inches, passport and visa photo size, social media sizes, compress, convert (and separate pages for PNG to JPG, JPG to PNG, WebP to JPG), three guides. 24 pages in 20 languages = 480 pages (plus one FAQ page with every question) |
| Page text | Each page has its own title (60 characters or less), description, one H1, an intro, three steps, tips, an explanatory section, and FAQ. Unique per page, written per language with the words people search with |
| Language signals | `hreflang` for all 20 languages plus `x-default`, canonical URL on every page, correct `lang` and `dir` |
| Structured data | `WebSite`, `SoftwareApplication`, `WebApplication`, `FAQPage`, `BreadcrumbList`, `Article` (guides) |
| Internal links | Every page links to every tool page, guide and the FAQ (menu on phones, header tabs and strip on wide screens, footer, "popular tasks", "more free tools"), so crawlers find everything in one step |
| Speed and quality | Lighthouse mobile: performance 98-100, accessibility 100, SEO 100. Layout does not jump. No analytics or tracking cookies |
| Crawling | `robots.txt` allows everything and points to `sitemap.xml` (1,140 URLs with alternates). The 404 page is `noindex` |
| IndexNow | `scripts/indexnow.mjs` tells Bing, Yandex, Seznam and Naver about all pages after a deploy (the key file is in `public/`) |

## What you need to do (once)

1. **Google Search Console** - https://search.google.com/search-console
   - Add the property **Domain**: `freeresizeimageonline.com`. Google shows a TXT record; add it in Cloudflare
     (DNS > Records > Add record > Type TXT, Name `@`, Content = the text Google shows). Click Verify.
   - Open **Sitemaps** and submit `sitemap.xml`.
   - Open **URL inspection**, paste the home page and a few important pages (`/resize-image-to-50kb/`, `/png-to-jpg/`,
     `/resize-signature/`) and press **Request indexing**. Google allows only a few requests per day.
   - Check **Pages** after a week: "Discovered - currently not indexed" is normal for a brand-new site and improves as
     the site gets links and visitors.
2. **Bing Webmaster Tools** - https://www.bing.com/webmasters : choose **Import from Google Search Console**. Bing also
   feeds DuckDuckGo, Ecosia and Yahoo.
3. After each deploy run `npm run build` and then `node scripts/indexnow.mjs` (sends the page list to Bing and others).
   The first time, the answer may be `403 SiteVerificationNotCompleted`: Bing is still verifying the key file. Wait an
   hour or two and run it again (on 2026-11-11 the full list of 480 pages was accepted by Bing about an hour later).
4. **Cloudflare**: turn on Always Use HTTPS and redirect `www` to the main domain (see `docs/DEPLOY.md`), so there is
   only one version of each page.

## Links from other sites (the biggest factor you control)

Search engines trust a site more when other sites link to it. Honest, free ways:
- Post a short answer with the link on forums and Q&A sites where people ask "how to reduce photo size to 50 KB" or
  "passport photo size" (read each site's rules first, and only add a link where it really helps).
- Submit the site to tool directories such as AlternativeTo, Product Hunt and similar lists of free online tools.
- Share the guides on social media. A guide that answers a real question is easier to share than a tool page.
- Ask friends, schools or exam-preparation groups to link to the page that solves their problem.
Do not buy links, do not use link exchanges and do not use automatic submission tools: they can lead to a penalty.

## Adding another landing page later

1. Add a route in `src/data/routes.ts` (key, path, group, `strip: false`, `parent`).
2. Add the English text in `src/i18n/locales/en/pages.json` (same fields as `kb50`) and a nav label under `nav`.
3. Add a page file in `src/pages/[...lang]/` that renders `ToolPage` with the preset or format.
4. Have the 19 other languages written (one language at a time works well), run `node scripts/check-locale.mjs`, build and deploy.
Keep every page genuinely different. Pages that only change a number are treated as thin by search engines and by AdSense.

## Keyword research and landing pages (2026-11-12)

Method: Google's public autocomplete (what people actually type) for 50 seed phrases, once for the US and once for India, ranked by how
high and how often each phrase appears. No paid tools. Re-run it every few months.

Strongest demand (score = rank-weighted, US + India): "resize image to 20kb" (49), "100kb" (46), "resize image online" (36), "50kb" (34),
"20kb to 50kb" (29), "200kb" (28), "1mb" (28, mostly US), "reduce image size to 100kb" (27), "30kb" (26), "resize image for instagram without
cropping" (26), "resize image in kb" (25), "without losing quality" (23), "resize image pixels" (23), "10kb" (21), "500kb" (20), then
bulk / batch resizer, jpg to webp, png to webp, pan card / ssc / aadhar photo size, 4x6 and 2x2 photo size in pixels.

What was built from it:
- New landing pages for exact sizes that had no page: 10 KB, 30 KB, 500 KB, 1 MB; plus "resize image in pixels", "bulk image resizer", JPG to WebP, PNG to WebP
  (each with its own steps, tips, explanation and FAQ in all 20 languages; they also join the FAQ page, the sitemap, the menu and the footer automatically).
- Titles in the page language now lead with the phrase people type; descriptions use the full 140-160 characters with the keyword variants
  ("resize image to 50KB online free", "reduce image size", "no signup"); the Instagram FAQ now says "without cropping".
- Not built (ideas): "image to PDF" (very high demand but a different tool), PAN / SSC / Aadhaar photo-size pages (needs verified official sizes first).

Honest expectations: a brand-new domain normally shows no impressions for the first days to weeks; Google must crawl and trust it first.
What speeds it up: sitemap submitted in Search Console and Bing, "Request indexing" for the main pages (docs/indexing-urls.txt), a few real
links from other sites (directories, social posts, forums where the tool really helps), and patience.

## Search Console readout and wave 2 (2026-11-23)

Numbers (Search Console, about two weeks after launch): 21 clicks, 3.84K impressions, CTR 0.5 %, average position 45, 98 countries, 367 pages with
impressions, 1 external link (7,765 internal). Clicks come from the thinly contested language markets (Bangladesh 5, Vietnam 4, Japan 3, Thailand 2);
the big markets (Brazil 583 impressions, India 330, Netherlands 316, France 196, Poland 152, Turkey 133) show the site but at positions that get no clicks.
Meaning: indexing works; what is missing is ranking (position 45 is page 5) and authority (almost no links).

What was done:
1. Every language's titles, descriptions and h1 of home + 22 pages were retuned from real autocomplete data for that market (hl/gl per language,
   about 80 requests each; the phrase lists are kept by the person who runs the research, one file per language). Examples of what the data changed:
   Portuguese "reduzir imagem para X kb" instead of "redimensionar"; French "compresser image à X Ko"; Dutch "foto verkleinen"; Polish "zdjęcie",
   converters as "png na jpg"; Turkish "fotoğraf 50 kb yapma" and "vesikalık fotoğraf boyutu"; Japanese "画像を50KB以下にする"; Indonesian "resize foto",
   "pixel"; Urdu and Hindi in mixed Latin + native script because that is how they are typed.
2. New tools and pages, all 20 languages, all in the browser:
   - Image to PDF (+ JPG to PDF, PNG to PDF landing pages): pictures in any order, A4 / US Letter / same-as-image pages, margin and quality choice, up to 100
     pictures. The PDF is written by `src/engine/pdf.ts` (no library). The strongest unserved topic in every language checked.
   - Size converters: cm to pixels, inches to pixels, mm to pixels, pixels to cm (DPI-aware, with a table of common sizes). Typed in every market.
   - Resize to 300 KB and to 2 MB (typed in German, French, Polish, Portuguese and Vietnamese).
3. Not built yet, ranked by how many markets type it: HEIC to JPG (needs a WebAssembly decoder; check the licence first), crop image, rotate image,
   remove photo metadata (EXIF), 4x6 passport print sheet; local size pages (Brazil 3x4 cm and 70 KB, Vietnam 3x4 and 4x6 cm, Turkey 50x60 mm biometric,
   India Aadhaar and Bangladesh job-form 300x300 / 300x80, Pakistan CNIC, Korea ID sizes); Zalo, VK, LINE and TikTok presets.

What moves the numbers from here (honest): position 45 to the top 10 needs links from other sites and time, not more copy. Do these by hand:
sitemap + "Request indexing" in Search Console and Bing, a handful of real directory / community posts (alternative-to lists, Product Hunt-style launch,
forums where people ask "how to reduce photo to 50 kb"), and share the language pages with people in those markets. Re-read Search Console
(Performance > Queries) every two weeks and retune titles of pages that have impressions but no clicks.

## Keyword database and wave 3 (2026-11-24)

`docs/keywords/` holds 10,881 real English search phrases (US, India, UK autocomplete) with their topic cluster, the page that serves them and a demand
score (see its README). The phrases are not pasted into pages (that is spam and can fail the AdSense review); each cluster is answered by a page that does the job.

Built from it, all 20 languages: WebP to PNG, GIF to JPG, BMP to JPG, AVIF to JPG, JFIF to JPG; pixels to inches, pixels to mm, paper sizes in pixels
(A4, A5, Letter at 72 to 600 DPI); Instagram, YouTube, Facebook and WhatsApp size pages (the resizer with that platform's sizes); resize to 15 KB, 25 KB,
150 KB and 5 MB. The PDF result screen also shows a strip of the finished pages. Previews everywhere were made sharper (see PLAN.md).

Next, by demand: change DPI (write the density into the file), crop, rotate / flip, remove EXIF, HEIC to JPG (decoder licence first), upscale, India PAN /
Aadhaar / SSC photo sizes (check the official notices first). SVG to PNG and TIFF to JPG are not possible reliably in a browser.
