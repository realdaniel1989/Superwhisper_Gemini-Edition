# Requirements: Superwhisper Jedi Edition

**Defined:** 2026-03-09
**Core Value:** Users can dictate text with their voice and get accurate transcriptions instantly, accessible from any device.

## v1 Requirements

Requirements for production deployment. Each maps to roadmap phases.

### Authentication

- [ ] **AUTH-01**: User can create account with email and password
- [ ] **AUTH-02**: User can log in with email and password
- [ ] **AUTH-03**: User can log out
- [ ] **AUTH-04**: User session persists across browser refresh

### Backend Infrastructure

- [x] **BACK-01**: Backend API server deployed on Railway
- [x] **BACK-02**: API endpoint for transcription requests
- [ ] **BACK-03**: OpenRouter integration with Gemini 3.1 Flash Lite Preview
- [ ] **BACK-04**: Fallback model support when primary unavailable

### Database

- [ ] **DATA-01**: Dictations stored in Supabase database
- [ ] **DATA-02**: User can only access their own dictations
- [ ] **DATA-03**: Dictations synced across devices (via database)

### Frontend Deployment

- [ ] **DEPL-01**: React app deployed to Railway
- [ ] **DEPL-02**: Frontend calls backend API (no direct OpenRouter calls)
- [ ] **DEPL-03**: Environment variables securely configured

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Enhancements
- **ENHC-01**: OAuth providers (Google, GitHub login)
- **ENHC-02**: Audio file storage for re-transcription
- **ENHC-03**: Export dictations (PDF, TXT)
- **ENHC-04**: Dictation folders/organization

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Real-time collaboration | Single-user experience |
| Mobile native app | Web-first approach |
| Video transcription | Audio only |
| Audio file storage | Transient recordings, only text stored |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 2 | Pending |
| AUTH-02 | Phase 2 | Pending |
| AUTH-03 | Phase 2 | Pending |
| AUTH-04 | Phase 2 | Pending |
| BACK-01 | Phase 1 | Complete |
| BACK-02 | Phase 1 | Complete |
| BACK-03 | Phase 1 | Pending |
| BACK-04 | Phase 1 | Pending |
| DATA-01 | Phase 3 | Pending |
| DATA-02 | Phase 3 | Pending |
| DATA-03 | Phase 3 | Pending |
| DEPL-01 | Phase 4 | Pending |
| DEPL-02 | Phase 4 | Pending |
| DEPL-03 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 14 total
- Mapped to phases: 14
- Unmapped: 0

---
*Requirements defined: 2026-03-09*
*Last updated: 2026-03-09 after roadmap creation*
