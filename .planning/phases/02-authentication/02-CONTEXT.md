# Phase 2: Authentication - Context

**Gathered:** 2026-03-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can create accounts and securely access them from any device. This phase covers signup, login, logout, session persistence, and password reset. Database storage of dictations is Phase 3.

</domain>

<decisions>
## Implementation Decisions

### Auth UI Placement
- Modal overlay for login/signup (not separate pages)
- Triggered by button in header
- Combined modal that toggles between login and signup via link
- Modal closes only via explicit button (no backdrop click dismiss)

### Session & State Handling
- Session persists in localStorage (Supabase default)
- Supabase handles token refresh automatically (no custom refresh logic)
- React Context + useAuth hook for sharing auth state across components
- Expose `user` object and `loading` boolean to components

### Unauthenticated Access
- Must login first — no guest access to the app
- Auth modal appears immediately on session expiry during use
- Silent redirect to login when returning with expired session
- Force re-login on invalid/corrupted auth state (no recovery attempt)

### Password Reset Flow
- Include password reset functionality
- "Forgot password" link in the auth modal
- Supabase default page for password reset (no custom reset form)
- Email-only verification before sending reset link

### Claude's Discretion
- Exact modal styling and animation
- Form field validation UX
- Error message copy and display style
- Loading state design during auth operations

</decisions>

<specifics>
## Specific Ideas

No specific requirements — standard auth patterns are acceptable.

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/App.tsx`: Main app component — will need to be wrapped with AuthProvider
- `src/lib/api.ts`: Backend API client — may need auth token injection for future user-specific endpoints

### Established Patterns
- Tailwind CSS for all styling — auth modal should match clean, minimal aesthetic
- Lucide React icons — use for auth UI icons (X for close, etc.)
- No routing currently — single page app structure preserved

### Integration Points
- Wrap App with `<AuthProvider>` in `main.tsx`
- Header area in App.tsx for login button (currently just has History button)
- Supabase client needs to be initialized in `src/lib/supabase.ts`

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 02-authentication*
*Context gathered: 2026-03-09*
