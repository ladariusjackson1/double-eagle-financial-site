#!/usr/bin/env bash
# Validate the HTML and check links, including the GitHub Pages copy.
#
# Needs Java, the Nu Html Checker (set VNU_JAR to vnu.jar), lychee 0.24.x,
# and Python 3. From the repository root, after those are installed:
#
#   VNU_JAR=/path/to/vnu.jar scripts/check_site.sh
#
# PAGES_BASE_PATH defaults to /double-eagle-financial-site. The Pages
# workflow passes the base path GitHub reports. An empty value means the
# copy is served from the host root and root-relative links stay as they are.

set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"

if ! command -v java >/dev/null 2>&1; then
  echo "java is not on PATH" >&2
  exit 1
fi
if ! command -v lychee >/dev/null 2>&1; then
  echo "lychee is not on PATH" >&2
  exit 1
fi
if [[ -z "${VNU_JAR:-}" || ! -f "$VNU_JAR" ]]; then
  echo "Set VNU_JAR to the Nu Html Checker jar (vnu.jar)." >&2
  exit 1
fi

base="${PAGES_BASE_PATH-/double-eagle-financial-site}"

echo "Validating HTML"
java -jar "$VNU_JAR" \
  --errors-only \
  --stdout \
  --filterfile "$root/scripts/vnu-filter.txt" \
  "$root"/*.html

# Excludes:
# - The production domain and the Netlify subdomain are down, so a live
#   request would fail for a reason outside this repository.
# - deploy-preview-NUMBER is a placeholder in the deployment notes.
# - Formspree rejects GET; the forms POST. The example Make.com URL in
#   assets/js/config.js is not a real endpoint.
# - The github.io address is what the Pages workflow publishes. This job
#   checks that copy on disk instead of racing the deploy.
# - Loopback URLs are the local-preview examples in the docs.
lychee_excludes=(
  --exclude '^https://(www\.)?doubleeaglefinancial\.com'
  --exclude '^https://doubleeaglefinancial\.netlify\.app'
  --exclude '^https://deploy-preview-.*\.netlify\.app'
  --exclude '^https://formspree\.io/f/'
  --exclude 'hook\.us1\.make\.com'
  --exclude '^https://ladariusjackson1\.github\.io/double-eagle-financial-site'
)

echo "Checking links in the repository"
lychee \
  --root-dir "$root" \
  --no-progress \
  --include-fragments \
  --exclude-loopback \
  "${lychee_excludes[@]}" \
  "$root"/*.html \
  "$root"/assets/css/styles.css \
  "$root"/assets/js/main.js \
  "$root"/assets/js/config.js \
  "$root"/robots.txt \
  "$root"/sitemap.xml \
  "$root"/README.md \
  "$root"/DEPLOYMENT.md

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

echo "Checking links in the GitHub Pages copy"
if [[ -z "$base" || "$base" == "/" ]]; then
  site="$tmp/site"
  python3 "$root/scripts/prepare_pages.py" --base-path "" --dest "$site"
  lychee_root="$site"
else
  python3 "$root/scripts/prepare_pages.py" --base-path "$base" --dest "$tmp$base"
  site="$tmp$base"
  lychee_root="$tmp"
fi

lychee \
  --root-dir "$lychee_root" \
  --no-progress \
  --include-fragments \
  --exclude-loopback \
  "${lychee_excludes[@]}" \
  "$site"/*.html \
  "$site"/assets/css/styles.css \
  "$site"/assets/js/main.js \
  "$site"/assets/js/config.js \
  "$site"/robots.txt \
  "$site"/sitemap.xml

echo "HTML is valid and the checked links resolve."
