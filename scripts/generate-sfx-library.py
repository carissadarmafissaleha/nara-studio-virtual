"""
Deterministic transition SFX library for NARA Studio videos.

Everything is synthesised with the Python standard library (wave + math), so the
library can be rebuilt offline and every render sounds identical:

    python scripts/generate-sfx-library.py

Output (public/audio/sfx/):
    whoosh.wav   scene change, 0.9 s
    riser.wav    build-up before a reveal, 1.2 s
    impact.wav   opening hit / final card, 0.8 s
    tick.wav     small accent, 0.14 s

Kept deliberately short and quiet: the mix uses them at ~0.16-0.2 volume, under
the narration, never as a music bed.
"""

import math
import os
import random
import struct
import wave

SAMPLE_RATE = 44100
OUTPUT_DIR = os.path.join("public", "audio", "sfx")


def _write(path: str, samples: list[float]) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    peak = max(1e-6, max(abs(s) for s in samples))
    scale = 0.85 / peak
    with wave.open(path, "wb") as handle:
        handle.setnchannels(1)
        handle.setsampwidth(2)
        handle.setframerate(SAMPLE_RATE)
        frames = b"".join(
            struct.pack("<h", int(max(-1.0, min(1.0, s * scale)) * 32767)) for s in samples
        )
        handle.writeframes(frames)


def _envelope(t: float, duration: float, attack: float, release: float) -> float:
    head = min(1.0, t / max(1e-4, attack))
    tail = min(1.0, max(0.0, duration - t) / max(1e-4, release))
    return max(0.0, min(head, tail))


def whoosh(duration: float = 0.9) -> list[float]:
    rng = random.Random(20261027)
    total = int(duration * SAMPLE_RATE)
    out: list[float] = []
    noise = 0.0
    for i in range(total):
        t = i / SAMPLE_RATE
        progress = t / duration
        # Centre-weighted envelope: air rushing past, then gone.
        env = math.sin(math.pi * progress) ** 1.6
        cutoff = 0.05 + 0.32 * math.sin(math.pi * progress)
        noise += cutoff * (rng.uniform(-1.0, 1.0) - noise)
        tone = math.sin(2 * math.pi * (220 + 520 * progress) * t) * 0.18
        out.append((noise * 1.25 + tone) * env)
    return out


def riser(duration: float = 1.2) -> list[float]:
    total = int(duration * SAMPLE_RATE)
    out: list[float] = []
    phase = 0.0
    for i in range(total):
        t = i / SAMPLE_RATE
        progress = t / duration
        freq = 160 + 780 * (progress ** 1.7)
        phase += 2 * math.pi * freq / SAMPLE_RATE
        tremolo = 0.75 + 0.25 * math.sin(2 * math.pi * (4 + 10 * progress) * t)
        env = (progress ** 1.8) * _envelope(t, duration, 0.02, 0.12)
        out.append((math.sin(phase) * 0.7 + math.sin(phase * 2.01) * 0.2) * env * tremolo)
    return out


def impact(duration: float = 0.8) -> list[float]:
    rng = random.Random(771)
    total = int(duration * SAMPLE_RATE)
    out: list[float] = []
    phase = 0.0
    for i in range(total):
        t = i / SAMPLE_RATE
        freq = 42 + 120 * math.exp(-t * 9)
        phase += 2 * math.pi * freq / SAMPLE_RATE
        body = math.sin(phase) * math.exp(-t * 4.2)
        click = rng.uniform(-1.0, 1.0) * math.exp(-t * 60) * 0.35
        out.append(body + click)
    return out


def tick(duration: float = 0.14) -> list[float]:
    total = int(duration * SAMPLE_RATE)
    out: list[float] = []
    for i in range(total):
        t = i / SAMPLE_RATE
        env = math.exp(-t * 38)
        out.append((math.sin(2 * math.pi * 1480 * t) * 0.6 + math.sin(2 * math.pi * 2960 * t) * 0.2) * env)
    return out


def main() -> None:
    sounds = {
        "whoosh.wav": whoosh(),
        "riser.wav": riser(),
        "impact.wav": impact(),
        "tick.wav": tick(),
    }
    for name, samples in sounds.items():
        path = os.path.join(OUTPUT_DIR, name)
        _write(path, samples)
        print(f"SUCCESS: {path}")


if __name__ == "__main__":
    main()
