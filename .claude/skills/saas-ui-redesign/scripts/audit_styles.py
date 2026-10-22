#!/usr/bin/env python3
"""Inventory hardcoded style values in a Vue 3 source tree.

Usage:
    audit_styles.py <src-dir> [--exclude NAME ...] [--json]

Scans .vue files (style, template, and script blocks separately) and .css
files. Reports, per file, literal values that should be design tokens:

    colors    hex / rgb() / hsl() literals in style blocks
    js-colors color literals in <template> and <script> (SVG fills, chart palettes)
    spacing   literal lengths in padding / margin / gap / inset properties
    font      literal font-size values
    radius    literal border-radius values
    shadow    literal box-shadow values
    tokens    var(--*) references (higher is better)

Colors inside a var() fallback are not counted. Files named in --exclude
(default: tokens.css) are skipped, since that is where literals belong.
"""
import argparse
import json
import os
import re
import sys

COLOR_RE = re.compile(
    r"#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b|\b(?:rgba?|hsla?)\("
)
VAR_RE = re.compile(r"var\(\s*--[\w-]+")
VAR_CALL_RE = re.compile(r"var\([^()]*\)")
DECL_RE = re.compile(r"([a-zA-Z-]+)\s*:\s*([^;{}]+)")
LENGTH_RE = re.compile(r"(?<![\w-])-?\d*\.?\d+(?:px|rem|em)\b")
COMMENT_RE = re.compile(r"/\*.*?\*/", re.S)
BLOCK_RE = {
    "style": re.compile(r"<style[^>]*>(.*?)</style>", re.S),
    "template": re.compile(r"<template[^>]*>(.*)</template>", re.S),
    "script": re.compile(r"<script[^>]*>(.*?)</script>", re.S),
}

SPACING_PROPS = re.compile(
    r"^(?:padding|margin)(?:-(?:top|right|bottom|left|inline|block)(?:-(?:start|end))?)?$"
    r"|^(?:row-|column-)?gap$|^inset$|^(?:top|right|bottom|left)$"
)
METRICS = ["colors", "js-colors", "spacing", "font", "radius", "shadow", "tokens"]


def audit_css(css):
    counts = dict.fromkeys(METRICS, 0)
    css = COMMENT_RE.sub("", css)
    counts["tokens"] = len(VAR_RE.findall(css))
    for prop, value in DECL_RE.findall(css):
        prop = prop.lower()
        literal = VAR_CALL_RE.sub("", value)
        counts["colors"] += len(COLOR_RE.findall(literal))
        if SPACING_PROPS.match(prop):
            counts["spacing"] += len(LENGTH_RE.findall(literal))
        elif prop == "font-size" and LENGTH_RE.search(literal):
            counts["font"] += 1
        elif prop.startswith("border") and prop.endswith("radius") and LENGTH_RE.search(literal):
            counts["radius"] += 1
        elif prop == "box-shadow" and literal.strip() not in ("none", ""):
            if COLOR_RE.search(literal) or LENGTH_RE.search(literal):
                counts["shadow"] += 1
    return counts


def audit_vue(text):
    counts = dict.fromkeys(METRICS, 0)
    for block in BLOCK_RE["style"].findall(text):
        for key, value in audit_css(block).items():
            counts[key] += value
    # Strip style blocks so the greedy template match can't count them twice.
    rest = BLOCK_RE["style"].sub("", text)
    for kind in ("template", "script"):
        for block in BLOCK_RE[kind].findall(rest):
            counts["js-colors"] += len(COLOR_RE.findall(VAR_CALL_RE.sub("", block)))
            counts["tokens"] += len(VAR_RE.findall(block))
    return counts


def walk(src, excludes):
    for root, dirs, files in os.walk(src):
        dirs[:] = [d for d in dirs if d not in ("node_modules", "dist", ".git")]
        for name in sorted(files):
            if name in excludes or not name.endswith((".vue", ".css")):
                continue
            path = os.path.join(root, name)
            with open(path, encoding="utf-8") as f:
                text = f.read()
            counts = audit_vue(text) if name.endswith(".vue") else audit_css(text)
            yield os.path.relpath(path, src), counts


def main():
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("src", help="client source directory, e.g. client/src")
    parser.add_argument("--exclude", action="append", default=None,
                        help="file name to skip (repeatable; default: tokens.css)")
    parser.add_argument("--json", action="store_true", help="emit JSON instead of a table")
    args = parser.parse_args()

    if not os.path.isdir(args.src):
        sys.exit(f"not a directory: {args.src}")
    excludes = set(args.exclude or ["tokens.css"])
    rows = list(walk(args.src, excludes))
    totals = dict.fromkeys(METRICS, 0)
    for _, counts in rows:
        for key in METRICS:
            totals[key] += counts[key]

    if args.json:
        json.dump({"files": dict(rows), "totals": totals}, sys.stdout, indent=2)
        print()
        return

    def literals(counts):
        return sum(counts[k] for k in METRICS if k != "tokens")

    rows.sort(key=lambda row: literals(row[1]), reverse=True)
    width = max([len("file")] + [len(path) for path, _ in rows])
    header = f"{'file':<{width}}  " + "  ".join(f"{m:>9}" for m in METRICS)
    print(header)
    print("-" * len(header))
    for path, counts in rows:
        print(f"{path:<{width}}  " + "  ".join(f"{counts[m]:>9}" for m in METRICS))
    print("-" * len(header))
    print(f"{'TOTAL':<{width}}  " + "  ".join(f"{totals[m]:>9}" for m in METRICS))
    hardcoded = literals(totals)
    share = totals["tokens"] / (totals["tokens"] + hardcoded) if hardcoded or totals["tokens"] else 0
    print(f"\n{len(rows)} files, {hardcoded} hardcoded values, "
          f"{totals['tokens']} token references ({share:.0%} tokenized)")


if __name__ == "__main__":
    main()
