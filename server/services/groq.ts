/**
 * Groq Whisper transcription service
 * Calls Groq API from the server to keep the API key secret
 */

const GROQ_API_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';

function getApiKey(): string {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY environment variable is required');
  }
  return apiKey;
}

/**
 * Transcribe audio using Groq Whisper API
 * @param audioBuffer - Raw audio buffer
 * @param mimeType - MIME type of the audio
 * @returns Full transcribed text
 */
export async function transcribeAudio(
  audioBuffer: Buffer,
  mimeType: string
): Promise<string> {
  const extension = mimeType.split(';')[0].split('/')[1] || 'webm';

  const formData = new FormData();
  formData.append('file', new Blob([audioBuffer], { type: mimeType }), `recording.${extension}`);
  formData.append('model', 'whisper-large-v3-turbo');
  formData.append('response_format', 'json');

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getApiKey()}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Groq API error (${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as { text: string };
  return data.text;
}
