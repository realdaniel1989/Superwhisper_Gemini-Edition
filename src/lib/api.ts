/**
 * Frontend API client for backend communication
 */

// Supabase Edge Function configuration
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const TRANSCRIBE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/transcribe`;

/**
 * Transcribe audio using Supabase Edge Function
 * Routes through supabase.co to bypass corporate proxy blocking
 * @param audioBlob - Audio blob to transcribe
 * @returns Full transcribed text
 */
export async function streamTranscription(audioBlob: Blob): Promise<string> {
  // Convert Blob to base64
  const arrayBuffer = await audioBlob.arrayBuffer();
  const base64 = btoa(
    new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
  );

  const response = await fetch(TRANSCRIBE_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'apikey': SUPABASE_ANON_KEY
    },
    body: JSON.stringify({
      audio: base64,
      mimeType: audioBlob.type || 'audio/webm'
    })
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
