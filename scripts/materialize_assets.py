#!/usr/bin/env python3
"""Rebuild files that are too large or binary to store as a single text blob."""

import hashlib
import json
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "asset-payload" / "manifest.json"
FONT_URL = (
    "https://github.com/esc-o/paper-reader/raw/"
    "74e0e631f5f6da3b60b3f15af9717c32bbcb2d50/public/fonts/ChironYuan-Medium.ttf"
)
FONT_PATHS = (
    "public/fonts/ChironYuan-Medium.ttf",
    "ios/App/App/public/fonts/ChironYuan-Medium.ttf",
)


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def write_checked(rel: str, data: bytes, expected: str) -> None:
    digest = sha256(data)
    if digest != expected:
        raise SystemExit(f"{rel}: sha256 {digest} != {expected}")
    path = ROOT / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.is_file() and sha256(path.read_bytes()) == expected:
        print(f"ok {rel}")
        return
    path.write_bytes(data)
    print(f"wrote {rel}")


def main() -> None:
    manifest = json.loads(MANIFEST.read_text())
    for item in manifest["files"]:
        blob = "".join((ROOT / part).read_text() for part in item["parts"]).encode()
        if item["encoding"] == "base64":
            import base64

            blob = base64.b64decode(blob)
        elif item["encoding"] != "utf-8":
            raise SystemExit(f"unknown encoding for {item['path']}")
        write_checked(item["path"], blob, item["sha256"])

    font_sha = manifest["font"]["sha256"]
    cached = ROOT / FONT_PATHS[0]
    if cached.is_file() and sha256(cached.read_bytes()) == font_sha:
        font = cached.read_bytes()
    else:
        print("downloading font")
        with urllib.request.urlopen(FONT_URL) as response:
            font = response.read()
    for rel in FONT_PATHS:
        write_checked(rel, font, font_sha)


if __name__ == "__main__":
    main()
