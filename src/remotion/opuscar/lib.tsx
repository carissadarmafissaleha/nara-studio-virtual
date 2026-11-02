import React, { useEffect, useRef } from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';

/**
 * Lemo-Opuscar Core Library adapted for NARA Studio Virtual (Remotion 4.x + TypeScript)
 * Source: https://github.com/lemomo-ai/lemo-opuscar (MIT License)
 *
 * 100% deterministic helpers: interpolation, Fritsch-Carlson monotone cubic splines,
 * multi-dimensional keyframe tracks, seeded PRNG (mulberry32), 1D/2D value noise,
 * frame-stepped boiling offsets (for crayon / hand-drawn / woodcut / ink styles),
 * and an <OpuscarCanvas> component driven by useCurrentFrame().
 */

export const TAU = Math.PI * 2;

export const clamp = (x: number, a = 0, b = 1): number => Math.max(a, Math.min(b, x));
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const seg = (t: number, a: number, b: number): number => clamp((t - a) / (b - a));

/** Smoothstep (0 -> 1) */
export const ss = (t: number): number => {
  const c = clamp(t);
  return c * c * (3 - 2 * c);
};

/** Cubic ease-in-out */
export const eio = (t: number): number => {
  const c = clamp(t);
  return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2;
};

/** Cubic ease-out */
export const eo = (t: number): number => 1 - Math.pow(1 - clamp(t), 3);

/** Cubic ease-in */
export const ei = (t: number): number => Math.pow(clamp(t), 3);

/** Back ease-out with overshoot */
export const back = (t: number, s = 1.8): number => {
  const c = clamp(t) - 1;
  return 1 + c * c * ((s + 1) * c + s);
};

/** Damped spring settle (0 -> 1) with one or two rebounds */
export const opuscarSpring = (t: number, k = 7, z = 0.35): number => {
  const c = Math.max(0, t);
  return 1 - Math.exp(-z * k * c) * Math.cos(k * Math.sqrt(1 - z * z) * c * 1.6);
};

/** Deterministic Mulberry32 PRNG */
export function mulberry(seed: number): () => number {
  let s = seed | 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic scalar hash (0 -> 1) */
export const hash = (n: number): number => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

/** Deterministic 2D hash (0 -> 1) */
export const hash2 = (x: number, y: number): number => {
  const v = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return v - Math.floor(v);
};

/** 1D Smooth Value Noise */
export const vnoise = (x: number): number => {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return lerp(hash(i), hash(i + 1), u);
};

/** 2D Smooth Value Noise */
export const vnoise2 = (x: number, y: number): number => {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy);
  const b = hash2(ix + 1, iy);
  const c = hash2(ix, iy + 1);
  const d = hash2(ix + 1, iy + 1);
  return lerp(lerp(a, b, ux), lerp(c, d, ux), uy);
};

/** 3-Octave Fractal Brownian Motion (Paper Tooth / Ink Granulation) */
export const fbm2 = (x: number, y: number): number => {
  return 0.5 * vnoise2(x, y) + 0.3 * vnoise2(x * 2.03, y * 2.03) + 0.2 * vnoise2(x * 4.07, y * 4.07);
};

/**
 * Fritsch–Carlson Monotone Cubic Interpolation
 * Takes keyframes `[[t0, y0], [t1, y1], ...]` and returns `t => y` without unnatural overshoot.
 */
export function monotone(keys: ReadonlyArray<readonly [number, number]>): (t: number) => number {
  const n = keys.length;
  const xs = keys.map((k) => k[0]);
  const ys = keys.map((k) => k[1]);
  if (n === 1) return () => ys[0];

  const d: number[] = [];
  const m: number[] = new Array(n).fill(0);
  for (let i = 0; i < n - 1; i++) {
    d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
  }
  m[0] = d[0];
  m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) {
    m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  }
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const a = m[i] / d[i];
    const b = m[i + 1] / d[i];
    const s = a * a + b * b;
    if (s > 9) {
      const k = 3 / Math.sqrt(s);
      m[i] = k * a * d[i];
      m[i + 1] = k * b * d[i];
    }
  }
  return (t: number) => {
    if (t <= xs[0]) return ys[0];
    if (t >= xs[n - 1]) return ys[n - 1];
    let i = 0;
    while (t > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i];
    const u = (t - xs[i]) / h;
    const u2 = u * u;
    const u3 = u2 * u;
    return (
      (2 * u3 - 3 * u2 + 1) * ys[i] +
      (u3 - 2 * u2 + u) * h * m[i] +
      (-2 * u3 + 3 * u2) * ys[i + 1] +
      (u3 - u2) * h * m[i + 1]
    );
  };
}

