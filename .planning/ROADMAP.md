# Roadmap: Superwhisper Jedi Edition

## Overview

This roadmap transforms a client-side dictation prototype into a secure, multi-user production application. We build a backend API for secure AI transcription, add Supabase authentication and database storage, and deploy everything to Railway. Each phase delivers a coherent capability that unblocks the next.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Backend API** - Secure transcription proxy with OpenRouter integration
- [x] **Phase 2: Authentication** - User accounts with Supabase Auth (Complete)
- [x] **Phase 3: Database Storage** - Persistent dictations with user ownership (Complete)
- [ ] **Phase 4: Deployment** - Railway deployment for frontend and backend

## Phase Details

### Phase 1: Backend API
**Goal**: A backend server securely proxies transcription requests to OpenRouter, keeping API keys off the client.
**Depends on**: Nothing (first phase)
**Requirements**: BACK-01, BACK-02, BACK-03, BACK-04
**Success Criteria** (what must be TRUE):
  1. Backend server runs locally and responds to health check endpoint
  2. Transcription endpoint accepts audio and returns streaming transcription text
  3. OpenRouter API key is only in backend environment (never exposed to the frontend)
  4. Fallback model is used when primary model fails
**Plans**: 2 plans in 2 waves

Plans:
- [x] 01-01-PLAN.md — Create Express server with health check and transcription endpoint skeleton (Wave 1)
- [x] 01-02-PLAN.md — Integrate OpenRouter with streaming, fallback, and frontend wiring (Wave 2)

### Phase 2: Authentication
**Goal**: Users can create accounts and securely access them from any device.
**Depends on**: Phase 1
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04
**Success Criteria** (what must be TRUE):
  1. User can create account with email and password
  2. User can log in with email and password
  3. User can log out from any page
  4. User stays logged in across browser refreshes
**Plans**: 2 plans in 2 waves

Plans:
- [x] 02-01-PLAN.md — Configure Supabase Auth and add auth context to React app (Wave 1)
- [x] 02-02-PLAN.md — Build login, signup, and logout UI components with auth-gated access (Wave 2)

### Phase 3: Database Storage
**Goal**: Dictations are stored in Supabase database and synced across devices.
**Depends on**: Phase 2
**Requirements**: DATA-01, DATA-02, DATA-03
**Success Criteria** (what must be TRUE):
  1. New dictations are saved to Supabase database automatically
  2. User sees only their own dictations in history
  3. Dictations appear when user logs in from a different device
**Plans**: 2 plans in 2 waves

Plans:
- [x] 03-01-PLAN.md — Create dictations table schema with RLS policies and database CRUD library (Wave 1)
- [x] 03-02-PLAN.md — Replace localStorage with Supabase, add offline detection and toast notifications (Wave 2)

### Phase 4: Deployment
**Goal**: Application is live on Railway with secure configuration.
**Depends on**: Phase 3
**Requirements**: DEPL-01, DEPL-02, DEPL-03
**Success Criteria** (what must be TRUE):
  1. Frontend is accessible at production URL
  2. Transcription requests go through deployed backend (no direct API calls)
  3. Environment variables are configured securely in Railway
**Plans**: TBD

Plans:
- [ ] 04-01: Deploy backend to Railway with environment variables
- [ ] 04-02: Deploy frontend to Railway with backend URL configuration

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Backend API | 2/2 | Complete | 01-01, 01-02 |
| 2. Authentication | 2/2 | Complete | 02-01, 02-02 |
| 3. Database Storage | 2/2 | Complete | 03-01, 03-02 |
| 4. Deployment | 0/2 | Not started | - |
