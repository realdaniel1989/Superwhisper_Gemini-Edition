/**
 * Text refinement service using Groq chat completions
 * Fixes punctuation, structure, and contextual accuracy of raw transcripts
 */

import { getApiKey } from './groq.js';

const GROQ_CHAT_URL = 'https://api.groq.com/openai/v1/chat/completions';

const SYSTEM_PROMPT = `You refine raw speech-to-text transcripts. Apply these three layers in one pass:

1. MECHANICAL CLEANUP: Fix punctuation, capitalization, and remove filler words (um, uh, like when used as filler).
2. STRUCTURAL FORMATTING: Detect topic boundaries and insert paragraph breaks. If content is clearly a list, format as bullet points.
3. CONTEXTUAL ACCURACY: Correct likely misheard words using surrounding sentence context (e.g., "solid by" → "sullied" in a Shakespeare context).

Preserve the speaker's original voice and intent. Light sentence restructuring for clarity is acceptable. Do not rewrite or paraphrase. Output only the refined text with no commentary.`;

/**
 * Refine raw transcript text using Groq GPT-OSS-20B
 * @param rawText - Raw Whisper transcription
 * @returns Refined transcript text
 */
export async function refineText(rawText: string): Promise<string> {
  const response = await fetch(GROQ_CHAT_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getApiKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'openai/gpt-oss-20b',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: rawText },
      ],
      temperature: 0.3,
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Groq refinement error (${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as {
    choices: Array<{ message: { content: string } }>;
  };

  return data.choices[0].message.content.trim();
}
