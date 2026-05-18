# Transcript Refinement — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chain an LLM refinement step after Whisper transcription using Groq's `openai/gpt-oss-20b` model to produce polished, readable transcripts.

**Architecture:** The transcribe route calls Whisper, then passes the raw text to a new `refineText()` service that calls Groq's chat completions endpoint. On refinement failure, the raw text is returned with a `refined: false` flag. The client shows a fallback toast when refinement didn't succeed.

**Tech Stack:** Express, Groq Chat Completions API (`openai/gpt-oss-20b`), React (useState + toast)

---

## File Structure

| File | Responsibility |
|---|---|
| `server/services/refine.ts` | **New** — Groq chat completions call for text refinement |
| `server/services/groq.ts` | **Existing** — extract shared `getApiKey()` into this file, import in refine.ts |
| `server/routes/transcribe.ts` | **Modify** — chain refine after Whisper, add `refined` flag |
| `src/lib/api.ts` | **Modify** — return `{ text, refined }` instead of `string` |
| `src/App.tsx` | **Modify** — handle `refined` flag, show fallback toast |
| `.env.example` | **Modify** — comment update only |

---

### Task 1: Create the refinement service

**Files:**
- Create: `server/services/refine.ts`

This service reuses the `getApiKey()` helper from `groq.ts`. Since it's currently a private function, export it first.

- [ ] **Step 1: Export `getApiKey` from `server/services/groq.ts`**

In `server/services/groq.ts`, change:

```typescript
function getApiKey(): string {
```

to:

```typescript
export function getApiKey(): string {
```

- [ ] **Step 2: Create `server/services/refine.ts`**

```typescript
/**
 * Text refinement service using Groq chat completions
 * Fixes punctuation, structure, and contextual accuracy of raw transcripts
 */

import { getApiKey } from './groq.js';

const GROQ_CHAT_URL = 'https://api.groq.com/openai/v1/chat/completions';

const SYSTEM_PROMPT = `You refine raw speech-to-text transcripts. Apply these three layers in one pass:

1. MECHANICAL CLEANUP: Fix punctuation, capitalization, and remove filler words (um, uh, like when used as filler).
2. STRUCTURAL FORMATTING: Detect topic boundaries and insert paragraph breaks. If content is clearly a list, format as bullet points.
3. CONTEXTUAL ACCURACY: Correct likely misheard words using surrounding sentence context (e.g., "solid by" → "sullied" in a Shakespeare context).

Preserve the speaker's original voice and intent. Light sentence restructuring for clarity is acceptable. Do not rewrite or paraphrase. Output only the refined text with no commentary.`;

/**
 * Refine raw transcript text using Groq GPT-OSS-20B
 * @param rawText - Raw Whisper transcription
 * @returns Refined transcript text
 */
