#!/usr/bin/env python3
"""
One-shot side-menu sweep: replace the single "Speaking" link with two
links — "Collaborating" + "Teaching" — across every page that ships a
side menu.

Run from the worktree root:
    cd /Users/halim/Documents/oulipo/.claude/worktrees/crazy-johnson-092a02
    python3 scripts/sweep-side-menu.py

Idempotent: only touches files that still have `/speaking/">Speaking`.
Deletes itself after verifying — this is a throwaway tool.
"""

from __future__ import annotations
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# Match the single `<a href="/speaking/">Speaking</a>` line (possibly with
# surrounding whitespace) and replace with the two-link block. The regex is
# anchored on the exact href + label so we don't accidentally replace other
# /speaking/ link patterns (e.g. inside the home page sections).
PATTERN = re.compile(
    r'(\s*)<a href="/speaking/">Speaking</a>',
    re.IGNORECASE,
)

REPLACEMENT = (
    r'\1<a href="/collaborating/">Collaborating</a>'
    r'\1<a href="/teaching/">Teaching</a>'
)


def main():
    touched = 0
    skipped = 0
    targets = list(ROOT.rglob("*.html"))
    # Skip noise dirs.
    targets = [
        p for p in targets
        if ".claude/" not in str(p) and ".git/" not in str(p) and "node_modules/" not in str(p)
    ]

    for p in targets:
        try:
            text = p.read_text(encoding="utf-8")
        except Exception:
            continue
        if 'href="/speaking/">Speaking</a>' not in text:
            skipped += 1
            continue
        new_text, n = PATTERN.subn(REPLACEMENT, text, count=1)
        if n == 0:
            skipped += 1
            continue
        p.write_text(new_text, encoding="utf-8")
        print(f"  rewrote: {p.relative_to(ROOT)}")
        touched += 1

    print(f"\n{touched} files rewritten, {skipped} skipped.")


if __name__ == "__main__":
    main()
