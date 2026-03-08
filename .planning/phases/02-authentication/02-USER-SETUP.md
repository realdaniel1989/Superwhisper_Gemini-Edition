# Phase 2: User Setup Required

**Generated:** 2026-03-09
**Phase:** 02-authentication
**Status:** Incomplete

Complete these items for Supabase Auth to function. Claude automated everything possible; these items require human access to external dashboards/accounts.

## Environment Variables

| Status | Variable | Source | Add to |
|--------|----------|--------|--------|
| [ ] | `VITE_SUPABASE_URL` | Supabase Dashboard -> Project Settings -> API -> Project URL | `.env` |
| [ ] | `VITE_SUPABASE_ANON_KEY` | Supabase Dashboard -> Project Settings -> API -> anon public key | `.env` |

## Account Setup

- [ ] **Create Supabase project**
  - URL: https://supabase.com/dashboard/new
  - Skip if: Already have project for this app

## Dashboard Configuration

- [ ] **Enable Email Auth provider**
  - Location: Supabase Dashboard -> Authentication -> Providers -> Email
  - Enable: Email provider
  - Configure: Confirm email (on/off based on preference)

## Verification

After completing setup:

```bash
# Check env vars are set
grep VITE_SUPABASE .env

# Verify build passes
npm run lint

# Start dev server to test
npm run dev
```

Expected results:
- No TypeScript errors
- Dev server starts successfully
- AuthProvider initializes without errors

---

**Once all items complete:** Mark status as "Complete" at top of file.
