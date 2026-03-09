# Phase 3: Database Storage - Context

**Gathered:** 2026-03-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Dictations are stored in Supabase database and synced across devices. Users see only their own dictations. This phase replaces localStorage persistence with database-backed storage, enabling multi-device access.

</domain>

<decisions>
## Implementation Decisions

### Migration Strategy
- Migrate existing localStorage dictations to Supabase on first auth
- Skip duplicates by matching timestamp + text content
- Clear localStorage after successful migration (clean slate)
- Migration happens silently in background during login flow

### Sync Behavior
- Optimistic updates — UI shows success immediately, database save happens in background
- Load dictations on auth only (not periodic refresh)
- No real-time subscription — poll on demand

### Offline Handling
- Block recording when offline (disable record button)
- Use browser `navigator.onLine` and `online`/`offline` events for detection
- On reconnection: re-enable recording and refresh dictations from database
- No notification toast on reconnection — just silently resume

### Error Handling
- Toast notifications for database errors (non-blocking, auto-dismiss after 3 seconds)
- Manual retry button on failed saves
- Failed saves appear in history list with error indicator and retry option
- User never loses their dictation text due to save failure

### Claude's Discretion
- Exact toast styling and position
- Error indicator design in history list
- Loading states during initial fetch

</decisions>

<specifics>
## Specific Ideas

No specific requirements — standard database sync patterns are acceptable.

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/supabase.ts`: Supabase client already configured with session persistence
- `src/context/AuthContext.tsx`: Provides `user` object — use `user.id` for RLS policies
- `src/App.tsx`: `Dictation` interface (id, text, timestamp, duration) — extend or reuse

### Established Patterns
- Tailwind CSS for all styling — error states should match existing aesthetic
- Lucide React icons — use for error indicators, retry buttons
- Toast pattern not yet established — this phase introduces it

### Integration Points
- Replace `saveDictation` (line 116) with Supabase insert
- Replace `deleteDictation` (line 129) with Supabase delete
- Replace localStorage load (lines 105-113) with Supabase fetch
- Add offline detection listeners in `useEffect`
- Create `src/lib/dictations.ts` for database operations

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 03-database-storage*
*Context gathered: 2026-03-09*
