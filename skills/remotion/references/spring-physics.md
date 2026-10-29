# Remotion Spring Physics Cheatsheet

| Feel | Mass | Damping | Stiffness | Best Used For |
|---|---|---|---|---|
| **Punchy Pop** | `0.4` | `10` | `180` | Judul, kata penting, icon pop, button |
| **Snappy Snap** | `0.3` | `12` | `240` | Notification badge, alert, tick checkmark |
| **Smooth Cinematic** | `1.2` | `22` | `65` | Kamera geser, background pan, slide transisi |
| **Bouncy Joy** | `0.6` | `8` | `130` | Kartun melompat, emoticon reaksi, koin |
| **Heavy Impact** | `2.0` | `28` | `90` | Meteor jatuh, palu, teks penutup tebal |

```tsx
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';

export const usePunchySpring = (delay = 0) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({
    frame: frame - delay,
    fps,
    config: { damping: 10, mass: 0.4, stiffness: 180 },
  });
};
```
