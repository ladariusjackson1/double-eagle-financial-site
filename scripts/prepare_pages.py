#!/usr/bin/env python3
"""Build the GitHub Pages copy of this site.

Netlify serves the repository from the domain root, so links such as
``/pricing.html`` and ``/assets/css/styles.css`` resolve. A GitHub Pages
project site inserts the repository name
(``/double-eagle-financial-site/...``), and those same links 404.

This script copies the site into ``--dest`` and prefixes those
root-relative URLs. It does not modify the files in the repository.
Visible text has to match the source, and every rewritten local URL has
to point at a file in the copy.
"""

from __future__ import annotations

import argparse
import re
import shutil
import sys
from html.parser import HTMLParser
from pathlib import Path

ROOT_FILES = ("robots.txt", "sitemap.xml")
TEXT_SUFFIXES = {".html", ".js", ".css"}
ATTR_RE = re.compile(
    r"(?P<name>\b(?:href|src|action|poster|data-redirect))"
    r"(?P<eq>\s*=\s*)"
    r"(?P<quote>[\"'])"
    r"(?P<value>/(?!/)[^\"']*)"
    r"(?P=quote)",
    re.IGNORECASE,
)
JS_STRING_RE = re.compile(
    r"(?P<quote>[\"'])(?P<value>/(?!/)[^\"'\\]*)(?P=quote)"
)
CSS_URL_RE = re.compile(
    r"url\(\s*(?P<quote>[\"']?)(?P<value>/(?!/)[^)\"']*)(?P=quote)\s*\)"
)
# Social images point at the production host. On the backup copy they
# have to load from Pages while that host is down. Canonical URLs are
# left on the production domain.
PROD_ASSET_RE = re.compile(
    r"https://(?:www\.)?doubleeaglefinancial\.com(?=/assets/)"
)
BASE_RE = re.compile(r"^/[A-Za-z0-9._-]+(?:/[A-Za-z0-9._-]+)*$")


