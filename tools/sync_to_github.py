#!/usr/bin/env python3
import subprocess
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

def run(cmd):
    print(f"$ {' '.join(cmd)}")
    subprocess.run(cmd, cwd=ROOT, check=True)

def main():
    run(["git", "rev-parse", "--is-inside-work-tree"])

    run(["git", "add", "-A"])

    diff = subprocess.run(["git", "diff", "--cached", "--quiet"], cwd=ROOT)
    if diff.returncode == 0:
        print("No changes to commit.")
        return

    msg = f"Sync local folder {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
    run(["git", "commit", "-m", msg])

    run(["git", "pull", "--no-rebase", "origin", "main"])
    run(["git", "push", "origin", "main"])

    print("Sync complete.")

if __name__ == "__main__":
    main()
