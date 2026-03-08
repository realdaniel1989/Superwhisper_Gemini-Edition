---
phase: 01-backend-api
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - server/index.ts
  - server/routes/health.ts
  - server/routes/transcribe.ts
  - server/middleware/cors.ts
  - tsconfig.server.json
  - package.json
requirements: [BACK-01, BACK-02]
autonomous: true
must_haves:
  truths:
    - "Backend server starts and listens on configured port"
    - "GET /health returns 200 with status ok"
    - "POST /api/transcribe accepts multipart/form-data with audio file"
    - "Server reads OPENROUTER_API_KEY from environment (not hardcoded)"
  artifacts:
    - path: "server/index.ts"
      provides: "Express server entry point"
      exports: ["app", "server"]
    - path: "server/routes/health.ts"
      provides: "Health check endpoint"
      contains: "GET /health"
    - path: "server/routes/transcribe.ts"
      provides: "Transcription endpoint (skeleton)"
      contains: "POST /api/transcribe"
  key_links:
    - from: "server/index.ts"
      to: "server/routes/health.ts"
      via: "import and app.use"
      pattern: "import.*health"
    - from: "server/index.ts"
      to: "server/routes/transcribe.ts"
      via: "import and app.use"
      pattern: "import.*transcribe"
---

<objective>
Create Express backend server with health check and transcription endpoint skeleton.

Purpose: Establish the backend infrastructure that will securely proxy transcription requests to OpenRouter, removing API key exposure from the client.
Output: Running Express server with /health and /api/transcribe endpoints ready for OpenRouter integration.
</objective>

<execution_context>
@/Users/djedidiahw007/.claude/get-shit-done/workflows/execute-plan.md
@/Users/djedidiahw007/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md

## Current Frontend Pattern (to be replaced)

The frontend currently calls Gemini directly (SECURITY ISSUE - to be fixed in Plan 02):

```typescript
// src/App.tsx lines 84-124 (current - will change)
const transcribeAudio = async (blob: Blob, duration: number) => {
  const base64Data = await blobToBase64(blob);
  const responseStream = await ai.models.generateContentStream({
    model: "gemini-3.1-flash-lite-preview",
    contents: { parts: [audioPart, { text: "..." }] }
  });
  // Streaming via async iteration
  for await (const chunk of responseStream) {
    fullText += chunk.text;
    setTranscription(fullText);
  }
};
```

## Dependencies Already Available

From package.json:
- express: ^4.21.2
- dotenv: ^17.2.3
- tsx: ^4.21.0 (for running TypeScript server)
- @types/express: ^4.17.21

## Environment Variables Required

Create `.env` in project root (NOT in server/):
```
OPENROUTER_API_KEY=sk-or-v1-xxx
PORT=3001
```
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create server directory structure and TypeScript config</name>
  <files>server/index.ts, tsconfig.server.json, package.json</files>
  <action>
    1. Create `server/` directory for backend code (separate from frontend src/)
    2. Create `tsconfig.server.json` extending main tsconfig but targeting ES2022 for Node.js:
       - module: "NodeNext"
       - moduleResolution: "NodeNext"
       - outDir: "./dist-server"
       - rootDir: "./server"
    3. Update package.json scripts:
       - Add `"server:dev": "tsx watch server/index.ts"`
       - Add `"server:build": "tsc --project tsconfig.server.json"`
       - Add `"dev:all": "npm run dev & npm run server:dev"`
    4. Create `server/index.ts` with basic Express setup:
       - Import express, cors middleware (will create in Task 3)
       - Load dotenv config at top
       - Create Express app
       - Listen on process.env.PORT || 3001
       - Log startup message with port number
  </action>
  <verify>
    <automated>npx tsc --noEmit --project tsconfig.server.json 2>&1 | head -20</automated>
  </verify>
  <done>TypeScript compiles without errors, server directory exists with index.ts entry point</done>
</task>

<task type="auto">
  <name>Task 2: Create health check endpoint</name>
  <files>server/routes/health.ts</files>
  <action>
    Create `server/routes/health.ts`:
    - Export Express Router
    - GET /health endpoint returning JSON: `{ status: "ok", timestamp: new Date().toISOString() }`
    - No authentication required for health check
    - Include simple error handling wrapper

    In server/index.ts, import and mount at root level: `app.use(healthRouter)`
  </action>
  <verify>
    <automated>curl -s http://localhost:3001/health 2>/dev/null | grep -q '"status":"ok"' && echo "PASS" || echo "FAIL (start server first: npm run server:dev)"</automated>
  </verify>
  <done>GET /health returns 200 with `{ status: "ok", timestamp: "..." }`</done>
</task>

<task type="auto">
  <name>Task 3: Create CORS middleware and transcription endpoint skeleton</name>
  <files>server/middleware/cors.ts, server/routes/transcribe.ts</files>
  <action>
    1. Create `server/middleware/cors.ts`:
       - Configure CORS to allow frontend origin (http://localhost:3000 in dev)
       - Allow Content-Type, Authorization headers
       - Allow GET, POST, OPTIONS methods

    2. Create `server/routes/transcribe.ts`:
       - Export Express Router
       - POST /api/transcribe endpoint (skeleton for Plan 02):
         - Accept multipart/form-data with audio file
         - For now, return placeholder response: `{ message: "Transcription endpoint ready", audioReceived: boolean }`
         - Validate audio file presence in request
       - Use express.json() and express.raw() for body parsing

    3. In server/index.ts:
       - Import and use CORS middleware
       - Mount transcribe router at /api
  </action>
  <verify>
    <automated>curl -s -X POST http://localhost:3001/api/transcribe -F "audio=@/dev/null" 2>/dev/null | grep -q "Transcription endpoint ready" && echo "PASS" || echo "FAIL"</automated>
  </verify>
  <done>POST /api/transcribe accepts multipart audio and returns placeholder response; CORS configured for frontend origin</done>
</task>

</tasks>

<verification>
After all tasks complete:
1. Run `npm run server:dev` - server starts without errors
2. Run `curl http://localhost:3001/health` - returns `{"status":"ok",...}`
3. Run `curl -X POST http://localhost:3001/api/transcribe -F "audio=@test.webm"` - returns placeholder response
4. Verify no OPENROUTER_API_KEY hardcoded in any file (only in .env)
</verification>

<success_criteria>
- [ ] Express server runs on port 3001
- [ ] GET /health returns 200 with status ok
- [ ] POST /api/transcribe accepts audio file upload
- [ ] CORS configured for localhost:3000 (frontend)
- [ ] No API keys in source code (env vars only)
- [ ] TypeScript compiles without errors
</success_criteria>

<output>
After completion, create `.planning/phases/01-backend-api/01-01-SUMMARY.md`
</output>
