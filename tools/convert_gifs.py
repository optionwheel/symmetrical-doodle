#!/usr/bin/env python3
import argparse
import json
import shutil
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_STATE = ROOT / "tools" / "media_index.json"
DEFAULT_INPUT = Path("gifs")
DEFAULT_OUTPUT = Path("media")


def run_cmd(cmd):
    return subprocess.run(cmd, check=True)


def convert_one(gif_path: Path, out_base: Path):
    webm = out_base.with_suffix(".webm")
    mp4 = out_base.with_suffix(".mp4")

    run_cmd([
        "ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", str(gif_path),
        "-c:v", "libvpx-vp9", "-b:v", "0", "-crf", "38",
        "-pix_fmt", "yuv420p",
        "-vf", "scale='min(640,iw)':-2:flags=lanczos,fps=24",
        "-an", str(webm),
    ])

    run_cmd([
        "ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", str(gif_path),
        "-movflags", "+faststart", "-pix_fmt", "yuv420p",
        "-vf", "scale='min(640,iw)':-2:flags=lanczos,fps=24",
        "-an", str(mp4),
    ])

    return webm, mp4


def load_state(state_file: Path):
    if not state_file.exists():
        return {"next_index": 38}
    with state_file.open("r", encoding="utf-8") as f:
        data = json.load(f)
    if "next_index" not in data or not isinstance(data["next_index"], int):
        raise ValueError("state file must contain integer key 'next_index'")
    return data


def save_state(state_file: Path, state):
    with state_file.open("w", encoding="utf-8") as f:
        json.dump(state, f, indent=2)
        f.write("\n")


def main():
    parser = argparse.ArgumentParser(description="Convert new GIFs to numbered WEBM/MP4 and update local media state.")
    parser.add_argument("--input", type=Path, default=DEFAULT_INPUT)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--state", type=Path, default=DEFAULT_STATE)
    args = parser.parse_args()

    if shutil.which("ffmpeg") is None:
        raise SystemExit("ffmpeg not found. Install it first (e.g. brew install ffmpeg).")

    if shutil.which("git") is None:
        raise SystemExit("git not found.")

    if not args.input.exists():
        raise SystemExit(f"Input folder not found: {args.input}")

    args.output.mkdir(parents=True, exist_ok=True)

    state = load_state(args.state)
    next_index = state["next_index"]

    gifs = sorted(args.input.glob("*.gif"))
    if not gifs:
        print("No new GIFs found.")
        return

    created = []
    deleted = []

    for gif in gifs:
        out_base = args.output / str(next_index)
        try:
            webm, mp4 = convert_one(gif, out_base)
            gif.unlink()
            created.extend([str(webm), str(mp4)])
            deleted.append(str(gif))
            print(f"Converted {gif.name} -> {webm.name}, {mp4.name}")
            next_index += 1
        except subprocess.CalledProcessError:
            print(f"Failed converting {gif.name}; leaving it in place.")

    if not created:
        print("No files converted successfully.")
        return

    state["next_index"] = next_index
    save_state(args.state, state)

    print("Conversion completed. Files were added locally only (no git push).")


if __name__ == "__main__":
    main()
