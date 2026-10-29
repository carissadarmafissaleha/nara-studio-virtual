---
name: remotion
description: Comprehensive Master Guide for Programmatic Video Creation in React with Remotion. Merancang, merakit, menganimasikan, menyinkronkan audio narasi/VO, dan merender video motion graphic profesional (16:9 explainer, 9:16 vertical shorts/TikTok/Reels) secara terprogram menggunakan React, Remotion 4.x, Spring physics, GSAP, Tailwind/CSS, dan CLI hardware-accelerated rendering. Gunakan skill ini setiap kali user meminta membuat video berbasis Remotion, merender MP4, membuat kinetic typography, transisi adegan (Series/TransitionSeries), sinkronisasi voiceover, atau optimasi render performance.
license: MIT
metadata:
  author: NARA Motion Studio & DeepMind Agentic Coding
  version: "2.0.0"
---

# Remotion Master Guide — Programmatic Video Creation in React

Remotion memungkinkan pembuatan video sinematik dengan kode React murni. Setiap frame video diperlakukan sebagai sebuah status deterministik `(frame) => UI`, menghasilkan visual 60 FPS sempurna tanpa jeda atau frame drop.

---

## 1. Arsitektur Komposisi & Root Configuration

### A. Root Entry Point (`Root.tsx`)
```tsx
import { Composition } from 'remotion';
import { MainExplainer } from './compositions/MainExplainer';
import { VerticalShort } from './compositions/VerticalShort';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* 16:9 Landscape Cinematic Explainer */}
      <Composition
        id="MainExplainer-1080p"
        component={MainExplainer}
        durationInFrames={30 * 32} // 32 detik @ 30 FPS = 960 frames
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          title: 'Misteri Mencairnya Puncak Es Dunia',
          author: 'NARA Studio',
          themeColor: '#f97316',
        }}
      />

      {/* 9:16 Vertical TikTok / Reels / Shorts */}
      <Composition
        id="VerticalShort-60fps"
        component={VerticalShort}
        durationInFrames={60 * 15} // 15 detik @ 60 FPS = 900 frames
        fps={60}
        width={1080}
        height={1920}
      />
    </>
  );
};
```

### B. Aturan Durasi & FPS
* **16:9 YouTube / Explainer**: Rekomendasi `30 fps` (seimbang antara rendering speed & kehalusan gerak) atau `60 fps` untuk kinetic typography ultra-crisp.
* **Durasi Frame**: Selalu hitung `durationInFrames = Math.round(seconds * fps)`.
* **Zero Jitter**: Jangan gunakan `setInterval` atau `setTimeout`. Selalu gunakan `useCurrentFrame()` dan `useVideoConfig()`.

---

## 2. Layout & Timeline Primitives

### `AbsoluteFill`
Dasar dari seluruh layer adegan. Otomatis `position: absolute; inset: 0; width: 100%; height: 100%;`:
```tsx
import { AbsoluteFill } from 'remotion';

export const SceneBackground: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: '#090812', overflow: 'hidden' }}>
      {/* Visual content */}
    </AbsoluteFill>
  );
};
```

### `Sequence` vs `Series`
* **`Sequence`**: Menempatkan elemen pada waktu absolut (`from` dan `durationInFrames`). Ideal untuk audio latar, watermark, overlay HUD, atau elemen yang saling tumpang tindih.
* **`Series`**: Mengurutkan adegan secara sekuensial otomatis tanpa perlu menghitung frame offset manual.

```tsx
import { Series, Sequence, Audio, staticFile } from 'remotion';

export const VideoStory: React.FC = () => {
  return (
    <AbsoluteFill>
      {/* Audio Musik Latar Sepanjang Video */}
      <Audio src={staticFile('audio/ambient_score.mp3')} volume={0.35} />

      {/* Urutan Adegan Otomatis */}
      <Series>
        <Series.Sequence durationInFrames={120}>
          <HookScene />
        </Series.Sequence>
        <Series.Sequence durationInFrames={180}>
          <ProblemScene />
        </Series.Sequence>
        <Series.Sequence durationInFrames={240}>
          <SolutionScene />
        </Series.Sequence>
        <Series.Sequence durationInFrames={150}>
          <CallToActionScene />
        </Series.Sequence>
      </Series>
    </AbsoluteFill>
  );
};
```

---

## 3. Fisika Animasi: `spring()` & `interpolate()`

### A. Formula Pegas Alami (`spring()`)
Gunakan `spring()` untuk menghasilkan gerakan fisika nyata (menghilangkan kesan kaku "PowerPoint"):
```tsx
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';

const frame = useCurrentFrame();
const { fps } = useVideoConfig();

// 1. Snappy Pop (Teks/Badge Muncul Menghentak)
const popScale = spring({
  frame,
  fps,
  config: { damping: 10, mass: 0.4, stiffness: 180 },
});

// 2. Smooth Drift (Kamera Meluncur Halus)
const smoothSlide = spring({
  frame,
  fps,
  config: { damping: 20, mass: 1.2, stiffness: 60 },
});

// 3. Bouncy Drop (Ikon/Partikel Jatuh Memantul)
const bounce = spring({
  frame: frame - 10, // delay 10 frames
  fps,
  config: { damping: 8, mass: 0.6, stiffness: 140 },
});
```

