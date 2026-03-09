# Phase 4: Deployment - Context

**Gathered:** 2026-03-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Deploy the application to Railway with secure configuration — frontend and backend both go live. Environment variables are configured securely, with API keys never exposed to the client.

</domain>

<decisions>
## Implementation Decisions

### Service Strategy
- Single Railway service (monorepo) — frontend and backend deploy together
- Express serves frontend static files from `dist/` directory
- Single PORT — Railway auto-assigns, Express listens on `process.env.PORT`
- Build order: frontend first (`vite build`), then backend (`tsc`)

### Backend URL Configuration
- Build-time env var — `VITE_API_URL` baked into frontend bundle at build time
- Same origin calls — frontend calls backend at relative paths (no absolute URL in prod)
- `/api` prefix for all backend routes (e.g., `/api/health`, `/api/transcribe`)
- Empty string for production `VITE_API_URL`, `http://localhost:3001` for dev

### Domain Handling
- Use Railway's auto-generated URL (e.g., `xxx.up.railway.app`)
- Automatic HTTPS — Railway provides SSL certs, no manual config needed
- Custom domain deferred to future if needed

### Start Command
- Nixpacks auto-detection — Railway detects Node.js and uses npm scripts
- Add `build` script: builds frontend + backend
- Add `start` script: runs compiled server that serves static files
- Default health check — Railway pings `/`, `/api/health` responds with 200

### Claude's Discretion
- Exact build script commands
- How to wire Express static file serving
- Error handling for build failures

</decisions>

<specifics>
## Specific Ideas

- Keep it simple — Railway's defaults work well for this stack
- One-click deploy experience if possible

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `server/index.ts`: Express app with middleware and routes — needs static file serving added
- `server/routes/health.ts`: `/health` endpoint — rename to `/api/health` or add prefix in index.ts
- `server/routes/transcribe.ts`: `/transcribe` endpoint — needs `/api` prefix
- `vite.config.ts`: Already configured for production builds

### Established Patterns
- Backend proxy pattern: API keys stay server-side only
- Environment variables via dotenv in backend, Vite's loadEnv in frontend
- CORS middleware already exists in `server/middleware/cors.ts`

### Integration Points
- Frontend currently calls `http://localhost:3001/transcribe` — needs to use `VITE_API_URL` env var
- Backend needs to serve `dist/` folder as static files
- All backend routes need `/api` prefix (either in route definitions or app.use)

</code_context>

<deferred>
## Deferred Ideas

- Custom domain configuration — future enhancement if Railway URL isn't sufficient
- Separate frontend/backend services — not needed for v1 scale
- CI/CD pipeline beyond Railway's auto-deploy — future enhancement

</deferred>

---

*Phase: 04-deployment*
*Context gathered: 2026-03-09*
