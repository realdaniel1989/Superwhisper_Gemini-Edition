/**
 * Frontend API client for backend communication
 */

// In production, VITE_API_URL should be empty (same-origin requests)
// Use empty string as valid value, only fallback to localhost for undefined
const API_URL = import.meta.env.VITE_API_URL !== undefined
  ? import.meta.env.VITE_API_URL
  : 'http://localhost:3001';

/**
 * Stream transcription from backend
 * @param audioBlob - Audio blob to transcribe
 * @returns Full transcribed text
 */
export async function streamTranscription(audioBlob: Blob): Promise<string> {
  const formData = new FormData();
  formData.append('audio', audioBlob);

  const response = await fetch(`${API_URL}/api/transcribe`, {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    throw new Error(`Transcription request failed: ${response.status}`);
  }

  if (!response.body) {
    throw new Error('No response body from server');
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
    const lines = buffer.split('\n\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = JSON.parse(line.slice(6));
        if (data.text) fullText += data.text;
        if (data.done) return fullText;
        if (data.error) throw new Error(data.error);
      }
    }
  }

  return fullText;
}
