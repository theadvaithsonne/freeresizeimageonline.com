# Keyword database (English markets)

Built on 2026-11-24 from Google's public autocomplete (what people actually type), for the US, India and the UK:
11,069 unique phrases, of which **10,881 are about our topic** (images, sizes, converting, PDF, units).
8,173 are served by an existing page; 2,708 had no dedicated page when the list was made.

Files:

- `english-keywords.tsv` - every phrase with its topic cluster, the page that serves it (or the page it needs), a demand score, the best autocomplete rank and the markets it appeared in (us, in, gb).
- `summary.json` - the clusters with counts and example phrases.

How it was made: 140 seed phrases (resize, compress, convert, PDF, units, passport / social sizes ...), each expanded with a-z, "to / for / in / online / free / without / app" and similar, about 5,000 polite requests per market (3 at a time). No paid tools. The score is a rough ranking: more markets + more appearances + a higher autocomplete rank = more searched. It is not a search volume.

## How the list is used (and what is NOT done)

- The phrases are **not** pasted into pages. Stuffing thousands of phrases into a page is spam to search engines and can fail the AdSense review.
- Instead each cluster is answered by a page that really does the job, in all 20 languages. Phrases of one cluster appear naturally in that page: the title and headings, the steps, the tips, the explanation and the FAQ.
- Pages that only change a number are thin. The exact-size pages (10 KB ... 5 MB) were added only for sizes that show real demand, each with its own tips.

## Built from this list (2026-11-24)

Format converters WebP to PNG, GIF to JPG, BMP to JPG, AVIF to JPG, JFIF to JPG; pixels to inches, pixels to mm, paper sizes in pixels (A4 ...); Instagram, YouTube, Facebook and WhatsApp size pages; resize to 15 KB, 25 KB, 150 KB and 5 MB.

## Still without a page (ranked by score)

| Cluster | Phrases | Examples |
|---|---:|---|
| DPI and resolution (change-dpi) | 252 | reduce image size dpi; 300 dpi image example; change dpi of image |
| crop (crop-image) | 285 | circle crop image app; circle crop image with border; resize image in canva without cropping |
| India exam and ID photos (india-photo-sizes) | 241 | aadhar card photo size; aadhar card photo requirements; indian aadhar card photo size |
| enlarge / upscale (upscale) | 211 | enlarge image ai; photo editor online ai; upscale image ai |
| HEIC (heic-to-jpg) | 169 | heic to jpg converter; heic to png converter; heic to jpg converter free |
| rotate / flip (rotate-image) | 142 | flip image css; rotate image by 90 degree; flip image |
| EXIF / metadata (remove-exif) | 68 | remove exif data; how remove metadata from photos; remove exif data android |
| format convert: svg to png (svg-to-png) | 70 | svg to png converter; svg to png converter free; svg to png converter online |
| format convert: jpg to jpg (jpg-to-jpg) | 72 | jpeg to jpg converter; jpeg to jpg converter free; jpeg to jpg adobe |
| format convert: tiff to jpg (tiff-to-jpg) | 52 | tiff to jpg converter; tiff to jpg converter free; tiff to jpg converter online |
| exact size (no page yet) (mb10) | 26 | reduce photo size 10 mb; reduce picture size 10mb; compress jpg jadi 10 mb |
| exact size (no page yet) (kb250) | 16 | reduce image size 250 kb; compress jpg 250 kb; compress png 250kb |
| exact size (no page yet) (kb40) | 16 | compress photo to 40kb; image compressor less than 40kb; image resizer to 40kb |
| exact size (no page yet) (kb4) | 8 | upscale image ai free 4k; upscale image to 4k; youtube thumbnail size background hd 4k |
| format convert: jpg to bmp (jpg-to-bmp) | 5 | jpg to bmp app; jpg to bmp black and white; convert photo jpg to bmp |
| format convert: jpg to gif (jpg-to-gif) | 5 | jpg to gif transparent background; jpg to gif remove background; jpg to gif telegram bot |
| exact size (no page yet) (kb5) | 5 | reduce photo size 5 kb; compress photo 5kb; compress image 5kb |
| exact size (no page yet) (kb60) | 3 | reduce picture size less than 60 kb; resize picture less than 60 kb; resize photo to 60kb |
| exact size (no page yet) (mb20) | 4 | shopify exceeds maximum image size of 20 mb; compress png 20mb; compress image under 20mb |
| exact size (no page yet) (mb1.5) | 4 | photo resizer 1.5 mb; reduce photo size 1.5 mb; compress png 1.5 mb |
| exact size (no page yet) (kb512) | 3 | compress png 512 kb; resize picture 512kb; reduce image size 512 kb |
| exact size (no page yet) (kb800) | 1 | resize image to 800 kb |

Reading the table:

- **change DPI / resolution**, **crop**, **rotate / flip**, **remove EXIF**, **upscale**: real tools to build (DPI needs the density written into the file; crop and rotate need an editing screen).
- **HEIC**: needs a WebAssembly decoder; its licence has to be checked first.
- **India exam and ID photos** (PAN, Aadhaar, SSC): high demand, but the official sizes must be checked against the official notice before a page claims them.
- **SVG to PNG, TIFF to JPG**: browsers cannot decode these reliably, so no page until a safe way exists.
- Further exact sizes (250 KB, 40 KB, 10 MB ...): only if the demand holds in Search Console.

Refresh this list every few months, and read Search Console (Performance > Queries) to see which of these phrases bring real impressions.
