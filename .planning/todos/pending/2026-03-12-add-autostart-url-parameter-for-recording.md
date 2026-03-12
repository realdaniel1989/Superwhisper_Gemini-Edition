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

Add URL parameter `autostart=true` check on page load in App.tsx. When present, automatically call `startRecording()` function.

Implementation pattern:
```javascript
const params = new URLSearchParams(window.location.search);
if (params.get('autostart') === 'true') {
  startRecording();
}
```

This should be added in a `useEffect` hook in the App component, ensuring it runs after the component mounts and auth state is resolved.

URL example: `https://superwhispergemini-edition-production.up.railway.app/?autostart=true`
