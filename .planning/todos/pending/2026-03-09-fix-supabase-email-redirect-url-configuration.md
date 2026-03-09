---
created: 2026-03-09T13:52:03.325Z
title: Fix Supabase email redirect URL configuration
area: auth
files:
  - src/context/AuthContext.tsx:79-91
---

## Problem

When users sign up, the email verification link sent by Supabase points to `localhost:3000` instead of the production URL. This prevents users from completing the signup process in production.

Production URL: `https://superwhispergemini-edition-production.up.railway.app`

## Solution

**Code changes (DONE):**
- Updated `signUp()` to include `emailRedirectTo` option pointing to Railway production URL
- Updated `resetPassword()` to include `redirectTo` option for consistency

**Supabase dashboard configuration (REQUIRED):**
1. Go to Supabase Dashboard → Authentication → URL Configuration
2. Set Site URL to: `https://superwhispergemini-edition-production.up.railway.app`
3. Add Redirect URLs:
   - `https://superwhispergemini-edition-production.up.railway.app/**`
   - Optionally `http://localhost:3001/**` for local dev
