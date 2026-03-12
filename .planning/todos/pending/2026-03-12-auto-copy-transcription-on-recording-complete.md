---
created: 2026-03-12T02:26:26.870Z
title: Auto-copy transcription on recording complete
area: ui
files:
  - src/App.tsx
---

## Problem

After a recording completes and the transcription is ready, users must manually click the copy button before they can paste the text elsewhere. This adds an extra step and breaks the seamless workflow of: speak → transcribe → paste.

## Solution

Automatically copy the transcription to clipboard when recording completes:

1. **Trigger point**: After transcription finishes (when `isTranscribing` becomes false and transcription has content)
2. **Action**: Call `navigator.clipboard.writeText(transcription)` automatically
3. **Visual feedback**: Brief toast notification "Copied to clipboard" so user knows it's ready to paste
4. **Preserve manual copy**: Keep the existing copy button for re-copying historical transcriptions

Implementation:
- Add auto-copy logic in the transcription completion handler
- Use existing toast system for feedback
- Ensure clipboard API permissions are handled gracefully
