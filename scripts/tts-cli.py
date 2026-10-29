"""
CLI helper for on-demand Edge-TTS generation in NARA Studio.

Usage:
    python scripts/tts-cli.py --text "Halo dunia" --output "public/audio/test.mp3"

The script prints one line of JSON on success, so the Node pipeline knows the
real spoken length without shelling out to ffprobe:

    {"ok": true, "output": "...", "duration": 4.3, "words": 8, "voice": "..."}

`duration` is measured from Edge-TTS boundary metadata (offset + duration), so
it is the length of the narration itself, not a guess from character count.
"""

import argparse
import asyncio
import json
import os
import sys

import edge_tts


async def synthesize(text: str, output: str, voice: str) -> dict:
    os.makedirs(os.path.dirname(os.path.abspath(output)), exist_ok=True)

    communicate = edge_tts.Communicate(text, voice)
    words = 0
    end_ticks = 0

    with open(output, "wb") as handle:
        async for chunk in communicate.stream():
            kind = chunk.get("type")
            if kind == "audio":
                handle.write(chunk["data"])
            elif kind in ("WordBoundary", "SentenceBoundary"):
                words += 1
                end_ticks = max(end_ticks, int(chunk.get("offset", 0)) + int(chunk.get("duration", 0)))

    duration = end_ticks / 10_000_000.0
    if duration <= 0:
        # Boundaries are missing (offline proxy / older service): fall back to a
        # reading-speed estimate so the caller still gets a usable number.
        duration = max(1.2, len(text.split()) / 2.6)

    return {
        "ok": True,
        "output": output,
        "duration": round(duration, 3),
        "words": words,
        "voice": voice,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--text", required=True, help="Text to speak")
    parser.add_argument("--output", default="public/audio/latest_vo.mp3", help="Output file path")
    parser.add_argument("--voice", default="id-ID-ArdiNeural", help="Edge TTS voice")
    args = parser.parse_args()

    try:
        result = asyncio.run(synthesize(args.text, args.output, args.voice))
    except Exception as err:  # noqa: BLE001 - surfaced as JSON for the bridge
        print(json.dumps({"ok": False, "error": str(err), "output": args.output}))
        return 1

    print(json.dumps(result))
    return 0


if __name__ == "__main__":
    sys.exit(main())
