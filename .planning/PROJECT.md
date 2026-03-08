# Superwhisper Jedi Edition

## What This Is

A voice dictation web application that transcribes audio to text using AI. Users can record their voice, receive real-time streaming transcriptions, and manage their dictation history. The app is being upgraded from a client-side only prototype to a fully deployed, multi-user application with secure API handling.

## Core Value

Users can dictate text with their voice and get accurate transcriptions instantly, accessible from any device.

## Requirements

### Validated

Features already working in the existing codebase:

- ✓ Voice recording with MediaRecorder API — existing
- ✓ Live audio level visualization during recording — existing
- ✓ AI-powered transcription with streaming response — existing
- ✓ Dictation history with timestamps and duration — existing
- ✓ Copy transcription to clipboard — existing
- ✓ Delete individual dictations — existing
- ✓ Load past dictations from history — existing
- ✓ Responsive UI with Tailwind CSS — existing

### Active

New features to build for production deployment:

- [ ] User authentication via Supabase (signup, login, logout)
- [ ] Dictation storage in Supabase database (replace localStorage)
- [ ] Backend API server for secure OpenRouter proxy
- [ ] OpenRouter integration with Gemini 3.1 Flash Lite Preview
- [ ] Fallback model support via OpenRouter
- [ ] Railway deployment for frontend and backend

### Out of Scope

- Audio file storage in Supabase — recordings are transient, only transcriptions stored
- Real-time collaboration — single-user experience
- Mobile native app — web-first approach
- OAuth providers (Google, GitHub) — email/password sufficient for v1
- Video transcription — audio only

## Context

**Current State:**
- Working prototype with client-side only architecture
- API key exposed in client bundle (security issue)
- localStorage limits users to single device
- Monolithic React component (421 lines in `src/App.tsx`)
- Express and better-sqlite3 in dependencies but unused

**Technical Background:**
- React 19 with Vite build system
- Tailwind CSS for styling
- @google/genai SDK currently used for transcription
- Web Audio API for recording visualization
- TypeScript throughout

**Known Issues to Address:**
- API key security (being fixed with backend proxy)
- Memory leaks in AudioContext cleanup
- No test coverage
- Browser compatibility for Speech Recognition API

## Constraints

- **Tech Stack:** Must use Supabase for auth/database, Railway for hosting, OpenRouter for AI API
- **Model:** Primary model is Gemini 3.1 Flash Lite Preview via OpenRouter
- **Deployment:** Both frontend and backend deploy to Railway
- **Security:** API keys must never be exposed to client

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Supabase over custom backend | Built-in auth, real-time sync, managed database | — Pending |
| OpenRouter over direct Gemini | Fallback models, usage tracking, key protection | — Pending |
| Railway for both services | Simple deployment, single platform, cost-effective | — Pending |
| No audio storage | Reduce storage costs, transcriptions are the value | — Pending |

---
*Last updated: 2026-03-09 after initialization*
