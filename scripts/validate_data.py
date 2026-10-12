#!/usr/bin/env python3
"""Validate Prompt Gallery's static data before publishing."""

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data" / "prompts.json"
REQUIRED = {
    "id", "name", "category", "description", "useCases", "tags", "prompt",
    "cover", "coverType", "version", "createdAt", "updatedAt",
}


def fail(message):
    print(f"ERROR: {message}", file=sys.stderr)
    raise SystemExit(1)


def main():
    try:
        payload = json.loads(DATA.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        fail(f"Cannot read JSON: {error}")
    if payload.get("schemaVersion") != 1 or not isinstance(payload.get("prompts"), list):
        fail("Expected schemaVersion 1 and a prompts array")

    seen_ids, seen_names, seen_prompts = set(), set(), set()
    for index, item in enumerate(payload["prompts"], 1):
        if not isinstance(item, dict):
            fail(f"Entry {index} is not an object")
        missing = REQUIRED - item.keys()
        if missing:
            fail(f"Entry {index} missing: {', '.join(sorted(missing))}")
        ident = item["id"]
        if not isinstance(ident, str) or not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", ident):
            fail(f"Invalid ID in entry {index}")
        if ident in seen_ids or item["name"] in seen_names or item["prompt"] in seen_prompts:
            fail(f"Duplicate ID, name, or original prompt: {ident}")
        seen_ids.add(ident)
        seen_names.add(item["name"])
        seen_prompts.add(item["prompt"])
        for key in ("name", "category", "description", "prompt"):
            if not isinstance(item[key], str) or not item[key].strip():
                fail(f"{ident}: {key} must be nonempty text")
        for key in ("useCases", "tags"):
            if not isinstance(item[key], list) or not item[key] or any(not isinstance(v, str) or not v.strip() for v in item[key]):
                fail(f"{ident}: {key} must contain nonempty strings")
            if len(item[key]) != len(set(item[key])):
                fail(f"{ident}: repeated value in {key}")
        if item["coverType"] not in ("illustration", "generated", "example"):
            fail(f"{ident}: invalid coverType")
        if item.get("coverLayout", "portrait") not in ("portrait", "wide"):
            fail(f"{ident}: invalid coverLayout")
        cover = item["cover"]
        if not isinstance(cover, str) or not cover.startswith("assets/covers/") or not (ROOT / cover).is_file():
            fail(f"{ident}: cover missing or outside assets/covers")
        version = item["version"]
        if type(version) is not int or version < 1:
            fail(f"{ident}: version must be a positive integer")
        for key in ("createdAt", "updatedAt"):
            if not isinstance(item[key], str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", item[key]):
                fail(f"{ident}: invalid {key}")
        if item["updatedAt"] < item["createdAt"]:
            fail(f"{ident}: updatedAt precedes createdAt")
        for previous in range(1, version):
            snapshot = ROOT / "data" / "history" / ident / f"v{previous}.json"
            if not snapshot.is_file():
                fail(f"{ident}: missing version history {snapshot.relative_to(ROOT)}")
            try:
                old = json.loads(snapshot.read_text(encoding="utf-8"))
            except (OSError, json.JSONDecodeError) as error:
                fail(f"{ident}: invalid history: {error}")
            if old.get("id") != ident or old.get("version") != previous:
                fail(f"{ident}: wrong version history in {snapshot.relative_to(ROOT)}")

    print(f"OK: {len(payload['prompts'])} prompt(s), unique IDs and originals, covers and history verified")


if __name__ == "__main__":
    main()
