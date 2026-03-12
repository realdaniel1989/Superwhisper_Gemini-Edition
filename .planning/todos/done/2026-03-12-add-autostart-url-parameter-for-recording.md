---
created: 2026-03-12T02:16:05.903Z
title: Add autostart URL parameter for recording
area: ui
files:
  - src/App.tsx:84
  - src/App.tsx:253
---

## Problem

Users need a way to automatically start recording when visiting with a specific URL parameter. This is useful for:
- Quick access via bookmark or shortcut
- Automation workflows
- Integration with other tools that can launch URLs

Currently, users must manually click the record button each time.

## Solution

Add URL parameter `autostart=true` check on page load in App.tsx, plus a toggle button for user control.

**Features:**
1. **URL parameter detection** - `?autostart=true` triggers recording on page load
2. **Toggle button** - UI control to turn autostart on/off
3. **Auth handling** - If user not logged in, autostart is OFF until they manually toggle it ON

**Implementation:**
- Add `autostartEnabled` state (default: true if logged in, false if not)
- Add toggle button in UI (could be near record button or in a settings area)
- Add useEffect that checks URL param + autostartEnabled state before triggering
- Keep URL param in address bar (don't clear it)

**Logic flow:**
```
On page load with ?autostart=true:
  - If loading → wait
  - If offline → skip
  - If not logged in → set autostartEnabled = false, don't record
  - If logged in AND autostartEnabled → startRecording()
```

**UI considerations:**
- Toggle could be a small switch/button near the mic button
- Visual indicator when autostart is enabled
- Maybe a toast when autostart is disabled due to not being logged in

URL example: `https://superwhispergemini-edition-production.up.railway.app/?autostart=true`
