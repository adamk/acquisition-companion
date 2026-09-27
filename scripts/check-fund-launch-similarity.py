#!/usr/bin/env python3
"""Compare rendered site prose with locally fetched Fund Launch guide HTML.

Fetch the four source URLs to a temporary directory first. Never put source HTML
under public/, src/ or dist/. This catches direct long copying, not paraphrases.
"""
import argparse
from html.parser import HTMLParser
from pathlib import Path
import re
import sys


class VisibleText(HTMLParser):
    def __init__(self):
        super().__init__()
        self.hidden = 0
        self.parts = []

    def handle_starttag(self, tag, attrs):
        if tag in {"script", "style", "svg", "noscript"}:
            self.hidden += 1

    def handle_endtag(self, tag):
        if tag in {"script", "style", "svg", "noscript"} and self.hidden:
            self.hidden -= 1

    def handle_data(self, data):
        if not self.hidden:
            self.parts.append(data)


def words(path):
    parser = VisibleText()
    parser.feed(path.read_text(encoding="utf-8"))
    return re.findall(r"[a-z0-9]+(?:['’][a-z0-9]+)?", " ".join(parser.parts).lower())


def longest_match(source, page, seed=12):
    positions = {}
    for i in range(len(source) - seed + 1):
        positions.setdefault(tuple(source[i:i + seed]), []).append(i)
    best = (0, "")
    for j in range(len(page) - seed + 1):
        for i in positions.get(tuple(page[j:j + seed]), []):
            length = seed
            while i + length < len(source) and j + length < len(page) and source[i + length] == page[j + length]:
                length += 1
            if length > best[0]:
                best = (length, " ".join(page[j:j + min(length, 30)]))
    return best


def main():
    arg = argparse.ArgumentParser()
    arg.add_argument("--sources", type=Path, required=True, help="Temporary directory holding four downloaded guide HTML files")
    arg.add_argument("--dist", type=Path, default=Path("dist"))
    arg.add_argument("--threshold", type=int, default=24)
    args = arg.parse_args()
    names = ["fund-independent-sponsor.html", "fund-private-credit.html", "fund-direct-lending.html", "fund-mezzanine.html"]
    source_paths = [args.sources / name for name in names]
    missing = [str(p) for p in source_paths if not p.is_file()]
    if missing:
        arg.error("missing source files: " + ", ".join(missing))
    pages = [(p, words(p)) for p in args.dist.rglob("*.html")]
    failures = []
    for source_path in source_paths:
        source = words(source_path)
        longest = (0, "", "")
        for page_path, page in pages:
            count, excerpt = longest_match(source, page)
            if count > longest[0]:
                longest = (count, str(page_path), excerpt)
        print(f"{source_path.name}: {len(source)} visible source words; longest site overlap {longest[0]} words in {longest[1]}")
        if longest[0] >= args.threshold:
            failures.append(f"{source_path.name}: {longest[0]} words: {longest[2]}")
    if failures:
        print("Long source overlaps:\n" + "\n".join(failures), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
