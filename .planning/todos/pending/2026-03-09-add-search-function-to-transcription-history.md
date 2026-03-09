---
created: 2026-03-09T13:52:03.325Z
title: Add search function to transcription history
area: ui
files:
  - src/components/HistoryPanel.tsx
  - src/lib/dictations.ts
---

## Problem

Users cannot search through their transcription history. As users accumulate more dictations, finding specific past transcriptions becomes difficult without manually scrolling through the entire list.

## Solution

Implement a search feature in the history panel that allows users to:
- Search by transcription text content
- Optionally filter by date range
- Real-time filtering as user types

Implementation approach:
1. Add search input field to HistoryPanel component
2. Filter dictations client-side based on search query (text match on content)
3. Consider debouncing for performance with large histories
4. May need database query support if history grows large (Supabase full-text search)