export async function refineText(rawText: string): Promise<string> {
  const response = await fetch(GROQ_CHAT_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getApiKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'openai/gpt-oss-20b',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: rawText },
      ],
      temperature: 0.3,
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Groq refinement error (${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as {
    choices: Array<{ message: { content: string } }>;
  };

  return data.choices[0].message.content.trim();
}
```

- [ ] **Step 3: Commit**

```bash
git add server/services/groq.ts server/services/refine.ts
git commit -m "feat: add text refinement service using Groq GPT-OSS-20B"
```

---

### Task 2: Integrate refinement into the transcribe route

**Files:**
- Modify: `server/routes/transcribe.ts`

- [ ] **Step 1: Update the transcribe route**

Replace the full contents of `server/routes/transcribe.ts` with:

```typescript
import express, { Request, Response } from 'express';
import { transcribeAudio } from '../services/groq.js';
import { refineText } from '../services/refine.js';

const router = express.Router();

/**
 * Transcription endpoint
 * Accepts JSON with base64 audio
 * Returns JSON with transcribed text (refined if possible)
 */
router.post('/transcribe', express.json({ limit: '50mb' }), async (req: Request, res: Response) => {
  try {
    const { audio, mimeType } = req.body;

    if (!audio || typeof audio !== 'string') {
      return res.status(400).json({
        error: 'No audio provided',
        message: 'Send JSON { audio: "base64string", mimeType: "audio/webm" }'
      });
    }

    const audioBuffer = Buffer.from(audio, 'base64');
    const type = mimeType || 'audio/webm';

    const rawText = await transcribeAudio(audioBuffer, type);

    // Attempt refinement — fall back to raw text on failure
    let refined = true;
    let text: string;
    try {
      text = await refineText(rawText);
    } catch (err) {
      console.error('Refinement error, returning raw text:', err);
      text = rawText;
      refined = false;
    }

    res.json({ text, refined });
  } catch (error) {
    console.error('Transcription error:', error);
    const message = error instanceof Error ? error.message : 'An error occurred while processing the audio';
    res.status(500).json({ error: message });
  }
});

export default router;
```

- [ ] **Step 2: Commit**

```bash
git add server/routes/transcribe.ts
git commit -m "feat: chain refinement after Whisper in transcribe route"
```

---

### Task 3: Update the frontend API client

**Files:**
- Modify: `src/lib/api.ts`

- [ ] **Step 1: Change return type and destructuring**

Replace the full contents of `src/lib/api.ts` with:

```typescript
/**
 * Frontend API client for transcription
 * Sends audio as base64 JSON to avoid Zscaler multipart inspection
 */

const API_URL = import.meta.env.VITE_API_URL || '';

export interface TranscriptionResult {
  text: string;
  refined: boolean;
}

/**
 * Transcribe audio via the backend server
 * Uses JSON + base64 to avoid corporate proxy issues with multipart uploads
 * @param audioBlob - Audio blob to transcribe
 * @returns Transcribed text and refinement status
 */
export async function streamTranscription(audioBlob: Blob): Promise<TranscriptionResult> {
  // Convert Blob to base64 (text payload, not binary multipart)
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      resolve(dataUrl.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(audioBlob);
  });

  const response = await fetch(`${API_URL}/api/transcribe`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      audio: base64,
      mimeType: audioBlob.type || 'audio/webm',
    }),
  });

  if (!response.ok) {
    throw new Error(`Transcription request failed: ${response.status}`);
  }

  const data = await response.json();
  if (data.error) {
    throw new Error(data.error);
  }

  return {
    text: data.text,
    refined: data.refined !== false, // default to true if field missing
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/api.ts
git commit -m "feat: update API client to return refinement status"
```

---

### Task 4: Update App.tsx to handle refinement fallback

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Update the `transcribeAudio` function**

In `src/App.tsx`, the `transcribeAudio` function at line 278 currently calls `streamTranscription(blob)` and uses the result as a plain string. Update it to destructure the new return type and show a fallback toast.

Replace:

```typescript
  const transcribeAudio = async (blob: Blob, duration: number) => {
    setIsTranscribing(true);
    setTranscription('');
    try {
      const text = await streamTranscription(blob);
      setTranscription(text);

      if (text.trim()) {
        try {
          window.focus();
          if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
            toast("Transcription complete — copied to clipboard", { type: 'success' });
          } else {
            toast("Transcription complete", { type: 'success' });
          }
        } catch (err) {
          console.log('Auto-copy not available:', err);
          toast("Transcription complete", { type: 'success' });
        }
      }
    } catch (error) {
      console.error("Transcription error:", error);
      setTranscription("Error transcribing audio. Please try again.");
    } finally {
      setIsTranscribing(false);
      setLivePreview('');
    }
  };
```

With:

```typescript
  const transcribeAudio = async (blob: Blob, duration: number) => {
    setIsTranscribing(true);
    setTranscription('');
    try {
      const { text, refined } = await streamTranscription(blob);
      setTranscription(text);

      if (text.trim()) {
        try {
          window.focus();
          if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
            toast(
              refined
                ? "Transcription complete — copied to clipboard"
                : "Refinement unavailable — showing raw transcription. Copied to clipboard.",
              { type: refined ? 'success' : 'error' }
            );
          } else {
            toast(
              refined
                ? "Transcription complete"
                : "Refinement unavailable — showing raw transcription.",
              { type: refined ? 'success' : 'error' }
            );
          }
        } catch (err) {
          console.log('Auto-copy not available:', err);
          toast(
            refined
              ? "Transcription complete"
              : "Refinement unavailable — showing raw transcription.",
            { type: refined ? 'success' : 'error' }
          );
        }
      }
    } catch (error) {
      console.error("Transcription error:", error);
      setTranscription("Error transcribing audio. Please try again.");
    } finally {
      setIsTranscribing(false);
      setLivePreview('');
    }
  };
```

- [ ] **Step 2: Commit**

```bash
git add src/App.tsx
git commit -m "feat: handle refinement fallback with toast notification"
```

---

### Task 5: Update .env.example documentation

**Files:**
- Modify: `.env.example`

- [ ] **Step 1: Update comment**

Replace the contents of `.env.example` with:

```
# Groq API key — used for both Whisper transcription and text refinement (GPT-OSS-20B)
GROQ_API_KEY=your_groq_api_key_here
PORT=3001
```

- [ ] **Step 2: Commit**

```bash
git add .env.example
git commit -m "docs: update .env.example with refinement usage note"
```

---

### Task 6: Smoke test

- [ ] **Step 1: Start the dev servers**

```bash
cd /Users/djedidiahw007/Desktop/Project/Superwhisper\ Jedi\ Edition
npm run dev:all
```

- [ ] **Step 2: Open browser to `http://localhost:3000`**

- [ ] **Step 3: Record a short audio clip (5-10 seconds of natural speech with some filler words)**

- [ ] **Step 4: Verify the result appears as refined text (proper punctuation, paragraphs, no filler words)**

- [ ] **Step 5: Check the server console — should see no errors. If refinement fails, verify raw text appears and toast shows fallback message**

- [ ] **Step 6: Commit any fixups**
