---
created: 2026-03-12T02:26:26.870Z
title: Explore event listener for external recording trigger
area: ui
files:
  - src/App.tsx
---

## Problem

Currently users must navigate to the Superwhisper website and manually click the record button to start recording. This is inconvenient when users want to quickly start a recording without switching context to the browser tab.

Users need a way to trigger recording externally without always having to visit the page.

## Solution

Explore event listener approaches that could enable external triggering of recording:

1. **Keyboard shortcuts/hotkeys** - Global keyboard listener to start/stop recording (e.g., `Ctrl+Shift+R`)
2. **Browser extension integration** - Allow a browser extension to send recording commands
3. **PostMessage API** - Listen for messages from parent windows/iframes
4. **Broadcast Channel API** - Cross-tab communication for triggering
5. **Custom protocol handler** - Register a custom URL scheme (e.g., `superwhisper://record`)

Research which approaches are feasible given browser security restrictions and user workflow preferences.
