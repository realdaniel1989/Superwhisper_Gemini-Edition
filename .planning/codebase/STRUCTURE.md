# Structure

## Directory Layout

```
Superwhisper Jedi Edition/
├── .claude/                 # Claude Code settings (local)
├── .planning/               # GSD planning documents
│   └── codebase/           # Codebase analysis docs
├── src/
│   ├── App.tsx             # Main application (421 lines)
│   ├── main.tsx            # React entry point
│   └── index.css           # Global styles
├── index.html              # HTML entry point
├── package.json            # Dependencies and scripts
├── tsconfig.json           # TypeScript configuration
├── vite.config.ts          # Vite bundler configuration
├── .env.example            # Environment variable template
├── .gitignore              # Git ignore rules
├── metadata.json           # Project metadata
└── README.md               # Project documentation
```

## Key Locations

| Path | Purpose |
|------|---------|
| `src/App.tsx` | All application logic - recording, transcription, history |
| `src/main.tsx` | React root render, imports global CSS |
| `src/index.css` | Tailwind directives, base styles |
| `vite.config.ts` | Build config, path aliases, env handling |
| `package.json` | Dependencies, npm scripts |

## Path Aliases

Configured in `tsconfig.json` and `vite.config.ts`:
```typescript
"@/*" → "./*"  // Project root
```

Example usage:
```typescript
import { foo } from '@/src/utils';  // Resolves to ./src/utils
```

## Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `App`, `Dictation` |
| Functions | camelCase | `startRecording`, `transcribeAudio` |
| Variables | camelCase | `audioBlob`, `recordingTime` |
| Constants | camelCase | `mediaRecorderRef` |
| Types/Interfaces | PascalCase | `Dictation` |
| Files | PascalCase for components | `App.tsx`, `main.tsx` |

## File Organization Notes

### What Exists
- Minimal structure: 3 source files in `src/`
- Single component file with all logic

### What's Missing (typical React project)
- `src/components/` - No reusable UI components
- `src/hooks/` - No custom hooks
- `src/services/` - No API abstraction layer
- `src/types/` - No separate type definitions
- `src/utils/` - No utility functions
- `src/styles/` - Styles in single CSS file
- `tests/` or `__tests__/` - No test files

## Recommended Expansion

For scaling this project, consider:
```
src/
├── components/
│   ├── RecordButton.tsx
│   ├── TranscriptionArea.tsx
│   ├── HistoryPanel.tsx
│   └── AudioVisualizer.tsx
├── hooks/
│   ├── useAudioRecorder.ts
│   ├── useTranscription.ts
│   └── useLocalStorage.ts
├── services/
│   └── gemini.ts
├── types/
│   └── dictation.ts
└── utils/
    └── format.ts
```
