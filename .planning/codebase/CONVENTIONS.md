# Conventions

## Code Style

### Language
- TypeScript with strict-ish defaults
- React 19 with JSX
- Target: ES2022

### Formatting
- 2-space indentation (inferred from code)
- No formatter config file (no `.prettierrc`, `.editorconfig`)
- Single quotes for strings (mostly consistent)
- Trailing commas in objects/arrays

### Imports
Order pattern observed in `src/App.tsx`:
```typescript
// 1. React hooks
import { useState, useRef, useEffect } from 'react';

// 2. External libraries
import { Mic, Square, ... } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';

// 3. Internal imports (using @ alias)
// (none currently - all code in single file)
```

## Naming Patterns

### Components
- PascalCase: `App`
- Default export for main component

### Functions
- camelCase, verb-first: `startRecording`, `stopRecording`, `transcribeAudio`
- Event handlers: `onClick`, `onChange` (inline in JSX)

### Variables
- camelCase: `audioBlob`, `recordingTime`, `isRecording`
- Boolean prefix: `is` for states (`isRecording`, `isTranscribing`)

### Refs
- Suffix `Ref`: `mediaRecorderRef`, `audioContextRef`, `timerRef`

### Types/Interfaces
- PascalCase: `Dictation`
- Defined at top of file before component

## React Patterns

### State Management
```typescript
const [isRecording, setIsRecording] = useState(false);
const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
```

### Refs for Mutable Values
```typescript
const mediaRecorderRef = useRef<MediaRecorder | null>(null);
const timerRef = useRef<number | null>(null);
```

### Effects
```typescript
useEffect(() => {
  // Load from localStorage on mount
  const saved = localStorage.getItem('dictations');
  // ...
}, []); // Empty deps = mount only
```

### Event Handlers
Defined inline or as functions in component body (not extracted).

## Error Handling

### Try-Catch Pattern
```typescript
try {
  // operation
} catch (error) {
  console.error("Error description:", error);
  // User feedback
  alert("Could not access microphone...");
}
```

### Error States
- Transcription errors show message in textarea
- No error boundary component

## Styling

### Tailwind CSS
- Utility-first approach
- Inline classes in JSX
- Color palette: neutral (gray), blue (accent), red (recording), emerald (success)
- Responsive: `sm:`, `lg:` breakpoints used sparingly

### Layout Patterns
```typescript
// Centered container
<div className="min-h-screen flex flex-col items-center py-12 px-4">

// Card with shadow
<div className="bg-white rounded-3xl shadow-sm border border-neutral-200/60">
```

## TypeScript Usage

### Type Annotations
- Explicit types for interfaces: `interface Dictation { ... }`
- Generic types for useState: `useState<Blob | null>(null)`
- Type assertions: `(reader.result as string)`, `(window as any)`

### Any Usage
- `useRef<any>(null)` for SpeechRecognition
- `(event: any)` for SpeechRecognition events
- Not strict - `any` used for browser APIs without types

## File Structure Within Components

```typescript
// 1. Imports
import { useState, useRef, useEffect } from 'react';

// 2. External setup (outside component)
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// 3. Types/Interfaces
interface Dictation { ... }

// 4. Component function
export default function App() {
  // 4a. State declarations
  const [isRecording, setIsRecording] = useState(false);

  // 4b. Ref declarations
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  // 4c. Effects
  useEffect(() => { ... }, []);

  // 4d. Helper functions
  const startRecording = async () => { ... };

  // 4e. Event handlers
  const copyToClipboard = async () => { ... };

  // 4f. JSX return
  return ( ... );
}
```
