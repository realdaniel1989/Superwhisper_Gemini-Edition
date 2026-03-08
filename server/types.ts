/**
 * Server types for transcription service
 */

export interface TranscriptionOptions {
  model?: string;
  fallbackModel?: string;
}

export interface TranscriptionChunk {
  text: string;
  done: boolean;
}
