/**
 * Frontend API client for transcription
 * Sends audio as base64 JSON to avoid Zscaler multipart inspection
 */

const API_URL = import.meta.env.VITE_API_URL || '';

/**
 * Transcribe audio via the backend server
 * Uses JSON + base64 to avoid corporate proxy issues with multipart uploads
 * @param audioBlob - Audio blob to transcribe
 * @returns Full transcribed text
 */
export async function streamTranscription(audioBlob: Blob): Promise<string> {
  // Convert Blob to base64 (text payload, not binary multipart)
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      resolve(dataUrl.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(audioBlob);
  });

  const response = await fetch(`${API_URL}/api/transcribe`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      audio: base64,
      mimeType: audioBlob.type || 'audio/webm',
    }),
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
