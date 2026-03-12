# Superwhisper Remote Extension

Trigger Superwhisper recording from anywhere with global keyboard shortcuts.

## Installation

### Chrome / Edge (Chromium)

1. Open Chrome/Edge and go to `chrome://extensions/` (or `edge://extensions/`)
2. Enable **Developer mode** (toggle in top-right corner)
3. Click **Load unpacked**
4. Select this `extension` folder
5. The extension icon should appear in your toolbar

### Firefox

1. Open Firefox and go to `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on**
3. Select the `manifest.json` file in this folder

## Keyboard Shortcuts

| Mac | Windows | Action |
|-----|---------|--------|
| `Cmd+Option+R` | `Ctrl+Shift+R` | Toggle recording |
| `Cmd+Option+S` | `Ctrl+Shift+S` | Start recording |
| `Cmd+Option+X` | `Ctrl+Shift+X` | Stop recording |

**Note:** `Cmd+Shift+R` is reserved by macOS (opens AirDrop), so we use `Cmd+Option+R` instead.

**Global shortcuts:** On Windows, shortcuts work globally. On Mac, you may need to set them as "Global" in `chrome://extensions/shortcuts`.

## Customizing Shortcuts

### Chrome
1. Go to `chrome://extensions/shortcuts`
2. Find "Superwhisper Remote"
3. Click the pencil icon to change shortcuts

### Edge
1. Go to `edge://extensions/shortcuts`
2. Find "Superwhisper Remote"
3. Click the pencil icon to change shortcuts

## Requirements

- Superwhisper must be running at `http://localhost:3000`
- You must be logged in to Superwhisper

## How It Works

1. Press the keyboard shortcut from any application
2. Extension finds the Superwhisper tab
3. Extension sends a command via BroadcastChannel
4. Superwhisper starts/stops recording
5. Tab is focused so you can see the result

## Troubleshooting

**Shortcut doesn't work:**
- Make sure the extension is enabled
- Check if another app is using the same shortcut
- Try customizing the shortcut in Chrome's extension settings

**"Superwhisper not found" notification:**
- Make sure Superwhisper is running at localhost:3000
- Check that the tab wasn't closed

**Recording doesn't start:**
- Make sure you're logged in to Superwhisper
- Check browser console for errors
