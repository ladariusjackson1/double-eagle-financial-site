# Deployment

Two hosts:

- **Netlify** is the primary host for [https://doubleeaglefinancial.com](https://doubleeaglefinancial.com). It publishes the files in this repository from `main`. There is no build step and no package install. Cloudflare provides DNS only.
- **GitHub Pages** is the backup host, at [https://ladariusjackson1.github.io/double-eagle-financial-site/](https://ladariusjackson1.github.io/double-eagle-financial-site/). Use that address while Netlify is not serving the site.

On 3 November 2026, `https://doubleeaglefinancial.com`, `https://www.doubleeaglefinancial.com`, and `https://doubleeaglefinancial.netlify.app` each returned Netlify's site-not-found page (HTTP 404). The Pages workflow publishes a working copy until that project is restored.

GitHub does not hold a Netlify token. When the Netlify project is linked again, Netlify's own Git integration publishes `main`. The Pages workflow does not replace that.

## How Netlify deploys work

Netlify project: [doubleeaglefinancial](https://app.netlify.com/projects/doubleeaglefinancial)

- Production: [https://doubleeaglefinancial.com](https://doubleeaglefinancial.com) (also [https://doubleeaglefinancial.netlify.app](https://doubleeaglefinancial.netlify.app))
- Production branch: `main`
- Publish directory: the repository root (set in `netlify.toml`)
- Build command: none
- Pull requests: Netlify comments with a Deploy Preview at `https://deploy-preview-NUMBER--doubleeaglefinancial.netlify.app`

That connection was in place: the `netlify[bot]` account commented on pull request #5 with a Deploy Preview for this project. GitHub has no Netlify workflow and no deploy secrets, because Netlify pulls the repo itself. The site-not-found response means the project is not publishing right now. The steps below are how to confirm the link, or put it back, once the Netlify project is available.

### Confirm it is still connected

1. Open [Project configuration → Build & deploy](https://app.netlify.com/projects/doubleeaglefinancial/configuration/deploys).
2. Under Continuous deployment, the repository should be `ladariusjackson1/double-eagle-financial-site` and the production branch should be `main`.
3. The build command should be empty. The publish directory should be the repository root (`.`).
4. Open a pull request. Within a few minutes, `netlify[bot]` should comment with a Deploy Preview link. Merging that pull request to `main` updates the live domain once the project is publishing again.

### Turn it back on if the link is ever removed

Link the existing project. Do not create a second Netlify site, or the domain will stay on the old one.

1. In the `doubleeaglefinancial` project, choose **Import an existing project** / **Link repository** and pick this GitHub repo.
2. Production branch: `main`.
3. Build command: leave blank.
4. Publish directory: `.` (the repository root). `netlify.toml` sets this.
5. Deploy. Then check Domain management still lists `doubleeaglefinancial.com`.

No `NETLIFY_AUTH_TOKEN` or `NETLIFY_SITE_ID` is required. Those would only matter for a Netlify CLI workflow, which this repo does not have.

## What `netlify.toml` changes

`netlify.toml` tells Netlify to publish the repository root and adds the response headers below. It does not run a build, minify files, or rewrite links.

Pretty URLs stay as configured in the Netlify UI (Project configuration → Build & deploy → Post processing). That setting is on today: Netlify rewrites internal links such as `/pricing.html` to `/pricing` in the HTML it serves. Both URLs still return the page. This file does not set `[build.processing]`, because specifying one processing option can turn the others off.

### Headers

Applied to every path:

| Header | Value | Why |
| --- | --- | --- |
| `X-Content-Type-Options` | `nosniff` | Browsers use the Content-Type Netlify sends instead of guessing. A text file cannot be sniffed into a script. |
| `X-Frame-Options` | `DENY` | The site is not embedded in another site. This blocks clickjacking. Deploy Previews open as their own tab, so they still work. |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Same-origin requests keep the full path. Formspree and other HTTPS sites receive only `https://doubleeaglefinancial.com`. The form JSON API does not need the page path. |
| `Permissions-Policy` | camera, microphone, geolocation, and payment disabled | The pages never ask for those. The Deploy Preview drawer cannot use them either, so a Loom recording from that drawer will not start. |
| `Content-Security-Policy` | see `netlify.toml` | Allows this site's own files, the one-line inline script that adds the `js` class, inline `style` attributes, Google Fonts (`fonts.googleapis.com` for the stylesheet, `fonts.gstatic.com` for the font files), the small SVG data-URI in `assets/css/styles.css`, and browser `POST`s to `https://formspree.io`. `frame-src` also allows `https://app.netlify.com`, which is the Deploy Preview drawer Netlify injects (an iframe loaded by `/.netlify/scripts/cdp`). That drawer is not added to production publishes. `frame-ancestors 'none'` matches `X-Frame-Options: DENY`. Other scripts, frames, and plugins are blocked. `upgrade-insecure-requests` upgrades any accidental `http://` URL to `https://`. |

Two headers are left to Netlify on purpose:

- **Strict-Transport-Security.** Netlify already sends `strict-transport-security: max-age=31536000` on the custom domain. Duplicating it here would not make HTTPS stricter, and adding `includeSubDomains` could affect a future hostname that is not on HTTPS yet. Deploy Preview URLs under `netlify.app` send a longer policy (`includeSubDomains; preload`) because that parent domain is on the browser preload list. This file does not set that header.
- **Cache-Control.** Netlify sends `public, max-age=0, must-revalidate`, so a new deploy shows up on the next request. Overriding that is how a static site gets stuck on an old page.

The pages do not load Google Analytics or Tag Manager today (`ga4MeasurementId` and `gtmContainerId` in `assets/js/config.js` are empty, and nothing injects those scripts). If a tag is added later, `script-src` and `connect-src` in `netlify.toml` have to name that host or the browser will block it.

## Cloudflare DNS

Nameservers are Cloudflare (`celeste.ns.cloudflare.com` and `ruben.ns.cloudflare.com`). The proxy is off. Responses come from Netlify (`server: Netlify`) and do not include a `cf-ray` header, which is the grey-cloud / DNS-only setup.

Records observed for this domain:

| Name | Type | Value |
| --- | --- | --- |
| `doubleeaglefinancial.com` | `A` | `75.2.60.5` |
| `www.doubleeaglefinancial.com` | `CNAME` | `doubleeaglefinancial.netlify.app` |

`75.2.60.5` is Netlify's load-balancer address, and the `www` CNAME is this project's Netlify hostname. Netlify then redirects `www` to the apex over HTTPS. Leave both records **DNS only** (grey cloud). Netlify issues and renews the certificate, and visitors connect straight to Netlify.

Do not point the apex at any other address. The individual IPs behind `doubleeaglefinancial.netlify.app` rotate. The stable targets are the load balancer `75.2.60.5` or, if you would rather not pin an IP, a Cloudflare flattened CNAME to `apex-loadbalancer.netlify.com`. One apex record is enough. Extra `A` or `AAAA` records stop Netlify from renewing the certificate. Netlify's load balancer does not use IPv6, so delete any `AAAA` record on these names.

### Proxied (orange cloud) versus DNS only

Keep the grey cloud. Netlify does not support another CDN in front of its CDN, and an orange cloud is what breaks certificate renewal.

Cloudflare's SSL/TLS mode does nothing while the records are DNS only, because Cloudflare is not in the request path.

If the orange cloud is turned on anyway, set Cloudflare SSL/TLS to **Full**. **Flexible** makes Cloudflare talk to Netlify over plain HTTP. Netlify redirects HTTP to HTTPS, and the browser loops. **Full (strict)** also works, because Netlify's certificate is publicly valid; Full is the minimum that stops the loop. While the proxy is on, Netlify must still be allowed to reach `/.well-known/acme-challenge/` over HTTP or the Let's Encrypt renewal fails later.

## Forms

Formspree form IDs are public. They appear in the JavaScript every visitor downloads. They are not secrets. Do not put a Formspree API key, a Netlify token, or anything else private in this repository.

All three forms post JSON to one endpoint, `https://formspree.io/f/xljrovea`, set as `formEndpoint` in `assets/js/config.js`. `assets/js/main.js` reads that value unless the `<form>` itself has a `data-endpoint` attribute (none do today). Each submission includes `form_name`, so one Formspree inbox can tell the forms apart.

| Page | `<form>` attribute | `form_name` sent to Formspree | After a successful send |
| --- | --- | --- | --- |
| `contact.html` | `data-form="contact"` | `contact` | `/thank-you.html?f=contact` |
| `profit-leak-audit.html` | `data-form="lead-magnet"` | `lead-magnet` | `/thank-you.html?f=audit` |
| `book-a-call.html` | `data-form="book-call"` | `book-call` | `/thank-you.html?f=call` |

The Profit Leak Audit form is the lead magnet (`lead-magnet`). The contact form is the other lead form. The book-a-call page also has a qualification form on the same endpoint; its calendar button uses `bookingUrl` in `assets/js/config.js` and does not post to Formspree.

### Swap an endpoint

To point every form at a new Formspree form, replace `formEndpoint` in `assets/js/config.js`.

To point one form at its own Formspree form, add `data-endpoint="https://formspree.io/f/YOUR_ID"` to that `<form>` and leave `formEndpoint` alone. `main.js` uses `data-endpoint` first.

If the new URL is not on `formspree.io`, also add that origin to `connect-src` and `form-action` in `netlify.toml`. Otherwise the browser will block the `POST` even though the form looks configured.

An empty `formEndpoint` (and no `data-endpoint`) does not pretend to send. The form shows "Form endpoint not configured."

### Test

1. Confirm `assets/js/config.js` still contains the endpoint you expect. The public form page is `https://formspree.io/f/xljrovea`.
2. Submit a form with the email left blank. The field error should appear and the page should stay put. That check never contacts Formspree.
3. For a real delivery check, submit once with an email you control and the word `test` in the message, then delete that row in the Formspree dashboard for form `xljrovea`. The `form_name` column shows which page sent it.

## Roll back

1. Open [Deploys](https://app.netlify.com/projects/doubleeaglefinancial/deploys).
2. Pick an older deploy whose context is **Production** and whose status is Published or succeeded. Deploy Previews are not the live site.
3. Open it and choose **Publish deploy** (the control is also labeled rollback). The custom domain serves that snapshot right away.
4. The next push to `main` deploys current `main` again. Roll back to restore the site, then revert or fix the commit so the following deploy does not repeat the problem.

## GitHub Pages

The backup site is [https://ladariusjackson1.github.io/double-eagle-financial-site/](https://ladariusjackson1.github.io/double-eagle-financial-site/).

[`.github/workflows/pages.yml`](.github/workflows/pages.yml) runs on every push to `main`. It checks out the repository, runs `scripts/prepare_pages.py`, and deploys that copy with the official GitHub Pages actions. It stops if GitHub reports a base path other than the repository name (`/double-eagle-financial-site`), so it cannot publish the old broken copy by accident. Repository settings already use GitHub Actions as the Pages source. If that is ever switched off, set **Settings → Pages → Build and deployment → Source** to **GitHub Actions**. The workflow does not create a second Netlify site and does not use a Netlify token.

### Why the copy is rewritten

The HTML links to `/pricing.html` and `/assets/css/styles.css`. On Netlify those resolve, because the site is the whole domain. GitHub Pages serves this project at `/double-eagle-financial-site/`, so the same paths would request `https://ladariusjackson1.github.io/pricing.html` and 404. An earlier workflow uploaded the repository unchanged and produced that broken copy. It was removed for that reason.

`scripts/prepare_pages.py` prefixes those root-relative URLs in the copy it writes, and it points the Open Graph image at that copy so the card still loads while the production host is down. Canonical URLs stay on `https://www.doubleeaglefinancial.com`. The script refuses to finish if the visible text differs from the source files. Netlify keeps publishing the untouched repository.

Do not add a `CNAME` file for `doubleeaglefinancial.com`. That would make Pages claim the domain Netlify uses.

Pages does not apply `netlify.toml`. The backup does not send the security headers described above. It is there so the pages can be opened, not as a second hardened host.

`robots.txt` and `sitemap.xml` are copied unchanged, so they still name the production domain.

To look at the same copy locally:

```bash
python3 scripts/prepare_pages.py \
  --base-path /double-eagle-financial-site \
  --dest /tmp/pages-preview/double-eagle-financial-site
python3 -m http.server 8080 --directory /tmp/pages-preview
```

Open `http://127.0.0.1:8080/double-eagle-financial-site/`. Styles and page links should load. `http://127.0.0.1:8080/assets/css/styles.css` should 404, which is the failure the prefix prevents.
