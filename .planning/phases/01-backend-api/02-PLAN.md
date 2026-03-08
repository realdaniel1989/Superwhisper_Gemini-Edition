---
phase: 01-backend-api
plan: 02
type: execute
wave: 2
depends_on: [01]
files_modified:
  - server/services/openrouter.ts
  - server/routes/transcribe.ts
  - server/types.ts
  - src/App.tsx
  - src/lib/api.ts
  - .env.example
requirements: [BACK-03, BACK-04]
autonomous: true
must_haves:
  truths:
    - "Frontend POSTs audio to backend, receives streaming transcription text"
    - "OpenRouter API key exists only in backend .env (never in frontend bundle)"
    - "Primary model (gemini-3.1-flash-lite-preview) is tried first"
    - "When primary model fails, fallback model (gemini-2.0-flash-lite) is used automatically"
    - "Streaming text appears in frontend UI as it arrives from backend"
  artifacts:
    - path: "server/services/openrouter.ts"
      provides: "OpenRouter SDK integration with fallback"
      exports: ["streamTranscription"]
      contains: "openrouter.ai/api/v1/chat/completions"
    - path: "server/routes/transcribe.ts"
      provides: "Streaming transcription endpoint"
      contains: "res.write.*chunk"
    - path: "src/lib/api.ts"
      provides: "Frontend API client"
      exports: ["streamTranscription"]
    - path: "src/App.tsx"
      provides: "Updated frontend calling backend"
      pattern: "fetch.*api/transcribe"
  key_links:
    - from: "src/App.tsx"
      to: "/api/transcribe"
      via: "fetch POST with audio blob"
      pattern: "fetch.*transcribe.*body.*FormData"
    - from: "server/routes/transcribe.ts"
      to: "server/services/openrouter.ts"
      via: "streamTranscription function"
      pattern: "streamTranscription\\("
    - from: "server/services/openrouter.ts"
      to: "OpenRouter API"
      via: "fetch to openrouter.ai"
      pattern: "openrouter\\.ai"
---

<objective>
Integrate OpenRouter SDK with streaming and fallback support, then wire frontend to use backend proxy.

Purpose: Complete the secure transcription pipeline - frontend calls backend, backend calls OpenRouter with streaming response, fallback model handles primary failures.
Output: Working end-to-end transcription flow with API key security and model fallback.
</objective>

<execution_context>
@/Users/djedidiahw007/.claude/get-shit-done/workflows/execute-plan.md
@/Users/djedidiahw007/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md

## Plan 01 Deliverables (Required Before This Plan)

From 01-PLAN.md, the following must exist:
- `server/index.ts` - Express server running on port 3001
- `server/routes/health.ts` - GET /health endpoint
- `server/routes/transcribe.ts` - POST /api/transcribe skeleton

## OpenRouter API Details

**Endpoint:** `https://openrouter.ai/api/v1/chat/completions`

**Authentication:** Bearer token in Authorization header
```
Authorization: Bearer sk-or-v1-xxx
```

**Required Headers:**
```
HTTP-Referer: http://localhost:3000
X-Title: Superwhisper Jedi Edition
```

**Primary Model:** `google/gemini-3.1-flash-lite-preview`
**Fallback Model:** `google/gemini-2.0-flash-lite-001`

**Request Format (for audio transcription):**
```json
{
  "model": "google/gemini-3.1-flash-lite-preview",
  "messages": [
    {
      "role": "user",
      "content": [
        {
          "type": "text",
          "text": "Transcribe this audio accurately. Output only the transcription."
        },
        {
          "type": "image_url",
          "image_url": {
            "url": "data:audio/webm;base64,..."
          }
        }
      ]
    }
  ],
  "stream": true
}
```

**Streaming Response Format (SSE):**
```
data: {"choices":[{"delta":{"content":"Hello"}}]}
data: {"choices":[{"delta":{"content":" world"}}]}
data: [DONE]
```

## Current Frontend Code (to be replaced)

