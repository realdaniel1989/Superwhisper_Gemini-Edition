# Architecture

## Pattern
Single-Page Application (SPA) with monolithic React component structure.

## Layers

### 1. Presentation Layer
- `src/App.tsx` - Single 421-line component containing all UI logic
- `src/index.css` - Global styles
- Uses Tailwind CSS for styling

### 2. State Management Layer
- React `useState` hooks for local state
- `useRef` hooks for mutable references (MediaRecorder, timers)
- `useEffect` for side effects (localStorage sync)

### 3. Audio Processing Layer
- Web Audio API (`AudioContext`, `AnalyserNode`) for audio level visualization
- MediaRecorder API for audio capture
- Blob to Base64 conversion for API transmission

### 4. External Integration Layer
- Google Gemini AI API for transcription
- Browser Speech Recognition API for live preview

### 5. Persistence Layer
- localStorage for dictation history
- No backend/database

## Data Flow

```
User clicks record
    ↓
MediaRecorder captures audio
    ↓
AudioContext analyzes levels (visual feedback)
    ↓
User stops recording
    ↓
Audio chunks → Blob → Base64
    ↓
Gemini API streaming transcription
    ↓
Transcription displayed in textarea
    ↓
Save to localStorage (if text exists)
```

## Entry Points

| File | Purpose |
|------|---------|
| `index.html` | HTML entry, loads Vite module |
| `src/main.tsx` | React entry, renders App component |
| `src/App.tsx` | Main application logic |

## Key Abstractions

### Dictation Interface
```typescript
interface Dictation {
  id: string;      // timestamp-based unique ID
  text: string;    // transcription content
  timestamp: number; // creation time
  duration: number;  // recording length in seconds
}
```

### Core Functions
- `startRecording()` - Initializes MediaRecorder, AudioContext, SpeechRecognition
- `stopRecording()` - Finalizes recording, triggers transcription
- `transcribeAudio(blob, duration)` - Sends to Gemini API, handles streaming response
- `blobToBase64(blob)` - Converts audio Blob to Base64 string

## Current Limitations

1. **Monolithic component** - All logic in single file (421 lines)
2. **No component decomposition** - No reusable UI components
3. **No custom hooks** - Logic could be extracted for reusability
4. **Client-side only** - API key exposed in bundle
