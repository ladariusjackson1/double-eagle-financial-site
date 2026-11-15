# Double Eagle Financial

Marketing site for Double Eagle Financial, a Memphis bookkeeping firm that works with real estate agents and general contractors. The live site is [https://doubleeaglefinancial.com](https://doubleeaglefinancial.com), hosted on Netlify.

The site is static. There is no framework, package install, or build step. The files in this repository are what Netlify serves.

## Layout

```
index.html                 Home
the-core-four.html         Monthly bookkeeping plans (Starter, Standard, Plus)
pricing.html               Pricing
about.html                 About
faq.html                   FAQ
contact.html               Contact
book-a-call.html           Book a call
profit-leak-audit.html     Free Profit Leak Audit
thank-you.html             Form confirmation (noindex; blocked in robots.txt)
privacy.html               Privacy policy
terms.html                 Terms of service
sitemap.xml
robots.txt
assets/css/styles.css      All styles
assets/js/main.js          Navigation, forms, and analytics events
assets/js/config.js        Public form endpoint, booking link, and contact details
assets/img/                Favicon and Open Graph card
```

The header, navigation, and footer are copied into each HTML file. A change to those has to be made on every page.

Links and assets use root-relative paths (`/pricing.html`, `/assets/css/styles.css`). The site has to be served from the domain root. Publishing it under a subdirectory — including GitHub Pages at `https://ladariusjackson1.github.io/Double-Eagle-/` — makes those paths 404. This repository does not deploy to GitHub Pages.

## Editing

- **Page copy.** Edit the HTML file for that page.
- **Styles.** Edit `assets/css/styles.css`. The token block at the top sets color, type, and spacing. `--brass` is decorative only (borders, rules, icons). `--brass-text` is the accessible color used for text and button fills.
- **Forms and booking.** `assets/js/config.js` holds the public Formspree endpoint and the Calendly link. It is served to every visitor, so it must not contain API keys or other secrets. Forms on the contact, Profit Leak Audit, and book-a-call pages POST JSON to `formEndpoint`. If that value is empty, the form shows a configuration error instead of pretending the message was sent.
- **Analytics.** `assets/js/main.js` pushes events onto `window.dataLayer`: `page_view`, `cta_click`, `book_a_call_click`, `lead_magnet_submit`, `booking_request_submit`, `contact_submit`, `lead_submit`, `lead_confirmed`, `faq_open`, `form_error`, and `form_submit_failed`. Set `window.DE_DEBUG = true` in the browser console to log them. `ga4MeasurementId` and `gtmContainerId` in `config.js` are optional and currently empty.

Canonical URLs, Open Graph tags, and `sitemap.xml` use `https://www.doubleeaglefinancial.com`.

## Deploy

Netlify deploys this repository from `main`. Details — the Git connection, `netlify.toml`, Cloudflare DNS, the Formspree forms, and rollback — are in [DEPLOYMENT.md](DEPLOYMENT.md).

Do not enable GitHub Pages for this repository. A Pages deploy of this repo is a second, broken copy of the site.