### B. Pemetaan Nilai Halus (`interpolate()`)
```tsx
import { interpolate, Easing } from 'remotion';

// Transisi Alpha & Rotasi dengan Easing Bezier
const opacity = interpolate(frame, [0, 20], [0, 1], {
  extrapolateRight: 'clamp',
});

const rotateY = interpolate(frame, [0, 60], [-45, 0], {
  easing: Easing.bezier(0.16, 1, 0.3, 1),
  extrapolateRight: 'clamp',
});
```

---

## 4. Kinetic Typography & Voiceover Sync

### A. Staggered Word Reveal (Teks Muncul Kata per Kata)
```tsx
import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';

interface KineticTextProps {
  sentence: string;
  startFrame?: number;
  wordDelay?: number;
}

export const KineticText: React.FC<KineticTextProps> = ({
  sentence,
  startFrame = 0,
  wordDelay = 4, // 4 frame jarak antar kata
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const words = sentence.split(' ');

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center' }}>
      {words.map((word, idx) => {
        const wordStart = startFrame + idx * wordDelay;
        const progress = spring({
          frame: frame - wordStart,
          fps,
          config: { damping: 12, mass: 0.4, stiffness: 160 },
        });

        const translateY = interpolate(progress, [0, 1], [40, 0]);
        const opacity = interpolate(progress, [0, 1], [0, 1]);

        return (
          <span
            key={idx}
            style={{
              display: 'inline-block',
              transform: `translateY(${translateY}px)`,
              opacity,
              fontSize: '48px',
              fontWeight: 800,
              color: idx === 0 ? '#f97316' : '#ffffff',
              letterSpacing: '-1px',
              fontFamily: "'JetBrains Mono', sans-serif",
            }}
          >
            {word}
          </span>
        );
      })}
    </div>
  );
};
```

### B. Sinkronisasi Voiceover & SFX
* Tempatkan file audio di folder `public/audio/`.
* Gunakan `staticFile('audio/file.mp3')`.
* Buat transisi audio fade in/fade out memakai properti `volume`:
```tsx
<Audio
  src={staticFile('audio/naskah_vo.mp3')}
  volume={(f) =>
    interpolate(f, [0, 15, 880, 900], [0, 1, 1, 0], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    })
  }
/>
```

---

## 5. Async Assets & Preloading (`delayRender`)

Ketika video memuat font kustom, gambar eksternal, atau data API, Remotion HARUS diberi tahu agar tidak merender frame kosong:

```tsx
import { delayRender, continueRender } from 'remotion';
import { useEffect, useState } from 'react';

export const DynamicScene: React.FC = () => {
  const [handle] = useState(() => delayRender('Memuat Font & Asset'));

  useEffect(() => {
    document.fonts.ready.then(() => {
      continueRender(handle);
    });
  }, [handle]);

  return <AbsoluteFill>...</AbsoluteFill>;
};
```

---

## 6. Template & Resep Motion Graphics NARA

### Formula 8 Panggung Sinematik (Anti-PPT)
1. **Scene 1: Cold Hook (00-03s)** $\rightarrow$ Visual misteri + Tipografi kinetik besar.
2. **Scene 2: Problem Stated (04-07s)** $\rightarrow$ Visual es runtuh / grafik merah membara.
3. **Scene 3: Deep Dive Data (08-12s)** $\rightarrow$ Angka statistik berhitung naik (`Math.floor`).
4. **Scene 4: Dynamic Scale Shift (13-16s)** $\rightarrow$ Perubahan skala makro ke mikro.
5. **Scene 5: Human Impact (17-20s)** $\rightarrow$ Karakter kartun bereaksi di canvas.
6. **Scene 6: Solution Revelation (21-25s)** $\rightarrow$ Visual beralih ke warna hijau/oranye terang.
7. **Scene 7: Action Steps (26-29s)** $\rightarrow$ 3 poin kartu melayang 3D.
8. **Scene 8: Climax & CTA (30-32s)** $\rightarrow$ Logo studio pulse + audio whoosh drop.

---

## 7. Eksekusi Render CLI & Hardware Acceleration

### A. Render Video Tunggal (1080p 60fps)
```bash
npx remotion render src/remotion/index.ts MainExplainer-1080p out/output.mp4 --gl=angle
```

### B. Render Cepat dengan Konkurensi Tinggi
```bash
npx remotion render src/remotion/index.ts MainExplainer-1080p out/output.mp4 --concurrency=8 --gl=angle --jpeg-quality=90
```

### C. Flags Rendering Penting
* `--gl=angle`: Menggunakan akselerasi GPU DirectX di Windows (jauh lebih cepat dari software rasterizer).
* `--gl=swiftshader`: Fallback software jika GPU tidak tersedia di container/CI.
* `--concurrency=N`: Jumlah core CPU yang digunakan untuk render paralel.
* `--muted`: Merender tanpa audio stream jika hanya butuh visual.
* `--props='{"title":"Baru"}'`: Melewatkan parameter dinamis via JSON command line.

---

## 8. Panduan Troubleshooting
1. **Layar Hitam / Gambar Tidak Muncul**: Pastikan asset berada di folder `public/` dan dipanggil dengan `staticFile('nama_file')`.
2. **Video Macet Saat Render**: Cek apakah ada infinite loop di `useMemo` atau komponen React yang tidak menutup `delayRender`.
3. **Audio Out of Sync**: Pastikan nilai `fps` komposisi sama persis dengan perhitungan detik voiceover (`seconds = frames / fps`).
