---
phase: 4
slug: deployment
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-09
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (existing) |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npm test` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 1 | DEPL-03 | manual | env vars verified in Railway | N/A | ⬜ pending |
| 04-01-02 | 01 | 1 | DEPL-02 | manual | curl `/api/health` returns 200 | N/A | ⬜ pending |
| 04-02-01 | 02 | 2 | DEPL-01 | manual | frontend loads at Railway URL | N/A | ⬜ pending |
| 04-02-02 | 02 | 2 | DEPL-02 | manual | transcription works end-to-end | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.

*Note: This phase is primarily deployment/configuration. Validation is manual via Railway dashboard and production URL testing.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Frontend loads at production URL | DEPL-01 | Requires live deployment | Visit Railway URL, verify React app renders |
| Backend health check responds | DEPL-02 | Requires live deployment | `curl https://{railway-url}/api/health` returns 200 |
| Transcription works end-to-end | DEPL-02 | Requires live deployment + API keys | Record audio, verify transcription appears |
| Environment variables secure | DEPL-03 | Railway dashboard access required | Check Railway env vars show API keys, not exposed in frontend |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
