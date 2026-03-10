import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// Configuration
const PRIMARY_MODEL = 'gemini-3.1-flash-lite-preview';
const FALLBACK_MODEL = 'gemini-3.1-flash-lite-preview';
const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

function getApiKey(): string {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
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

async function attemptTranscription(
  audioBase64: string,
  mimeType: string,
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

  // Parse SSE stream and collect full text
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
        const content = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (content) {
          fullText += content;
        }
      } catch {
        // Handle malformed SSE gracefully - continue
        console.warn('Failed to parse SSE data:', data.substring(0, 100));
      }
    }
  }

  return fullText;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey',
      },
    });
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  try {
    const body = await req.json();
    const { audio, mimeType } = body;

    if (!audio) {
      return new Response(JSON.stringify({ error: 'No audio data provided' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    const resolvedMimeType = mimeType || 'audio/webm';

    // Try primary model first, then fallback
    let fullText: string;
    try {
      fullText = await attemptTranscription(audio, resolvedMimeType, PRIMARY_MODEL);
    } catch (primaryError) {
      console.error(`Primary model (${PRIMARY_MODEL}) failed:`, primaryError);
      console.log(`Switching to fallback model: ${FALLBACK_MODEL}`);

      try {
        fullText = await attemptTranscription(audio, resolvedMimeType, FALLBACK_MODEL);
      } catch (fallbackError) {
        console.error(`Fallback model (${FALLBACK_MODEL}) also failed:`, fallbackError);
        throw new Error(
          `Both models failed. Primary: ${primaryError instanceof Error ? primaryError.message : String(primaryError)}. Fallback: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`
        );
      }
    }

    return new Response(JSON.stringify({ text: fullText }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Transcription error:', error);
    const message = error instanceof Error ? error.message : 'An error occurred while processing the audio';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
});
