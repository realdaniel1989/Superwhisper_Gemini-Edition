/**
 * Frontend API client for transcription
 * Sends audio to the Express backend, which proxies to Groq
 */

const API_URL = import.meta.env.VITE_API_URL || '';

/**
 * Transcribe audio via the backend server
 * @param audioBlob - Audio blob to transcribe
 * @returns Full transcribed text
 */
export async function streamTranscription(audioBlob: Blob): Promise<string> {
  const extension = audioBlob.type.split(';')[0].split('/')[1] || 'webm';
  const formData = new FormData();
  formData.append('audio', audioBlob, `recording.${extension}`);

  const response = await fetch(`${API_URL}/api/transcribe`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Transcription request failed: ${response.status}`);
  }

  const data = await response.json();
  if (data.error) {
    throw new Error(data.error);
  }

  return data.text;
}