class TextExtractor(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.parts: list[str] = []
        self._skip = 0

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag in ("script", "style"):
            self._skip += 1

    def handle_endtag(self, tag: str) -> None:
        if tag in ("script", "style") and self._skip:
            self._skip -= 1

    def handle_data(self, data: str) -> None:
        if not self._skip:
            self.parts.append(data)


def visible_text(html: str) -> str:
    extractor = TextExtractor()
    extractor.feed(html)
    extractor.close()
    return "".join(extractor.parts)


def normalize_base(raw: str) -> str:
    raw = raw.strip()
    if raw in ("", "/"):
        return ""
    if not raw.startswith("/"):
        raw = "/" + raw
    raw = "/" + raw.strip("/")
    if not BASE_RE.fullmatch(raw):
        raise SystemExit(f"Refusing base path {raw!r}")
    return raw


def prefix_root(value: str, base: str) -> str:
    if not base or not value.startswith("/") or value.startswith("//"):
        return value
    if value == base or value.startswith(base + "/"):
        return value
    if value == "/":
        return base + "/"
    return base + value


def rewrite_attrs(text: str, base: str) -> str:
    def repl(match: re.Match[str]) -> str:
        value = prefix_root(match.group("value"), base)
        return (
            f"{match.group('name')}{match.group('eq')}"
            f"{match.group('quote')}{value}{match.group('quote')}"
        )

    return ATTR_RE.sub(repl, text)


def rewrite_js(text: str, base: str) -> str:
    def repl(match: re.Match[str]) -> str:
        value = prefix_root(match.group("value"), base)
        return f"{match.group('quote')}{value}{match.group('quote')}"

    return JS_STRING_RE.sub(repl, text)


def rewrite_css(text: str, base: str) -> str:
    def repl(match: re.Match[str]) -> str:
        value = prefix_root(match.group("value"), base)
        quote = match.group("quote")
        return f"url({quote}{value}{quote})"

    return CSS_URL_RE.sub(repl, text)


def rewrite_prod_assets(text: str, base: str) -> str:
    if not base:
        return text
    return PROD_ASSET_RE.sub(base, text)


def restored(text: str, base: str) -> str:
    """Undo the base-path prefix so the copy can be compared to source."""
    if not base:
        return text
    return text.replace(base + "/", "/")


def assert_equivalent(original: str, rewritten: str, base: str, label: str) -> None:
    if not base:
        if rewritten != original:
            raise SystemExit(f"Pages copy of {label} changed with an empty base path")
        return
    if PROD_ASSET_RE.search(original) and PROD_ASSET_RE.search(rewritten):
        raise SystemExit(f"Production asset URL was left unchanged in {label}")
    undone = restored(rewritten, base)
    # Social-image URLs are the one absolute production URL this rewrites.
    # After the prefix is removed they are root-relative /assets/... paths.
    if PROD_ASSET_RE.sub("", undone) != PROD_ASSET_RE.sub("", original):
        raise SystemExit(f"Pages copy of {label} changed more than URLs")


def local_target(value: str, dest: Path, base: str) -> Path | None:
    if not value.startswith("/") or value.startswith("//"):
        return None
    path = value.split("#", 1)[0].split("?", 1)[0]
    if base:
        if path != base and not path.startswith(base + "/"):
            raise SystemExit(f"Root-relative URL was not prefixed: {value}")
        path = path[len(base):] or "/"
    path = path.lstrip("/")
    if path == "":
        return dest / "index.html"
    return dest / path


def assert_targets(text: str, dest: Path, base: str, label: str, pattern: re.Pattern[str]) -> None:
    for match in pattern.finditer(text):
        target = local_target(match.group("value"), dest, base)
        if target is None:
            continue
        if not target.is_file():
            raise SystemExit(f"{label} points at missing file {target} ({match.group('value')})")


def write_text(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8", newline="\n")


def transform(suffix: str, text: str, base: str) -> str:
    if suffix == ".html":
        text = rewrite_attrs(text, base)
        text = rewrite_prod_assets(text, base)
    elif suffix == ".js":
        text = rewrite_js(text, base)
    elif suffix == ".css":
        text = rewrite_css(text, base)
    return text


def prepare(src: Path, dest: Path, base: str) -> None:
    src = src.resolve()
    dest = dest.resolve()
    if dest == src or dest == Path("/") or src in dest.parents:
        raise SystemExit(f"Refusing to write to {dest}")
    if dest.exists():
        shutil.rmtree(dest)
    dest.mkdir(parents=True)

    html_files = sorted(p for p in src.glob("*.html") if p.is_file())
    if not html_files:
        raise SystemExit(f"No HTML files in {src}")

    written: list[tuple[str, str, re.Pattern[str]]] = []
    for path in html_files:
        original = path.read_text(encoding="utf-8")
        rewritten = transform(".html", original, base)
        if visible_text(original) != visible_text(rewritten):
            raise SystemExit(f"Visible text changed in {path.name}")
        assert_equivalent(original, rewritten, base, path.name)
        write_text(dest / path.name, rewritten)
        written.append((path.name, rewritten, ATTR_RE))

    assets = src / "assets"
    if not assets.is_dir():
        raise SystemExit(f"Missing {assets}")
    for path in sorted(p for p in assets.rglob("*") if p.is_file()):
        rel = path.relative_to(src)
        original = path.read_bytes()
        if path.suffix in TEXT_SUFFIXES:
            text = original.decode("utf-8")
            rewritten = transform(path.suffix, text, base)
            assert_equivalent(text, rewritten, base, str(rel))
            write_text(dest / rel, rewritten)
            if path.suffix == ".js":
                written.append((str(rel), rewritten, JS_STRING_RE))
            elif path.suffix == ".css":
                written.append((str(rel), rewritten, CSS_URL_RE))
        else:
            target = dest / rel
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(original)

    for label, text, pattern in written:
        assert_targets(text, dest, base, label, pattern)

    for name in ROOT_FILES:
        source = src / name
        if not source.is_file():
            raise SystemExit(f"Missing {source}")
        shutil.copy2(source, dest / name)

    (dest / ".nojekyll").write_text("", encoding="utf-8")
    print(f"Wrote {dest} (base {base or '/'})")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--base-path",
        required=True,
        help="Pages base path, such as /double-eagle-financial-site. Empty serves from the host root.",
    )
    parser.add_argument("--dest", required=True, type=Path)
    parser.add_argument(
        "--src",
        type=Path,
        default=Path(__file__).resolve().parent.parent,
    )
    args = parser.parse_args()
    prepare(args.src, args.dest, normalize_base(args.base_path))


if __name__ == "__main__":
    try:
        main()
    except BrokenPipeError:
        sys.exit(0)
