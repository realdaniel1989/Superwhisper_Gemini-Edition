# Transcript Refinement — Design Spec

**Date:** 2026-05-18  
**Status:** Approved  
**Scope:** Post-Whisper LLM refinement of transcribed text

## Problem

Raw Whisper transcription contains no punctuation, no paragraph structure, filler words, and occasionally misheard words. The user wants polished, readable output without manual editing.

## Solution

Chain an LLM refinement step after Whisper transcription, using Groq's `openai/gpt-oss-20b` model. Same API key, same provider. At ~1000 tokens/second, the added latency is negligible.

## Refinement Layers

A single LLM pass performs all three layers:

1. **Mechanical cleanup** — fix punctuation, capitalization, remove filler words ("um", "uh", "like" when used as filler)
2. **Structural formatting** — detect topic boundaries and insert paragraph breaks; format lists as bullet points when the content is clearly a list
3. **Contextual accuracy** — correct likely misheard words using surrounding sentence context

**Constraint:** Preserve the speaker's voice and intent. Light sentence restructuring for clarity is acceptable. This is not a rewrite.

## Architecture

```
Audio → Whisper → raw text → Refine (GPT-OSS-20B) → refined text → response
                                        ↓ (on failure)
                                     raw text → response + refined: false
```

### API Call Details

- **Endpoint:** `https://api.groq.com/openai/v1/chat/completions`
- **Model:** `openai/gpt-oss-20b`
- **Auth:** Reuse existing `GROQ_API_KEY`
- **Max tokens:** 4096
- **Temperature:** 0.3 (low — predictable, faithful refinement)

### Response Shape

Currently:
```json
{ "text": "the transcribed text" }
```

New:
```json
{ "text": "the refined text", "refined": true }
```

On refinement failure:
```json
{ "text": "the raw whisper text", "refined": false }
```

Non-breaking — the `text` field remains. `refined` is additive.

## File Changes

| File | Change |
|---|---|
| `server/services/refine.ts` | **New** — Groq chat completions call with system prompt for three-layer refinement |
| `server/routes/transcribe.ts` | **Modified** — chains `refineText()` after Whisper, wraps in try/catch for fallback, adds `refined` flag to response |
| `src/lib/api.ts` | **Modified** — return type changes from `Promise<string>` to `Promise<{ text: string; refined: boolean }>` |
| `src/App.tsx` | **Modified** — adds `isRefined` state, shows fallback toast when `refined` is false |
| `.env.example` | **Modified** — comment update noting `GROQ_API_KEY` is used for both Whisper and refinement |

## Prompt Design

The system prompt instructs the model to perform all three refinement layers in one pass:

- Fix punctuation, capitalization, remove filler words
- Detect topic boundaries and insert paragraph breaks; format lists as bullet points
- Correct likely misheard words using surrounding context
- Preserve the speaker's voice — light restructuring only, not a rewrite

## Error Handling

- Refinement failure falls back to raw Whisper text with `refined: false`
- Client shows a toast: "Refinement unavailable — showing raw transcription."
- The user always gets their text — refinement is a best-effort enhancement

## Environment

No new environment variables. The existing `GROQ_API_KEY` is reused for both Whisper and the refinement call.
