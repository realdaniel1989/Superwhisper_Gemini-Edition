# External Integrations

**Analysis Date:** 2026-03-09

## APIs & External Services

**AI/ML Services:**
- Google Gemini AI - Audio transcription service
  - SDK/Client: `@google/genai` v1.29.0
  - Auth: `GEMINI_API_KEY` environment variable
  - Model: `gemini-3.1-flash-lite-preview`
  - Used for: Converting recorded audio to text via streaming API
  - Implementation: `src/App.tsx` lines 5, 84-124

**Browser APIs:**
- MediaRecorder API - Audio recording
  - Used for: Capturing audio from microphone
  - Implementation: `src/App.tsx` lines 129-166

- Web Audio API - Audio analysis
  - Used for: Real-time audio level visualization
  - Implementation: `src/App.tsx` lines 133-148

- Web Speech API - Live transcription preview
  - Used for: Real-time speech-to-text preview during recording
  - Fallback: WebKit Speech Recognition
  - Implementation: `src/App.tsx` lines 172-197

- Clipboard API - Copy to clipboard
  - Used for: Copying transcription text
  - Implementation: `src/App.tsx` lines 226-235

## Data Storage

**Databases:**
- None actively used
  - better-sqlite3 dependency present but not integrated
  - Potential future use for persistent storage

**File Storage:**
- In-memory only - Audio blobs stored in React state during session
- No persistent file storage

**Caching:**
- LocalStorage - Dictation history persistence
  - Key: `dictations`
  - Data: Array of Dictation objects (id, text, timestamp, duration)
  - Implementation: `src/App.tsx` lines 36-64

## Authentication & Identity

**Auth Provider:**
- None - Application has no authentication
  - API key injected at build time by AI Studio platform
  - Users configure secrets via AI Studio UI

## Monitoring & Observability

**Error Tracking:**
- Console logging - Basic error logging
  - Implementation: `src/App.tsx` lines 42, 118, 195, 204, 233

**Logs:**
- Browser console only - No centralized logging

## CI/CD & Deployment

**Hosting:**
- Google Cloud Run - Mentioned in `.env.example`
- AI Studio platform - App hosting and management

**CI Pipeline:**
- None detected - No CI configuration files present

**Build Pipeline:**
- Vite build system
- Static SPA output to `dist/` directory

## Environment Configuration

**Required env vars:**
- `GEMINI_API_KEY` - Google Gemini API authentication (required)
- `APP_URL` - Application URL for Cloud Run deployment

**Optional env vars:**
- `DISABLE_HMR` - Set to 'true' to disable hot module replacement

**Secrets location:**
- AI Studio platform manages secrets
- Users configure via AI Studio Secrets panel
- `.env.local` for local development (gitignored)

## Webhooks & Callbacks

**Incoming:**
- None

**Outgoing:**
- None

## Third-Party SDKs

**Google GenAI SDK:**
```typescript
import { GoogleGenAI } from '@google/genai';
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Usage pattern
const responseStream = await ai.models.generateContentStream({
  model: "gemini-3.1-flash-lite-preview",
  contents: {
    parts: [
      { inlineData: { mimeType: blob.type, data: base64Data } },
      { text: "Transcription prompt..." }
    ]
  }
});
```

**SDK Features Used:**
- Streaming content generation (`generateContentStream`)
- Inline data upload (base64 audio)
- Model: `gemini-3.1-flash-lite-preview`

## Platform-Specific Features

**AI Studio Integration:**
- App ID: `9f7ade62-4e2f-408c-8ff9-217570b4467f`
- Studio URL: https://ai.studio/apps/9f7ade62-4e2f-408c-8ff9-217570b4467f
- Frame permissions: `microphone` required
- Automatic secret injection at runtime

---

*Integration audit: 2026-03-09*
