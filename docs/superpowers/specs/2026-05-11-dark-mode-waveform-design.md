# Dark Mode + Waveform Visualizer — Design Spec

**Date:** 2026-05-11  
**Scope:** In-place UI update to existing React + Vite + Tailwind app  
**Reference:** `mockup-dark.html`  
**Stack:** Unchanged (React 19, Vite 6, Tailwind 4, Express, Railway)

---

## What's changing

The entire visual layer. No backend changes, no new dependencies, no stack migration.

| Layer | Before | After |
|---|---|---|
| Colors | Light (`#fcfcfc`, white cards) | Dark (`#0c0d0e`, `#131416` surfaces) |
| Accent | Neutral-900 / blue-500 | Electric lime `#c6f74e` |
| Recording | Red-500 | Signal red `#ff5d4a` |
| Fonts | System sans-serif | Geist, Geist Mono, Instrument Serif |
| Audio feedback | Scale-pulse on button | Canvas oscilloscope + level meter bars |
| Layout | Single card, header+footer | Top bar → hero headline → surface card → footer |

## What's NOT changing

- React component structure (still one `App.tsx` + `Toast.tsx`)
- API client (`src/lib/api.ts`)
- Server code (`server/`)
- Recording logic (MediaRecorder, AudioContext, AnalyserNode)
- BroadcastChannel, keyboard shortcuts, autostart
- Toast system (just dark-themed)
- Build/deploy pipeline

---

## Design tokens

```css
:root {
  --bg:          #0c0d0e;
  --bg-deep:     #08090a;
  --surface:     #131416;
  --surface-2:   #1a1c1f;
  --line:        #1f2226;
  --line-bright: #2a2e33;
  --fg:          #e8e8e6;
  --fg-dim:      #9b9d9f;
  --fg-mute:     #5a5d62;
  --fg-faint:    #383b40;
  --accent:      #c6f74e;
  --accent-dim:  rgba(198, 247, 78, 0.12);
  --accent-line: rgba(198, 247, 78, 0.4);
  --signal:      #ff5d4a;
  --signal-dim:  rgba(255, 93, 74, 0.10);
}
```

## Fonts

- **Geist** — body text, UI labels, buttons (wght 300–700)
- **Geist Mono** — timers, metadata, keyboard hints
- **Instrument Serif** — italic emphasis in headlines

Loaded via Google Fonts `<link>` in `index.html`.

---

## Component layout (top to bottom)

### 1. Top bar (brand + session meta + shortcut hint)
```
[●] Jedi · Whispers          SESSION 047 · 11.05.26 · whisper-large-v3          ⌘ ⇧ R
```
- Brand mark: small square with lime dot + glow ring
- Session counter: static display (can be random/fixed for v1)
- Shortcut: keyboard glyphs on right

### 2. Hero headline
Dynamic per state:
- Idle: `Speak, and *I'll listen*.`
- Recording: `Listening closely.` (signal red)
- Transcribing: `Turning sound *into words*.`
- Result: `Transcribed. Yours to keep.` (accent lime)

### 3. Surface card

**Strip bar** (top edge):
- Left: status dot + label (STANDBY / RECORDING / TRANSCRIBING / COMPLETE)
- Center: audio specs (static: "Take 01 · 48kHz · MONO")
- Right: timer in `HH:MM:SS` format

**Oscilloscope** (recording only):
- Canvas element, 88px tall, `var(--bg-deep)` background
- Thin lime line trace with leading dot and faint glow trail
- Center-line crosshair (CSS pseudo-element)
- Left label: "CH 01 · INPUT"
- Right: 7-bar level meter (lime bars, signal red for top 2)

**Content area** (per state):
- Idle: prompt text with serif italic emphasis + silence hint
- Recording: live preview text (dimmed) with blinking caret
- Transcribing: label + sliding progress track + meta (model, duration, estimate)
- Result: editable transcription text (full brightness)

**Controls bar** (bottom edge):
- Left: auto-start pill (idle) / REC timer tag (recording) / LEN timer tag (result)
- Center: record button — circle with inner disc; morphs to square when recording, pulse rings animate
- Right: copy / save / discard icon buttons (result only)

### 4. Footer
`Jedi Whispers — set in Geist & Instrument Serif — v 0.4.7`

---

## Waveform implementation

The existing code already creates an `AnalyserNode` with `getByteFrequencyData()`. Change to:

1. **Time-domain trace** (oscilloscope): use `getByteTimeDomainData()` instead of frequency data
2. **Canvas drawing loop** (already have `requestAnimationFrame` loop via `updateAudioLevel`):
   - Shift old points left, append new sample
   - Draw faint glow trail (2.5px, 10% opacity lime)
   - Draw sharp main trace (1.2px, full lime)
   - Draw leading dot with shadow glow
3. **Level meter bars**: compute RMS from the time-domain buffer, map to 0–7 bars
4. **Cleanup**: existing `cancelAnimationFrame` + `audioContext.close()` already handles this

The canvas resizes to parent container via `getBoundingClientRect()` × `devicePixelRatio`.

---

## Files to modify

| File | Change |
|---|---|
| `index.html` | Add Google Fonts `<link>` tags |
| `src/index.css` | Add `:root` custom properties, base dark styles, font declarations, oscilloscope styles |
| `src/App.tsx` | Full JSX rewrite to match layout; swap `getByteFrequencyData` → `getByteTimeDomainData`; add canvas rendering logic; update all color/font classes |
| `src/components/Toast.tsx` | Dark-theme colors for toast notifications |

No new files. No new dependencies.

---

## State preservation

All existing features carry forward unchanged:

- `isRecording`, `recordingTime`, `audioLevel` state
- MediaRecorder + AudioContext + AnalyserNode setup
- BroadcastChannel (`superwhisper-recording`)
- Keyboard shortcut (Cmd/Ctrl+Shift+R)
- URL autostart (`?autostart=true`)
- Clipboard auto-copy on completion
- Offline detection
- Toast notifications
- Live preview via SpeechRecognition API

---

## Execution order

1. **Fonts + tokens** — `index.html` gets font links, `index.css` gets CSS variables and base dark styles
2. **App layout restructure** — rewrite JSX from top bar → hero → surface → controls → footer
3. **Oscilloscope** — add canvas element, switch to time-domain data, implement trace rendering
4. **Level meter** — add 7-bar meter in scope header, driven by RMS from audio buffer
5. **Toast dark theme** — update Toast.tsx colors
6. **Verify** — run dev server, test all 4 states, test recording → transcription flow end-to-end