From src/App.tsx lines 84-124:
```typescript
// REMOVE THIS - direct Gemini call with exposed API key
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const transcribeAudio = async (blob: Blob, duration: number) => {
  const base64Data = await blobToBase64(blob);
  // ... direct call to Gemini
};
```

This must be replaced with call to our backend.
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create OpenRouter service with streaming and fallback</name>
  <files>server/services/openrouter.ts, server/types.ts</files>
  <action>
    1. Create `server/types.ts`:
       - Export `TranscriptionOptions` interface: `{ model?: string; fallbackModel?: string }`
       - Export `TranscriptionChunk` interface: `{ text: string; done: boolean }`

    2. Create `server/services/openrouter.ts`:

       **Configuration:**
       - API_KEY from process.env.OPENROUTER_API_KEY (throw if missing)
       - PRIMARY_MODEL = "google/gemini-3.1-flash-lite-preview"
       - FALLBACK_MODEL = "google/gemini-2.0-flash-lite-001"
       - API_URL = "https://openrouter.ai/api/v1/chat/completions"

       **Export async function streamTranscription(params):**
       - Parameters: `audioBase64: string`, `mimeType: string`, `onChunk: (text: string) => void`, `options?: TranscriptionOptions`
       - Returns: `Promise<string>` (full transcribed text)

       **Implementation:**
       - Build request body with audio as data URL in content array
       - Set stream: true
       - Try PRIMARY_MODEL first
       - On any error (network, 4xx, 5xx, or parse error), log error and retry with FALLBACK_MODEL
       - Parse SSE stream line by line
       - For each `data: {...}` line (not `[DONE]`), extract `choices[0].delta.content`
       - Call onChunk() with each text chunk as it arrives
       - Accumulate and return full text at end
       - If both models fail, throw error with details

       **Error handling:**
       - Wrap fetch in try/catch
       - Check response.ok before parsing
       - Handle malformed SSE gracefully
       - Log model switches for debugging
  </action>
  <verify>
    <automated>grep -q "openrouter.ai" server/services/openrouter.ts && grep -q "FALLBACK_MODEL" server/services/openrouter.ts && echo "PASS" || echo "FAIL"</automated>
  </verify>
  <done>OpenRouter service exports streamTranscription function with fallback logic; no API key hardcoded</done>
</task>

<task type="auto">
  <name>Task 2: Implement streaming transcription endpoint</name>
  <files>server/routes/transcribe.ts</files>
  <action>
    Update `server/routes/transcribe.ts` to fully implement transcription:

    1. Import streamTranscription from services/openrouter
    2. Use multer or built-in Express middleware for multipart/form-data parsing
       - Install multer: `npm install multer @types/mulittle`
       - Configure to accept single 'audio' field
    3. POST /api/transcribe handler:
       - Extract audio file from req.file
       - Convert buffer to base64
       - Set response headers for SSE:
         - `Content-Type: text/event-stream`
         - `Cache-Control: no-cache`
         - `Connection: keep-alive`
       - Call streamTranscription with:
         - audioBase64 from file buffer
         - mimeType from file mimetype
         - onChunk callback that writes SSE: `res.write(\`data: \${JSON.stringify({text: chunk})}\\n\\n\`)`
       - On completion, send done event: `res.write(\`data: \${JSON.stringify({done: true})}\\n\\n\`)` then `res.end()`
       - On error, send error event: `res.write(\`data: \${JSON.stringify({error: message})}\\n\\n\`)` then `res.end()`
    4. Remove placeholder response from Plan 01
  </action>
  <verify>
    <automated>grep -q "text/event-stream" server/routes/transcribe.ts && grep -q "streamTranscription" server/routes/transcribe.ts && echo "PASS" || echo "FAIL"</automated>
  </verify>
  <done>POST /api/transcribe accepts audio, returns SSE stream with transcription chunks</done>
</task>

