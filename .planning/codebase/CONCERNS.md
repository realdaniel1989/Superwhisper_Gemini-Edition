# Concerns

## Critical Issues

### 1. API Key Exposure (Security)
**Location:** `vite.config.ts:10-12`
```typescript
define: {
  'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
}
```

**Problem:** API key is bundled into client-side JavaScript. Anyone can extract it from the build output.

**Impact:** High - API abuse, quota exhaustion, potential billing charges

**Fix:** Move transcription to backend proxy or use serverless function.

---

### 2. Zero Test Coverage
**Location:** Entire codebase

**Problem:** No test files, no test framework, no test scripts.

**Impact:** Medium - Refactoring risk, regression potential, no confidence in changes

**Fix:** Add Vitest + React Testing Library. Start with critical paths.

---

### 3. Monolithic Component
**Location:** `src/App.tsx` (421 lines)

**Problem:** All logic in single file - recording, transcription, history, UI.

**Impact:** Medium - Hard to maintain, test, and reuse

**Fix:** Decompose into components and custom hooks.

---

## High Priority Issues

### 4. Unused Dependencies
**Location:** `package.json:21-24`
```json
"express": "^4.21.2",
"dotenv": "^17.2.3",
"better-sqlite3": "^12.4.1",
"motion": "^12.23.24"
```

**Problem:** These packages are listed but never imported in the codebase.

**Impact:** Low - Bloats install size, confusion about architecture

**Fix:** Remove unused dependencies or implement intended features.

---

### 5. Memory Leaks
**Location:** `src/App.tsx:132-164`

**Problem:** AudioContext and MediaStream created but not cleaned up on unmount.

```typescript
// Created on start
const audioContext = new AudioContext();
const stream = await navigator.mediaDevices.getUserMedia(...);

// No cleanup in useEffect return
```

**Impact:** Medium - Memory leak if component unmounts during recording

**Fix:** Add cleanup in useEffect:
```typescript
useEffect(() => {
  return () => {
    if (audioContextRef.current) audioContextRef.current.close();
    if (mediaRecorderRef.current?.stream) {
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
    }
  };
}, []);
```

---

### 6. Browser Compatibility
**Location:** `src/App.tsx:172`
```typescript
if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)
```

**Problem:** Relies on non-standard WebKit Speech Recognition API. Not supported in Firefox, limited in Safari.

**Impact:** Medium - Feature degrades silently on unsupported browsers

**Fix:** Add feature detection UI feedback, consider fallback or polyfill.

---

## Medium Priority Issues

### 7. No Error Recovery
**Location:** `src/App.tsx:117-119`

**Problem:** Failed transcription shows error message but audio is lost. User must re-record.

```typescript
catch (error) {
  setTranscription("Error transcribing audio. Please try again.");
  // Audio blob is not preserved for retry
}
```

**Impact:** Low - Poor UX on transient failures

**Fix:** Preserve audio blob, add retry button.

---

### 8. localStorage Quota
**Location:** `src/App.tsx:57`

**Problem:** No quota management. localStorage typically limited to 5-10MB.

```typescript
localStorage.setItem('dictations', JSON.stringify(updated));
```

**Impact:** Low - Will fail silently when quota exceeded

**Fix:** Add try-catch, implement size limits or rotation policy.

---

### 9. TypeScript `any` Usage
**Location:** `src/App.tsx:30, 178, 183`

```typescript
const recognitionRef = useRef<any>(null);
recognition.onresult = (event: any) => { ... };
```

**Problem:** Loses type safety for browser APIs without type definitions.

**Impact:** Low - Runtime errors possible, no IDE assistance

**Fix:** Create type declarations for Speech Recognition API.

---

### 10. No Loading States
**Location:** History panel

**Problem:** No loading indicator when loading dictations or copying to clipboard.

**Impact:** Low - Minor UX issue

**Fix:** Add loading states for async operations.

---

## Low Priority Issues

### 11. Magic Numbers
**Location:** `src/App.tsx:136`
```typescript
analyser.fftSize = 256;
```

**Problem:** No explanation for audio processing parameters.

**Fix:** Add comments or extract to named constants.

---

### 12. Inline Styles Mixed with Tailwind
**Location:** `src/App.tsx:319-320`
```typescript
style={{ transform: `scale(${1 + (audioLevel / 255) * 0.8})` }}
```

**Problem:** Dynamic styles inline rather than using Tailwind utilities or CSS variables.

**Impact:** Very Low - Minor inconsistency

**Fix:** Use CSS custom properties for dynamic values.

---

## Summary Table

| Issue | Severity | Effort | Priority |
|-------|----------|--------|----------|
| API Key Exposure | Critical | High | Fix First |
| Zero Test Coverage | High | Medium | Soon |
| Monolithic Component | High | High | Soon |
| Unused Dependencies | Medium | Low | Quick Win |
| Memory Leaks | Medium | Low | Soon |
| Browser Compatibility | Medium | Medium | Plan |
| No Error Recovery | Low | Low | Backlog |
| localStorage Quota | Low | Low | Backlog |
| TypeScript `any` | Low | Low | Backlog |

---

## Recommended Action Order

1. **Immediate:** Remove unused dependencies (quick win)
2. **Short-term:** Fix memory leaks, add basic tests
3. **Medium-term:** Refactor component, add error recovery
4. **Long-term:** Backend proxy for API key, full test coverage
