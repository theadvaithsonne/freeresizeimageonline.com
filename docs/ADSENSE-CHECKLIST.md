# Google AdSense policy checklist

Sources: Google's official pages read on 2026-11-10 - AdSense Program policies (updated Aug 4, 2026), Eligibility
requirements, Google Publisher Policies, Ad placement policies, Supported languages, and the privacy-policy
"Required content" article. Policies change; re-read them before every big change and when AdSense sends a notice.

Legend: **Done** = implemented and live. **You** = only the account owner can do it in AdSense.

## 1. Eligibility and account
| Requirement | Status |
|---|---|
| Publisher is 18+, owns the site, can edit its HTML | **You** confirm. Site is yours; the code snippet, `google-adsense-account` meta tag and `ads.txt` are live for verification |
| Own, high-quality content | Done: original how-to text, tips, FAQ and size tables on 7 pages, in 20 languages |
| Site language supported | Done: all 20 languages are on Google's supported-language list |
| Working, finished site | Done: live over HTTPS, 221 pages, no placeholder text |

## 2. Required pages and disclosures
| Requirement | Status |
|---|---|
| Privacy policy that discloses data use, that Google and third parties use cookies for ads based on earlier visits, and how to opt out of personalised ads | Done: `/privacy/` (all languages) incl. links to Google Ads Settings, how Google uses data, aboutads.info |
| Privacy policy reachable from every page | Done: footer link on every page |
| Honest publisher identity (no concealed information) | Done: owner name and email on About, Contact, Privacy, Terms |
| Contact and About pages (not mandatory, but a trust signal) | Done |
| Postal address on the site | Not required by Google's published policies; kept off the site (entered privately in AdSense) |

## 3. Consent (EEA, UK, Switzerland)
| Requirement | Status |
|---|---|
| Consent through a Google-certified consent platform before personalised ads | **You**: AdSense -> **Privacy & messaging** -> create the EEA/UK/Switzerland consent message (free). Takes 2 minutes; the code needs no change |
| Visitors can change their choice later | Done: footer link "Privacy and cookie settings" re-opens Google's message once it exists |
| Own analytics/cookies | Done: no analytics cookies; only theme/language choices are saved in the browser; Cloudflare Web Analytics is cookie-free |

## 4. Ad placement
| Policy | Status |
|---|---|
| Label ads only "Advertisement" / "Sponsored Links" | Done: label above each box (translated word for "Advertisement") |
| No ads near buttons that cause accidental clicks | Done: desktop box sits in its own column with a 3rem gap; phone box sits after the how-to section, never next to Resize / Download / ZIP |
| Ads must not look like navigation, menus or download links | Done: separate bordered box with label; no arrows or "click here" |
| No pop-ups, pop-unders, interstitials, auto-refresh | Done: none exist; ads are never refreshed |
| No ads on pages without publisher content / thin pages | Done: legal pages and the 404 page carry no ads; every ad page has full content |
| No ads in modals, loading or empty states | Done |
| No incentives to click, no asking for clicks | Done: the only text is "Ads keep FreeResizeImageOnline free. Everything works without them." |
| Layout does not jump when ads load (Better Ads / user experience) | Done: fixed reserved heights; measured layout shift ~0 |
| Auto ads | **You**: keep **OFF** (AdSense -> Sites -> freeresizeimageonline.com -> Auto ads). Manual placement is built in |
| Ad units | **You** (after approval): create 1 vertical unit (right column) and 1 responsive unit (phones), paste the slot ids in `src/config/site.ts`, redeploy |

## 5. Content policies
| Policy | Status |
|---|---|
| Illegal, dangerous, hateful, adult, deceptive, copyright-infringing content | None. Platform names (Instagram, YouTube, ...) are used only to state image sizes, and the Terms say the site is not affiliated with them |
| Misrepresentation | Done: claims are true ("images never leave your device" is how the tool works; counters, if enabled, show real numbers only; photo-ID sizes carry a reminder to check the official rules) |
| User-generated content / comments | None |
| Valuable inventory (not scraped, not auto-generated filler, not duplicated) | Done: translations are written per language, not machine-bulk copies; pages differ in purpose |

## 6. Traffic and behaviour
| Policy | Status |
|---|---|
| No invalid clicks / never click your own ads | **You**: never click your own ads, and do not ask friends to |
| No paid-to-click, no unwanted-email traffic, no incentivised traffic | **You**: promote only through legitimate channels (search, social posts, forum answers) |
| Site behaviour: no redirects to unwanted sites, no automatic downloads, no malware | Done: downloads start only when the visitor presses a button |

## 7. Technical
| Item | Status |
|---|---|
| `ads.txt` with `google.com, pub-5152758693265080, DIRECT, f08c47fec0942fa0` | Done (`/ads.txt`) |
| Not blocking Google's crawler | Done: `robots.txt` allows everything; sitemap published |
| Fast, mobile friendly | Done: Lighthouse mobile performance 91-100, accessibility 100, SEO 100 |
| HTTPS | Done |

## 8. After approval
1. Create ad units, add slot ids, redeploy.
2. Create the consent message (section 3).
3. Check AdSense -> **Policy center** weekly for the first month.
4. Never place extra ads without re-checking the placement rules above.