<task type="auto">
  <name>Task 3: Create frontend API client and update App.tsx</name>
  <files>src/lib/api.ts, src/App.tsx</files>
  <action>
    1. Create `src/lib/api.ts`:

       **Export async function streamTranscription(audioBlob: Blob): Promise<string>**
       - Create FormData with audio blob
       - POST to `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/transcribe`
       - Read response body as ReadableStream
       - Parse SSE events line by line
       - Accumulate text chunks and return full text

       **SSE Parsing Logic:**
       ```typescript
       const reader = response.body.getReader();
       const decoder = new TextDecoder();
       let buffer = '';
       let fullText = '';

       while (true) {
         const { done, value } = await reader.read();
         if (done) break;
         buffer += decoder.decode(value, { stream: true });
         const lines = buffer.split('\n\n');
         buffer = lines.pop() || '';
         for (const line of lines) {
           if (line.startsWith('data: ')) {
             const data = JSON.parse(line.slice(6));
             if (data.text) fullText += data.text;
             if (data.done) return fullText;
             if (data.error) throw new Error(data.error);
           }
         }
       }
       return fullText;
       ```

    2. Update `src/App.tsx`:

       **Remove:**
       - Import of GoogleGenAI (line 3)
       - `const ai = new GoogleGenAI(...)` (line 5)
       - Remove @google/genai from dependencies (it's no longer needed)

       **Replace transcribeAudio function (lines 84-124):**
       - Import streamTranscription from './lib/api'
       - Call `const text = await streamTranscription(blob);`
       - Update state as text arrives (for now, full text on completion - streaming UI update is optional enhancement)
       - Keep same error handling pattern
       - Keep saveDictation call with text and duration

       **Keep unchanged:**
       - blobToBase64 helper (but it's no longer needed in frontend - remove it)
       - All recording logic
       - All UI rendering
       - History functionality
  </action>
  <verify>
    <automated>grep -q "import.*GoogleGenAI" src/App.tsx && echo "FAIL (still using direct Gemini)" || (grep -q "streamTranscription" src/lib/api.ts && grep -q "api/transcribe" src/lib/api.ts && echo "PASS") || echo "FAIL"</automated>
  </verify>
  <done>Frontend calls backend for transcription; no direct Gemini/OpenRouter calls; no API keys in frontend code</done>
</task>

<task type="auto">
  <name>Task 4: Create .env.example and verify security</name>
  <files>.env.example, .gitignore</files>
  <action>
    1. Create `.env.example`:
       ```
       # Backend only - never exposed to frontend
       OPENROUTER_API_KEY=sk-or-v1-your-key-here
       PORT=3001

       # Frontend (optional - defaults to localhost:3001)
       VITE_API_URL=http://localhost:3001
       ```

    2. Verify `.gitignore` contains `.env` entry

    3. Verify no API keys in source files:
       - Run grep to ensure OPENROUTER_API_KEY only appears in .env.example as placeholder
       - Ensure no sk-or-v1- patterns in any .ts/.tsx files
       - Ensure process.env.GEMINI_API_KEY is removed from App.tsx
  </action>
  <verify>
    <automated>grep -r "sk-or-v1-" src/ server/ 2>/dev/null && echo "FAIL (API key found in source)" || echo "PASS (no API keys in source)"</automated>
  </verify>
  <done>.env.example documents required env vars; .env is gitignored; no API keys in source code</done>
</task>

</tasks>

<verification>
After all tasks complete:
1. Start server: `npm run server:dev`
2. Start frontend: `npm run dev`
3. Record audio in browser UI
4. Verify transcription appears (streaming from backend)
5. Check Network tab: request goes to localhost:3001/api/transcribe, not openrouter.ai
6. Verify no API keys in frontend bundle (check built files)
7. Test fallback: temporarily use invalid primary model name, verify fallback model works
</verification>

<success_criteria>
- [ ] Frontend POSTs audio to backend /api/transcribe
- [ ] Backend streams transcription via SSE
- [ ] OpenRouter API key only in backend .env
- [ ] Primary model (gemini-3.1-flash-lite-preview) used first
- [ ] Fallback model used on primary failure
- [ ] No @google/genai import in frontend
- [ ] No API keys in frontend source or bundle
- [ ] .env.example documents required variables
</success_criteria>

<output>
After completion, create `.planning/phases/01-backend-api/01-02-SUMMARY.md`
</output>
