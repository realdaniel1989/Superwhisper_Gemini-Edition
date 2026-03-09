import { TranscriptionOptions } from '../types.js';

// Configuration
const PRIMARY_MODEL = 'gemini-3.1-flash-lite-preview';
const FALLBACK_MODEL = 'gemini-3.1-flash-lite-preview';
const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

function getApiKey(): string {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is required');
  }
  return apiKey;
}

interface GeminiPart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string;
  };
}

interface GeminiContent {
  parts: GeminiPart[];
  role: string;
}

interface GeminiRequest {
  contents: GeminiContent[];
  generationConfig?: {
    temperature?: number;
    maxOutputTokens?: number;
  };
}

/**
 * Stream transcription from Gemini API
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
  const requestBody: GeminiRequest = {
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: 'Transcribe this audio accurately. Output only the transcription.'
          },
          {
            inlineData: {
              mimeType,
              data: audioBase64
            }
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.1
    }
  };

  const url = `${API_URL}/${model}:streamGenerateContent?alt=sse&key=${getApiKey()}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errorText}`);
  }

  if (!response.body) {
    throw new Error('No response body from Gemini API');
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
        // Gemini's response structure: candidates[0].content.parts[0].text
        const content = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
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