/**
 * Multi-dimensional keyframe spline track:
 * `[[t0, [x0, y0, scale0]], [t1, [x1, y1, scale1]], ...]` -> `t => [x, y, scale]`
 */
export function track(keys: ReadonlyArray<readonly [number, ReadonlyArray<number>]>): (t: number) => number[] {
  const dim = keys[0][1].length;
  const fs: Array<(t: number) => number> = [];
  for (let j = 0; j < dim; j++) {
    fs.push(monotone(keys.map((k) => [k[0], k[1][j]] as const)));
  }
  return (t: number) => fs.map((f) => f(t));
}

/** 0 -> 1 -> 0 envelope over [a, b] with fade-in `fi` and fade-out `fo` */
export const env = (t: number, a: number, b: number, fi = 0.3, fo = 0.3): number =>
  Math.min(seg(t, a, a + fi), 1 - seg(t, b - fo, b));

/**
 * Frame-stepped boiling offset for hand-drawn styles (crayon-book, whiteboard, ink-wash, rubber-hose).
 * Steps every `stepFrames` (default 2 frames = 15fps at 30fps or 12fps at 24fps).
 */
export function boilOffset(
  frame: number,
  seedId: number,
  amplitude = 1.5,
  stepFrames = 2
): { dx: number; dy: number; rot: number } {
  const stepped = Math.floor(frame / stepFrames);
  const dx = (hash(stepped * 19.7 + seedId * 7.3) - 0.5) * 2 * amplitude;
  const dy = (hash(stepped * 31.1 + seedId * 13.9) - 0.5) * 2 * amplitude;
  const rot = (hash(stepped * 47.3 + seedId * 23.1) - 0.5) * 2 * amplitude * 0.6;
  return { dx, dy, rot };
}

/**
 * Draw a crayon / hand-boiled stroke on a 2D Canvas context
 */
export function drawCrayonLine(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  options: {
    color?: string;
    width?: number;
    frame?: number;
    seed?: number;
    progress?: number;
  } = {}
) {
  const { color = '#3b2f2f', width = 6, frame = 0, seed = 1, progress = 1 } = options;
  const p = clamp(progress, 0, 1);
  if (p <= 0) return;

  const boilSeed = Math.floor(frame / 2) * 37 + seed;
  const steps = Math.max(8, Math.floor(Math.hypot(x2 - x1, y2 - y1) / 8));
  const maxStep = Math.ceil(steps * p);

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Main dense core + 1 textured streak
  for (let pass = 0; pass < 2; pass++) {
    ctx.beginPath();
    ctx.lineWidth = pass === 0 ? width : width * 0.45;
    ctx.globalAlpha = pass === 0 ? 0.92 : 0.45;
    for (let i = 0; i <= maxStep; i++) {
      const u = i / steps;
      const wobX = (vnoise(u * 6 + boilSeed + pass * 11) - 0.5) * 3.2;
      const wobY = (vnoise(u * 6 + boilSeed + 50 + pass * 17) - 0.5) * 3.2;
      const px = lerp(x1, x2, u) + wobX;
      const py = lerp(y1, y2, u) + wobY;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }
  ctx.restore();
}

export interface OpuscarCanvasProps {
  width?: number;
  height?: number;
  style?: React.CSSProperties;
  draw: (ctx: CanvasRenderingContext2D, timeSec: number, frame: number, width: number, height: number) => void;
}

/**
 * Deterministic HTML5 2D Canvas wrapper for Remotion compositions.
 * Automatically re-draws on every Remotion frame.
 */
export const OpuscarCanvas: React.FC<OpuscarCanvasProps> = ({
  width = 1080,
  height = 1040,
  style,
  draw,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const timeSec = frame / fps;

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    ctx.save();
    ctx.clearRect(0, 0, width, height);
    draw(ctx, timeSec, frame, width, height);
    ctx.restore();
  }, [frame, timeSec, width, height, draw]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{
        display: 'block',
        width,
        height,
        pointerEvents: 'none',
        ...style,
      }}
    />
  );
};
