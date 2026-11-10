# Getting found in search

A new site does not appear in Google straight away, and ranking takes weeks to months. What the code can do is make the
site easy to find, easy to understand and fast. What only the owner can do is tell the search engines the site exists and
earn links from other sites. Both lists are below.

## What the site already does

| Area | What is in place |
|---|---|
| One page per search intent | Home, resize to KB (and separate pages for 20, 50, 100 and 200 KB), signature, cm / mm / inches, passport and visa photo size, social media sizes, compress, convert (and separate pages for PNG to JPG, JPG to PNG, WebP to JPG), three guides. 24 pages in 20 languages = 480 pages (plus one FAQ page with every question) |
| Page text | Each page has its own title (60 characters or less), description, one H1, an intro, three steps, tips, an explanatory section, and FAQ. Unique per page, written per language with the words people search with |
| Language signals | `hreflang` for all 20 languages plus `x-default`, canonical URL on every page, correct `lang` and `dir` |
| Structured data | `WebSite`, `SoftwareApplication`, `WebApplication`, `FAQPage`, `BreadcrumbList`, `Article` (guides) |
| Internal links | Every page links to every tool page, guide and the FAQ (menu on phones, header tabs and strip on wide screens, footer, "popular tasks", "more free tools"), so crawlers find everything in one step |
| Speed and quality | Lighthouse mobile: performance 98-100, accessibility 100, SEO 100. Layout does not jump. No analytics or tracking cookies |
| Crawling | `robots.txt` allows everything and points to `sitemap.xml` (480 URLs with alternates). The 404 page is `noindex` |
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
