#!/usr/bin/env python3
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
STATE_FILE = ROOT / "tools" / "media_index.json"
SCRIPT_FILE = ROOT / "script.js"


def main():
    data = json.loads(STATE_FILE.read_text(encoding="utf-8"))
    next_index = int(data.get("next_index", 38))
    clip_count = max(1, next_index - 1)

    content = SCRIPT_FILE.read_text(encoding="utf-8")
    pattern = re.compile(r"const clipPool = Array\.from\(\{ length: \d+ \}, \(_, index\) => \"\./media/\" \+ \(index \+ 1\) \+ \"\.webm\"\);")
    replacement = f'const clipPool = Array.from({{ length: {clip_count} }}, (_, index) => "./media/" + (index + 1) + ".webm");'

    updated, count = pattern.subn(replacement, content, count=1)
    if count != 1:
      raise SystemExit("Could not find the clipPool line to update in script.js")

    SCRIPT_FILE.write_text(updated, encoding="utf-8")
    print(f"Updated clipPool length to {clip_count} (next_index={next_index}).")


if __name__ == "__main__":
    main()
