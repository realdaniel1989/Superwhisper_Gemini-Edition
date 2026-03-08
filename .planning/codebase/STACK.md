# Technology Stack

**Analysis Date:** 2026-03-09

## Languages

**Primary:**
- TypeScript 5.8.2 - Used throughout the application codebase in `src/`

**Secondary:**
- JavaScript (ES2022) - Build tooling and configuration files

## Runtime

**Environment:**
- Node.js - Required for development (version not specified in project)
- Browser runtime - Application runs in browser context

**Package Manager:**
- npm - Configured via `package.json`
- Lockfile: Missing (no package-lock.json, yarn.lock, or pnpm-lock.yaml present)

## Frameworks

**Core:**
- React 19.0.0 - UI framework for the dictation application
- Vite 6.2.0 - Build tool and development server

**Styling:**
- Tailwind CSS 4.1.14 - Utility-first CSS framework
- @tailwindcss/vite 4.1.14 - Vite plugin for Tailwind integration

**Animation:**
- Motion 12.23.24 - Animation library (formerly Framer Motion)

**Icons:**
- Lucide React 0.546.0 - Icon library

**Backend (included but not actively used):**
- Express 4.21.2 - Web server framework (present in dependencies, not used in current code)
- better-sqlite3 12.4.1 - SQLite database (present in dependencies, not used in current code)

**Development:**
- TypeScript ~5.8.2 - Type checking and compilation
- tsx 4.21.0 - TypeScript execution engine
- @vitejs/plugin-react 5.0.4 - React plugin for Vite

## Key Dependencies

**Critical:**
- @google/genai 1.29.0 - Google Gemini AI SDK for audio transcription
- react-dom 19.0.0 - React DOM rendering
- lucide-react 0.546.0 - UI icons (Mic, Square, Copy, Trash2, Check, Loader2, Clock, History, X, ChevronRight)

**Infrastructure:**
- dotenv 17.2.3 - Environment variable management
- autoprefixer 10.4.21 - CSS vendor prefixing

## Configuration

**Environment:**
- Environment variables configured via `.env` files
- Variables injected at build time via Vite's `define` config
- Key configs required:
  - `GEMINI_API_KEY` - Required for AI transcription API
  - `APP_URL` - Application URL for self-referential links
  - `DISABLE_HMR` - Optional, disables hot module replacement

**Build:**
- `vite.config.ts` - Main build configuration
- `tsconfig.json` - TypeScript configuration
  - Target: ES2022
  - Module: ESNext
  - JSX: react-jsx
  - Path alias: `@/*` maps to project root

**Path Aliases:**
- `@/*` - Maps to project root (`.`)

## Platform Requirements

**Development:**
- Node.js runtime
- npm package manager
- Modern browser with Web Audio API and MediaRecorder support
- Microphone access permissions

**Production:**
- Static file hosting (built as SPA)
- Google Cloud Run (mentioned in `.env.example` as deployment target)
- AI Studio platform integration

## Build Commands

```bash
npm run dev      # Development server on port 3000
npm run build    # Production build
npm run preview  # Preview production build
npm run clean    # Remove dist directory
npm run lint     # TypeScript type checking
```

---

*Stack analysis: 2026-03-09*
