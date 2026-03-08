# Testing

## Current State

**No test infrastructure exists.**

### Evidence
- No test files in `src/` or project root
- No test framework in `package.json` dependencies
- No test scripts in `package.json`
- No test configuration files (vitest.config.ts, jest.config.js)

### Package.json Scripts
```json
{
  "scripts": {
    "dev": "vite --port=3000 --host=0.0.0.0",
    "build": "vite build",
    "preview": "vite preview",
    "clean": "rm -rf dist",
    "lint": "tsc --noEmit"
  }
}
```

Note: Only `lint` script exists for type checking, no test command.

## Coverage Gaps

### Untested Code
All code in `src/App.tsx` is untested:

| Function/Area | Risk Level | Description |
|---------------|------------|-------------|
| `startRecording()` | High | MediaRecorder initialization, permissions |
| `stopRecording()` | High | Cleanup, state transitions |
| `transcribeAudio()` | Critical | API integration, error handling |
| `blobToBase64()` | Medium | Data conversion |
| `copyToClipboard()` | Low | Browser API |
| `saveDictation()` | Medium | localStorage persistence |
| `deleteDictation()` | Low | State updates |
| Audio level visualization | Low | UI feedback |
| History panel | Low | UI rendering |

### Edge Cases Not Tested
- Microphone permission denied
- Gemini API rate limiting/errors
- Network timeout during transcription
- localStorage quota exceeded
- Invalid audio format
- Empty recording handling
- Browser compatibility (webkitSpeechRecognition)

## Recommended Setup

### Framework: Vitest
Since project uses Vite, Vitest is natural choice:

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

### Configuration
Create `vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
  },
});
```

### Test File Structure
```
src/
├── App.test.tsx           # Component tests
└── test/
    ├── setup.ts           # Test environment setup
    └── mocks/
        ├── mediaRecorder.ts
        └── gemini.ts
```

### Add Test Script
```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage"
  }
}
```

## Priority Test Scenarios

### 1. Recording Flow (Critical)
```typescript
// Test: User can start and stop recording
// Test: Audio blob is created after recording
// Test: Timer increments during recording
```

### 2. Transcription (Critical)
```typescript
// Test: API receives correct audio format
// Test: Streaming response updates UI
// Test: Error handling for API failures
```

### 3. Persistence (Medium)
```typescript
// Test: Dictations saved to localStorage
// Test: Dictations loaded on mount
// Test: Delete removes from storage
```

### 4. UI Interactions (Low)
```typescript
// Test: Copy to clipboard
// Test: History panel toggle
// Test: Load dictation from history
```

## Mocking Requirements

### MediaRecorder API
```typescript
// Mock in test setup
class MockMediaRecorder {
  start() {}
  stop() {}
  ondataavailable = null;
  onstop = null;
}
```

### Gemini API
```typescript
// Mock streaming response
vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn(() => ({
    models: {
      generateContentStream: vi.fn(async function* () {
        yield { text: 'Hello' };
        yield { text: ' world' };
      })
    }
  }))
}));
```

### localStorage
```typescript
// Use vi.stubGlobal or testing-library
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  // ...
};
```
