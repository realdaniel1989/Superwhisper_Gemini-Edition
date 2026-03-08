import { TranscriptionOptions } from '../types.js';

// Configuration
const API_KEY = process.env.OPENROUTER_API_KEY;
const PRIMARY_MODEL = 'google/gemini-3.1-flash-lite-preview';
const FALLBACK_MODEL = 'google/gemini-2.0-flash-lite-001';
const API_URL = 'https://openrouter.ai/api/v1/chat/completions';

if (!API_KEY) {
  throw new Error('OPENROUTER_API_KEY environment variable is required');
}

interface OpenRouterMessage {
  role: string;
  content: Array<{
    type: string;
    text?: string;
    image_url?: {
      url: string;
    };
  }>;
}

interface OpenRouterRequest {
  model: string;
  messages: OpenRouterMessage[];
  stream: boolean;
}

/**
 * Stream transcription from OpenRouter API
 * @param audioBase64 - Base64 encoded audio data
 * @param mimeType - MIME type of the audio (e.g., 'audio/webm')
 * @param onChunk - Callback for each text chunk received
 * @param options - Optional configuration for model selection
 * @returns Full transcribed text
 */
export async function streamTranscription(
  audioBase64: string,
  mimeType: string,
  onChunk: (text: string) => void,
  options?: TranscriptionOptions
): Promise<string> {
  const primaryModel = options?.model || PRIMARY_MODEL;
  const fallbackModel = options?.fallbackModel || FALLBACK_MODEL;

  // Try primary model first
  try {
    return await attemptTranscription(audioBase64, mimeType, onChunk, primaryModel);
  } catch (primaryError) {
    console.error(`Primary model (${primaryModel}) failed:`, primaryError);
    console.log(`Switching to fallback model: ${fallbackModel}`);

    // Try fallback model
    try {
      return await attemptTranscription(audioBase64, mimeType, onChunk, fallbackModel);
    } catch (fallbackError) {
      console.error(`Fallback model (${fallbackModel}) also failed:`, fallbackError);
      throw new Error(
        `Both models failed. Primary (${primaryModel}): ${primaryError instanceof Error ? primaryError.message : String(primaryError)}. Fallback (${fallbackModel}): ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`
      );
    }
  }
}

async function attemptTranscription(
  audioBase64: string,
  mimeType: string,
  onChunk: (text: string) => void,
  model: string
): Promise<string> {
  const requestBody: OpenRouterRequest = {
    model,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Transcribe this audio accurately. Output only the transcription.'
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:${mimeType};base64,${audioBase64}`
            }
          }
        ]
      }
    ],
    stream: true
  };

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost:3000',
      'X-Title': 'Superwhisper Jedi Edition'
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API error (${response.status}): ${errorText}`);
  }

  if (!response.body) {
    throw new Error('No response body from OpenRouter API');
  }

  // Parse SSE stream
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let fullText = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine || !trimmedLine.startsWith('data: ')) continue;

      const data = trimmedLine.slice(6);
      if (data === '[DONE]') continue;

      try {
        const parsed = JSON.parse(data);
        const content = parsed?.choices?.[0]?.delta?.content;
        if (content) {
          fullText += content;
          onChunk(content);
        }
      } catch (parseError) {
        // Handle malformed SSE gracefully - log but continue
        console.warn('Failed to parse SSE data:', data.substring(0, 100));
      }
    }
  }

  return fullText;
}
