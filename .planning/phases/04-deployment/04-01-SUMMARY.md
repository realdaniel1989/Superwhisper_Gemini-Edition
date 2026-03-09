---
phase: 04-deployment
plan: 01
subsystem: infra
tags: [express, railway, static-files, spa, deployment]

# Dependency graph
requires:
  - phase: 01-backend-api
    provides: Express server with API routes
  - phase: 02-authentication
    provides: Supabase authentication
  - phase: 03-database-storage
    provides: Supabase database integration
provides:
  - Express server configured to serve frontend static files from dist/
  - Centralized /api prefix for all backend routes
  - SPA fallback for client-side routing
  - Railway-compatible build and start scripts
  - Production-ready VITE_API_URL configuration
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Express static file serving for SPA deployment
    - Centralized route prefixing via app.use('/api', router)
    - SPA fallback pattern with index.html

key-files:
  created: []
  modified:
    - server/index.ts
    - server/routes/health.ts
    - server/routes/transcribe.ts
    - package.json
    - vite.config.ts
    - .env.example

key-decisions:
  - "Centralized /api prefix in index.ts instead of individual route files for cleaner architecture"
  - "SPA fallback serves index.html for all non-API routes to support client-side routing"
  - "VITE_API_URL defaults to empty string in production for same-origin requests"

patterns-established:
  - "Route mounting: app.use('/api', router) applies prefix centrally, route files use relative paths"
  - "Static serving: express.static(dist/) serves frontend build artifacts"
  - "SPA fallback: app.get('*') serves index.html for client-side routing"

requirements-completed: [DEPL-01, DEPL-02, DEPL-03]

# Metrics
duration: 4min
completed: 2026-03-09
---

# Phase 4 Plan 1: Railway Deployment Configuration Summary

**Express server configured to serve React frontend static files with centralized /api prefix for backend routes, SPA fallback for client-side routing, and Railway-compatible build/start scripts.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-09T09:55:45Z
- **Completed:** 2026-03-09T09:59:57Z
- **Tasks:** 6
- **Files modified:** 6

## Accomplishments

- Configured Express to serve frontend static files from dist/ directory
- Centralized /api prefix for all backend routes in index.ts
- Added SPA fallback to serve index.html for client-side routing
- Created Railway-compatible build script (vite build + server:build)
- Created start script to run compiled server from dist-server/
- Updated vite.config.ts for production VITE_API_URL handling

## Task Commits

Each task was committed atomically:

1. **Task 1: Add /api prefix to health route** - `c7e8b41` (feat)
2. **Task 2: Configure Express to serve static files and use /api prefix** - `111e846` (feat)
3. **Task 3: Update route files to use relative paths** - `2404ba6` (refactor)
4. **Task 4: Add Railway build and start scripts to package.json** - `24db0a0` (feat)
5. **Task 5: Update vite.config.ts for VITE_API_URL handling** - `48596e0` (feat)
6. **Task 6: Update .env.example with deployment variables** - `f089b25` (docs)

## Files Created/Modified

- `server/index.ts` - Added static file serving, /api prefix, SPA fallback
- `server/routes/health.ts` - Changed to relative path /health
- `server/routes/transcribe.ts` - Changed to relative path /transcribe
- `package.json` - Added combined build script and start script
- `vite.config.ts` - Updated define for VITE_API_URL handling
- `.env.example` - Documented all required env vars for Railway

## Decisions Made

- **Centralized /api prefix:** Applied prefix in index.ts via `app.use('/api', router)` instead of in individual route files for cleaner, more maintainable architecture
- **SPA fallback:** All non-API routes serve index.html to support React Router and client-side routing
- **Empty VITE_API_URL in production:** Frontend makes same-origin requests in production, development defaults handled in src/lib/api.ts

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all tasks completed successfully.

## User Setup Required

**External services require manual configuration.** See plan frontmatter `user_setup` for:
- Railway project creation from GitHub repo
- Environment variables configuration (OPENROUTER_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY, VITE_API_URL)

## Verification Results

- Build completed successfully: `npm run build` produces dist/ and dist-server/
- dist/index.html exists (frontend build artifact)
- dist-server/index.js compiled correctly with express.static and /api routes
- Server requires OPENROUTER_API_KEY to start (expected for Railway deployment)

## Next Phase Readiness

- Deployment configuration complete, ready for Railway deployment
- User needs to configure Railway project and environment variables
- No blockers or concerns

---
*Phase: 04-deployment*
*Completed: 2026-03-09*

## Self-Check: PASSED

All claimed files and commits verified.
